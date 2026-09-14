import { Treemap } from 'steamprofiler';

export function Wide() {
  return (
    <div className="relative overflow-hidden rounded-[10px] border border-line bg-[#0b0a10]" style={{ width: '100%', maxWidth: 520, height: 240 }}>
      <Treemap stagger={false} />
    </div>
  );
}

export function Square() {
  return (
    <div className="relative overflow-hidden rounded-[10px] border border-line bg-[#0b0a10]" style={{ width: '100%', maxWidth: 280, height: 280 }}>
      <Treemap stagger={false} />
    </div>
  );
}
