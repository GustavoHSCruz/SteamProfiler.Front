import { Live, translator } from 'steamprofiler';

const sample = { known: { detailed: 48210, catalogue: 131402, houses: 2917, deck: { rated: 18744 } } };

export function FourCounts() {
  return (
    <div style={{ display: 'grid', width: 260, height: 360 }}>
      <Live t={translator('pt')} lang="pt" live={sample} />
    </div>
  );
}

export function TwoCounts() {
  return (
    <div style={{ display: 'grid', width: 260, height: 190 }}>
      <Live t={translator('en')} lang="en" live={{ known: { detailed: 48210, houses: 2917 } }} />
    </div>
  );
}
