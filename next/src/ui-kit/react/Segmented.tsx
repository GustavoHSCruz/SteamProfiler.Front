// SteamProfiler.UI 0.1.0 (dacc046). Generated: edit github.com/GustavoHSCruz/SteamProfiler.UI, not this copy.
import { cx } from './cx';

export type SegmentedOption<V extends string> = { value: V; label: string };

export type SegmentedProps<V extends string> = {
  options: SegmentedOption<V>[];
  value: V;
  onChange: (value: V) => void;
  /** Read by assistive tech as the group's name. */
  label: string;
  className?: string;
};

/** Two or three choices that change what a whole panel is for. */
export function Segmented<V extends string>({ options, value, onChange, label, className }: SegmentedProps<V>) {
  return (
    <div role="group" aria-label={label} className={cx('sp-seg', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="sp-seg-btn"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
