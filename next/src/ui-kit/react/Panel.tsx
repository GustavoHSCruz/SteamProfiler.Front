// SteamProfiler.UI 0.1.0 (dacc046). Generated: edit github.com/GustavoHSCruz/SteamProfiler.UI, not this copy.
import type { ComponentProps, ElementType, ReactNode } from 'react';
import { cx } from './cx';

export type PanelProps = {
  title: ReactNode;
  /** The one way out of the panel, at the right of the title bar: a PanelGo, or a router link with className "sp-panel-go". */
  action?: ReactNode;
  /** No body padding, for lists and pictures that run to the edge. */
  tight?: boolean;
  /** No hover ring. */
  still?: boolean;
  /** Hide the amber square before the title. */
  noDot?: boolean;
  as?: ElementType;
  titleAs?: ElementType;
  className?: string;
  bodyClassName?: string;
  children?: ReactNode;
} & Omit<ComponentProps<'section'>, 'title'>;

/** The only container: a mono title bar and a body. */
export function Panel({
  title, action, tight, still, noDot, as: As = 'section', titleAs: Title = 'h2',
  className, bodyClassName, children, ...rest
}: PanelProps) {
  return (
    <As className={cx('sp-panel', still && 'sp-panel--still', className)} {...rest}>
      <div className="sp-panel-bar">
        <Title className="sp-panel-title">
          {noDot ? null : <span className="sp-dot" />}
          <span>{title}</span>
        </Title>
        {action}
      </div>
      <div className={cx('sp-panel-body', tight && 'sp-panel-body--tight', bodyClassName)}>{children}</div>
    </As>
  );
}

export type PanelGoProps = ComponentProps<'a'> & { external?: boolean };

/** A title-bar link. `external` adds the arrow and opens a new tab. */
export function PanelGo({ external, className, ...rest }: PanelGoProps) {
  return (
    <a
      data-external={external ? '' : undefined}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener' : undefined}
      className={cx('sp-panel-go', className)}
      {...rest}
    />
  );
}

/** A title-bar action that is not an address. */
export function PanelAction({ className, type = 'button', ...rest }: ComponentProps<'button'>) {
  return <button type={type} className={cx('sp-panel-go', className)} {...rest} />;
}
