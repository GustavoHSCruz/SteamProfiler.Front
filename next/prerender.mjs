/* Writes a real HTML file for every page and every language.

   This is the one thing the served site does that a single-page app does not
   get for free, and the project cannot ship without it: an assistant asked
   whether steamprofiler.org is safe fetches the page, does not run the
   script, and answers from what is left. Three of them did exactly that, and
   one decided from the silence that the site was phishing. `gen-shell.js`
   was the old answer - English baked into the shells. This is the same
   answer, produced by the same components that run in the browser, so the
   two can no longer drift.

   One file per page per language: `about/index.pt.html`. That is not a URL
   scheme, it is a file name. nginx already chooses `dict.<lang>.js` from the
   `sp-lang` cookie with a map; choosing `index.<lang>.html` from the same
   cookie is the same line of config against the same cookie, so the
   addresses stay clean and a reader in Portuguese gets Portuguese in the
   markup rather than English that corrects itself after the script runs. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const { render, LANGS, ROUTES, translator } = await import('./dist/server/entry-server.js');

/* Every address written to a file, read off the router's own table: a route
   that says it prerenders and is missing here cannot happen, because there is
   no here. The table's `title`, `desc` and `head` are the page's <title>, its
   description and the file in head/ with its canonical and preview. */
const PAGES = ROUTES.flatMap((r) => (r.prerender ?? []).map((path) => ({ path, title: r.title, desc: r.desc, head: r.head, src: r.src })));

/* The rest of each page's head - canonical, the link preview, the structured
   data - is a file per page in head/, read as it is with its comments taken
   out. Those comments explain the tags to whoever edits them; the reader's
   browser has no use for them. */
const headOf = (name) => readFileSync(join('head', `${name}.html`), 'utf8').replace(/<!--[\s\S]*?-->\n?/g, '').trim();

const template = readFileSync('dist/index.html', 'utf8');

/* The dictionary is a chunk of its own and the page cannot hydrate until it
   has arrived, so each file asks for its language's chunk up front instead of
   leaving the browser to find out after the main bundle has run. */
const manifest = JSON.parse(readFileSync('dist/.vite/manifest.json', 'utf8'));
const entry = Object.values(manifest).find((m) => m.isEntry);
const dictChunk = (lang) => manifest[`src/i18n/${lang}.ts`].file;

/* The page's own chunk and whatever it imports that the entry does not
   already carry, for the same reason: hydration waits for the page. */
function pageChunks(src) {
  const out = new Set();
  const walk = (key) => {
    const m = manifest[key];
    if (!m || m === entry || out.has(m.file)) return;
    out.add(m.file);
    for (const dep of m.imports ?? []) walk(dep);
  };
  walk(src);
  return [...out];
}
const strip = (s) => s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

let written = 0;
for (const page of PAGES) {
  for (const lang of LANGS) {
    const t = translator(lang);
    const html = await render(page.path, lang);
    const title = strip(t(page.title));
    const desc = strip(t(page.desc)).slice(0, 300);

    const out = template
      .replace('<html lang="en">', `<html lang="${lang}">`)
      .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
      .replace('</head>', `<meta name="description" content="${esc(desc)}">\n${headOf(page.head)}\n${[dictChunk(lang), ...pageChunks(page.src)].map((f) => `<link rel="modulepreload" crossorigin href="/${f}">`).join('\n')}\n</head>`)
      .replace('<div id="root"></div>', `<div id="root">${html}</div>`);

    const file = join('dist', page.path === '/' ? '' : page.path, `index.${lang}.html`);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, out);
    written += 1;
  }
}
/* The shell, for every address whose page is not a file: a post, and in
   time a game or a profile. Its root is empty on purpose. The words on those
   pages come from the service, and a file prerendered for some other address
   - the list of posts, served for one post - is markup React would have to
   throw away while telling the console it did; an empty root is rendered
   into from scratch instead. What the file does carry is the language, the
   dictionary and the chrome's own chunk, so the page is one round trip from
   drawn. */
let shells = 0;
for (const lang of LANGS) {
  const t = translator(lang);
  const out = template
    .replace('<html lang="en">', `<html lang="${lang}">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(strip(t('land.title')))}</title>`)
    .replace('</head>', `<link rel="modulepreload" crossorigin href="/${dictChunk(lang)}">\n</head>`);
  mkdirSync('dist/shell', { recursive: true });
  writeFileSync(join('dist/shell', `index.${lang}.html`), out);
  shells += 1;
}
console.log(`prerender: ${written} files, ${PAGES.length} pages x ${LANGS.length} languages, and ${shells} shells`);
