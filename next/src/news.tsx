import { useEffect, useMemo, useState } from 'react';
import { LOCALES } from './copy';
import type { Lang, T } from './copy';
import { Panel } from './ui';
import { Link } from './router';
import { bbcode } from './bbcode';
import * as api from './api';

/* ── The feed ─────────────────────────────────────────────────────────
   api.steamNews is asked once per page load and hands every caller the same
   promise, so /news, /news/<id> and the bench panel are one request between
   them. This hook is only the part React needs: what arrived, and whether it
   ever will. */
function useFeed() {
  const [items, setItems] = useState<api.NewsItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    api.steamNews(20)
      .then((out) => { if (alive) setItems(out); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, []);

  return { items, failed };
}

type Kind = 'all' | 'fest' | 'client';

const kindOf = (item: api.NewsItem): Exclude<Kind, 'all'> =>
  item.feed_name === 'steam_community_announcements' ? 'client' : 'fest';

function useWhen(lang: string) {
  return useMemo(() => {
    const fmt = new Intl.DateTimeFormat(LOCALES[lang as Lang], { day: 'numeric', month: 'short' });
    const full = new Intl.DateTimeFormat(LOCALES[lang as Lang], { day: 'numeric', month: 'long', year: 'numeric' });
    return {
      short: (at: number) => fmt.formatToParts(new Date(at * 1000))
        .filter((p) => p.type === 'day' || p.type === 'month')
        .map((p) => p.value.replace('.', ''))
        .join(' '),
      full: (at: number) => full.format(new Date(at * 1000)),
    };
  }, [lang]);
}

/** The first words of a post, for a row that has room for a line of them. */
function opening(item: api.NewsItem) {
  return (item.contents ?? '')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/([.!?])([A-ZÀ-ÖØ-Þ])/g, '$1 $2')
    .trim();
}

/** The line over a title: what kind of post, when, and by whom. Written
 *  once because the band and the plain header both need it. */
function Meta({ t, item, when }: { t: T; item: api.NewsItem; when: string }) {
  return (
    <p className="mono flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] uppercase tracking-[.14em] text-faint">
      <span className="text-amber">{t(kindOf(item) === 'client' ? 'w.feed_ann' : 'w.feed_blog')}</span>
      <span>{when}</span>
      {item.author && <span className="normal-case tracking-normal">{t('n.by', { who: item.author })}</span>}
    </p>
  );
}

/* ── /news ────────────────────────────────────────────────────────────
   Twenty posts, filtered by the two things the hub actually publishes, and
   a panel beside them saying where they came from. Rows are addresses on
   this site: a post with a body to draw opens here, and one without does
   what it always did and goes to Steam. */
export function NewsPage({ t, lang }: { t: T; lang: string }) {
  const { items, failed } = useFeed();
  const [kind, setKind] = useState<Kind>('all');
  const when = useWhen(lang);

  const shown = (items ?? []).filter((i) => kind === 'all' || kindOf(i) === kind);

  return (
    <main className="feedgrid">
      <div className="grid gap-[var(--gap)]">
        <section className="p">
          <div className="p-bar">
            <h2 className="m-0 flex items-center gap-2.5 font-[inherit] text-[inherit] font-medium tracking-[inherit]">
              <span className="dot" />
              <span>{t('n.feed')}</span>
            </h2>
            <div className="flex gap-1 rounded-full border border-line p-[3px]">
              {(['all', 'fest', 'client'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`mono rounded-full px-3 py-[2px] text-[10.5px] lowercase tracking-normal transition-colors ${
                    kind === k ? 'bg-panel-2 text-text' : 'text-faint hover:text-dim'
                  }`}
                >
                  {t(k === 'all' ? 'n.filter_all' : k === 'fest' ? 'n.filter_fest' : 'n.filter_client')}
                </button>
              ))}
            </div>
          </div>

          <ul className="m-0 flex list-none flex-col p-0">
            {!items && !failed && [0, 1, 2, 3, 4, 5].map((i) => (
              <li key={i} className="flex items-center gap-4 border-b border-line px-4 py-5 last:border-b-0">
                <span className="h-2 w-10 shrink-0 animate-pulse rounded bg-line" />
                <span className="h-2 flex-1 animate-pulse rounded bg-line opacity-70" />
              </li>
            ))}

            {failed && <li className="mono px-4 py-6 text-[12px] text-faint">{t('n.empty')}</li>}

            {shown.map((item) => (
              <li key={item.id} className="border-b border-line last:border-b-0">
                <Link
                  to={`/news/${item.id}`}
                  className="group flex items-baseline gap-4 px-4 py-4 no-underline transition-colors hover:bg-panel-2"
                >
                  <b className="mono w-[3.8rem] shrink-0 whitespace-nowrap text-[10.5px] font-medium tabular-nums text-faint">
                    {when.short(item.date)}
                  </b>
                  {/* Steam's own card for the event, at the size a row can
                      afford. A post without one keeps its place in the column
                      rather than sliding the titles left by ninety pixels. */}
                  <span
                    className={`hidden h-[54px] w-24 shrink-0 self-center overflow-hidden rounded sm:block ${
                      item.art?.capsule ? 'border border-line bg-ink' : ''
                    }`}
                  >
                    {item.art?.capsule && (
                      <img
                        src={item.art.capsule}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover opacity-80 transition-opacity duration-300 group-hover:opacity-100"
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold leading-tight tracking-tight text-text">
                      {item.title}
                    </span>
                    <span className="mt-1 block truncate text-[12.5px] text-dim">{opening(item)}</span>
                  </span>
                  <span className="mono hidden shrink-0 text-[9.5px] uppercase tracking-[.1em] text-line-2 transition-colors group-hover:text-amber-d sm:inline">
                    {t(kindOf(item) === 'client' ? 'w.feed_ann' : 'w.feed_blog')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="stick grid gap-[var(--gap)]">
        <Panel title={t('n.source')} area="" go={t('w.news_go')} goHref="https://store.steampowered.com/news/">
          <h1 className="display text-[clamp(1.5rem,2.2vw,2rem)]">{t('n.news_title')}</h1>
          <p className="mt-3 text-[13px] leading-snug text-dim">{t('n.news_lede')}</p>
          <p className="mono mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-faint">
            {t('n.source_body')}
          </p>
          {items && (
            <p className="mono mt-3 text-[11px] text-faint">
              <span className="text-amber">{t('n.count', { n: items.length })}</span>
            </p>
          )}
        </Panel>
      </div>
    </main>
  );
}

/* ── /news/<id> ───────────────────────────────────────────────────────
   The post, drawn here. The rule the page is built on is one sentence: if
   Steam handed over a body, it is read on steamprofiler; if it handed over a
   headline and a link, there is nothing to draw and the reader is sent to
   the post rather than shown a page that says it exists.

   That second case is rare in this feed and is not hypothetical: an item can
   arrive with an empty `contents`, and a panel that renders it would be a
   title and a wall of nothing. */
export function PostPage({ t, lang, id }: { t: T; lang: string; id: string }) {
  const { items, failed } = useFeed();
  const when = useWhen(lang);
  const item = items?.find((i) => i.id === id);
  const thin = item ? api.bodyWeight(item) < api.READABLE : false;

  useEffect(() => {
    /* Nothing to draw: leave, and do it with replace so the back button goes
       where the reader came from rather than back into this hand-off. */
    if (item && thin) {
      const go = setTimeout(() => window.location.replace(item.url), 900);
      return () => clearTimeout(go);
    }
  }, [item, thin]);

  const body = useMemo(() => (item && !thin ? bbcode(item.contents ?? '') : ''), [item, thin]);

  return (
    <main className="feedgrid">
      <section className="p">
        <div className="p-bar">
          <Link to="/news" className="flex items-center gap-2.5 text-[inherit] no-underline">
            <span className="dot" />
            <span>{t('n.back')}</span>
          </Link>
          {item && (
            <a className="p-go" href={item.url} target="_blank" rel="noopener">{t('n.on_steam')} ↗</a>
          )}
        </div>

        <div className="p-body p-tight">
          {!items && !failed && (
            <div className="grid gap-3 px-[clamp(16px,2.4vw,34px)] py-[clamp(18px,2.4vw,30px)]">
              <span className="h-3 w-40 animate-pulse rounded bg-line" />
              <span className="h-7 w-2/3 animate-pulse rounded bg-line" />
              <span className="mt-3 h-2 w-full animate-pulse rounded bg-line" />
              <span className="h-2 w-11/12 animate-pulse rounded bg-line" />
            </div>
          )}

          {failed && <p className="mono px-[clamp(16px,2.4vw,34px)] py-[clamp(18px,2.4vw,30px)] text-[12px] text-faint">{t('n.empty')}</p>}

          {items && !item && (
            <p className="mono px-[clamp(16px,2.4vw,34px)] py-[clamp(18px,2.4vw,30px)] text-[12px] leading-relaxed text-faint">
              {t('n.missing')}{' '}
              <Link to="/news" className="text-dim hover:text-amber">{t('n.back')} ↗</Link>
            </p>
          )}

          {item && (
            <article>
              {/* Steam's own band for this post, when it has one. A client
                  update has no artwork on Steam either, and gets the plain
                  header rather than a made-up picture. */}
              {item.art?.background ? (
                <div className="hero">
                  <img src={item.art.background} alt="" />
                  <div className="hero-in">
                    <Meta t={t} item={item} when={when.full(item.date)} />
                    <h1 className="display mt-3 max-w-[24ch] text-[clamp(1.8rem,3.4vw,2.8rem)]">{item.title}</h1>
                    {item.art.subtitle && (
                      <p className="mt-3 max-w-[52ch] text-[14.5px] leading-snug text-dim">{item.art.subtitle}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="px-[clamp(16px,2.4vw,34px)] pt-[clamp(18px,2.4vw,30px)]">
                  <Meta t={t} item={item} when={when.full(item.date)} />
                  <h1 className="display mt-3 max-w-[24ch] text-[clamp(1.7rem,3.2vw,2.6rem)]">{item.title}</h1>
                </div>
              )}

              <div className="px-[clamp(16px,2.4vw,34px)] pb-[clamp(18px,2.4vw,30px)]">
                {thin ? (
                  <p className="mono mt-6 text-[12.5px] leading-relaxed text-faint">
                    {t('n.sending')}{' '}
                    <a className="text-amber" href={item.url}>{t('n.on_steam')} ↗</a>
                  </p>
                ) : (
                  <div className="post mt-7" dangerouslySetInnerHTML={{ __html: body }} />
                )}

                <p className="mono mt-10 border-t border-line pt-4 text-[10px] leading-relaxed text-faint">
                  {t('n.valve_note')}
                </p>
              </div>
            </article>
          )}
        </div>
      </section>

      <div className="stick grid gap-[var(--gap)]">
        <Panel title={t('n.more')} area="" tight>
          <ul className="m-0 flex list-none flex-col p-0">
            {(items ?? []).filter((i) => i.id !== id).slice(0, 8).map((other) => (
              <li key={other.id} className="border-b border-line last:border-b-0">
                <Link
                  to={`/news/${other.id}`}
                  className="flex items-baseline gap-3 px-3.5 py-2.5 no-underline transition-colors hover:bg-panel-2"
                >
                  <b className="mono w-[3.4rem] shrink-0 whitespace-nowrap text-[10px] text-faint">{when.short(other.date)}</b>
                  <span className="line-clamp-2 text-[12.5px] leading-snug text-dim">{other.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </main>
  );
}
