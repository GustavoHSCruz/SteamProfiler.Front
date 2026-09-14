import { News, translator } from 'steamprofiler';

export function Unreachable() {
  return (
    <div style={{ display: 'grid', width: '100%', maxWidth: 520, minHeight: 340 }}>
      <News t={translator('pt')} lang="pt" />
    </div>
  );
}
