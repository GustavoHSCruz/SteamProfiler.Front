/* steamprofiler.org - three languages. English is the default; Portuguese and Russian
   are picked up from the browser or chosen in the status bar.

   Loaded before everything else, because number and date formatting depend on
   the active locale and every other file uses them.

   Strings live here and only here - including the ones the API returns, which
   sends stable keys (`arma.terrain.other`, `gmod.props`, …) rather than prose,
   so the server never has to know which language a visitor reads. */

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
const LANG_KEY = 'sp-lang';

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

let LANG = pickLang();
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
 *  falls back to English and then to the key itself, which makes it obvious. */
function t(key, vars) {
  let s = DICT[LANG]?.[key];
  if (s == null) s = DICT.en[key];
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

function setLang(next) {
  if (!LOCALES[next] || next === LANG) return;
  localStorage.setItem(LANG_KEY, next);
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
