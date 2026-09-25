import { use } from 'react';
import type { ComponentType } from 'react';

/* A page that is its own chunk, and that can be asked for before it renders.

   React.lazy would split the bundle the same way, but it always suspends on
   its first render, even when the module is already in memory - and the first
   render in a browser is the hydration of a prerendered file, where a suspend
   means React leaves the server markup standing and hydrates it later. So the
   page is fetched before hydrateRoot is called (main.tsx) and before
   renderToString is called (entry-server.tsx), and when it is already here
   this renders it straight through. A page that is not here yet - a link
   followed to somewhere new - suspends on a cached promise and the router's
   transition keeps the old page on screen until it arrives. */
export type Lazy<P> = ComponentType<P> & { preload: () => Promise<void> };

export function lazyPage<P extends object>(load: () => Promise<{ default: ComponentType<P> }>): Lazy<P> {
  let Mod: ComponentType<P> | null = null;
  let pending: Promise<void> | null = null;
  const preload = () => {
    if (Mod) return Promise.resolve();
    pending ??= load().then((m) => { Mod = m.default; }, (err) => { pending = null; throw err; });
    return pending;
  };
  function Page(props: P) {
    if (!Mod) use(preload());
    const M = Mod!;
    return <M {...props} />;
  }
  return Object.assign(Page, { preload });
}
