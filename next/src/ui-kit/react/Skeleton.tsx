// SteamProfiler.UI 0.1.0 (dacc046). Generated: edit github.com/GustavoHSCruz/SteamProfiler.UI, not this copy.
import type { ComponentProps } from 'react';
import { cx } from './cx';

/** A pulsing bar that holds the place of text still on its way. */
export function Skeleton({ className, ...rest }: ComponentProps<'span'>) {
  return <span aria-hidden className={cx('sp-skeleton', className)} {...rest} />;
}
