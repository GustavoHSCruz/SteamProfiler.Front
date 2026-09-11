/* What the app knows before it renders, on either side.

   In the browser this is the address bar and the stored language. On the
   build machine, where there is no address bar and no storage, the prerender
   sets it per page before calling renderToString - which is the whole trick
   that lets the same components produce a file with the text already in it.

   A module holding two values rather than a context: every component that
   needs them reads them once, at first render, and after that the browser is
   the source of truth. A context would make that a prop drill through nine
   panels to say something neither of them can change. */
import type { Lang } from './copy';

export const SERVER = typeof window === 'undefined';

export const boot: { path: string; lang: Lang } = {
  path: SERVER ? '/' : window.location.pathname,
  lang: 'en',
};
