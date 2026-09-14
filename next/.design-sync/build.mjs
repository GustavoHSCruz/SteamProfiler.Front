#!/usr/bin/env node
/* Builds .design-sync/pkg/dist, the input the design-sync converter reads:

     dist/steamprofiler.css   Tailwind compiled from the bench's styles.css,
                              then Duo's stylesheet scoped under `.duo`
     dist/fonts/              the self-hosted faces, url()s made relative
     dist/types/index.d.ts    declarations for pkg/index.tsx

   Run from steamprofiler-front/next. Duo is read from its sibling checkout,
   ../../steamprofiler-duo-front. */

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { compile, optimize } from '@tailwindcss/node';
import { Scanner } from '@tailwindcss/oxide';
import { transform } from 'lightningcss';

const PKG = dirname(fileURLToPath(import.meta.url)) + '/pkg';
const NEXT = resolve(PKG, '../..');
const WORKSPACE = resolve(NEXT, '../..');
const DUO = join(WORKSPACE, 'steamprofiler-duo-front');
const DIST = join(PKG, 'dist');

if (!existsSync(join(DUO, 'src/styles.css'))) {
  console.error(`Duo checkout not found at ${DUO}`);
  process.exit(1);
}
rmSync(DIST, { recursive: true, force: true });
mkdirSync(join(DIST, 'fonts'), { recursive: true });

/* ── Tailwind ─────────────────────────────────────────────────────────── */
const input = join(PKG, 'steamprofiler.tw.css');
const compiler = await compile(readFileSync(input, 'utf8'), {
  base: PKG,
  shouldRewriteUrls: true,
  onDependency: () => {},
});
const sources = (compiler.root === 'none' ? [] : compiler.root === null ? [] : [{ ...compiler.root, negated: false }])
  .concat(compiler.sources);
const scanner = new Scanner({ sources });
const bench = compiler.build(scanner.scan());

/* ── Duo, scoped ──────────────────────────────────────────────────────── */
const duoRaw = readFileSync(join(DUO, 'src/styles.css'), 'utf8')
  .replace(/@import url\(['"]?\.\/fonts\.css['"]?\);?/, '')
  .replace(/:root\b/g, '&')
  .replace(/^body\b/gm, '&');
const duo = transform({
  filename: 'duo.css',
  code: Buffer.from(`.duo {\n${duoRaw}\n}\n`),
  minify: false,
  targets: { chrome: 120 << 16 },
}).code.toString();

/* ── Fonts ────────────────────────────────────────────────────────────── */
for (const f of readdirSync(join(NEXT, 'public/fonts'))) cpSync(join(NEXT, 'public/fonts', f), join(DIST, 'fonts', f));

const css = optimize(`${bench}\n/* ── Duo (scoped to .duo) ── */\n${duo}`, { minify: false }).code
  .replace(/url\((['"]?)\/fonts\//g, 'url($1./fonts/');
writeFileSync(join(DIST, 'steamprofiler.css'), css);

/* ── Types ────────────────────────────────────────────────────────────── */
const raw = join(DIST, 'types-raw');
execFileSync(join(NEXT, 'node_modules/.bin/tsc'), [
  '--ignoreConfig', '--declaration', '--emitDeclarationOnly', '--noEmit', 'false',
  '--jsx', 'react-jsx', '--module', 'esnext', '--moduleResolution', 'bundler', '--target', 'es2022',
  '--allowImportingTsExtensions', '--skipLibCheck', '--strict',
  '--types', 'node', '--typeRoots', join(NEXT, 'node_modules/@types'),
  '--rootDir', WORKSPACE, '--outDir', raw,
  join(PKG, 'index.tsx'), join(NEXT, 'src/vite-env.d.ts'),
], { stdio: 'inherit', cwd: NEXT });

const types = join(DIST, 'types');
renameSync(raw, types);
const nested = join(types, 'steamprofiler-front/next/.design-sync/pkg/index.d.ts');
writeFileSync(join(types, 'index.d.ts'), readFileSync(nested, 'utf8')
  .replaceAll("'../../src/", "'./steamprofiler-front/next/src/")
  .replaceAll("'../../../../steamprofiler-duo-front/", "'./steamprofiler-duo-front/"));
rmSync(join(types, 'steamprofiler-front/next/.design-sync'), { recursive: true, force: true });

console.log(`dist: steamprofiler.css ${(css.length / 1024).toFixed(0)} KB, types, ${readdirSync(join(DIST, 'fonts')).length} fonts`);
