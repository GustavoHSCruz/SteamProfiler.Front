#!/usr/bin/env node
/* The featured franchise pages are intentionally separate implementations, not
 * palettes on one implementation. Keep that architectural promise testable:
 * every editorial slug must own a CSS/JS pair, register itself, contain its
 * own animation and respect reduced motion. */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const site = path.join(root, 'site');
const source = fs.readFileSync(path.join(site, 'franchise-list.js'), 'utf8');
const renderer = fs.readFileSync(path.join(site, 'franchises.js'), 'utf8');
const slugs = [...source.matchAll(/\bslug:\s*'([a-z0-9-]+)'/g)].map((match) => match[1]);
const failures = [];

if (slugs.length !== 11) failures.push(`expected 11 franchise slugs, found ${slugs.length}`);
if (new Set(slugs).size !== slugs.length) failures.push('franchise slugs are not unique');
if (/cls:\s*'[^']*\bnote\b/.test(renderer)) {
  failures.push('franchise renderer contains explanatory note copy');
}

for (const slug of slugs) {
  const base = path.join(site, 'franchises', slug);
  const cssPath = `${base}.css`;
  const jsPath = `${base}.js`;
  if (!fs.existsSync(cssPath)) failures.push(`${slug}: missing CSS`);
  if (!fs.existsSync(jsPath)) failures.push(`${slug}: missing JS`);
  if (!fs.existsSync(cssPath) || !fs.existsSync(jsPath)) continue;

  const css = fs.readFileSync(cssPath, 'utf8');
  const js = fs.readFileSync(jsPath, 'utf8');
  if (!css.includes(`data-franchise="${slug}"`)) failures.push(`${slug}: CSS is not rooted in its slug`);
  if (!/@keyframes\s+fx[a-z]/.test(css)) failures.push(`${slug}: no exclusive keyframe animation`);
  if (!css.includes('prefers-reduced-motion:no-preference') &&
      !css.includes('prefers-reduced-motion: no-preference')) {
    failures.push(`${slug}: CSS does not guard motion`);
  }
  // A generic franchise class at the beginning of a selector would leak out
  // of this theme file. Unique scene classes use `.fxhl-`, `.fxcs-`, etc. and
  // therefore cannot match this deliberately hyphenated prefix.
  if (/(?:^|[},])\s*\.fx-(?:hero|line|track|dot|sig|shelf|row|act|stand|band)/m.test(css)) {
    failures.push(`${slug}: contains an unscoped shared selector`);
  }
  if (!js.includes(`register('${slug}'`)) failures.push(`${slug}: JS registers a different slug`);
  if (!js.includes('prefers-reduced-motion: reduce')) failures.push(`${slug}: JS ignores reduced motion`);
}

for (const shell of ['franchises.html', 'profile.html']) {
  const html = fs.readFileSync(path.join(site, shell), 'utf8');
  if (!html.includes('/franchises/exclusive-loader.js')) failures.push(`${shell}: exclusive loader is absent`);
}

if (failures.length) {
  for (const failure of failures) console.error(`franchise exclusive: ${failure}`);
  process.exit(1);
}
console.log(`franchise exclusives ok: ${slugs.length} isolated CSS/JS pairs`);
