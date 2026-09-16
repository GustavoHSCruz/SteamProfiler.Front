// SteamProfiler.UI 0.1.0 (dacc046). Generated: edit github.com/GustavoHSCruz/SteamProfiler.UI, not this copy.
import type { ComponentProps } from 'react';
import { cx } from './cx';

export type ChipProps = ComponentProps<'button'> & { pressed?: boolean };

/** A square, filled toggle or filter inside a panel. */
export function Chip({ pressed, className, type = 'button', ...rest }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={pressed === undefined ? undefined : pressed}
      className={cx('sp-chip', className)}
      {...rest}
    />
  );
}
