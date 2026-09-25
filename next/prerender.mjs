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
   no here. A route with a `template` is rendered once, at that address, into
   _t/<name>/, and nginx serves that one file for every address it matches. */
/* A name is a folder under _t/ and a line in nginx.conf; two routes with
   one name would write each other's template. */
const names = ROUTES.map((r) => r.name);
const twice = names.filter((n, i) => names.indexOf(n) !== i);
if (twice.length) throw new Error(`prerender: route name used twice: ${twice.join(', ')}`);

/* And every address written must be one its own route answers: an address
   that falls through to the bench writes the bench into another page's file,
   and the browser then hydrates the wrong page over it. */
for (const r of ROUTES) {
  for (const path of [...(r.prerender ?? []), ...(r.template ? [r.template] : [])]) {
    if (!r.test.test(path)) throw new Error(`prerender: ${r.name} would write ${path}, which it does not match`);
  }
}

const PAGES = ROUTES.flatMap((r) => [
  ...(r.prerender ?? []).map((path) => ({ route: r, path, file: path === '/' ? '' : path })),
  ...(r.template ? [{ route: r, path: r.template, file: `_t/${r.name}` }] : []),
]);

/* The rest of each page's head - canonical, the link preview, the structured
   data - is a file per page in head/, read as it is with its comments taken
   out. Those comments explain the tags to whoever edits them; the reader's
   browser has no use for them. */
const headOf = (name) => readFileSync(join('head', `${name}.html`), 'utf8').replace(/<!--(?!#|og-->)[\s\S]*?-->\n?/g, '').trim();

/* A page from site/ keeps the head its shell had: the description, the robots
   line, the preview, and the server-side includes three of them carry - the
   game's title and description on /g/, a post's on /blog/, the profile's
   preview and the game's theme on /u/. What goes is what the app's own
   template already has or replaces: charset, viewport, icons, fonts,
   stylesheets and scripts. The title is the shell's, in this language. */
const LEGACY_DIR = '../site';
function legacyHead(name, t) {
  const html = readFileSync(join(LEGACY_DIR, `${name}.html`), 'utf8');
  let head = html.slice(html.indexOf('<head>') + 6, html.indexOf('</head>'));
  head = head
    .replace(/<!--(?!#|og-->)[\s\S]*?-->/g, '')
    .replace(/<script\b[\s\S]*?<\/script>/g, (m) => (m.includes('application/ld+json') ? m : ''))
    .replace(/<meta (charset|name="viewport"|name="color-scheme"|name="theme-color")[^>]*>/g, '')
    .replace(/<link rel="(stylesheet|preload|icon|apple-touch-icon|manifest)"[^>]*>/g, '')
    .replace(/<title( data-i18n-doc="([^"]+)")?>([^<]*)<\/title>/, (_, a, key, text) => `<title>${esc(strip(key ? t(key) : text))}</title>`);
  return head.split('\n').map((l) => l.trim()).filter(Boolean).join('\n');
}

const template = readFileSync('dist/index.html', 'utf8');

/* The dictionary is a chunk of its own and the page cannot hydrate until it
   has arrived, so each file asks for its language's chunk up front instead of
   leaving the browser to find out after the main bundle has run. */
const manifest = JSON.parse(readFileSync('dist/.vite/manifest.json', 'utf8'));
const entry = Object.values(manifest).find((m) => m.isEntry);
const dictChunk = (lang) => manifest[`src/i18n/${lang}.ts`].file;

/* The page's own chunk and whatever it imports that the entry does not
   already carry, for the same reason: hydration waits for the page. Its
   stylesheets too, as <link>s, so the served markup is drawn styled rather
   than drawn and then restyled when the script gets round to it. */
function pageAssets(src) {
  const js = new Set(), css = new Set();
  const walk = (key) => {
    const m = manifest[key];
    if (!m || m === entry || js.has(m.file)) return;
    js.add(m.file);
    for (const c of m.css ?? []) css.add(c);
    for (const dep of m.imports ?? []) walk(dep);
  };
  walk(src);
  if (!manifest[src]) throw new Error(`prerender: ${src} is not in the manifest`);
  return { js: [...js], css: [...css] };
}

const strip = (s) => s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

let written = 0;
/* What was written from what, for tools/check-prerender.js. */
const record = [];
for (const page of PAGES) {
  const r = page.route;
  const { js, css } = pageAssets(r.src);
  for (const lang of LANGS) {
    const t = translator(lang);
    const html = await render(page.path, lang);
    const preload = [dictChunk(lang), ...js].map((f) => `<link rel="modulepreload" crossorigin href="/${f}">`);
    const styles = css.map((f) => `<link rel="stylesheet" href="/${f}">`);

    let out = template.replace('<html lang="en">', `<html lang="${lang}">`);
    let head;
    if (r.legacy) {
      out = out.replace(/<title>[^<]*<\/title>\n?/, '');
      head = legacyHead(r.legacy, t);
    } else if (headOf(r.head).includes('{{title}}')) {
      /* A head whose order matters writes its own <title>, and says where. */
      out = out.replace(/<title>[^<]*<\/title>\n?/, '');
      head = headOf(r.head).replace('{{title}}', esc(strip(t(r.title))));
    } else {
      out = out.replace(/<title>[^<]*<\/title>/, `<title>${esc(strip(t(r.title)))}</title>`);
      /* No `desc` on the route: the description is a line in its head file,
         which is how the pages lifted from site/ carried it. */
      head = [r.desc ? `<meta name="description" content="${esc(strip(t(r.desc)).slice(0, 300))}">` : '', headOf(r.head)].filter(Boolean).join('\n');
    }
    out = out
      .replace('</head>', `${head}\n${[...styles, ...preload].join('\n')}\n</head>`)
      .replace('<div id="root"></div>', `<div id="root">${html}</div>`);

    const file = join('dist', page.file, `index.${lang}.html`);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, out);
    record.push({ file, legacy: r.legacy ?? null });
    written += 1;
  }
}
writeFileSync('dist/.prerender.json', JSON.stringify(record, null, 1));

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
