// SteamProfiler.UI 0.1.0 (dacc046). Generated: edit github.com/GustavoHSCruz/SteamProfiler.UI, not this copy.
import type { ComponentProps } from 'react';
import { cx } from './cx';

export type ButtonVariant = 'neutral' | 'primary' | 'quiet' | 'danger' | 'text';
export type ButtonSize = 'sm' | 'md' | 'lg';

type Common = {
  /** `primary` is the one amber button a screen gets. Default `neutral`. */
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** For `quiet`: marks the chosen one of a row of buttons. */
  pressed?: boolean;
};

export type ButtonProps = Common & ComponentProps<'button'>;
export type ButtonLinkProps = Common & ComponentProps<'a'> & { href: string };

function classes({ variant = 'neutral', size = 'md', className }: Common & { className?: string }) {
  return cx(
    'sp-btn',
    variant !== 'neutral' && `sp-btn--${variant}`,
    size !== 'md' && `sp-btn--${size}`,
    className,
  );
}

/** A button. Neutral by default; `variant="primary"` for the one action that matters. */
export function Button({ variant, size, pressed, className, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      aria-pressed={pressed === undefined ? undefined : pressed}
      className={classes({ variant, size, className })}
      {...rest}
    />
  );
}

/** The same button as an anchor, for actions that are addresses. */
export function ButtonLink({ variant, size, pressed, className, ...rest }: ButtonLinkProps) {
  return <a data-on={pressed ? '1' : undefined} className={classes({ variant, size, className })} {...rest} />;
}
