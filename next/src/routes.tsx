import type { ComponentType } from 'react';
import { lazyPage } from './lazy';
import type { Lazy } from './lazy';
import type { Lang, T } from './i18n';

/* Every address this front draws, in one table.

   A path that matches nothing here is not this front's: the router lets the
   browser go there the ordinary way, and nginx answers it from site/ for as
   long as site/ still has pages in it. So porting a page is three lines -
   a row here, a location in nginx.conf, and the page itself - and a link to a
   page that has not been ported yet still works, it just loads.

   `prerender` lists the addresses written to a file at build time. A page
   whose address carries an id (a post, a game) is not one of them: its words
   arrive from the service, and its file is the page's shell. */

export type PageProps = { t: T; lang: Lang; path: string; params: Record<string, string> };

export type Route = {
  name: string;
  test: RegExp;
  page: Lazy<PageProps>;
  /** The key of the <title>, and of the description, for this address. */
  title: string;
  desc: string;
  /** head/<name>.html, the canonical and the preview. */
  head?: string;
  /** The module the page lives in, as Vite's manifest names it, so its
   *  prerendered file can ask for that chunk before the script asks. */
  src: string;
  prerender?: string[];
};

const adapt = <P extends object>(load: () => Promise<ComponentType<P>>, props: (p: PageProps) => P) =>
  lazyPage<PageProps>(() => load().then((C) => ({ default: (p: PageProps) => <C {...props(p)} /> })));

export const ROUTES: Route[] = [
  {
    name: 'home', test: /^\/$/, title: 'land.title', desc: 'land.meta', head: 'home', prerender: ['/'], src: 'src/pages/Home.tsx',
    page: lazyPage(() => import('./pages/Home')),
  },
  {
    name: 'news', test: /^\/news\/?$/, title: 'n.news_title', desc: 'n.news_lede', head: 'news', prerender: ['/news'], src: 'src/news.tsx',
    page: adapt(() => import('./news').then((m) => m.NewsPage), (p) => ({ t: p.t, lang: p.lang })),
  },
  {
    name: 'post', test: /^\/news\/(?<id>[^/]+)$/, title: 'n.news_title', desc: 'n.news_lede', head: 'news', src: 'src/news.tsx',
    page: adapt(() => import('./news').then((m) => m.PostPage), (p) => ({ t: p.t, lang: p.lang, id: p.params.id })),
  },
  {
    name: 'privacy', test: /^\/privacy\/?$/, title: 'priv.title', desc: 'priv.lede', head: 'privacy', prerender: ['/privacy'], src: 'src/pages-view.tsx',
    page: adapt(() => import('./pages-view').then((m) => m.PrivacyPage), (p) => ({ t: p.t })),
  },
  {
    name: 'about', test: /^\/about\/?$/, title: 'abt.title', desc: 'abt.lede', head: 'about', prerender: ['/about'], src: 'src/pages-view.tsx',
    page: adapt(() => import('./pages-view').then((m) => m.AboutPage), (p) => ({ t: p.t })),
  },
  {
    name: 'status', test: /^\/status\/?$/, title: 'st.title', desc: 'st.lede', head: 'status', prerender: ['/status'], src: 'src/pages-view.tsx',
    page: adapt(() => import('./pages-view').then((m) => m.StatusPage), (p) => ({ t: p.t, lang: p.lang })),
  },
];

export function match(path: string): { route: Route; params: Record<string, string> } | null {
  for (const route of ROUTES) {
    const m = route.test.exec(path);
    if (m) {
      const params: Record<string, string> = {};
      for (const [k, v] of Object.entries(m.groups ?? {})) {
        try { params[k] = decodeURIComponent(v); } catch { params[k] = v; }
      }
      return { route, params };
    }
  }
  return null;
}

/** Whether a link to this address can be followed without leaving the app. */
export const isRouted = (path: string) => match(path) !== null;
