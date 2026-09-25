/* Fails if the app's own stylesheet and a site/ stylesheet style the same
   class name.

   The pages from site/ run inside the app with their stylesheets scoped
   under `.legacy-<page>` (next/vite-legacy.ts), which keeps their rules off
   the app's pages. It does nothing for the other direction: a rule in
   next/src/styles.css reaches into a legacy page like into any other part
   of the document. That happened once - the bench's treemap and the
   profile's treemap were both `.map .cell`, and every small cell on a
   profile grew the bench's hairline border. So the two sets of names must
   not meet. `sp-*` is the design system, shared on purpose.

     node tools/check-legacy-css.js
*/
const fs = require('fs');
const path = require('path');

function classes(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = new Set();
  for (const m of css.matchAll(/([^{}@;]+)\{/g)) {
    /* A class named inside :has() is looked for, not styled: the app may ask
       whether a site/ page is showing something without dressing it. */
    const styled = m[1].replace(/:has\([^)]*\)/g, '');
    for (const c of styled.matchAll(/\.([a-zA-Z_][\w-]*)/g)) out.add(c[1]);
  }
  return out;
}

/* Every stylesheet the app ships except the design system's own copy. */
const app = new Set();
const walkApp = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'ui-kit') walkApp(full); }
    else if (e.name.endsWith('.css')) for (const c of classes(fs.readFileSync(full, 'utf8'))) app.add(c);
  }
};
walkApp('next/src');
const legacy = new Set();
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'fonts') walk(full); }
    else if (e.name.endsWith('.css')) for (const c of classes(fs.readFileSync(full, 'utf8'))) legacy.add(c);
  }
};
walk('site');

const shared = [...app].filter((c) => legacy.has(c) && !c.startsWith('sp-')).sort();
if (shared.length) {
  console.error(`next/src and site/ both style: ${shared.map((c) => '.' + c).join(' ')}`);
  console.error('rename the one in next/src; the site/ page would wear it too');
  process.exit(1);
}
console.log(`no class shared between the app and ${legacy.size} site/ classes`);
