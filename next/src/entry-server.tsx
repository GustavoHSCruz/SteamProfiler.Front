import { renderToString } from 'react-dom/server';
import App from './App';
import { boot } from './boot';
import { LANGS, translator } from './copy';
import type { Lang } from './copy';

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
