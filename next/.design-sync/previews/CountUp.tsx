import { CountUp } from 'steamprofiler';

export function LiveFigure() {
  return (
    <div className="p" style={{ width: 240 }}>
      <div className="px-3.5 py-3">
        <p className="mono m-0 text-[clamp(1.3rem,1.9vw,1.8rem)] leading-none tracking-tight text-amber">
          <CountUp to={48210} locale="pt-BR" />
        </p>
        <p className="mono mt-1.5 text-[10px] leading-tight text-faint">jogos com página detalhada</p>
      </div>
    </div>
  );
}

export function Display() {
  return (
    <div className="p" style={{ width: 240 }}>
      <div className="px-3.5 py-3">
        <p className="display m-0 text-[clamp(2.6rem,4.4vw,3.6rem)] leading-none text-amber">
          <CountUp to={9310} locale="en-US" />
        </p>
        <p className="mono mt-2 text-[10.5px] leading-relaxed text-faint">hours on record</p>
      </div>
    </div>
  );
}
