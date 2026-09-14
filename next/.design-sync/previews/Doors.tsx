import { Doors, translator } from 'steamprofiler';

export function Default() {
  return (
    <div style={{ display: 'grid', width: '100%', maxWidth: 760, minHeight: 360 }}>
      <Doors t={translator('pt')} />
    </div>
  );
}
