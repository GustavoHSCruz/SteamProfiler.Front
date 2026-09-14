import { Rail, translator } from 'steamprofiler';

export function Default() {
  return (
    <div style={{ display: 'grid', width: '100%', maxWidth: 280, height: 440 }}>
      <Rail t={translator('pt')} />
    </div>
  );
}
