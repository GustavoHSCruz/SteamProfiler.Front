// SteamProfiler.UI 0.1.0 (76d7fe3+dirty). Generated: edit github.com/GustavoHSCruz/SteamProfiler.UI, not this copy.
import type { ReactNode } from 'react';
import { cx } from './cx';

export type TableProps = {
  /** Column headings, in order. */
  columns: string[];
  /** Which column carries the sentence rather than a measurement, and so takes
   *  the room the others do not need. */
  wideColumn?: number;
  children: ReactNode;
  /** A ceiling, so a long table scrolls inside its panel instead of running
   *  the page. */
  maxHeight?: number;
  className?: string;
};

/** Rows read against each other: sticky head, tabular numbers. */
export function Table({ columns, wideColumn, children, maxHeight, className }: TableProps) {
  return (
    <div className={cx('sp-table-wrap', className)} style={maxHeight ? { maxHeight } : undefined}>
      <table className="sp-table">
        <thead>
          <tr>
            {columns.map((name, i) => (
              <th key={name} scope="col" className={i === wideColumn ? 'sp-table-wide' : undefined}>
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
