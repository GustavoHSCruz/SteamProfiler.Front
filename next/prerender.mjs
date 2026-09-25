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
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const { render, LANGS, translator } = await import('./dist/server/entry-server.js');

/* Every address this front answers itself, with the keys its <title> and its
   description are written in. A route missing from here is a route that
   ships as an empty div, so this list is the checklist. */
const PAGES = [
  { path: '/', title: 'land.title', desc: 'land.meta', head: 'home' },
  { path: '/news', title: 'n.news_title', desc: 'n.news_lede', head: 'news' },
  { path: '/privacy', title: 'priv.title', desc: 'priv.lede', head: 'privacy' },
  { path: '/about', title: 'abt.title', desc: 'abt.lede', head: 'about' },
  { path: '/status', title: 'st.title', desc: 'st.lede', head: 'status' },
];

/* The rest of each page's head - canonical, the link preview, the structured
   data - is a file per page in head/, read as it is with its comments taken
   out. Those comments explain the tags to whoever edits them; the reader's
   browser has no use for them. */
const headOf = (name) => readFileSync(join('head', `${name}.html`), 'utf8').replace(/<!--[\s\S]*?-->\n?/g, '').trim();

const template = readFileSync('dist/index.html', 'utf8');

/* The dictionary is a chunk of its own and the page cannot hydrate until it
   has arrived, so each file asks for its language's chunk up front instead of
   leaving the browser to find out after the main bundle has run. */
const chunks = readdirSync('dist/assets');
const dictChunk = (lang) => chunks.find((f) => f.startsWith(`${lang}-`) && f.endsWith('.js'));
const strip = (s) => s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

let written = 0;
for (const page of PAGES) {
  for (const lang of LANGS) {
    const t = translator(lang);
    const html = render(page.path, lang);
    const title = strip(t(page.title));
    const desc = strip(t(page.desc)).slice(0, 300);

    const out = template
      .replace('<html lang="en">', `<html lang="${lang}">`)
      .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
      .replace('</head>', `<meta name="description" content="${esc(desc)}">\n${headOf(page.head)}\n<link rel="modulepreload" crossorigin href="/assets/${dictChunk(lang)}">\n</head>`)
      .replace('<div id="root"></div>', `<div id="root">${html}</div>`);

    const file = join('dist', page.path === '/' ? '' : page.path, `index.${lang}.html`);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, out);
    written += 1;
  }
}
console.log(`prerender: ${written} files, ${PAGES.length} pages x ${LANGS.length} languages`);
