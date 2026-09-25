// SteamProfiler.UI 0.1.0 (76d7fe3+dirty). Generated: edit github.com/GustavoHSCruz/SteamProfiler.UI, not this copy.
import { cx } from './cx';

export type MeterProps = {
  label: string;
  value: number;
  /** What the bar is drawn against. The largest value in the set, usually. */
  max: number;
  /** How much the number is worth: a declaration, a guess, or neither. */
  tone?: 'strong' | 'weak';
  className?: string;
};

/** A label, a proportional bar, a number. Deliberately not a chart. */
export function Meter({ label, value, max, tone, className }: MeterProps) {
  // A floor of two percent, so a count of one is a visible mark rather than an
  // empty track that reads as zero.
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className={cx('sp-meter', className)} data-tone={tone}>
      <span title={label}>{label}</span>
      <div className="sp-meter-track">
        <div className="sp-meter-fill" style={{ width: `${pct}%` }} />
      </div>
      <b>{value}</b>
    </div>
  );
}
