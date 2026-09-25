// SteamProfiler.UI 0.1.0 (76d7fe3+dirty). Generated: edit github.com/GustavoHSCruz/SteamProfiler.UI, not this copy.
import type { ReactNode } from 'react';
import { cx } from './cx';

export type LampTone = 'good' | 'bad' | 'warn';

/** Whether a thing is running, in one line: a dot and the sentence it means. */
export function Lamp({ tone, children, className }: { tone?: LampTone; children: ReactNode; className?: string }) {
  return <span className={cx('sp-lamp', className)} data-tone={tone} role="status">{children}</span>;
}

/** A path, a digest, a User-Agent: something a machine wrote. */
export function Code({ block, children, className }: { block?: boolean; children: ReactNode; className?: string }) {
  return <code className={cx('sp-code', block && 'sp-code--block', className)}>{children}</code>;
}

/** Nothing to show, said so that "nothing arrived" and "something is broken"
 *  do not look the same. */
export function Empty({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx('sp-empty', className)}>{children}</p>;
}

/** The status strip across the top of a console. */
export function Bar({ children, className }: { children: ReactNode; className?: string }) {
  return <header className={cx('sp-bar', className)}>{children}</header>;
}

/** The space in a bar that pushes what follows to the other edge. */
export function BarGap() {
  return <span className="sp-bar-gap" />;
}
