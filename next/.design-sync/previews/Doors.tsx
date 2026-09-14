import { Doors, translator } from 'steamprofiler';

export function Default() {
  return (
    <div style={{ display: 'grid', width: 760, height: 360 }}>
      <Doors t={translator('pt')} />
    </div>
  );
}
