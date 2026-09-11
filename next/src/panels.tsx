import { useEffect, useRef, useState } from 'react';
import { LOCALES } from './copy';
import type { Lang, T } from './copy';
import { DEMO_RAIL, DEMO_SHAPE, DEMO_THEMES, FRANCHISES, HEADER_ART } from './data';
import { CountUp, Panel, Treemap, usePainted } from './ui';
import { Link } from './router';
import * as api from './api';

/* ── The field ────────────────────────────────────────────────────────
   The front door, and on a bench it is a panel like any other rather than a
   screen of its own. It resolves against the service before it goes
   anywhere, so a typo answers here instead of on a page that loads only to
   say it failed, and what it opens is the served site, because the pages
   behind a profile live there. */
/* Five handles in localStorage, newest first, and nothing else: no time, no
   persona, no avatar, no count. The key is `sp-recent` and not a name of this
   cut's own, because the privacy policy this site serves names that entry and
   says what is in it: a page that keeps the same thing under a different name
   is a page the policy no longer describes. The list exists because typing a steamID64
   twice is a thing this site made somebody do, and it stops exactly there.
   It never leaves the browser, and a name is only written after it resolved,
   so a typo is never remembered. */
const RECENT_KEY = 'sp-recent';

function recentRead(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((q): q is string => typeof q === 'string' && !!q).slice(0, 5) : [];
  } catch {
    return [];
  }
}

export function Find({ t, inputRef }: { t: T; inputRef: React.RefObject<HTMLInputElement | null> }) {
  const [kind, setKind] = useState<'profile' | 'game'>('profile');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [hits, setHits] = useState<{ appid: number; name: string }[]>([]);
  const [recent, setRecent] = useState<string[]>(() => recentRead());

  function remember(name: string) {
    const next = [name, ...recent.filter((r) => r !== name)].slice(0, 5);
    setRecent(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* A private window and a full quota both land here. The lookup still
         works; it is only the remembering that does not. */
    }
  }

  useEffect(() => {
    if (kind !== 'game' || q.trim().length < 2) { setHits([]); return; }
    let alive = true;
    const timer = setTimeout(() => {
      api.searchGames(q.trim())
        .then((out) => { if (alive) setHits(out.items ?? []); })
        .catch(() => { if (alive) setHits([]); });
    }, 180);
    return () => { alive = false; clearTimeout(timer); };
  }, [q, kind]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    setError('');
    if (!term) return setError(t('land.empty'));
    if (kind === 'game') {
      if (/^\d{1,8}$/.test(term)) return api.open(`/g/${term}`);
      if (hits[0]) return api.open(`/g/${hits[0].appid}`);
      return setError(t('land.game_choose'));
    }
    setBusy(true);
    try {
      await api.resolve(term);
      remember(term);
      api.open(`/u/${encodeURIComponent(term)}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="p a-find">
      <div className="p-bar">
        <h2 className="m-0 flex items-center gap-2.5 font-[inherit] text-[inherit] font-medium tracking-[inherit]">
          <span className="dot" />
          <span>{t(kind === 'game' ? 'land.game_field' : 'land.field')}</span>
        </h2>
        {/* Two tabs of one panel, in its title bar, because that is what the
            switch is: it changes what the whole panel is for, not one
            setting inside the form. */}
        <div className="flex gap-1 rounded-full border border-line p-[3px]">
          {(['profile', 'game'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => { setKind(k); setQ(''); setHits([]); setError(''); inputRef.current?.focus(); }}
              className={`mono rounded-full px-3 py-[2px] text-[10.5px] lowercase tracking-normal transition-colors ${
                kind === k ? 'bg-panel-2 text-text' : 'text-faint hover:text-dim'
              }`}
            >
              {t(k === 'game' ? 'land.kind_game' : 'land.kind_profile')}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col justify-center gap-0 p-[clamp(14px,1.5vw,22px)]">
        <p className="mono text-[10px] uppercase tracking-[.18em] text-dim">{t('land.eyebrow')}</p>
        <h1
          className="display mt-3 text-[clamp(1.9rem,2.7vw,2.9rem)]"
          dangerouslySetInnerHTML={{ __html: t('land.h1') }}
        />
        <p
          className="mt-3 max-w-[46ch] text-[13.5px] leading-snug text-dim [&_b]:font-semibold [&_b]:text-text"
          dangerouslySetInnerHTML={{ __html: t('land.lede') }}
        />

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <input
            ref={inputRef}
            className="field"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t(kind === 'game' ? 'land.game_placeholder' : 'land.placeholder')}
            spellCheck={false}
            autoComplete="off"
            enterKeyHint="go"
          />
          <button className="go" disabled={busy}>
            {busy ? t('land.searching') : t(kind === 'game' ? 'land.game_go' : 'land.go')}
          </button>
        </div>

        {hits.length > 0 && (
          <ul className="mt-2 max-h-32 list-none overflow-y-auto rounded-lg border border-line bg-panel-2 p-1">
            {hits.slice(0, 6).map((g) => (
              <li key={g.appid}>
                <button
                  type="button"
                  onClick={() => api.open(`/g/${g.appid}`)}
                  className="mono flex w-full items-center justify-between gap-6 rounded px-2 py-1.5 text-left text-[12px] text-dim hover:bg-ink hover:text-text"
                >
                  <span className="truncate">{g.name}</span>
                  <span className="shrink-0 text-[10px] text-faint">app {g.appid}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <p
          className="mono mt-3 text-[10.5px] leading-relaxed text-faint [&_b]:font-normal [&_b]:text-dim"
          dangerouslySetInnerHTML={{ __html: t(kind === 'game' ? 'land.game_help' : 'land.help') }}
        />

        {/* What you looked up before, from this browser and nowhere else.
            Absent until there is one, because an empty list of your own
            history is a promise of a feature rather than a feature, and the
            button that clears it is beside it rather than in a settings page
            nobody will find. */}
        {kind === 'profile' && recent.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <span className="mono text-[9.5px] uppercase tracking-[.12em] text-faint">{t('land.recent')}</span>
            {recent.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => api.open(`/u/${encodeURIComponent(name)}`)}
                className="mono max-w-[18ch] truncate rounded-full border border-line px-2.5 py-1 text-[11px] text-dim transition-colors hover:border-amber-d hover:text-text"
              >
                {name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => { setRecent([]); localStorage.removeItem(RECENT_KEY); }}
              className="mono ml-auto text-[10px] text-faint underline underline-offset-2 hover:text-dim"
            >
              {t('land.recent_clear')}
            </button>
          </div>
        )}
        {error && (
          <p className="mono mt-2 rounded border-l-2 border-[#ff7a5c] bg-[#ff5f4514] px-3 py-2 text-[11.5px] text-[#ffb8a8]">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}

/* ── The shape ────────────────────────────────────────────────────── */
export function Map({ t }: { t: T }) {
  return (
    <Panel title={t('w.shape')} area="a-map" tight>
      <div className="relative flex h-full min-h-[220px] flex-col">
        <div className="relative flex-1 bg-[#0b0a10]">
          <Treemap />
        </div>
        <p className="mono flex-none border-t border-line px-3 py-2.5 text-[10.5px] leading-relaxed text-faint">
          {t('w.shape_note')}
        </p>
      </div>
    </Panel>
  );
}

/* ── What it knows right now ──────────────────────────────────────────
   Four counts out of /api/status, stacked, with a hairline between each.
   The panel takes itself off the bench if the service does not answer: a
   tile that is four dashes and an apology is worse than a bench with eight
   panels on it, and nothing else here needs the service to be up. */
export function Live({ t, lang, live }: { t: T; lang: string; live: api.Status | null }) {
  const counts: [number | undefined, string][] = [
    [live?.known?.detailed, 'land.live_games'],
    [live?.known?.catalogue, 'land.live_cat'],
    [live?.known?.houses, 'land.live_houses'],
    [live?.known?.deck?.rated, 'land.live_deck'],
  ];
  const shown = counts.filter(([v]) => typeof v === 'number' && v > 0) as [number, string][];
  if (!shown.length) return null;

  return (
    <Panel title={t('w.live')} area="a-live" go={t('land.live_link')} goHref={`${api.SITE}/status`} tight>
      <dl className="m-0 flex h-full flex-col">
        {shown.map(([value, key]) => (
          <div key={key} className="flex-1 border-b border-line px-3.5 py-3 last:border-b-0">
            <dd className="mono m-0 text-[clamp(1.3rem,1.9vw,1.8rem)] leading-none tracking-tight text-amber">
              <CountUp to={value} locale={LOCALES[lang as Lang]} />
            </dd>
            <dt className="mono mt-1.5 text-[10px] leading-tight text-faint">{t(key)}</dt>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

/* ── The games with a page of their own ───────────────────────────────
   The number, the reason, and the covers running slowly up the side of the
   panel. It is the one thing on this screen that moves on its own, and it
   stops the moment anybody points at it. */
export function Rail({ t }: { t: T }) {
  const still = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return (
    <Panel title={t('w.themes')} area="a-rail" tight>
      <div className="flex h-full min-h-[260px] flex-col">
        <div className="flex-none px-3.5 pt-3">
          <p className="display text-[clamp(2.6rem,4.4vw,3.6rem)] leading-none text-amber">{DEMO_THEMES}</p>
          <p className="mono mt-2 text-[10.5px] leading-relaxed text-faint">{t('w.rail_note')}</p>
        </div>
        <div className="rail-box relative mt-3 min-h-0 flex-1 overflow-hidden [mask-image:linear-gradient(180deg,transparent,#000_12%,#000_88%,transparent)]">
          <div className="lane-v px-2" data-run={still ? '0' : '1'}>
            {[0, 1].map((pass) =>
              DEMO_RAIL.map(([appid, name]) => (
                <a
                  key={`${pass}-${appid}`}
                  href={`${api.SITE}/g/${appid}`} {...api.OUT}
                  aria-hidden={pass === 1 || undefined}
                  tabIndex={pass === 1 ? -1 : undefined}
                  title={name}
                  className="group block shrink-0 overflow-hidden rounded-md border border-line transition-colors hover:border-amber-d"
                >
                  <img
                    src={`${HEADER_ART}/${appid}/capsule_231x87.jpg`}
                    alt=""
                    width={231}
                    height={87}
                    decoding="async"
                    className="block aspect-[231/87] w-full object-cover opacity-60 transition-opacity duration-300 group-hover:opacity-100"
                  />
                </a>
              )),
            )}
          </div>
        </div>
        <p className="mono flex-none border-t border-line px-3.5 py-2 text-[10px] text-faint">{t('w.plain')}</p>
      </div>
    </Panel>
  );
}

/* ── The latest from Steam ────────────────────────────────────────────
   Valve's own posts, live: the fests, the sales and the client updates, read
   from the news hub. It is the second panel on this bench that is different
   tomorrow, and the only one whose contents this project does not write.

   The rows go to /news/<id> and not to Steam. Steam hands over the whole
   body, so there is a page to send the reader to here; the post that arrives
   as a headline and nothing else is the one case that still ends up on
   Steam, and that decision is made on the post's own page rather than
   guessed at in this list. */
function feedOf(item: api.NewsItem) {
  return item.feed_name === 'steam_community_announcements' ? 'ann' : 'blog';
}

export function News({ t, lang }: { t: T; lang: string }) {
  const [items, setItems] = useState<api.NewsItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [at, setAt] = useState(0);

  useEffect(() => {
    let alive = true;
    api.steamNews(20)
      .then((out) => { if (alive) { setItems(out.slice(0, 5)); setAt(0); } })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, []);

  /* "10 set", not "10 de set." - pt-BR writes the preposition in and this
     column is four characters wide. Assembled from the parts rather than
     string-edited, so a language that orders them the other way still gets
     its own order. */
  const fmt = new Intl.DateTimeFormat(LOCALES[lang as Lang], { day: 'numeric', month: 'short' });
  const when = (at: number) => fmt.formatToParts(new Date(at * 1000))
    .filter((p) => p.type === 'day' || p.type === 'month')
    .map((p) => p.value.replace('.', ''))
    .join(' ');

  const here = items?.[at];
  /* The opening words, with the space put back where stripping the markup
     took it out: "on sale.Do your family". It is the only thing done to
     Valve's own words anywhere in this prototype. */
  const opening = (here?.contents ?? '')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/([.!?])([A-ZÀ-ÖØ-Þ])/g, '$1 $2')
    .trim();

  return (
    <Panel title={t('w.news')} area="a-pages" go={t('w.news_go')} goTo="/news" tight>
      <div className="flex h-full min-h-[300px] flex-col">
        <ul className="m-0 flex min-h-0 flex-1 list-none flex-col p-0">
          {/* Rows of nothing while it is in the air, in the places the real
              ones will take, rather than an empty panel that fills and shoves
              the bench around it. */}
          {!items && !failed && [0, 1, 2, 3, 4].map((i) => (
            <li key={i} className="flex flex-1 items-center gap-3 border-b border-line px-3.5 last:border-b-0">
              <span className="h-2 w-9 shrink-0 animate-pulse rounded bg-line" />
              <span className="h-2 flex-1 animate-pulse rounded bg-line opacity-70" />
            </li>
          ))}

          {items?.map((item, i) => (
            <li key={item.id} className="min-h-0 flex-1 border-b border-line last:border-b-0">
              <Link
                to={`/news/${item.id}`}
                className="rowl rowl-tall no-underline"
                data-on={i === at ? '1' : '0'}
                onMouseEnter={() => setAt(i)}
                onFocus={() => setAt(i)}
              >
                <b className="w-[3.8rem] shrink-0 whitespace-nowrap tabular-nums">{when(item.date)}</b>
                <span className="truncate">{item.title}</span>
                <span className="mono ml-auto hidden shrink-0 text-[9.5px] uppercase tracking-[.1em] text-line-2 xl:inline">
                  {t(feedOf(item) === 'ann' ? 'w.feed_ann' : 'w.feed_blog')}
                </span>
              </Link>
            </li>
          ))}

          {failed && (
            <li className="mono flex flex-1 items-center px-3.5 text-[11.5px] leading-relaxed text-faint">
              {t('w.news_off')}
            </li>
          )}
        </ul>

        <div className="min-h-[4rem] flex-none border-t border-line px-3.5 py-2.5">
          {here ? (
            <>
              <p className="line-clamp-2 text-[12.5px] leading-snug text-dim">{opening}</p>
              <p className="mono mt-1.5 text-[10px] text-faint">
                {here.author ? `${here.author} · ` : ''}
                <Link to={`/news/${here.id}`} className="text-dim no-underline hover:text-amber">
                  {t('w.news_open')}
                </Link>
              </p>
            </>
          ) : (
            <p className="mono text-[11px] text-faint">{failed ? '' : t('w.news_wait')}</p>
          )}
        </div>
      </div>
    </Panel>
  );
}

/* ── What opens with nobody in it ─────────────────────────────────── */
export function Doors({ t }: { t: T }) {
  /* One effect dresses all ten: --tint is what the border, the veil and the
     saturation of the picture are all written against in styles.css, so it is
     the only value that has to reach the element, and it reaches it through
     the CSSOM because the policy refuses the attribute. */
  const plates = usePainted<HTMLDivElement>(
    Object.fromEntries(FRANCHISES.map((f, i) => [i, { '--tint': f.tint }])),
  );
  return (
    <Panel title={t('w.doors')} area="a-fx" go={t('w.all_fx')} goHref={`${api.SITE}/franchises`} tight>
      <div className="flex h-full min-h-[280px] flex-col">
        <div ref={plates} className="grid min-h-0 flex-1 grid-cols-2 gap-1.5 p-2 sm:grid-cols-3 xl:grid-cols-5">
          {FRANCHISES.map((f) => (
            <a
              key={f.slug}
              className="plate flex min-h-[74px] flex-col justify-end p-2.5"
              href={`${api.SITE}/franchises/${f.slug}`} {...api.OUT}
            >
              <img src={`${HEADER_ART}/${f.flagship}/capsule_231x87.jpg`} alt="" loading="lazy" decoding="async" />
              <span className="plate-veil" />
              <span className="relative z-10 block">
                <b className="display block text-[13.5px] leading-tight">{f.name}</b>
                <span className="mono mt-0.5 block text-[9.5px] text-text/70">{f.born}-{f.last} · {f.n}</span>
              </span>
            </a>
          ))}
        </div>
        <div className="flex flex-none flex-wrap items-center gap-2 border-t border-line px-3 py-2.5">
          <p className="mono mr-auto max-w-[46ch] text-[10.5px] leading-relaxed text-faint">{t('land.open_lede')}</p>
          <a className="pill" href={`${api.SITE}/publishers`} {...api.OUT}>{t('land.hs_pub')}</a>
          <a className="pill" href={`${api.SITE}/developers`} {...api.OUT}>{t('land.hs_dev')}</a>
        </div>
      </div>
    </Panel>
  );
}

/* ── The two that are not pages here ──────────────────────────────────
   Drawn rather than screenshotted, the same way the panel on /extension is:
   a screenshot goes stale in a language nobody rereads and a drawing is
   corrected in a diff. Wordless, and every width is a rule. */
/* The three fills in the drawing below. A module-level list so the effect
   that paints them and the markup that shows them cannot disagree about how
   many there are. */
const EXT_METERS = [78, 54, 31];

export function Ext({ t }: { t: T }) {
  /* The policy refuses a style attribute and the server writes the drawing
     into the markup, so the widths are applied on mount instead. */
  const meters = usePainted<HTMLDivElement>(
    Object.fromEntries(EXT_METERS.map((w, i) => [i, { width: `${w}%` }])),
  );
  return (
    <Panel title={t('w.ext')} area="a-ext" go={t('land.ext_go')} goHref={`${api.SITE}/extension`}>
      <div className="flex h-full gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold leading-tight tracking-tight">{t('land.ext_head')}</h3>
          <p
            className="mt-2 text-[12.5px] leading-snug text-dim [&_b]:font-semibold [&_b]:text-text"
            dangerouslySetInnerHTML={{ __html: t('land.ext_body') }}
          />
        </div>
        <div aria-hidden className="hidden w-[160px] shrink-0 2xl:block">
          <div className="mk">
            <span className="mk-line w-[64%]" />
            <span className="mk-line w-[38%]" />
            <span className="mk-line !h-3.5 w-[62px] rounded !bg-line-2 opacity-70" />
          </div>
          <div className="mk mt-1.5 border-l-2 border-l-amber">
            <div className="flex items-center gap-2">
              <i className="dot" />
              <i className="mk-line w-[62px] flex-none" />
            </div>
            <div ref={meters} className="grid gap-[7px]">
              {EXT_METERS.map((w) => (
                <span key={w} className="mk-meter"><i /></span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

export function Emb({ t, onLookup }: { t: T; onLookup: () => void }) {
  const bars = DEMO_SHAPE.slice(0, 9);
  const top = bars[0];
  const chart = usePainted<HTMLDivElement>(
    Object.fromEntries(bars.map((v, i) => [i, { height: `${14 + 86 * Math.pow(v / top, 0.42)}%` }])),
  );
  return (
    <Panel title={t('w.emb')} area="a-emb" go={t('land.emb_go')} onGo={onLookup}>
      <div className="flex h-full gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold leading-tight tracking-tight">{t('land.emb_head')}</h3>
          <p
            className="mt-2 text-[12.5px] leading-snug text-dim [&_b]:font-semibold [&_b]:text-text"
            dangerouslySetInnerHTML={{ __html: t('land.emb_body') }}
          />
        </div>
        <figure aria-hidden className="m-0 hidden w-[160px] shrink-0 2xl:block">
          <div className="mk">
            <span className="mono flex items-center gap-1.5 border-b border-line pb-1.5 text-[9.5px] text-faint">
              <i className="block h-[6px] w-[6px] rounded-[2px] bg-line-2" />README.md
            </span>
            <div ref={chart} className="mk-bars">
              {bars.map((_, i) => <i key={i} />)}
            </div>
          </div>
        </figure>
      </div>
    </Panel>
  );
}

/* ── The parts ────────────────────────────────────────────────────────
   Five repositories, one line each, and the languages under them. It is the
   section the served page did not have, and the reason it read as older
   than the thing it is the front of. */
const PARTS: [string, string, string][] = [
  ['land.eco_front_h', 'land.eco_front_b', 'SteamProfiler.Front'],
  ['land.eco_api_h', 'land.eco_api_b', 'SteamProfiler.Api'],
  ['land.eco_ext_h', 'land.eco_ext_b', 'SteamProfiler.Companion'],
  ['land.eco_i18n_h', 'land.eco_i18n_b', 'SteamProfiler.i18n'],
  ['land.eco_player_h', 'land.eco_player_b', 'SteamProfiler.Player'],
];

export function Parts({ t }: { t: T }) {
  return (
    <Panel title={t('w.parts')} area="a-repos" tight>
      <div className="flex h-full flex-col">
        <ul className="m-0 grid list-none grid-cols-1 gap-px bg-line p-0 sm:grid-cols-2 xl:grid-cols-5">
          {PARTS.map(([head, body, repo], i) => (
            <li key={repo} className="bg-panel">
              <a
                href={`https://github.com/GustavoHSCruz/${repo}`}
                target="_blank"
                rel="noopener"
                className="group block h-full border-t-2 border-t-transparent p-3.5 no-underline transition-colors hover:border-t-amber hover:bg-panel-2"
              >
                <span className="mono text-[9.5px] tracking-[.2em] text-line-2">{String(i + 1).padStart(2, '0')}</span>
                <b className="mt-1 block text-[13.5px] font-semibold tracking-tight text-text">{t(head)}</b>
                <span className="mt-1.5 block text-[11.5px] leading-snug text-dim">{t(body)}</span>
                <span className="mono mt-2 block text-[10px] text-faint transition-colors group-hover:text-amber">
                  {t('land.eco_repo')} ↗
                </span>
              </a>
            </li>
          ))}
        </ul>
        <div className="flex flex-none flex-wrap items-center gap-x-6 gap-y-2 border-t border-line px-3.5 py-2.5">
          <p className="mono m-0 text-[10.5px] text-faint">
            {t('w.langs_line', { n: (2224).toLocaleString(), k: 3 })}
            {' · '}
            <span className="text-dim">EN</span> <span className="text-amber">100%</span>{' · '}
            <span className="text-dim">PT</span> <span className="text-amber">100%</span>{' · '}
            <span className="text-dim">RU</span> <span className="text-amber">100%</span>
          </p>
          <p className="mono m-0 ml-auto flex flex-wrap gap-x-5 gap-y-1 text-[10.5px]">
            <a className="text-dim no-underline hover:text-amber" href={`${api.SITE}/translate`} {...api.OUT}>
              {t('land.eco_translate')}
            </a>
            <a className="text-dim no-underline hover:text-amber" href={`${api.SITE}/status`} {...api.OUT}>
              {t('land.eco_status')}
            </a>
          </p>
        </div>
      </div>
    </Panel>
  );
}
