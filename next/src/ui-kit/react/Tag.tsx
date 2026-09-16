// SteamProfiler.UI 0.1.0 (dacc046). Generated: edit github.com/GustavoHSCruz/SteamProfiler.UI, not this copy.
import type { ComponentProps } from 'react';
import { cx } from './cx';

export type TagTone = 'neutral' | 'accent' | 'good' | 'bad' | 'info' | 'violet' | 'muted' | 'alert';
export type TagProps = ComponentProps<'span'> & { tone?: TagTone };

/** A status label. Never clickable. */
export function Tag({ tone = 'neutral', className, ...rest }: TagProps) {
  return <span data-tone={tone === 'neutral' ? undefined : tone} className={cx('sp-tag', className)} {...rest} />;
}
