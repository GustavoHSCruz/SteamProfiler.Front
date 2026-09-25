import { useLayoutEffect, useMemo, useRef } from 'react';
import type { ComponentType } from 'react';
import { lazyPage } from '../lazy';
import type { Lazy } from '../lazy';
import type { PageProps } from '../routes';
import { createEnv } from './env';
import type { Env } from './env';
import { translateShell } from './shell';

/* A page from site/, run inside the app. See vite-legacy.ts for how it is
   built and env.ts for what it is given.

   The markup is the page's own shell in the reader's language, set as HTML
   and never diffed by React: from the moment the page's code runs, that
   subtree is the page's, exactly as the document used to be. Every change of
   address or language runs the page again from a fresh shell, which is what a
   reload used to do, minus the reload. */

export type LegacyModule = {
  default: (env: Env) => void;
  shell: string;
  title: string | null;
  name: string;
};

type Prepare = (path: string) => Promise<void> | void;

function LegacyPage({ mod, prepare, t, lang, path }: PageProps & { mod: LegacyModule; prepare?: Prepare }) {
  const ref = useRef<HTMLDivElement>(null);
  const html = useMemo(() => translateShell(mod.shell, t), [mod, t]);
  const ran = useRef(false);

  useLayoutEffect(() => {
    const root = ref.current!;
    /* The first run takes the markup that was served, or that React just set;
       every run after it starts from a clean shell, because the last run
       filled this one in. */
    if (ran.current) root.innerHTML = html;
    ran.current = true;

    const { env, dispose } = createEnv(root, lang, t, (next) => {
      window.dispatchEvent(new CustomEvent('sp:lang', { detail: next }));
    });

    let left = false;
    const start = () => {
      if (left) return;
      try {
        mod.default(env);
      } catch (err) {
        console.error(`legacy:${mod.name}`, err);
      }
    };
    /* Whatever the page expected the server to have put in the document
       before it ran - see profileTheme() - is fetched first when it is not
       there. Most runs have nothing to wait for and start in this frame. */
    const ready = prepare?.(path);
    if (ready) ready.catch(() => {}).then(start);
    else start();

    return () => { left = true; dispose(); };
    // `html` is left out on purpose: it changes with `t`, and `lang` already
    // runs the page again when the language does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mod, path, lang]);

  return <div ref={ref} className={`legacy legacy-${mod.name}`} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function legacyPage(load: () => Promise<LegacyModule>, prepare?: Prepare): Lazy<PageProps> {
  return lazyPage<PageProps>(() => load().then((mod) => {
    const Page: ComponentType<PageProps> = (p) => <LegacyPage mod={mod} prepare={prepare} {...p} />;
    return { default: Page };
  }));
}

/* ── /u/<who>/<appid> and /g/<appid> ──────────────────────────────────
   nginx puts <meta name="sp-game"> in the head of those addresses, from an
   include that asks the api which theme the game has, and boot.js reads it
   to draw the wait screen in the game's colours from the first frame. A
   page reached by a link inside the app never went through nginx, so the
   meta is whatever the first page left - another game's, or none. This asks
   the same question the include asks, before the page runs. */
const GAME_PATH = /^\/(?:u\/[^/]+|g)\/(\d{1,8})$/;
let themedFor = typeof window === 'undefined' ? null : GAME_PATH.exec(window.location.pathname)?.[1] ?? null;

export function profileTheme(path: string): Promise<void> | void {
  const appid = GAME_PATH.exec(path)?.[1] ?? null;
  if (appid === themedFor) return;
  themedFor = appid;
  const set = (name: string | null) => {
    let meta = document.head.querySelector<HTMLMetaElement>('meta[name="sp-game"]');
    if (!name) { meta?.remove(); return; }
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'sp-game';
      document.head.append(meta);
    }
    meta.content = name;
  };
  if (!appid) { set(null); return; }
  return fetch(`/api/game/theme?appid=${appid}`)
    .then((r) => (r.ok ? r.text() : ''))
    .then((html) => set(/name="sp-game" content="([a-z0-9-]+)"/.exec(html)?.[1] ?? null))
    .catch(() => set(null));
}
