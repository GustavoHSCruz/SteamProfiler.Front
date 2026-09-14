import { Panel } from 'steamprofiler';

const frame = { display: 'grid', width: 380, height: 230 } as const;

export function WithRoute() {
  return (
    <div style={frame}>
      <Panel title="Biblioteca" area="a-demo" go="ver tudo" goTo="/library">
        <p className="display text-[2.6rem] leading-none text-amber">1.284</p>
        <p className="mono mt-2 text-[10.5px] leading-relaxed text-faint">jogos na conta, 312 abertos pelo menos uma vez</p>
      </Panel>
    </div>
  );
}

export function ExternalLink() {
  return (
    <div style={frame}>
      <Panel title="Extensão" area="a-demo" go="instalar" goHref="https://steamprofiler.org/extension">
        <h3 className="text-[15px] font-semibold leading-tight tracking-tight">O perfil dentro da própria Steam</h3>
        <p className="mt-2 text-[12.5px] leading-snug text-dim">
          A Companion põe as horas, as franquias e o formato da biblioteca na página de perfil, sem sair da loja.
        </p>
      </Panel>
    </div>
  );
}

export function TightList() {
  return (
    <div style={frame}>
      <Panel title="Mais jogados" area="a-demo" go="abrir" onGo={() => {}} tight>
        <ul className="m-0 flex h-full list-none flex-col p-0">
          {[['Dota 2', '4.812 h'], ['Counter-Strike 2', '1.930 h'], ['Elden Ring', '214 h'], ['Hades', '88 h']].map(([name, hours]) => (
            <li key={name} className="flex flex-1 items-center justify-between border-b border-line px-3.5 last:border-b-0">
              <span className="text-[13px] text-text">{name}</span>
              <span className="mono text-[11px] text-amber">{hours}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
