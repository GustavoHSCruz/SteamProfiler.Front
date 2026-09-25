import type { ReactNode } from 'react';
import { Panel } from './ui-kit/react';

/** The small word at the right of a title bar, the way the policy cards
 *  carry theirs: text, not a chip, so every bar keeps the same height. */
export function BarNote({ children }: { children: ReactNode }) {
  return <b className="shrink-0 font-medium normal-case tracking-normal text-faint">{children}</b>;
}

/* The shape every page of prose on this site takes: what it is about in a
   panel on the right that stays in view, and the page itself down the left.
   On a narrow screen the panel comes first, because the headline is what a
   reader arriving from a link needs before anything under it. */
export function Sheet({ eyebrow, h1, lede, side, children }: {
  eyebrow: string;
  /** Markup too: some headlines break where the writer chose. */
  h1: string;
  /** Markup from the dictionary: <b> and <a> are part of these sentences. */
  lede?: string;
  side?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="feedgrid sheet">
      <div className="stick grid gap-[var(--gap)]">
        <Panel title={eyebrow}>
          <h1 className="sp-display text-[clamp(1.5rem,2.2vw,2rem)]" dangerouslySetInnerHTML={{ __html: h1 }} />
          {lede && <div className="mt-3"><p className="policy-p text-[13px] leading-snug" dangerouslySetInnerHTML={{ __html: lede }} /></div>}
          {side}
        </Panel>
      </div>
      <div className="grid min-w-0 content-start gap-[var(--gap)]">{children}</div>
    </main>
  );
}
