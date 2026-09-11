import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { animate, useInView } from 'motion/react';
import { DEMO_SHAPE, squarify } from './data';
import { Link } from './router';

/* ── The panel ────────────────────────────────────────────────────────
   The only container on this page. A title bar that says what the panel is
   and, at its right, the one way out of it; a body; and nothing else. Nine
   of these tiled is the whole layout. */
export function Panel({ title, area, go, goHref, goTo, onGo, tight, children }: {
  title: string;
  area: string;
  go?: string;
  /** An address off this site. Gets the arrow and a new tab. */
  goHref?: string;
  /** A route on this site. Gets neither. */
  goTo?: string;
  onGo?: () => void;
  tight?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`p ${area}`}>
      <div className="p-bar">
        <h2 className="m-0 flex items-center gap-2.5 overflow-hidden font-[inherit] text-[inherit] font-medium tracking-[inherit]">
          <span className="dot shrink-0" />
          <span className="truncate">{title}</span>
        </h2>
        {go && goHref && <a className="p-go" href={goHref} target="_blank" rel="noopener">{go} ↗</a>}
        {go && goTo && <Link to={goTo} className="p-go">{go}</Link>}
        {go && !goHref && !goTo && <button type="button" className="p-go" onClick={onGo}>{go}</button>}
      </div>
      <div className={`p-body ${tight ? 'p-tight' : ''}`}>{children}</div>
    </section>
  );
}

/* A figure that counts up to itself the first time it is seen. The four
   numbers from the service are the only part of this screen that is
   different tomorrow, and a figure that lands rather than appears is the
   cheapest way to say so. */
export function CountUp({ to, locale }: { to: number; locale: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true });
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!seen) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(to); return; }
    const run = animate(0, to, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setShown(Math.round(v)),
    });
    return () => run.stop();
  }, [seen, to]);
  return <span ref={ref}>{shown.toLocaleString(locale)}</span>;
}

/* ── The map ──────────────────────────────────────────────────────────
   Laid out against the size the panel actually got, and laid out again when
   that size changes, because squarify decides which rectangle sits beside
   which from the aspect ratio it is handed: a treemap computed for the
   wrong shape is a different picture, not the same picture stretched.

   Seventy-two divs and no canvas. It is drawn once and then only answers
   the pointer, and a canvas would buy nothing for that except a second way
   for the page to fail. */
const TOP = DEMO_SHAPE[0];

export function Treemap({ stagger = true }: { stagger?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<[number, number]>([0, 0]);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize(([w, h]) => (Math.abs(w - width) < 1 && Math.abs(h - height) < 1 ? [w, h] : [width, height]));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [w, h] = size;
  const rects = w > 0 && h > 0 ? squarify(DEMO_SHAPE, 0, 0, w, h) : [];
  const still = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="map" ref={box} aria-hidden>
      {rects.map((r, i) => (
        <div
          key={i}
          className="cell"
          style={{
            left: `${(r.x / w) * 100}%`,
            top: `${(r.y / h) * 100}%`,
            width: `${(r.w / w) * 100}%`,
            height: `${(r.h / h) * 100}%`,
            /* The served site's ramp, three quarters of the way up: amber at
               full strength across a whole panel stops being a colour. */
            background: `rgba(255, 180, 84, ${(0.15 + 0.66 * Math.pow(r.value / TOP, 0.42)).toFixed(3)})`,
            /* Biggest first, capped, and only on the first draw. A relayout
               is somebody resizing a window they are already looking at, and
               replaying the reveal at every step of that is the page
               flinching rather than the page arriving. */
            animation: stagger && !still ? `cell-in 320ms ${Math.min(i * 7, 260)}ms both cubic-bezier(.2,.7,.3,1)` : undefined,
          }}
        />
      ))}
    </div>
  );
}

/* ── A style the browser applies, not the markup ──────────────────────
   The site is served with `style-src 'self'` and no 'unsafe-inline', which
   blocks a `style=` attribute outright. That is fine for a page whose HTML
   is written by hand and it is not fine for one rendered by React, because
   `style={{...}}` is serialised into exactly that attribute on the server.
   The failure is quiet and it was real: the franchise plates arrived with
   `style="--tint:#ff9b21"` in the DOM, the policy refused it, getComputedStyle
   came back empty, and hydration did not put it back - React trusts the
   attribute it already sees.

   So anything whose value is computed rather than written is applied here
   instead, through the CSSOM, which the same policy allows. The element
   ships without the attribute, a reader with no JavaScript sees the layout
   without that one colour or that one width, and the browser paints it in on
   mount.

   `paint` is a map from a child index to the properties that child needs, so
   one effect dresses a whole list: a hook cannot be called inside a loop, and
   a component per bar would be a component per bar. */
export function usePainted<T extends HTMLElement>(
  paint: Record<number, Record<string, string>>,
  deps: unknown[] = [],
) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const box = ref.current;
    if (!box) return;
    for (const [index, css] of Object.entries(paint)) {
      const child = box.children[Number(index)] as HTMLElement | undefined;
      if (!child) continue;
      for (const [prop, value] of Object.entries(css)) child.style.setProperty(prop, value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}
