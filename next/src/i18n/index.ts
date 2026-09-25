/* The languages, and the one dictionary a reader is sent.

   The strings are not written here. `en.ts`, `pt.ts` and the rest are built
   by SteamProfiler.i18n from the same lines as the served site's
   dict.<lang>.js, English underneath, so a key a language has not translated
   arrives as English and the two fronts cannot say different things while
   both are served.

   Each dictionary is its own chunk. The browser loads the one for the
   language the page was prerendered in before it hydrates, and a second one
   only if the reader switches; the build machine, which renders every
   language, loads all five through entry-server. */

import type { Dict, Vars } from './plural';

export type Lang = 'en' | 'pt' | 'ru' | 'zh-cn' | 'zh-tw';
export type { Dict, Vars };

export const LANGS: Lang[] = ['en', 'pt', 'ru', 'zh-cn', 'zh-tw'];

/** What each language calls itself, which is the only name worth putting in
 *  a picker: a reader who needs the Russian one is not looking for the word
 *  "Russian" written in English. */
export const LANG_NAMES: Record<Lang, string> = {
  en: 'English',
  pt: 'Português',
  ru: 'Русский',
  'zh-cn': '简体中文',
  'zh-tw': '繁體中文',
};

/** What Intl should format numbers and dates in. Not the same string as the
 *  language code: the site writes `pt`, the platform wants `pt-BR`. */
export const LOCALES: Record<Lang, string> = {
  en: 'en-US',
  pt: 'pt-BR',
  ru: 'ru-RU',
  'zh-cn': 'zh-CN',
  'zh-tw': 'zh-TW',
};

/* One Steam storefront per language, because Steam prices each region on its
   own and no exchange rate turns one into the other. The language picker is
   therefore the currency picker as well - the same trade the served site
   makes in i18n.js. */
export const STORES: Record<Lang, string> = { en: 'us', pt: 'br', ru: 'ru', 'zh-cn': 'cn', 'zh-tw': 'tw' };
export const MONEY: Record<Lang, string> = { en: 'USD', pt: 'BRL', ru: 'RUB', 'zh-cn': 'CNY', 'zh-tw': 'TWD' };

const isLang = (x: unknown): x is Lang => typeof x === 'string' && (LANGS as string[]).includes(x);

/** Stored choice first, then the browser, then English - the same guess the
 *  server makes from Accept-Language, in the same order, so a reader who has
 *  never chosen gets the same language from the file nginx picks and from the
 *  script once it runs. */
export function pickLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = localStorage.getItem('sp-lang');
    if (isLang(saved)) return saved;
  } catch { /* storage refused: fall through to the browser */ }
  for (const raw of navigator.languages ?? [navigator.language ?? '']) {
    const tag = raw.toLowerCase().replaceAll('_', '-');
    if (tag.startsWith('zh-hant') || /^zh-(tw|hk|mo)(?:-|$)/.test(tag)) return 'zh-tw';
    if (tag === 'zh' || tag.startsWith('zh-')) return 'zh-cn';
    const code = tag.slice(0, 2);
    if (code === 'pt') return 'pt';
    if (code === 'ru') return 'ru';
    if (code === 'en') return 'en';
  }
  return 'en';
}

/** The language the served file was rendered in. Hydrating in any other one
 *  would make React throw away the markup the reader is already looking at,
 *  so this wins over pickLang() for the first paint. */
export function servedLang(): Lang | null {
  if (typeof document === 'undefined') return null;
  const l = document.documentElement.getAttribute('lang');
  return isLang(l) ? l : null;
}

const CHUNKS: Record<Lang, () => Promise<{ default: Dict }>> = {
  en: () => import('./en'),
  pt: () => import('./pt'),
  ru: () => import('./ru'),
  'zh-cn': () => import('./zh-cn'),
  'zh-tw': () => import('./zh-tw'),
};

const loaded = new Map<Lang, Dict>();

export async function loadDict(lang: Lang): Promise<Dict> {
  const have = loaded.get(lang);
  if (have) return have;
  const dict = (await CHUNKS[lang]()).default;
  loaded.set(lang, dict);
  return dict;
}

/** For the build machine, which has every dictionary already imported. */
export function provideDict(lang: Lang, dict: Dict) {
  loaded.set(lang, dict);
}

export function dictFor(lang: Lang): Dict {
  const d = loaded.get(lang);
  if (!d) throw new Error(`dictionary for ${lang} was not loaded`);
  return d;
}

/** `{name}` placeholders are filled from `vars`; a missing key is the key
 *  itself, which is the failure mode that gets noticed. */
export function translator(lang: Lang) {
  const dict = dictFor(lang);
  const t = (key: string, vars?: Vars): string => {
    let s = dict[key];
    if (s == null) return key;
    if (typeof s === 'function') s = s(vars ?? {});
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };
  return t;
}

export type T = ReturnType<typeof translator>;

/** Resolve a string the API sent. Those travel as keys with parameters -
 *  "@err.rate|n=6" - so the server never guesses a language, and a
 *  parameter that is itself a key is resolved too. Anything else is shown
 *  as it came. */
export function resolveApi(t: T, value: unknown): string {
  if (typeof value !== 'string' || value[0] !== '@') return String(value ?? '');
  const [key, ...pairs] = value.slice(1).split('|');
  const vars: Vars = {};
  for (const pair of pairs) {
    const at = pair.indexOf('=');
    if (at > 0) vars[pair.slice(0, at)] = resolveApi(t, pair.slice(at + 1));
  }
  return t(key, vars);
}
