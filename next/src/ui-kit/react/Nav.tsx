// SteamProfiler.UI 0.1.0 (76d7fe3+dirty). Generated: edit github.com/GustavoHSCruz/SteamProfiler.UI, not this copy.
import { cx } from './cx';

export type NavItem<V extends string> = {
  value: V;
  label: string;
  /** Empty or absent draws nothing at all. A badge showing "0" is a number
   *  that has to be read before it can be dismissed. */
  badge?: string;
  badgeTone?: 'accent' | 'bad';
  /** A place that exists but is not ready. Says so rather than hiding. */
  disabled?: boolean;
};

export type NavProps<V extends string> = {
  items: NavItem<V>[];
  value: V;
  onChange: (value: V) => void;
  label: string;
  className?: string;
};

/** A column of places, for a screen that is a console rather than a document. */
export function Nav<V extends string>({ items, value, onChange, label, className }: NavProps<V>) {
  return (
    <nav aria-label={label} className={cx('sp-nav', className)}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          className="sp-nav-item"
          aria-current={item.value === value ? 'page' : undefined}
          aria-disabled={item.disabled || undefined}
          onClick={() => { if (!item.disabled) onChange(item.value); }}
        >
          <span>{item.label}</span>
          <b className="sp-badge" data-tone={item.badgeTone}>{item.badge ?? ''}</b>
        </button>
      ))}
    </nav>
  );
}
