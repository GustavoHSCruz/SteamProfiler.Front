import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import './styles.css';
import App from './App';
import { boot } from './boot';
import { loadDict, pickLang, servedLang } from './i18n';
import { match } from './routes';

/* The page may already be here.

   A prerendered file arrives with the whole of its text in it, and what this
   does is take it over rather than throw it away: hydrateRoot attaches to the
   markup that was served, so the words a reader is already looking at do not
   blink. That only works in the language the file was rendered in, so that is
   the language the first render uses, and its dictionary is fetched before
   anything renders. When there is nothing to attach to - the dev server - it
   renders from scratch in the reader's own language instead. */
const root = document.getElementById('root')!;
const prerendered = !!root.firstElementChild;

boot.path = window.location.pathname;
boot.lang = (prerendered && servedLang()) || pickLang();

/* The dictionary and the page's own chunk, together: hydrating before the page
   is here would suspend, and React would keep the served markup standing
   instead of taking it over. */
Promise.all([loadDict(boot.lang), (match(boot.path) ?? match('/'))?.route.page.preload()]).then(() => {
  const app = (
    <StrictMode>
      <App />
    </StrictMode>
  );
  if (prerendered) hydrateRoot(root, app);
  else createRoot(root).render(app);
});
