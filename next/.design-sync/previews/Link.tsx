import { Link } from 'steamprofiler';

const pill = 'whitespace-nowrap rounded-full border px-3 py-1 no-underline transition-colors';
const on = 'border-amber-d bg-amber/10 text-amber';
const off = 'border-line text-dim hover:border-line-2 hover:text-text';

export function HeaderNav() {
  return (
    <header className="flex h-[42px] items-center justify-between gap-4 border-b border-line bg-ink/80 px-4" style={{ width: 560 }}>
      <Link to="/" className="mono flex items-center gap-2.5 text-[12.5px] font-semibold text-text no-underline">
        <span className="dot" />
        steamprofiler<span className="font-normal text-faint">.org</span>
      </Link>
      <nav className="mono flex items-center gap-1.5 text-[11px]">
        <Link to="/news" className={`${pill} ${on}`}>notícias</Link>
        <Link to="/about" className={`${pill} ${off}`}>sobre</Link>
        <Link to="/status" className={`${pill} ${off}`}>status</Link>
      </nav>
    </header>
  );
}

export function InlineLink() {
  return (
    <div className="p" style={{ width: 360 }}>
      <div className="px-3.5 py-2.5">
        <p className="line-clamp-2 text-[12.5px] leading-snug text-dim">A Promoção de Outono começa hoje, com descontos em milhares de jogos até o dia 30.</p>
        <p className="mono mt-1.5 text-[10px] text-faint">
          Valve Corporation ·{' '}
          <Link to="/news/5812" className="text-dim no-underline hover:text-amber">abrir a publicação</Link>
        </p>
      </div>
    </div>
  );
}
