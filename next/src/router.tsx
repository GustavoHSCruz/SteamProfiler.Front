import { useCallback, useEffect, useState } from 'react';
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react';
import { boot, SERVER } from './boot';

/* Three addresses and the History API. A router library would be four times
   its weight and would earn it on the fifth route, which this prototype does
   not have:

     /           the bench
     /news       the feed
     /news/<id>  one post

   The served site does the same thing in router.js for everything under
   /u/<profile>, so a path that is read rather than mapped is the convention
   here as well as the cheap answer. */

export function usePath() {
  /* boot.path is the address bar in a browser and the page being
     prerendered on the build machine. */
  const [path, setPath] = useState(() => boot.path);

  useEffect(() => {
    /* The first paint came from boot.path, which on a prerendered page is
       whatever file nginx served. If the reader arrived somewhere else in the
       meantime - a back button during hydration - this catches it up. */
    setPath(window.location.pathname);
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    /* Our own pushes do not fire popstate, so navigate() announces them. */
    window.addEventListener('sp:navigate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('sp:navigate', onPop);
    };
  }, []);

  return path;
}

export function navigate(to: string) {
  if (SERVER || to === window.location.pathname) return;
  window.history.pushState(null, '', to);
  window.dispatchEvent(new Event('sp:navigate'));
  window.scrollTo(0, 0);
}

/** A real anchor, with the click intercepted. Middle-click, ctrl-click and
 *  "open in new tab" all have to keep working, which is the whole reason
 *  this is an <a> with an href and not a button pretending to be one. */
export function Link({ to, className, children, title, ...rest }: {
  to: string;
  className?: string;
  children: ReactNode;
  title?: string;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick' | 'className' | 'title'>) {
  const onClick = useCallback((e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to);
  }, [to]);

  return <a href={to} className={className} title={title} onClick={onClick} {...rest}>{children}</a>;
}
