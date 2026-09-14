import { Parts, translator } from 'steamprofiler';

export function Default() {
  return (
    <div style={{ display: 'grid', width: '100%' }}>
      <Parts t={translator('pt')} />
    </div>
  );
}
