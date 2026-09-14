import { MapPanel, translator } from 'steamprofiler';

const t = translator('pt');

export function Default() {
  return (
    <div style={{ display: 'grid', width: 520, height: 320 }}>
      <MapPanel t={t} />
    </div>
  );
}
