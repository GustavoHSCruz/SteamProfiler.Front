import { News, translator } from 'steamprofiler';

export function Unreachable() {
  return (
    <div style={{ display: 'grid', width: 520, height: 340 }}>
      <News t={translator('pt')} lang="pt" />
    </div>
  );
}
