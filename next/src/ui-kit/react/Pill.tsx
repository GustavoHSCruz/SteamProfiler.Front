// SteamProfiler.UI 0.1.0 (dacc046). Generated: edit github.com/GustavoHSCruz/SteamProfiler.UI, not this copy.
import type { ComponentProps } from 'react';
import { cx } from './cx';

type Common = {
  size?: 'sm' | 'md' | 'lg';
  /** Marks the current route or the chosen filter in amber. */
  active?: boolean;
  /** A dimmer outline, for pills that sit on a busy bar. */
  quiet?: boolean;
};

export type PillProps = Common & ComponentProps<'a'>;
export type PillButtonProps = Common & ComponentProps<'button'>;

function classes({ size = 'md', quiet, className }: Common & { className?: string }) {
  return cx('sp-pill', size !== 'md' && `sp-pill--${size}`, quiet && 'sp-pill--quiet', className);
}

/** A round, mono, outlined link: header addresses, "open on Steam". */
export function Pill({ size, active, quiet, className, ...rest }: PillProps) {
  return <a aria-current={active ? 'page' : undefined} className={classes({ size, quiet, className })} {...rest} />;
}

/** A pill that does something on the page instead of going somewhere. */
export function PillButton({ size, active, quiet, className, type = 'button', ...rest }: PillButtonProps) {
  return <button type={type} data-on={active ? '1' : undefined} className={classes({ size, quiet, className })} {...rest} />;
}
