/* The pages that have not been rewritten as components yet, built into the app.

   The served site is plain scripts that share one global scope: every page is
   an HTML shell that loads a list of files in order, and each file sees what
   the ones before it declared. That arrangement is kept, whole, rather than
   rewritten under a deadline. `import run from 'legacy:profile'` hands back
   one function whose body is those same files concatenated in the order the
   shell loads them, so the declarations are shared exactly as they were -
   and scoped to one call instead of to the window, which is what lets the app
   run a page, leave it, and run it again.

   What the files used to find as globals comes in through the function's
   argument: the i18n API (i18n.js is not concatenated; src/legacy/env.ts is
   its replacement, reading the app's dictionary), and a window, a document
   and a location that belong to the page being run. See env.ts.

   Everything is read out of the served site's own files, so there is one copy
   of each: which scripts a page runs and which stylesheets it wears are the
   <script> and <link> tags in its shell, and the markup is its <body>. Each
   stylesheet is scoped to that page - every selector under `.legacy-<page>`,
   and `:root`, `html` and `body` turned into that class - so a stylesheet
   written for a page that owned the whole document now owns one element,
   and two pages' rules cannot meet once both have been visited. */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import type { Plugin } from 'vite';

/* Where the pages still live. Moved into this folder the day site/ is taken
   out, which is a change to this line and not to anything else here. */
export const LEGACY_DIR = fileURLToPath(new URL('../site', import.meta.url));

/* The shells the app runs this way, by the name their module is imported as.
   The key is the file under LEGACY_DIR. */
export const LEGACY_PAGES = [
  'profile', 'game-public', 'franchises', 'publishers', 'developers',
  'blog', 'post', 'extension', 'translate',
  'terms', 'terms-history', 'policy-history',
] as const;
export type LegacyName = (typeof LEGACY_PAGES)[number];

/* Replaced by env.ts, or loaded once for every page. */
const NOT_CONCATENATED = new Set(['/dict.js', '/i18n.js']);
const UNSCOPED = new Set(['/fonts.css']);

const PREFIX = 'legacy:';
const VIRTUAL = '\0' + PREFIX;

type Shell = { scripts: string[]; styles: string[]; body: string; title: string | null };

function readShell(name: string): Shell {
  const html = readFileSync(resolve(LEGACY_DIR, `${name}.html`), 'utf8');
  const scripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map((m) => '/' + m[1].replace(/^\//, ''));
  const styles = [...html.matchAll(/<link\s+rel="stylesheet"\s+href="([^"]+)"/g)].map((m) => '/' + m[1].replace(/^\//, ''));
  const title = /data-i18n-doc="([^"]+)"/.exec(html)?.[1] ?? null;
  let body = html.slice(html.indexOf('>', html.indexOf('<body')) + 1, html.lastIndexOf('</body>'));
  body = body
    .replace(/<script\b[\s\S]*?<\/script>/g, '')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/g, '')
    .replace(/<!--(?!#)[\s\S]*?-->/g, '')
    /* The page's own status bar and footer stay in the markup, because the
       scripts write into them - the back link, the "fetched at" stamp - and a
       lookup that comes back null is an exception in the middle of a page.
       They are hidden: the app draws the chrome now, once, for every page. */
    .replace(/<header class="bar-top"/, '<header class="bar-top" hidden')
    .replace(/<footer class="foot"/, '<footer class="foot" hidden')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
  return { scripts, styles, body, title };
}

/** Every selector under the page's class.
 *
 *  `:root` qualified by an attribute - `:root[data-game="dota-2"]`, which is
 *  how the game and franchise themes are written - keeps that qualifier on the
 *  real root and puts the page's class under it: the scripts still set the
 *  attribute on <html>, the rule still only reaches inside the page. A bare
 *  `:root`, `html` or `body` is the page's element itself. */
export function scope(css: string, cls: string): string {
  const root = postcss.parse(css);
  root.walkRules((rule) => {
    const parent = rule.parent;
    if (parent && parent.type === 'atrule' && /keyframes$/i.test((parent as postcss.AtRule).name)) return;
    rule.selectors = rule.selectors.map((sel) => {
      const s = sel.trim();
      const m = /^(?::root|html)((?:\[[^\]]*\]|:(?!:)[\w-]+(?:\([^)]*\))?)*)/.exec(s);
      if (m) {
        const rest = s.slice(m[0].length).replace(/^\s+body(?![\w-])/, '');
        return m[1] ? `:root${m[1]} .${cls}${rest}` : `.${cls}${rest}`;
      }
      if (/^body(?![\w-])/.test(s)) return `.${cls}${s.slice(4)}`;
      return `.${cls} ${s}`;
    });
  });
  return root.toString();
}

export function legacyPages(): Plugin {
  return {
    name: 'steamprofiler-legacy',
    enforce: 'pre',

    resolveId(id) {
      if (id.startsWith(PREFIX)) return VIRTUAL + id.slice(PREFIX.length);
      return null;
    },

    load(id) {
      if (!id.startsWith(VIRTUAL)) return null;
      const name = id.slice(VIRTUAL.length) as LegacyName;
      if (!(LEGACY_PAGES as readonly string[]).includes(name)) {
        this.error(`legacy:${name} is not one of LEGACY_PAGES`);
      }
      const shellPath = resolve(LEGACY_DIR, `${name}.html`);
      this.addWatchFile(shellPath);
      const shell = readShell(name);

      const imports = shell.styles.map((href) => {
        const file = resolve(LEGACY_DIR, '.' + href);
        return UNSCOPED.has(href)
          ? `import ${JSON.stringify(file)};`
          : `import ${JSON.stringify(`${file}?legacy=${name}`)};`;
      });

      const parts: string[] = [];
      for (const src of shell.scripts) {
        if (NOT_CONCATENATED.has(src)) continue;
        const file = resolve(LEGACY_DIR, '.' + src);
        this.addWatchFile(file);
        parts.push(`/* ── ${src} ${'─'.repeat(Math.max(4, 66 - src.length))} */\n${readFileSync(file, 'utf8')}`);
      }

      return [
        `/* GENERATED from ${name}.html and the scripts it loads, by vite-legacy.ts. */`,
        ...imports,
        `export const shell = ${JSON.stringify(shell.body)};`,
        `export const title = ${JSON.stringify(shell.title)};`,
        `export const name = ${JSON.stringify(name)};`,
        'export default function run(__env) {',
        '  const {',
        '    window, document, location, history, addEventListener, removeEventListener,',
        '    setTimeout, setInterval, clearTimeout, clearInterval,',
        '    LOCALES, STORES, MONEY, LANG_NAMES, LANG, locale, store, myMoney, plural, t, ts,',
        '    setLang, applyStatic, langSwitchInto,',
        '  } = __env;',
        parts.join('\n\n'),
        '}',
      ].join('\n');
    },

    transform(code, id) {
      const m = /\.css\?legacy=([a-z-]+)$/.exec(id);
      if (!m) return null;
      return { code: scope(code, `legacy-${m[1]}`), map: null };
    },
  };
}
