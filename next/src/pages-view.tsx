import { useEffect, useState } from 'react';
import { LOCALES } from './copy';
import type { Lang, T } from './copy';
import { ABOUT, PRIVACY } from './pages';
import type { Card } from './pages';
import { Panel, usePainted } from './ui';
import { Link } from './router';
import * as api from './api';

/* ── The pages every visitor might need ───────────────────────────────
   Privacy, about and status, in the bench's own furniture.

   The words are not written here. The privacy policy and the about page are
   read out of the served site's own shells and dictionaries by a script, and
   this file only draws what that produced: a second, hand-typed copy of what
   a site promises about data is a copy that will disagree with the first
   one, and the disagreement gets found by somebody who trusted the wrong
   half. The status page has no prose to copy - it is whatever /api/status
   says at the moment it is read. */

/** One card of a policy: a title bar, and blocks of paragraphs and lists. */
function PolicyCard({ t, card }: { t: T; card: Card }) {
  return (
    <section className="p" id={card.head?.replace('.', '-')}>
      {card.head && (
        <div className="p-bar">
          <h2 className="m-0 flex items-center gap-2.5 font-[inherit] text-[inherit] font-medium tracking-[inherit]">
            <span className="dot" />
            <span>{t(card.head)}</span>
          </h2>
          {card.tag && <b className="shrink-0 font-medium normal-case tracking-normal text-faint">{t(card.tag)}</b>}
        </div>
      )}
      <div className="p-body px-[clamp(16px,2vw,26px)] py-[clamp(16px,1.8vw,24px)]">
        {card.blocks.map((block, i) =>
          block.t === 'ul' ? (
            <ul key={i} className="policy-list">
              {block.items.map((item) =>
                item.href ? (
                  <li key={item.k}>
                    {/* A route of this prototype stays inside it; everything
                        else is the served site or somebody else's, and says so
                        with a new tab. */}
                    {item.href.startsWith('/') && !HERE.has(item.href) ? (
                      <a href={`${api.SITE}${item.href}`} {...api.OUT}>{t(item.k)} ↗</a>
                    ) : item.href.startsWith('/') ? (
                      <Link to={item.href}>{t(item.k)}</Link>
                    ) : (
                      <a href={item.href} target="_blank" rel="noopener">{t(item.k)}</a>
                    )}
                  </li>
                ) : (
                  <li key={item.k} dangerouslySetInnerHTML={{ __html: t(item.k) }} />
                ),
              )}
            </ul>
          ) : (
            <p
              key={i}
              className={block.t === 'note'
                ? 'mono mt-5 border-t border-line pt-4 text-[11px] leading-relaxed text-faint'
                : 'policy-p'}
              dangerouslySetInnerHTML={{ __html: t(block.k) }}
            />
          ),
        )}
      </div>
    </section>
  );
}

/** The addresses this prototype answers itself. Everything else in a policy's
 *  links points at the served site. */
const HERE = new Set(['/', '/news', '/privacy', '/about', '/status']);

function PolicyPage({ t, cards, eyebrow, h1, lede, foot }: {
  t: T; cards: Card[]; eyebrow: string; h1: string; lede: string; foot?: React.ReactNode;
}) {
  return (
    <main className="feedgrid">
      <div className="grid gap-[var(--gap)]">
        {cards.map((card, i) => <PolicyCard key={card.head ?? i} t={t} card={card} />)}
      </div>

      <div className="stick grid gap-[var(--gap)]">
        <Panel title={t(eyebrow)} area="">
          <h1 className="display text-[clamp(1.5rem,2.2vw,2rem)]">{t(h1)}</h1>
          <p className="mt-3 text-[13px] leading-snug text-dim" dangerouslySetInnerHTML={{ __html: t(lede) }} />
          {foot}
          {/* The index. On a page of seven cards of prose it is the one thing
              a reader arrives wanting: which of them answers the question
              they came with. */}
          <ul className="mt-5 grid list-none gap-1 border-t border-line pt-4 p-0">
            {cards.map((card) => card.head && (
              <li key={card.head}>
                <a
                  href={`#${card.head.replace('.', '-')}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(card.head!.replace('.', '-'))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="mono block truncate rounded px-2 py-1 text-[11px] text-faint no-underline hover:bg-panel-2 hover:text-amber"
                >
                  {t(card.head)}
                </a>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </main>
  );
}

export function PrivacyPage({ t }: { t: T }) {
  return (
    <PolicyPage
      t={t}
      cards={PRIVACY}
      eyebrow="priv.eyebrow"
      h1="priv.h1"
      lede="priv.lede"
      foot={
        <p className="mono mt-4 text-[11px] text-faint">
          {/* The archive of earlier revisions is a page of the served site and
              is not rebuilt here: a policy's history is a record, and a
              prototype has no business keeping a second copy of one. */}
          <a className="text-dim no-underline hover:text-amber" href={`${api.SITE}/privacy/history`} {...api.OUT}>
            {t('pol.see')} ↗
          </a>
        </p>
      }
    />
  );
}

export function AboutPage({ t }: { t: T }) {
  return <PolicyPage t={t} cards={ABOUT} eyebrow="abt.eyebrow" h1="abt.h1" lede="abt.lede" />;
}

/* ── /status ──────────────────────────────────────────────────────────
   Three lights and two columns of figures, read from the service's own
   public payload. Nothing here is filtered in the browser: /api/status is
   what the api publishes, and /healthz - the operator's one, with the gate's
   counters and the ban table in it - is a different address that this page
   has never asked for. */
type Full = api.Status & {
  ok?: boolean;
  started_at?: number;
  steam?: { budget?: string; budget_used?: number; community?: string; cooling_for?: number };
  known?: api.Status['known'] & {
    games?: number; reviewed?: number; warm?: number;
    art?: { count?: number; bytes?: number };
  };
  traffic?: {
    addresses?: number; requests?: number; lookups?: number;
    weeks?: { began_at: number; addresses: number; requests: number }[];
  };
};

function Light({ name, state, tone, detail }: { name: string; state: string; tone: string; detail?: string }) {
  const colour = tone === 'bad' ? 'bg-[#ff7a5c]' : tone === 'warn' ? 'bg-amber' : 'bg-[#5ee08a]';
  return (
    <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line px-4 py-3.5 last:border-b-0">
      <span className={`h-2 w-2 shrink-0 self-center rounded-full ${colour}`} />
      <span className="mono text-[11px] uppercase tracking-[.12em] text-faint">{name}</span>
      <b className="text-[14px] font-semibold text-text">{state}</b>
      {detail && <span className="mono ml-auto text-[11px] text-faint">{detail}</span>}
    </li>
  );
}

export function StatusPage({ t, lang }: { t: T; lang: string }) {
  const [data, setData] = useState<Full | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    api.status()
      .then((out) => { if (alive) setData(out as Full); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, []);

  const locale = LOCALES[lang as Lang];
  const num = (n: number | undefined) => (typeof n === 'number' ? n.toLocaleString(locale) : '-');
  const day = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  /* The bars are six weeks of one year and the column is six characters
     wide: the year is the part of that date nobody is reading, and in
     ru-RU it is also the part that wraps the label onto a second line. */
  const short = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });

  const steam = data?.steam ?? {};
  const known = data?.known ?? {};
  const traffic = data?.traffic ?? {};
  const weeks = traffic.weeks ?? [];
  const busiest = Math.max(1, ...weeks.map((w) => w.requests));
  /* Six bars whose width is a division, which the policy will not take as an
     attribute. The rows are the grid's children and the bar is inside each,
     so this paints the row and the row's own CSS carries it down. */
  const bars = usePainted<HTMLDivElement>(
    Object.fromEntries(weeks.map((w, i) => [i, { '--fill': `${(w.requests / busiest) * 100}%` }])),
    [weeks],
  );

  const figures: [string, string][] = [
    ['st.k_games', num(known.games)],
    ['st.k_detailed', num(known.detailed)],
    ['st.k_reviewed', num(known.reviewed)],
    ['st.k_catalogue', num(known.catalogue)],
    ['st.k_houses', num(known.houses)],
    ['st.k_deck', num(known.deck?.rated)],
    ['st.k_art', num(known.art?.count)],
    ['st.k_warm', num(known.warm)],
  ];

  return (
    <main className="feedgrid">
      <div className="grid gap-[var(--gap)]">
        <Panel title={t('st.steam')} area="" tight>
          {failed && <p className="mono px-4 py-5 text-[12px] text-faint">{t('st.failed')}</p>}
          {!data && !failed && <p className="mono px-4 py-5 text-[12px] text-faint">{t('st.reading')}</p>}
          {data && (
            <>
              <ul className="m-0 list-none p-0">
                <Light
                  name={t('st.l_site')}
                  state={t('st.up')}
                  tone="ok"
                  detail={data.started_at ? t('st.since', { d: day.format(new Date(data.started_at * 1000)) }) : undefined}
                />
                <Light
                  name={t('st.l_budget')}
                  state={t(steam.budget === 'spent' ? 'st.budget_spent' : steam.budget === 'tight' ? 'st.budget_tight' : 'st.budget_normal')}
                  tone={steam.budget === 'spent' ? 'bad' : steam.budget === 'tight' ? 'warn' : 'ok'}
                  detail={t('st.budget_used', { n: Math.round(steam.budget_used ?? 0) })}
                />
                <Light
                  name={t('st.l_community')}
                  state={t(steam.community === 'ok' ? 'st.community_ok' : 'st.community_cooling')}
                  tone={steam.community === 'ok' ? 'ok' : 'warn'}
                  detail={steam.community !== 'ok' && steam.cooling_for
                    ? t('st.cooling_for', { n: Math.round(steam.cooling_for) })
                    : undefined}
                />
              </ul>
              <p className="mono border-t border-line px-4 py-3 text-[11px] leading-relaxed text-faint">
                {t('st.budget_note')}
              </p>
            </>
          )}
        </Panel>

        {data && (
          <Panel title={t('st.known')} area="" tight>
            <dl className="m-0 grid grid-cols-2 gap-px bg-line p-0 sm:grid-cols-4">
              {figures.map(([key, value]) => (
                <div key={key} className="bg-panel px-4 py-3.5">
                  <dd className="mono m-0 text-[clamp(1.1rem,1.6vw,1.5rem)] leading-none text-amber">{value}</dd>
                  <dt className="mono mt-1.5 text-[10px] leading-tight text-faint">{t(key)}</dt>
                </div>
              ))}
            </dl>
            <p className="mono border-t border-line px-4 py-3 text-[11px] leading-relaxed text-faint">{t('st.known_note')}</p>
          </Panel>
        )}

        {data && (
          <Panel title={t('st.week')} area="" tight>
            <dl className="m-0 grid grid-cols-3 gap-px bg-line p-0">
              {([['st.w_requests', traffic.requests], ['st.w_addresses', traffic.addresses], ['st.w_lookups', traffic.lookups]] as const).map(([key, value]) => (
                <div key={key} className="bg-panel px-4 py-3.5">
                  <dd className="mono m-0 text-[clamp(1.1rem,1.6vw,1.5rem)] leading-none text-amber">{num(value)}</dd>
                  <dt className="mono mt-1.5 text-[10px] leading-tight text-faint">{t(key)}</dt>
                </div>
              ))}
            </dl>

            {weeks.length > 0 && (
              <div className="border-t border-line px-4 py-4">
                <p className="mono mb-3 text-[10px] uppercase tracking-[.12em] text-faint">{t('st.weeks_past')}</p>

                {/* Two numbers per row, and they are not the same thing: the
                    bar and the first are requests, the second is addresses.
                    The served site carries that in a title attribute, which
                    is a legend nobody sees without a mouse and a reason to
                    hover - and the first person to read this asked what the
                    second column was. A header row costs one line, once. */}
                <div className="mono mb-2 flex items-end gap-3 text-[9.5px] leading-tight text-faint">
                  <span className="w-[4.5rem] shrink-0" />
                  <span className="flex-1" />
                  <span className="w-[4.5rem] shrink-0 text-right">{t('st.w_requests')}</span>
                  <span className="w-[4rem] shrink-0 text-right">{t('st.w_addresses')}</span>
                </div>

                <div ref={bars} className="grid gap-2">
                  {weeks.map((week) => (
                    <div key={week.began_at} className="flex items-center gap-3">
                      <span className="mono w-[4.5rem] shrink-0 whitespace-nowrap text-[10.5px] text-faint">
                        {short.format(new Date(week.began_at * 1000))}
                      </span>
                      <span className="h-[6px] flex-1 overflow-hidden rounded bg-[#26232f]">
                        <i className="week-bar block h-full rounded bg-amber/70" />
                      </span>
                      <span className="mono w-[4.5rem] shrink-0 text-right text-[11px] text-dim">{num(week.requests)}</span>
                      <span className="mono w-[4rem] shrink-0 text-right text-[11px] text-faint">{num(week.addresses)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="mono border-t border-line px-4 py-3 text-[11px] leading-relaxed text-faint">{t('st.week_note')}</p>
          </Panel>
        )}
      </div>

      <div className="stick grid gap-[var(--gap)]">
        <Panel title={t('st.eyebrow')} area="">
          <h1 className="display text-[clamp(1.5rem,2.2vw,2rem)]">{t('st.h1')}</h1>
          <p className="mt-3 text-[13px] leading-snug text-dim">{t('st.lede')}</p>
          <p className="mono mt-4 border-t border-line pt-4 text-[11px]">
            <Link to="/privacy" className="text-dim no-underline hover:text-amber">{t('st.privacy')}</Link>
          </p>
        </Panel>
      </div>
    </main>
  );
}
