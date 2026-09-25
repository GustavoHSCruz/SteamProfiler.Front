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
    for (const c of m[1].matchAll(/\.([a-zA-Z_][\w-]*)/g)) out.add(c[1]);
  }
  return out;
}

const app = classes(fs.readFileSync('next/src/styles.css', 'utf8'));
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
  console.error(`next/src/styles.css and site/ both style: ${shared.map((c) => '.' + c).join(' ')}`);
  console.error('rename the one in next/src/styles.css; the site/ page would wear it too');
  process.exit(1);
}
console.log(`no class shared between the app and ${legacy.size} site/ classes`);
