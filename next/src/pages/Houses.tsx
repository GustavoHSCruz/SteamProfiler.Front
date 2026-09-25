import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from '../router';
import { ApiError, apiGet, formats } from '../lib';
import type { Lang, T } from '../i18n';
import type { PageProps } from '../routes';
/* The house screens keep the stylesheet they were drawn with, scoped the way
   every page from site/ is (see vite-legacy.ts): the markup below is the same
   classes houses.js builds, and those rules are the design. */
import '../../../site/style.css?legacy=houses';
import '../../../site/houses.css?legacy=houses';

/* /publishers and /developers, and one house on either axis, with nobody
   attached.

   Publisher and developer are not two views of one list. Valve published
   Garry's Mod and Facepunch made it, so it is on the first shelf and not on
   the second - which is why there are two addresses rather than a toggle.

   There are ninety thousand companies on Steam and a browser has no business
   holding all of them to show sixty: the list, the filtering and the paging
   belong to the api, and what arrives is the answer rather than the material
   to work it out from. */

const PAGE = 60;
/* How many rows a shelf shows before the filter earns its place. */
const FILTER_AT = 24;
const HEADER_ART = 'https://cdn.cloudflare.steamstatic.com/steam/apps';

type Axis = 'publishers' | 'developers';
const AXES: Record<Axis, { title: string; kicker: string; lede: string; shelf: string }> = {
  publishers: { title: 'hs.pub_title', kicker: 'hs.pub_kicker', lede: 'hs.pub_lede', shelf: 'hs.pub_shelf' },
  developers: { title: 'hs.dev_title', kicker: 'hs.dev_kicker', lede: 'hs.dev_lede', shelf: 'hs.dev_shelf' },
};

/** A house's colour, out of its own slug: stable across reloads, spread over
 *  the wheel, and the same arithmetic for the biggest publisher on Steam and
 *  for somebody's one game. Saturation and lightness are fixed, because those
 *  are what keep a colour legible on this background. */
function tint(slug: string) {
  let n = 0;
  for (let i = 0; i < slug.length; i++) n = (n * 31 + slug.charCodeAt(i)) >>> 0;
  return `hsl(${n % 360} 58% 52%)`;
}

type HouseTile = { slug: string; name: string; games: number; art?: number | null; owned?: number | null };
type App = { appid: number; name: string; year?: number | null };
type House = { name: string; games: number; art?: number | null; apps?: App[]; read?: number; shown?: number };

/** A custom property on the element itself, through the CSSOM: the page is
 *  served under `style-src 'self'`, which refuses the attribute React would
 *  otherwise write into the prerendered markup. */
function useTint<E extends HTMLElement>(slug: string, drawn = true) {
  const ref = useRef<E>(null);
  /* `drawn`: the element may arrive after the first render, with the data. */
  useLayoutEffect(() => { ref.current?.style.setProperty('--tint', tint(slug)); }, [slug, drawn]);
  return ref;
}

/* ── The filter ────────────────────────────────────────────────────── */

function Filter({ t, label, count, onChange }: {
  t: T; label: string; count: ReactNode; onChange: (needle: string) => void;
}) {
  const id = useId();
  const [value, setValue] = useState('');
  /* A quarter second of settling. On the index every keystroke is a request,
     and a held-down key should be one of them rather than eight. */
  useEffect(() => {
    const at = window.setTimeout(() => onChange(value.trim()), 240);
    return () => window.clearTimeout(at);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <div className="hs-filter">
      <label className="hs-filter-label" htmlFor={id}>{t(label)}</label>
      <input
        id={id} className="hs-filter-field" type="search" autoComplete="off" spellCheck={false}
        placeholder={t(label)} value={value} onChange={(e) => setValue(e.target.value)}
      />
      {/* Counted out loud, because a filter that hides forty rows without
          saying so reads as a list that lost them. */}
      <p className="hs-filter-count" role="status" aria-live="polite">{count}</p>
    </div>
  );
}

/* ── The index ─────────────────────────────────────────────────────── */

function Tile({ t, lang, axis, house }: { t: T; lang: Lang; axis: Axis; house: HouseTile }) {
  const { num } = formats(lang);
  const [art, setArt] = useState(!!house.art);
  const box = useTint<HTMLAnchorElement>(house.slug);
  return (
      <Link ref={box} to={`/${axis}/${house.slug}`} className={art ? 'hs-tile' : 'hs-tile hs-tile--flat'} data-hs={house.slug} role="listitem">
        {art && (
          /* The capsule of the house's most reviewed game, off Steam's CDN:
             a few kilobytes that never touch this server. A game with no
             capsule would leave a broken-image glyph across the tile, so it
             goes and the colour carries the tile alone. */
          <img className="hs-tile-art" src={`${HEADER_ART}/${house.art}/capsule_231x87.jpg`} alt="" loading="lazy" decoding="async" width={231} height={87} onError={() => setArt(false)} />
        )}
        <div className="hs-tile-veil" />
        <div className="hs-tile-in">
          <h2 className="hs-tile-name">{house.name}</h2>
          <p className="hs-tile-span">{t('hs.n_games', { n: num(house.games), raw: house.games })}</p>
        </div>
      </Link>
  );
}

function Index({ t, lang, axis }: { t: T; lang: Lang; axis: Axis }) {
  const { num } = formats(lang);
  const [query, setQuery] = useState<string | null>(null);
  const [tiles, setTiles] = useState<HouseTile[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<'idle' | 'reading' | 'failed'>('reading');
  const [error, setError] = useState('');
  const more = useRef<HTMLDivElement>(null);
  /* Which question the newest keystroke asked. A page that lands after the
     reader typed again belongs to a question nobody is asking any more. */
  const token = useRef(0);
  const busy = useRef(false);

  const page = async (q: string, start: number, mine: number) => {
    if (busy.current) return;
    busy.current = true;
    try {
      const got = await apiGet<{ total?: number; houses?: HouseTile[] }>(
        `/houses?kind=${axis}&q=${encodeURIComponent(q)}&start=${start}&count=${PAGE}`,
      );
      if (mine !== token.current) return;
      setTotal(got.total ?? 0);
      setTiles((have) => (start ? [...have, ...(got.houses ?? [])] : got.houses ?? []));
      setState('idle');
    } catch (e) {
      if (mine !== token.current) return;
      setError(e instanceof ApiError ? e.say(t) : String(e));
      setState('failed');
    } finally {
      busy.current = false;
    }
  };

  useEffect(() => {
    if (query === null) return;
    token.current += 1;
    setTiles([]);
    setTotal(0);
    setState('reading');
    page(query, 0, token.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, axis]);

  /* The next page when the end of the grid comes near. */
  const shown = tiles.length;
  useEffect(() => {
    const el = more.current;
    if (!el || shown >= total || query === null) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) page(query, shown, token.current);
    }, { rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, total, query]);

  const count = state === 'reading' ? t('hs.reading')
    : shown ? t('hs.showing', { shown: num(Math.min(shown, total)), total: num(total) }) : t('hs.none_match');

  return (
    <>
      <header className="hs-ix-head">
        <p className="hs-ix-kicker">{t(AXES[axis].kicker)}</p>
        <h1 className="display hs-ix-title">{t(AXES[axis].title)}</h1>
        <p className="hs-tile-span">{t(AXES[axis].lede)}</p>
      </header>
      <Filter t={t} label="hs.filter_house" count={count} onChange={setQuery} />
      <div className="hs-ix-grid" role="list">
        {tiles.map((house) => <Tile key={house.slug} t={t} lang={lang} axis={axis} house={house} />)}
        {state === 'failed' && <p className="hs-fail">{error}</p>}
        {/* Nothing at all and nothing asked for is not an empty search: it is
            a server that has not finished walking the catalogue yet. */}
        {state === 'idle' && !total && !query && <p className="hs-fail">{t('hs.filling')}</p>}
      </div>
      <div ref={more} className="hs-more" hidden={shown >= total}>
        <button className="hs-act" type="button" onClick={() => query !== null && page(query, shown, token.current)}>{t('hs.show_more')}</button>
      </div>
    </>
  );
}

/* ── One house ─────────────────────────────────────────────────────── */

function Shelf({ t, lang, axis, slug }: { t: T; lang: Lang; axis: Axis; slug: string }) {
  const { num } = formats(lang);
  const [house, setHouse] = useState<House | null>(null);
  const [error, setError] = useState('');
  const [needle, setNeedle] = useState('');
  const [art, setArt] = useState(true);
  const hero = useTint<HTMLElement>(slug, !!house);

  useEffect(() => {
    let alive = true;
    setHouse(null);
    setError('');
    apiGet<House>(`/house?kind=${axis}&slug=${encodeURIComponent(slug)}`)
      .then((got) => { if (alive) { setHouse(got); document.title = `${got.name} - steamprofiler.org`; } })
      .catch((e) => alive && setError(e instanceof ApiError ? e.say(t) : String(e)));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [axis, slug]);

  const apps = useMemo(() => house?.apps ?? [], [house]);
  /* Bands only where there is something to band by: most shelves have no
     years at all, and a decade heading over rows that all say "-" is a
     structure describing nothing. Those get one alphabetical list. */
  const bands = useMemo(() => {
    const byName = (x: App, y: App) => x.name.localeCompare(y.name);
    const decades = new Map<number, App[]>();
    const undated: App[] = [];
    for (const app of apps) {
      if (!app.year) { undated.push(app); continue; }
      const d = Math.floor(app.year / 10) * 10;
      if (!decades.has(d)) decades.set(d, []);
      decades.get(d)!.push(app);
    }
    if (!decades.size) return [{ heading: null as string | null, rows: apps.slice().sort(byName) }];
    const out: { heading: string | null; rows: App[] }[] = [...decades.keys()].sort((a, b) => a - b)
      .map((d) => ({ heading: t('hs.decade', { d }), rows: decades.get(d)!.sort((a, b) => (a.year! - b.year!) || byName(a, b)) }));
    if (undated.length) out.push({ heading: t('hs.no_year'), rows: undated.sort(byName) });
    return out;
  }, [apps, t]);
  const dated = bands.length > 1 || bands[0]?.heading !== null;

  if (error) return <p className="hs-fail">{error}</p>;
  if (!house) return <p className="hs-fail">{t('hs.reading')}</p>;

  let from: number | null = null, to: number | null = null;
  for (const app of apps) {
    if (!app.year) continue;
    if (from === null || app.year < from) from = app.year;
    if (to === null || app.year > to) to = app.year;
  }
  const lower = needle.toLowerCase();
  const hit = (app: App) => !lower || app.name.toLowerCase().includes(lower);
  const left = apps.filter(hit).length;
  const face = house.art || (apps.length ? apps[0].appid : null);

  /* What the shelf could not say: a year is missing because this server has
     not been to the store about that game yet, and a shelf is cut because
     some catalogue publishers have thousands of apps. */
  const foot: string[] = [];
  if (house.read != null && house.read < apps.length) foot.push(t('hs.years_read', { n: num(house.read), total: num(apps.length) }));
  if (house.shown != null && house.games > house.shown) foot.push(t('hs.cut_at', { n: num(house.shown), total: num(house.games) }));

  return (
    <>
        <header ref={hero} className="hs-hero">
          {/* /art/ here and the CDN on the tiles: one picture on a page asked
              for by name is what that cache is for. */}
          {face && art && <img className="hs-hero-art" src={`/art/${face}.jpg`} alt="" decoding="async" onError={() => setArt(false)} />}
          <div className="hs-hero-veil" />
          <div className="hs-hero-in">
            <p className="hs-hero-kicker">
              <span>{t(AXES[axis].shelf)}</span>
              {from !== null && <><i>·</i><span>{t('hs.span_years', { from, to: to! })}</span></>}
            </p>
            <h1 className="display hs-hero-name">{house.name}</h1>
            <p className="hs-hero-count">{t('hs.n_games', { n: num(house.games), raw: house.games })}</p>
            <div className="hs-acts"><Link className="hs-act" to={`/${axis}`}>{t('hs.all_houses')}</Link></div>
          </div>
        </header>

      {apps.length > FILTER_AT && (
        <Filter t={t} label="hs.filter_game" count={left ? t('hs.showing', { shown: num(left), total: num(apps.length) }) : t('hs.none_match')} onChange={setNeedle} />
      )}

      <div className="hs-shelf" data-undated={dated ? undefined : '1'}>
        {bands.map(({ heading, rows }) => {
          const shown = rows.filter(hit);
          /* A band with nothing left in it is a heading over a gap. */
          if (!shown.length) return null;
          return (
            <section key={heading ?? 'all'} className="hs-band">
              {heading && <div className="panel-bar"><span>{heading}</span><b>{num(shown.length)}</b></div>}
              <ol className="hs-rows">
                {shown.map((app) => (
                  <li key={app.appid}>
                    <Link className="hs-row" to={`/g/${app.appid}`}>
                      <Capsule appid={app.appid} />
                      {dated && <span className="hs-row-year">{app.year ? String(app.year) : '-'}</span>}
                      <b className="hs-row-name">{app.name}</b>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>
      {foot.length > 0 && <p className="hs-foot">{foot.join(' · ')}</p>}
    </>
  );
}

/** The game's small capsule, lazily off the CDN; gone, not hidden, when Steam
 *  has none, so the row closes up instead of keeping a hole. */
function Capsule({ appid }: { appid: number }) {
  const [ok, setOk] = useState(true);
  return ok ? (
    <img className="hs-row-icon" src={`${HEADER_ART}/${appid}/capsule_sm_120.jpg`} alt="" loading="lazy" decoding="async" width={60} height={28} onError={() => setOk(false)} />
  ) : null;
}

export default function Houses({ t, lang, path }: PageProps) {
  const [axisWord, slug] = path.split('/').filter(Boolean);
  const axis: Axis = axisWord === 'developers' ? 'developers' : 'publishers';
  return (
    <div className="legacy legacy-houses">
      <main id="hs">
        <div id="hs-root">
          {slug
            ? <Shelf key={`${axis}/${slug}`} t={t} lang={lang} axis={axis} slug={slug} />
            : <Index key={axis} t={t} lang={lang} axis={axis} />}
        </div>
      </main>
    </div>
  );
}
