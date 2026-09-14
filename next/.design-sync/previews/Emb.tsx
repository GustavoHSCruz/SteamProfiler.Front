import { Emb, translator } from 'steamprofiler';

export function Default() {
  return (
    <div style={{ display: 'grid', width: 360, height: 190 }}>
      <Emb t={translator('pt')} onLookup={() => {}} />
    </div>
  );
}
