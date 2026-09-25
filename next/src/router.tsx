import { startTransition, useCallback, useEffect, useState } from 'react';
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react';
import { boot, SERVER } from './boot';
import { isRouted } from './routes';

/* The address bar and the History API, and the table in routes.tsx deciding
   which addresses are ours. A router library would be four times its weight
   and would buy nothing the table does not already say.

   Every change of address happens inside a transition. The page being left
   stays on screen, interactive, until the next one has its chunk and has
   rendered, and then the two swap in one frame - which is the difference
   between moving through the site and watching it reload. */

export function usePath() {
  /* boot.path is the address bar in a browser and the page being
     prerendered on the build machine. */
  const [path, setPath] = useState(() => boot.path);

  useEffect(() => {
    /* The first paint came from boot.path, which on a prerendered page is
       whatever file nginx served. If the reader arrived somewhere else in the
       meantime - a back button during hydration - this catches it up. */
    setPath(window.location.pathname);
    const onMove = () => startTransition(() => setPath(window.location.pathname));
    window.addEventListener('popstate', onMove);
    /* Our own pushes do not fire popstate, so navigate() announces them. */
    window.addEventListener('sp:navigate', onMove);
    return () => {
      window.removeEventListener('popstate', onMove);
      window.removeEventListener('sp:navigate', onMove);
    };
  }, []);

  return path;
}

/* The page the reader was on before this one, inside the site. A full load
   has document.referrer for that; a route change does not change it. */
let previous: string | null = null;

/** Where the reader came from on this site, or null for an arrival from
 *  somewhere else. A bug report is most useful with this attached. */
export function cameFrom(): string | null {
  if (previous) return previous;
  if (typeof document === 'undefined' || !document.referrer) return null;
  try {
    const ref = new URL(document.referrer);
    return ref.origin === window.location.origin ? ref.pathname : null;
  } catch {
    return null;
  }
}

/** Go somewhere. An address this front draws is a route change; any other
 *  is an ordinary page load, because nginx still answers it from site/. */
export function navigate(to: string, { replace = false } = {}) {
  if (SERVER) return;
  const url = new URL(to, window.location.href);
  if (url.origin !== window.location.origin || !isRouted(url.pathname)) {
    if (replace) window.location.replace(url.href);
    else window.location.assign(url.href);
    return;
  }
  if (url.pathname + url.search + url.hash === window.location.pathname + window.location.search + window.location.hash) return;
  if (!replace) previous = window.location.pathname;
  if (replace) window.history.replaceState(null, '', url.href);
  else window.history.pushState(null, '', url.href);
  window.dispatchEvent(new Event('sp:navigate'));
  if (!replace) window.scrollTo(0, 0);
}

/** A real anchor, with the click intercepted when the address is ours.
 *  Middle-click, ctrl-click and "open in new tab" all have to keep working,
 *  which is the whole reason this is an <a> with an href and not a button
 *  pretending to be one. */
export function Link({ to, className, children, title, ...rest }: {
  to: string;
  className?: string;
  children: ReactNode;
  title?: string;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick' | 'className' | 'title'>) {
  const onClick = useCallback((e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const url = new URL(to, window.location.href);
    if (url.origin !== window.location.origin || !isRouted(url.pathname)) return;
    e.preventDefault();
    navigate(to);
  }, [to]);

  return <a href={to} className={className} title={title} onClick={onClick} {...rest}>{children}</a>;
}

/** Every plain <a href> on the page to an address the app draws is followed
 *  without a reload - the ones React renders, the ones in a policy's text,
 *  and the ones the pages from site/ build with h(). Listened for on the way
 *  back up, so a handler that already dealt with a click and said so with
 *  preventDefault wins, and so does anything asking for a new tab, a
 *  download or a jump within the same page. */
export function useLinkCapture() {
  useEffect(() => {
    const onClick = (e: globalThis.MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || !isRouted(url.pathname)) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return;
      e.preventDefault();
      navigate(url.pathname + url.search + url.hash);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
}
