/* Fails if a page of the new front would ship as an empty div.

   This is the check that protects the reason the rebuild is allowed to use a
   framework at all. The served tree gets it from gen-shell.js, which bakes
   English into the shells and is verified by `gen-shell.js --check`; next/
   gets it from the prerender, and this is the equivalent gate: every page,
   every language, a real file with the text in it.

   The threshold is deliberately low. It is not measuring whether a page is
   good, it is catching the failure that matters - React rendered nothing and
   the file that shipped is the template with an empty root in it.

   Run from the repo root, after `npm --prefix next run build`:

     node tools/check-prerender.js
*/
const fs = require('fs');
const path = require('path');

const DIST = 'next/dist';
const MIN_TEXT = 400;
const MIN_TEMPLATE_TEXT = 200;

if (!fs.existsSync(DIST)) {
  console.error(`${DIST} is not there: run npm --prefix next run build first`);
  process.exit(1);
}

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (!['assets', 'server', 'shell', '.vite', 'fonts'].includes(entry.name)) walk(full); }
    else if (/^index\.[a-z-]+\.html$/.test(entry.name)) files.push(full);
  }
})(DIST);

/* The link preview and the canonical went missing once already: the pages
   moved here from site/ and their heads did not come with them, so for two
   weeks a link to the home page pasted anywhere arrived with no card. So a
   page written from head/ must have both, and a page still run from a site/
   shell must carry every preview tag, canonical and server-side include that
   shell had - the includes are how /g/ and /blog/ get their title and
   preview per address, and a lost one fails the same way, silently. */
const RECORD = fs.existsSync(path.join(DIST, '.prerender.json'))
  ? new Map(JSON.parse(fs.readFileSync(path.join(DIST, '.prerender.json'), 'utf8')).map((r) => [path.normalize(r.file), r.legacy]))
  : new Map();
const HEAD_TAGS = /<link rel="canonical"[^>]*>|<meta property="og:[^"]+"[^>]*>|<meta name="(?:twitter:[^"]+|robots)"[^>]*>|<!--#include[^>]*-->|<!--og-->/g;

function headGaps(file, html) {
  const legacy = RECORD.get(path.normalize(path.relative('next', file)));
  if (legacy) {
    const shell = fs.readFileSync(path.join('site', `${legacy}.html`), 'utf8');
    const head = shell.slice(0, shell.indexOf('</head>'));
    return (head.match(HEAD_TAGS) ?? []).filter((tag) => !html.includes(tag)).map((tag) => `lost ${tag.slice(0, 60)} from site/${legacy}.html`);
  }
  const out = [];
  /* An include is the api writing the canonical and the preview for this
     one address before nginx sends the file - a post's, a game's. */
  if (html.includes('<!--#include virtual=')) return out;
  /* A template is one file for many addresses, and one canonical for all of
     them would tell a search engine they are the same page. None is right. */
  const template = file.includes(`${path.sep}_t${path.sep}`);
  if (!template && !/<link rel="canonical" href="https:\/\/steamprofiler\.org\/[^"]*">/.test(html)) out.push('no canonical');
  if (!/<meta property="og:title" content="[^"]+">/.test(html)) out.push('no og:title');
  if (!/<meta property="og:image" content="https:[^"]+">/.test(html)) out.push('no og:image');
  return out;
}

const bad = [];
for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  const text = html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (html.includes('<div id="root"></div>')) bad.push(`${file}: the root is empty`);
  /* A template under _t/ is one file for every address of its route, and
     what differs between those addresses - a post, a profile - arrives from
     the service; what it must carry is the chrome and the page's frame. */
  else if (text.length < (file.includes(`${path.sep}_t${path.sep}`) ? MIN_TEMPLATE_TEXT : MIN_TEXT)) bad.push(`${file}: only ${text.length} characters of text`);
  else if (!/<title>[^<]{3,}<\/title>/.test(html)) bad.push(`${file}: no title`);
  else if (!/<html lang="[a-z-]{2,5}"/.test(html)) bad.push(`${file}: no lang on <html>`);
  else for (const missing of headGaps(file, html)) bad.push(`${file}: ${missing}`);
}

/* The shells are the opposite case and are checked for the opposite thing:
   one per language, with an empty root, so the page is rendered and not
   hydrated over somebody else's markup. */
for (const lang of ['en', 'pt', 'ru', 'zh-cn', 'zh-tw']) {
  const file = path.join(DIST, 'shell', `index.${lang}.html`);
  if (!fs.existsSync(file)) bad.push(`${file}: missing`);
  else if (!fs.readFileSync(file, 'utf8').includes('<div id="root"></div>')) bad.push(`${file}: the shell's root is not empty`);
}

if (!files.length) {
  console.error('the prerender wrote nothing');
  process.exit(1);
}
if (bad.length) {
  console.error(`${bad.length} page(s) would ship without their text:`);
  for (const line of bad) console.error(`  ✗ ${line}`);
  process.exit(1);
}
console.log(`prerender ok: ${files.length} files, all with their text, a title, a lang, a canonical and a preview`);
