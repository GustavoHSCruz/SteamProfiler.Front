// SteamProfiler.UI 0.1.0 (dacc046). Generated: edit github.com/GustavoHSCruz/SteamProfiler.UI, not this copy.
import type { ComponentProps } from 'react';
import { cx } from './cx';

export type NoticeProps = ComponentProps<'p'> & { tone?: 'neutral' | 'bad' | 'good' | 'accent' };

/** A mono message with a coloured edge: an error under a form, a saved note. */
export function Notice({ tone = 'neutral', className, role, ...rest }: NoticeProps) {
  return (
    <p
      role={role ?? (tone === 'bad' ? 'alert' : undefined)}
      data-tone={tone === 'neutral' ? undefined : tone}
      className={cx('sp-notice', className)}
      {...rest}
    />
  );
}
