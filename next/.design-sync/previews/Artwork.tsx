import { Artwork, newDesign } from 'steamprofiler';

const stats = [
  { label: 'JOGOS', value: '1.284' },
  { label: 'HORAS', value: '9.310' },
  { label: 'CONQUISTAS', value: '4.702' },
];

export function Banner() {
  return (
    <div className="duo" style={{ width: '100%', maxWidth: 600 }}>
      <Artwork design={{ ...newDesign('Biblioteca do Gustavo', 'ember'), stats }} />
    </div>
  );
}

export function CardMint() {
  return (
    <div className="duo" style={{ width: '100%', maxWidth: 420 }}>
      <Artwork design={{ ...newDesign('Dez anos de Steam', 'mint'), layout: 'card', stats }} />
    </div>
  );
}

export function SquareViolet() {
  return (
    <div className="duo" style={{ width: '100%', maxWidth: 340 }}>
      <Artwork design={{ ...newDesign('Só estratégia', 'violet'), layout: 'square', stats }} />
    </div>
  );
}

export function SquareIce() {
  return (
    <div className="duo" style={{ width: '100%', maxWidth: 340 }}>
      <Artwork design={{ ...newDesign('Fim de semana', 'ice'), layout: 'square', stats }} />
    </div>
  );
}
