/* steamprofiler.org - three languages. English is the default; Portuguese and Russian
   are picked up from the browser or chosen in the status bar.

   Loaded before everything else, because number and date formatting depend on
   the active locale and every other file uses them.

   Strings live here and only here - including the ones the API returns, which
   sends stable keys (`arma.terrain.other`, `gmod.props`, …) rather than prose,
   so the server never has to know which language a visitor reads.

   **One dictionary arrives, not three.** `/dict.js` is a different file per
   language, built by SteamProfiler.i18n with English already underneath, and
   the server picks which one to send from the `sp-lang` cookie. A reader in
   Portuguese therefore downloads 48 KB instead of 152, and `t()` has nothing
   to fall back to because the fallback was resolved before the file shipped.

   That is why the choice is written to a cookie as well as to localStorage:
   localStorage is where this file reads it, and the cookie is the only part of
   it the server can see. `DICT_LANG` says which language actually arrived, and
   it is the last word here: when it disagrees with the stored choice, the
   cookie was missing or stale, and the page reloads once to get the right
   file. */

const LOCALES = { en: 'en-US', pt: 'pt-BR', ru: 'ru-RU' };
/* One Steam storefront per language, because Steam prices each region on its
   own: Arma 3 is $29.99 in the US against R$99.99 in Brazil, and no exchange
   rate turns one into the other. So the site does not convert - it asks the
   shop the reader's language belongs to and prints what that shop says.

   The language picker is therefore the currency picker as well. A Brazilian
   reading in English sees dollars, which is the trade for not having a second
   control on the page saying almost the same thing. */
const STORES = { en: 'us', pt: 'br', ru: 'ru' };
/* The money that storefront quotes in, which is also the money a card price is
   approximated into. Only cards need this: every other price on the site
   arrives already in the reader's currency, because it was asked for there. */
const MONEY = { en: 'USD', pt: 'BRL', ru: 'RUB' };
const LANG_NAMES = { en: 'EN', pt: 'PT', ru: 'RU' };
/* The same name in localStorage and in the cookie, because they hold the same
   answer for two different readers: this file, and the server. */
const LANG_KEY = 'sp-lang';
/* A year, renewed on every visit that agrees with it. Lax because the only
   thing it does is choose a file, and a cross-site GET that lands on a page in
   the wrong language is not worth a broken link from a forum. */
const LANG_COOKIE = ';path=/;max-age=31536000;samesite=lax';

/** Stored choice first, then the browser, then English. */
function pickLang() {
  const saved = localStorage.getItem(LANG_KEY);
  if (saved && LOCALES[saved]) return saved;
  for (const tag of navigator.languages || [navigator.language || '']) {
    const code = tag.toLowerCase().slice(0, 2);
    if (code === 'pt') return 'pt';
    if (code === 'ru') return 'ru';
    if (code === 'en') return 'en';
  }
  return 'en';
}

/** What the server will read on the next request. */
function langCookie() {
  const found = document.cookie.match(/(?:^|;\s*)sp-lang=([a-z]{2})/);
  return found ? found[1] : null;
}

let LANG = pickLang();

/* The dictionary that arrived is the only one there is, so when it is not the
   one this reader wants, the file has to be fetched again rather than looked
   up again. That happens once per browser in practice: the cookie is written
   below and renewed on every agreeing visit, and the server falls back to
   Accept-Language when there is no cookie at all, which is the same guess
   pickLang() makes from navigator.languages.

   The session flag is the guard against a loop. Cookies can be refused, and a
   reader whose cookies are refused should read the site in whatever language
   arrived rather than reload forever. */
if (typeof DICT_LANG === 'string' && DICT_LANG !== LANG) {
  const asked = sessionStorage.getItem(LANG_KEY);
  document.cookie = `${LANG_KEY}=${LANG}${LANG_COOKIE}`;
  if (langCookie() === LANG && asked !== LANG) {
    sessionStorage.setItem(LANG_KEY, LANG);
    location.reload();
  } else {
    LANG = DICT_LANG;
  }
} else {
  sessionStorage.removeItem(LANG_KEY);
  document.cookie = `${LANG_KEY}=${LANG}${LANG_COOKIE}`;
}
const locale = () => LOCALES[LANG];
/** The storefront this reader's prices come from. */
const store = () => STORES[LANG] || 'br';
/** The money this reader counts in. */
const myMoney = () => MONEY[LANG] || 'USD';

/** Russian needs three plural forms; English and Portuguese need two. */
function plural(n, forms) {
  if (LANG === 'ru') {
    const m10 = Math.abs(n) % 10, m100 = Math.abs(n) % 100;
    if (m10 === 1 && m100 !== 11) return forms[0];
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return forms[1];
    return forms[2] ?? forms[1];
  }
  return n === 1 ? forms[0] : forms[1];
}

/** Look up a string. `{name}` placeholders are filled from `vars`; a missing key
 *  is the key itself, which makes it obvious. There is no English fallback to
 *  try here: the file that arrived is one language deep and every key it does
 *  not translate is already English in it. */
function t(key, vars) {
  let s = DICT[key];
  if (s == null) return key;
  if (typeof s === 'function') s = s(vars || {});
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  }
  return s;
}

/** Resolve a string the API sent. Those travel as pure keys with parameters -
 *  "@err.rate|n=6", "@pd2.day|name=Rats|n=2" - so the server never guesses a
 *  language. Parameter values that are themselves keys are resolved too. */
function ts(value) {
  if (typeof value !== 'string' || value[0] !== '@') return value;
  const [key, ...pairs] = value.slice(1).split('|');
  const vars = {};
  for (const pair of pairs) {
    const at = pair.indexOf('=');
    if (at > 0) vars[pair.slice(0, at)] = ts(pair.slice(at + 1));
  }
  return t(key, vars);
}

/** Change language: write it where this file reads it, write it where the
 *  server reads it, and reload, which is what fetches the other dictionary. */
function setLang(next) {
  if (!LOCALES[next] || next === LANG) return;
  localStorage.setItem(LANG_KEY, next);
  document.cookie = `${LANG_KEY}=${next}${LANG_COOKIE}`;
  sessionStorage.removeItem(LANG_KEY);
  location.reload();
}

/** Fill every element carrying a translation attribute. Called once on boot. */
function applyStatic(root = document) {
  document.documentElement.lang = locale();
  for (const node of root.querySelectorAll('[data-i18n]')) {
    node.textContent = t(node.dataset.i18n);
  }
  for (const node of root.querySelectorAll('[data-i18n-html]')) {
    node.innerHTML = t(node.dataset.i18nHtml);
  }
  for (const node of root.querySelectorAll('[data-i18n-ph]')) {
    node.placeholder = t(node.dataset.i18nPh);
  }
  for (const node of root.querySelectorAll('[data-i18n-title]')) {
    node.title = t(node.dataset.i18nTitle);
  }
  const title = document.querySelector('[data-i18n-doc]');
  if (title) document.title = t(title.dataset.i18nDoc);
}

/** The language picker, dropped into the status bar of every page. */
function langSwitchInto(node) {
  if (!node) return;
  for (const code of Object.keys(LOCALES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'lang';
    b.textContent = LANG_NAMES[code];
    b.title = t(`lang.${code}`);
    if (code === LANG) b.dataset.on = '1';
    else b.addEventListener('click', () => setLang(code));
    node.append(b);
  }
}
