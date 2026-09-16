// SteamProfiler.UI 0.1.0 (dacc046). Generated: edit github.com/GustavoHSCruz/SteamProfiler.UI, not this copy.
import type { ComponentProps, ElementType } from 'react';
import { cx } from './cx';

type As<T extends ElementType> = { as?: T } & ComponentProps<T>;

/** The Bricolage headline. Size with the --sp-display-size custom property. */
export function Display<T extends ElementType = 'h1'>({ as, className, ...rest }: As<T>) {
  const Tag = as ?? 'h1';
  return <Tag className={cx('sp-display', className)} {...rest} />;
}

/** The mono uppercase line above a headline. */
export function Eyebrow<T extends ElementType = 'p'>({ as, className, ...rest }: As<T>) {
  const Tag = as ?? 'p';
  return <Tag className={cx('sp-eyebrow', className)} {...rest} />;
}

/** Dim body copy under a headline; <b> inside it goes to full text colour. */
export function Lede<T extends ElementType = 'p'>({ as, className, ...rest }: As<T>) {
  const Tag = as ?? 'p';
  return <Tag className={cx('sp-lede', className)} {...rest} />;
}

/** The 7px amber square. */
export function Dot({ className, ...rest }: ComponentProps<'span'>) {
  return <span aria-hidden className={cx('sp-dot', className)} {...rest} />;
}

/** steamprofiler<span>.org</span>, with the square in front. */
export function Wordmark({ className, children, ...rest }: ComponentProps<'a'>) {
  return (
    <a className={cx('sp-wordmark', className)} {...rest}>
      {children ?? <>steamprofiler<span>.org</span></>}
    </a>
  );
}
