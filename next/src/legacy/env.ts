/* What a page from site/ finds around itself when the app runs it.

   Those pages were written for a document of their own: they look elements up
   by id, add listeners to the window, start timers and never stop them, set
   attributes on <html>, and move to another page by assigning location. All
   of that was harmless when leaving the page threw the document away. In the
   app the document stays, so each run gets its own window, document and
   location that behave the same way and remember what was done through them,
   and leaving the page undoes it:

   - `document.getElementById` and `querySelector` look inside the page first,
     so a callback that lands after the reader has moved on finds nothing to
     write into instead of finding the next page's element with the same id.
   - listeners added through `window` and `document`, and timers started, are
     removed and cleared when the page is left.
   - the attributes the page sets on <html> - the game and franchise themes -
     are put back.
   - `location.assign`, `.replace` and `.href =` go through the router, so a
     page that sends the reader to a profile does it without a reload.

   The i18n half is i18n.js's API over the app's dictionary: the same names,
   the same behaviour, one dictionary instead of two. */

import { LOCALES, MONEY, STORES, resolveApi } from '../i18n';
import type { Lang, T } from '../i18n';
import { navigate } from '../router';
import { pluralFor } from '../i18n/plural';

export type Env = Record<string, unknown>;

type Undo = () => void;

export function createEnv(root: HTMLElement, lang: Lang, t: T, setLang: (l: Lang) => void) {
  const undo: Undo[] = [];
  let alive = true;

  /* ── window ─────────────────────────────────────────────────────── */
  const track = (target: EventTarget) =>
    (type: string, fn: EventListenerOrEventListenerObject, opts?: boolean | AddEventListenerOptions) => {
      target.addEventListener(type, fn, opts);
      undo.push(() => target.removeEventListener(type, fn, opts));
    };

  const timers = new Set<number>();
  const intervals = new Set<number>();
  const setT = (fn: TimerHandler, ms?: number, ...args: unknown[]) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      if (alive) (typeof fn === 'function' ? fn : () => {})(...args);
    }, ms);
    timers.add(id);
    return id;
  };
  const setI = (fn: TimerHandler, ms?: number, ...args: unknown[]) => {
    const id = window.setInterval(() => { if (alive) (typeof fn === 'function' ? fn : () => {})(...args); }, ms);
    intervals.add(id);
    return id;
  };
  const clearT = (id?: number) => { if (id != null) { timers.delete(id); window.clearTimeout(id); } };
  const clearI = (id?: number) => { if (id != null) { intervals.delete(id); window.clearInterval(id); } };
  undo.push(() => {
    for (const id of timers) window.clearTimeout(id);
    for (const id of intervals) window.clearInterval(id);
  });

  /* ── location ───────────────────────────────────────────────────── */
  const go = (to: string, replace = false) => { if (alive) navigate(String(to), { replace }); };
  const loc = new Proxy(window.location, {
    get(target, prop) {
      if (prop === 'assign') return (to: string) => go(to);
      if (prop === 'replace') return (to: string) => go(to, true);
      if (prop === 'reload') return () => target.reload();
      const v = Reflect.get(target, prop, target);
      return typeof v === 'function' ? v.bind(target) : v;
    },
    set(target, prop, value) {
      if (prop === 'href') { go(value); return true; }
      return Reflect.set(target, prop, value, target);
    },
  });

  const win = new Proxy(window, {
    get(target, prop) {
      switch (prop) {
        case 'addEventListener': return track(target);
        case 'setTimeout': return setT;
        case 'setInterval': return setI;
        case 'clearTimeout': return clearT;
        case 'clearInterval': return clearI;
        case 'location': return loc;
        case 'document': return doc;
      }
      const v = Reflect.get(target, prop, target);
      return typeof v === 'function' && !/^[A-Z]/.test(String(prop)) ? v.bind(target) : v;
    },
    set(target, prop, value) {
      if (prop === 'location') { go(value); return true; }
      return Reflect.set(target, prop, value, target);
    },
  });

  /* ── document ───────────────────────────────────────────────────── */
  /* Where lookups land. The page's element while the page is on screen; once
     it has been left, a detached copy of what it was, so a request that
     answers late still finds the element it expects and fills it in where
     nobody can see, instead of throwing on a null in the console. */
  let scope: Element = root;
  const doc = new Proxy(document, {
    get(target, prop) {
      switch (prop) {
        case 'getElementById':
          return (id: string) => scope.querySelector(`#${CSS.escape(id)}`);
        case 'querySelector':
          return (sel: string) => scope.querySelector(sel) ?? (alive ? target.querySelector(sel) : null);
        case 'querySelectorAll':
          return (sel: string) => scope.querySelectorAll(sel);
        case 'addEventListener': return track(target);
        case 'defaultView': return win;
        case 'location': return loc;
      }
      const v = Reflect.get(target, prop, target);
      return typeof v === 'function' ? v.bind(target) : v;
    },
    set(target, prop, value) {
      /* The page names the tab as it learns what it is showing - a
         profile's persona, a game's name - which is the only thing a title
         set by the app's router could not know. Kept, while the page is. */
      if (prop === 'title' && !alive) return true;
      return Reflect.set(target, prop, value, target);
    },
  });

  /* ── <html> ─────────────────────────────────────────────────────── */
  const html = document.documentElement;
  /* Only what the pages set: data-* themes and the franchise tint. `lang` is
     the app's, and the app may change it while this page is being left. */
  const data = () => [...html.attributes].filter((a) => a.name.startsWith('data-'));
  const before = new Map(data().map((a) => [a.name, a.value]));
  const tint = html.style.getPropertyValue('--tint');
  undo.push(() => {
    for (const a of data()) if (!before.has(a.name)) html.removeAttribute(a.name);
    for (const [k, v] of before) if (html.getAttribute(k) !== v) html.setAttribute(k, v);
    if (tint) html.style.setProperty('--tint', tint); else html.style.removeProperty('--tint');
  });

  /* ── i18n.js, over the app's dictionary ─────────────────────────── */
  const plural = pluralFor(lang);
  const ts = (value: unknown) => resolveApi(t, value);
  /** i18n.js filled every data-i18n* element on boot; the shell the app hands
   *  this page is already filled for its language, so this is for what the
   *  page itself inserts later with those attributes on it. */
  const applyStatic = (node: ParentNode = root) => {
    for (const n of node.querySelectorAll<HTMLElement>('[data-i18n]')) n.textContent = t(n.dataset.i18n!);
    for (const n of node.querySelectorAll<HTMLElement>('[data-i18n-html]')) n.innerHTML = t(n.dataset.i18nHtml!);
    for (const n of node.querySelectorAll<HTMLInputElement>('[data-i18n-ph]')) n.placeholder = t(n.dataset.i18nPh!);
    for (const n of node.querySelectorAll<HTMLElement>('[data-i18n-title]')) n.title = t(n.dataset.i18nTitle!);
  };

  const env: Env = {
    window: win,
    document: doc,
    location: loc,
    history: window.history,
    addEventListener: track(window),
    removeEventListener: window.removeEventListener.bind(window),
    setTimeout: setT,
    setInterval: setI,
    clearTimeout: clearT,
    clearInterval: clearI,
    LOCALES,
    STORES,
    MONEY,
    /* i18n.js called them EN, PT, 简; translate.js reads this to label a
       language that has no name of its own in the dictionary. */
    LANG_NAMES: { en: 'EN', pt: 'PT', ru: 'RU', 'zh-cn': '简', 'zh-tw': '繁' },
    LANG: lang,
    locale: () => LOCALES[lang],
    store: () => STORES[lang] || 'br',
    myMoney: () => MONEY[lang] || 'USD',
    plural,
    t: (key: string, vars?: Record<string, string | number>) => t(key, vars),
    ts,
    setLang: (next: string) => setLang(next as Lang),
    applyStatic,
    /* The picker lives in the app's status bar now. */
    langSwitchInto: () => {},
  };

  return {
    env,
    dispose() {
      alive = false;
      scope = root.cloneNode(true) as Element;
      while (undo.length) {
        try { undo.pop()!(); } catch { /* one failed undo must not keep the rest */ }
      }
      /* The franchise screens hand back their own teardown through a global. */
      const w = window as unknown as { __fxExclusiveCleanup?: (() => void) | null };
      try { w.__fxExclusiveCleanup?.(); } catch { /* already gone */ }
      w.__fxExclusiveCleanup = null;
    },
  };
}
