import { Ext, translator } from 'steamprofiler';

export function Default() {
  return (
    <div style={{ display: 'grid', width: 360, height: 190 }}>
      <Ext t={translator('pt')} />
    </div>
  );
}
