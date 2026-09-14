import { Ext, translator } from 'steamprofiler';

export function Default() {
  return (
    <div style={{ display: 'grid', width: '100%', maxWidth: 360, minHeight: 190 }}>
      <Ext t={translator('pt')} />
    </div>
  );
}
