import { MapPanel, translator } from 'steamprofiler';

const t = translator('pt');

export function Default() {
  return (
    <div style={{ display: 'grid', width: '100%', maxWidth: 520, minHeight: 320 }}>
      <MapPanel t={t} />
    </div>
  );
}
