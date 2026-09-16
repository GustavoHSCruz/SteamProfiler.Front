// SteamProfiler.UI 0.1.0 (dacc046). Generated: edit github.com/GustavoHSCruz/SteamProfiler.UI, not this copy.
import type { ComponentProps, ReactNode } from 'react';
import { cx } from './cx';

export type StatProps = { value: ReactNode; label: ReactNode; display?: boolean } & Omit<ComponentProps<'div'>, 'children'>;

/** A number in amber and what it counts, in mono under it. */
export function Stat({ value, label, display, className, ...rest }: StatProps) {
  return (
    <div className={cx('sp-stat', display && 'sp-stat--display', className)} {...rest}>
      <p className="sp-stat-value">{value}</p>
      <p className="sp-stat-label">{label}</p>
    </div>
  );
}
