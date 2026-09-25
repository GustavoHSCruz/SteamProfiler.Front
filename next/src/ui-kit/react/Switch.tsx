// SteamProfiler.UI 0.1.0 (76d7fe3+dirty). Generated: edit github.com/GustavoHSCruz/SteamProfiler.UI, not this copy.
import { cx } from './cx';

export type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** What the setting is. Kept inside the component on purpose: a switch whose
   *  meaning lives in a paragraph two lines up is one that gets flipped by
   *  mistake. */
  label: string;
  /** What turning it off actually costs. Worth writing every time. */
  note?: string;
  disabled?: boolean;
  className?: string;
};

/** A setting that is on or off, and takes effect where it is. */
export function Switch({ checked, onChange, label, note, disabled, className }: SwitchProps) {
  return (
    <label className={cx('sp-switch', className)}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.currentTarget.checked)}
      />
      <span className="sp-switch-track" aria-hidden="true">
        <span className="sp-switch-thumb" />
      </span>
      <span className="sp-switch-text">
        <span className="sp-switch-name">{label}</span>
        {note ? <span className="sp-switch-note">{note}</span> : null}
      </span>
    </label>
  );
}
