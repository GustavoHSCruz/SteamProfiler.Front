/* Fails if the site would open in the wrong language, or open twice.

   The dictionary is one file per language now, chosen by the server from the
   `sp-lang` cookie, and that moved a decision that used to be free into the
   boot: the file that arrives may not be the file this reader wants. i18n.js
   answers that by writing the cookie and reloading once, and every way that
   can go wrong is silent - a reader who reloads forever, a reader stuck in
   English, a reader served Russian for a Portuguese choice. None of it throws,
   so none of it shows up in a syntax check.

   So the four paths are walked here against a stub browser: the first visit
   the server guessed right, the stale cookie, the settled visit, and the
   browser that refuses cookies, which is the one that must not loop.

   Run: node tools/check-language-boot.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SITE = path.join(__dirname, '..', 'site');

/** Boot a page: the dictionary the server chose to send, then i18n.js, in a
 *  context holding just enough browser for them to run. */
function boot({ served, saved, languages, cookies = {}, cookiesWork = true }) {
  const store = saved ? { 'sp-lang': saved } : {};
  const session = {};
  let reloaded = 0;
  const ctx = {
    navigator: { languages },
    localStorage: {
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => { store[k] = v; },
      removeItem: (k) => { delete store[k]; },
    },
    sessionStorage: {
      getItem: (k) => session[k] ?? null,
      setItem: (k, v) => { session[k] = v; },
      removeItem: (k) => { delete session[k]; },
    },
    location: { reload: () => { reloaded += 1; } },
    document: {
      documentElement: {},
      get cookie() {
        return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
      },
      set cookie(value) {
        if (!cookiesWork) return;   // a browser set to refuse them says nothing
        const [name, v] = value.split(';')[0].split('=');
        cookies[name] = v;
      },
      querySelector: () => null,
      querySelectorAll: () => [],
    },
    console,
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(SITE, `dict.${served}.js`), 'utf8'), ctx);
  /* `let` at the top of a script is not a property of the global object, so the
     values have to be handed out from inside the context. */
  vm.runInContext(fs.readFileSync(path.join(SITE, 'i18n.js'), 'utf8')
    + ';globalThis.__OUT={lang:LANG,t};', ctx);
  return { reloaded, cookie: cookies['sp-lang'], ...ctx.__OUT };
}

const fail = [];
const check = (name, cond) => { if (!cond) fail.push(name); };

// The common first visit: no cookie yet, and the server guessed from
// Accept-Language exactly what pickLang() is about to decide.
let r = boot({ served: 'pt', saved: null, languages: ['pt-BR', 'pt'] });
check('a first visit in Portuguese reloads when it should not', r.reloaded === 0);
check('a first visit does not settle on the language it was served', r.lang === 'pt');
check('a first visit does not leave the cookie behind', r.cookie === 'pt');
check('the Portuguese dictionary did not answer', r.t('nav.about') !== 'nav.about');

// Chinese must keep its script variant: a generic or mainland tag chooses
// Simplified, while Taiwan, Hong Kong, Macao and Hant choose Traditional.
r = boot({ served: 'zh-cn', saved: null, languages: ['zh-CN', 'zh'] });
check('a Simplified Chinese first visit reloads', r.reloaded === 0);
check('a Simplified Chinese first visit chose the wrong variant', r.lang === 'zh-cn');
check('the Simplified Chinese dictionary did not answer', /[一-鿿]/.test(r.t('nav.about')));

r = boot({ served: 'zh-tw', saved: null, languages: ['zh-Hant-TW', 'zh'] });
check('a Traditional Chinese first visit reloads', r.reloaded === 0);
check('a Traditional Chinese first visit chose the wrong variant', r.lang === 'zh-tw');
check('the Traditional Chinese dictionary did not answer', /[一-鿿]/.test(r.t('nav.about')));

// A reader who chose Russian in the status bar, whose cookie was cleared.
r = boot({ served: 'en', saved: 'ru', languages: ['pt-BR'] });
check('a stale cookie does not fetch the right dictionary', r.reloaded === 1);
check('a stale cookie is not rewritten', r.cookie === 'ru');

// The same reader a moment later, with the cookie in place.
r = boot({ served: 'ru', saved: 'ru', languages: ['pt-BR'], cookies: { 'sp-lang': 'ru' } });
check('a settled visit reloads again', r.reloaded === 0);
check('a settled visit is not in Russian', /[Ѐ-ӿ]/.test(r.t('nav.about')));
check('plural() is not reached through the served file',
  /[Ѐ-ӿ]/.test(r.t('cd.cards', { n: '3', raw: 3 })));
check('a key nothing translates should come back as itself',
  r.t('no.such.key') === 'no.such.key');

// Cookies refused. This is the one that must not loop: there is no way to ask
// for another file, so the reader reads what arrived.
r = boot({ served: 'en', saved: 'ru', languages: ['ru'], cookiesWork: false });
check('a browser refusing cookies is sent into a reload loop', r.reloaded === 0);
check('a browser refusing cookies does not read what it was given', r.lang === 'en');

if (fail.length) {
  console.error(fail.join('\n'));
  process.exit(1);
}
console.log('language boot ok: served, stale, settled and cookie-less all land right');
