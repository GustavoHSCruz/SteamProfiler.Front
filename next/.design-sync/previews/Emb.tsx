import { Emb, translator } from 'steamprofiler';

export function Default() {
  return (
    <div style={{ display: 'grid', width: '100%', maxWidth: 360, minHeight: 190 }}>
      <Emb t={translator('pt')} onLookup={() => {}} />
    </div>
  );
}
