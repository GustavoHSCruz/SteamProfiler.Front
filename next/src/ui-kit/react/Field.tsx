// SteamProfiler.UI 0.1.0 (dacc046+dirty). Generated: edit github.com/GustavoHSCruz/SteamProfiler.UI, not this copy.
import { useId } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { cx } from './cx';

export type FieldProps = {
  label: ReactNode;
  /** Quiet text after the label, e.g. "optional". */
  labelHint?: ReactNode;
  /** Mono line under the control. */
  hint?: ReactNode;
  /** Receives the id the label points at. */
  children: (id: string) => ReactNode;
  className?: string;
};

/** A label, one control and an optional hint, stacked. */
export function Field({ label, labelHint, hint, children, className }: FieldProps) {
  const id = useId();
  return (
    <div className={cx('sp-field', className)}>
      <label className="sp-label" htmlFor={id}>
        {label}
        {labelHint ? <> <em>{labelHint}</em></> : null}
      </label>
      {children(id)}
      {hint ? <p className="sp-hint">{hint}</p> : null}
    </div>
  );
}

export type InputProps = Omit<ComponentProps<'input'>, 'size'> & { mono?: boolean; size?: 'md' | 'lg' };

export function Input({ mono, size = 'md', className, ...rest }: InputProps) {
  return <input className={cx('sp-input', mono && 'sp-input--mono', size === 'lg' && 'sp-input--lg', className)} {...rest} />;
}

export function Textarea({ className, ...rest }: ComponentProps<'textarea'>) {
  return <textarea className={cx('sp-textarea', className)} {...rest} />;
}

export type SelectProps = ComponentProps<'select'> & { /** The small round one a bar of pills holds. */ pill?: boolean };

export function Select({ pill, className, ...rest }: SelectProps) {
  return <select className={cx('sp-select', pill && 'sp-select--pill', className)} {...rest} />;
}

export function Hint({ className, ...rest }: ComponentProps<'p'>) {
  return <p className={cx('sp-hint', className)} {...rest} />;
}
