import type { ComponentType } from 'react';
import { lazyPage } from './lazy';
import type { Lazy } from './lazy';
import type { Lang, T } from './i18n';
import { legacyPage, profileTheme } from './legacy/LegacyPage';

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
  /** The key of the <title>, and of the description, for this address. A
   *  page from site/ that names its own tab has no title here. */
  title?: string;
  desc?: string;
  /** A page from site/, whose <head> - title, description, preview, and the
   *  server-side includes some of them carry - is read out of its shell. */
  legacy?: string;
  /** One address to render, written as a single file that nginx serves for
   *  every address the route matches: the page's markup does not depend on
   *  which one it is, only its data does. */
  template?: string;
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
    name: 'news-post', test: /^\/news\/(?<id>[^/]+)$/, title: 'n.news_title', desc: 'n.news_lede', head: 'news', src: 'src/news.tsx',
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

  {
    name: 'support', test: /^\/support\/?$/, title: 'sup.title', desc: 'sup.meta', head: 'support', prerender: ['/support'], src: 'src/pages/Support.tsx',
    page: lazyPage(() => import('./pages/Support')),
  },
  {
    name: 'feedback', test: /^\/feedback\/?$/, title: 'msg.title', desc: 'msg.meta', head: 'feedback', prerender: ['/feedback'], src: 'src/pages/Feedback.tsx',
    page: lazyPage(() => import('./pages/Feedback')),
  },
  {
    name: 'blog', test: /^\/blog\/?$/, title: 'blog.title', head: 'blog', prerender: ['/blog'], src: 'src/pages/Blog.tsx',
    page: lazyPage(() => import('./pages/Blog')),
  },
  {
    name: 'post', test: /^\/blog\/[a-z0-9][a-z0-9-]{0,79}(?:\/[a-z0-9][a-z0-9-]{0,79})?$/, title: 'blog.title', head: 'post', template: '/blog/x', src: 'src/pages/Post.tsx',
    page: lazyPage(() => import('./pages/Post')),
  },
  {
    name: 'extension', test: /^\/extension\/?$/, title: 'ext.doc', head: 'extension', prerender: ['/extension'], src: 'src/pages/Extension.tsx',
    page: lazyPage(() => import('./pages/Extension')),
  },
  {
    name: 'translate', test: /^\/translate\/?$/, title: 'tr.title', head: 'translate', prerender: ['/translate'], src: 'src/pages/Translate.tsx',
    page: lazyPage(() => import('./pages/Translate')),
  },
  {
    name: 'publishers', test: /^\/publishers(?:\/[a-z0-9][a-z0-9-]{0,39})?$/, title: 'hs.pub_doc', head: 'publishers', prerender: ['/publishers'], template: '/publishers/x', src: 'src/pages/Houses.tsx',
    page: lazyPage(() => import('./pages/Houses')),
  },
  {
    name: 'developers', test: /^\/developers(?:\/[a-z0-9][a-z0-9-]{0,39})?$/, title: 'hs.dev_doc', head: 'developers', prerender: ['/developers'], template: '/developers/x', src: 'src/pages/Houses.tsx',
    page: lazyPage(() => import('./pages/Houses')),
  },
  /* ── Pages from site/, run by the legacy engine until they are rewritten ── */
  {
    name: 'profile', test: /^\/u\/[^/]+(?:\/.*)?$/, legacy: 'profile', template: '/u/_', src: 'legacy:profile',
    page: legacyPage(() => import('legacy:profile'), profileTheme),
  },
  {
    name: 'game-public', test: /^\/g\/\d{1,8}$/, legacy: 'game-public', title: 'gp.doc', template: '/g/0', src: 'legacy:game-public',
    page: legacyPage(() => import('legacy:game-public'), profileTheme),
  },
  {
    name: 'franchises', test: /^\/franchises(?:\/[a-z0-9][a-z0-9-]{0,39})?$/, legacy: 'franchises', title: 'fx.doc', prerender: ['/franchises'], src: 'legacy:franchises',
    page: legacyPage(() => import('legacy:franchises')),
  },
  {
    name: 'terms', test: /^\/terms\/?$/, legacy: 'terms', title: 'tos.title', prerender: ['/terms'], src: 'legacy:terms',
    page: legacyPage(() => import('legacy:terms')),
  },
  {
    name: 'terms-history', test: /^\/terms\/history\/?$/, legacy: 'terms-history', title: 'tos.archive_title', prerender: ['/terms/history'], src: 'legacy:terms-history',
    page: legacyPage(() => import('legacy:terms-history')),
  },
  {
    name: 'policy-history', test: /^\/privacy\/history\/?$/, legacy: 'policy-history', title: 'pol.title', prerender: ['/privacy/history'], src: 'legacy:policy-history',
    page: legacyPage(() => import('legacy:policy-history')),
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
