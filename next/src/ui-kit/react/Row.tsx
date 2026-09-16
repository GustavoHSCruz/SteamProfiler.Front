// SteamProfiler.UI 0.1.0 (dacc046). Generated: edit github.com/GustavoHSCruz/SteamProfiler.UI, not this copy.
import type { ComponentProps, ReactNode } from 'react';
import { cx } from './cx';

export type RowProps = ComponentProps<'a'> & { lead?: ReactNode; on?: boolean };

/** A list line that is a link: a mono lead (date, count), then the title. */
export function Row({ lead, on, className, children, ...rest }: RowProps) {
  return (
    <a data-on={on ? '1' : undefined} className={cx('sp-row', className)} {...rest}>
      {lead !== undefined ? <b>{lead}</b> : null}
      {children}
    </a>
  );
}
