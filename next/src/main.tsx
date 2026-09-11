import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import './styles.css';
import App from './App';
import { boot } from './boot';
import { pickLang } from './copy';

/* The page may already be here.

   A prerendered file arrives with the whole of its text in it, and what this
   does is take it over rather than throw it away: hydrateRoot attaches to the
   markup that was served, so the words a reader is already looking at do not
   blink. When there is nothing to attach to - the dev server, or a build with
   the prerender turned off - it renders from scratch instead. */
boot.path = window.location.pathname;
boot.lang = pickLang();

const root = document.getElementById('root')!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

if (root.firstElementChild) hydrateRoot(root, app);
else createRoot(root).render(app);
