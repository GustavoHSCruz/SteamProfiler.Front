/* Loads the dictionaries the way a browser would, and hands back the shape the
   checks here were written against: { en: {...}, pt: {...}, ru: {...} }.

   The site no longer ships that shape. Since the strings moved to
   SteamProfiler.i18n, `site/dict.<lang>.js` is one language deep, with English
   already merged underneath it, and a reader is served exactly one of them.
   Checking is the one job that still wants all of them at once, which is what
   this file is for.

   Worth knowing when reading a failure: because English is merged into every
   file, a key missing from a translation is not missing here - it is the
   English string. Parity between languages is checked in the i18n repository,
   against the sources, which is the only place it can still be seen. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SITE = path.join(__dirname, '..', 'site');

/** The languages there are, read off disk so that a new one needs no line. */
function languages() {
  return fs.readdirSync(SITE)
    .map((f) => /^dict\.([a-z]{2}(?:-[a-z]{2})?)\.js$/.exec(f))
    .filter(Boolean)
    .map((m) => m[1])
    .sort((a, b) => (a === 'en' ? -1 : b === 'en' ? 1 : a.localeCompare(b)));
}

/** Every language, loaded. plural() is stubbed because it lives in i18n.js and
 *  the function-valued strings only call it when they are rendered. */
function load() {
  const out = {};
  for (const lang of languages()) {
    const ctx = { plural: (n, forms) => forms[0] };
    vm.createContext(ctx);
    vm.runInContext(
      fs.readFileSync(path.join(SITE, `dict.${lang}.js`), 'utf8') + ';globalThis.__D=DICT;',
      ctx);
    out[lang] = ctx.__D;
  }
  return out;
}

module.exports = { load, languages };
