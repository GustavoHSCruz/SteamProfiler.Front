import { renderToString } from 'react-dom/server';
import App from './App';
import { boot } from './boot';
import { LANGS, provideDict, translator } from './i18n';
import type { Dict, Lang } from './i18n';
import en from './i18n/en';
import pt from './i18n/pt';
import ru from './i18n/ru';
import zhCn from './i18n/zh-cn';
import zhTw from './i18n/zh-tw';

/* The build machine renders every language, so it holds every dictionary;
   the browser is sent one. */
const ALL: Record<Lang, Dict> = { en, pt, ru, 'zh-cn': zhCn, 'zh-tw': zhTw };
for (const l of LANGS) provideDict(l, ALL[l]);

/* Called once per page and per language by prerender.mjs. There is no
   request here and there will not be one in production either: this runs on
   the build machine and its output is a file nginx serves. */
export function render(path: string, lang: Lang) {
  boot.path = path;
  boot.lang = lang;
  return renderToString(<App />);
}

/* Re-exported so the prerender has one module to load rather than two, and
   so the list of languages it walks is the same list the picker offers. */
export { LANGS, translator };
