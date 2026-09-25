import { Panel } from '../ui-kit/react';
import { BarNote, Sheet } from '../sheet';
import { Link } from '../router';
import { usePainted } from '../ui';
import { formats } from '../lib';
import COVERAGE from '../i18n/coverage';
import type { Lang, T } from '../i18n';
import type { PageProps } from '../routes';

/* /translate: how much of the site each language has, and what it takes to
   add one. The counts are a file, not a request - SteamProfiler.i18n's build
   writes them beside the dictionaries, because that build is the last place
   that still knows which half of a language was translated and which half
   fell back to English. */

/* What the picker called them before it spelled them out; this list keeps
   the short form because the full name follows it on the same line. */
const SHORT: Record<string, string> = { en: 'EN', pt: 'PT', ru: 'RU', 'zh-cn': '简', 'zh-tw': '繁' };

type Bar = { name: string; title?: string; pct: number; figure: string; note: string; lead?: boolean };

/** Name, bar, figure. The widths are painted on mount: the page is served
 *  under a policy that refuses a style attribute, and this is prerendered. */
function Bars({ rows }: { rows: Bar[] }) {
  const box = usePainted<HTMLDivElement>(
    Object.fromEntries(rows.map((r, i) => [i, { '--w': `${Math.max(0, Math.min(100, r.pct))}%` }])),
    [rows.map((r) => r.pct).join()],
  );
  return (
    <div ref={box} className="grid">
      {rows.map((r) => (
        <div key={r.name} className="grid grid-cols-[minmax(8rem,14rem)_minmax(0,1fr)_auto] items-center gap-3 border-b border-line py-2.5 last:border-b-0">
          <span className={`truncate text-[13px] ${r.lead ? 'text-text' : 'text-dim'}`} title={r.title}>{r.name}</span>
          <span className="relative h-1.5 overflow-hidden rounded-full bg-panel-2">
            <i className={`absolute inset-y-0 left-0 w-[var(--w,0%)] rounded-full ${r.lead ? 'bg-amber' : 'bg-amber-d'}`} />
          </span>
          <span className="font-mono text-right text-[12px] text-text">
            {r.figure} <em className="not-italic text-faint">{r.note}</em>
          </span>
        </div>
      ))}
    </div>
  );
}

function Html({ k, t, as: As = 'p' }: { k: string; t: T; as?: 'p' | 'li' }) {
  return <As className={As === 'p' ? 'policy-p' : undefined} dangerouslySetInnerHTML={{ __html: t(k) }} />;
}

export default function Translate({ t, lang }: PageProps) {
  const { num } = formats(lang as Lang);
  const total = COVERAGE.keys;

  const languages: Bar[] = COVERAGE.languages.map((l) => {
    const left = total - l.done;
    return {
      name: `${SHORT[l.code] ?? l.code.toUpperCase()} · ${t(`lang.${l.code}`)}`,
      title: t('tr.count', { done: num(l.done), total: num(total) }),
      pct: total ? Math.round((l.done / total) * 100) : 0,
      figure: `${total ? Math.round((l.done / total) * 100) : 0}%`,
      note: l.code === 'en' ? t('tr.source') : left ? t('tr.left', { n: num(left) }) : t('tr.whole'),
      /* The source leads the list and everything else is measured against
         it, so it is the row that reads at full strength. */
      lead: l.code === 'en',
    };
  });

  /* A share of the whole site rather than of the largest group: against the
     largest, the top bar is always full no matter how much of the site it is,
     which is the one number this list exists to give. */
  const weights: Bar[] = COVERAGE.groups.map((g) => ({
    name: t(`tr.grp_${g.id}`),
    pct: total ? (g.keys / total) * 100 : 0,
    figure: num(g.keys),
    note: `${total ? Math.round((g.keys / total) * 100) : 0}%`,
  }));

  const note = 'font-mono mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-faint';

  return (
    <Sheet eyebrow={t('tr.eyebrow')} h1={t('tr.h1')} lede={t('tr.lede')}>
      <Panel title={t('tr.state')} action={<BarNote>{t('tr.state_tag')}</BarNote>}>
        <Bars rows={languages} />
        <p className={note}>{t('tr.state_note')}</p>
        <p className="font-mono mt-2 text-[11px] leading-relaxed text-faint">{t('tr.embed_note', { n: num(COVERAGE.embed.words) })}</p>
      </Panel>

      <Panel title={t('tr.weight')} action={<BarNote>{t('tr.weight_tag')}</BarNote>}>
        <Bars rows={weights} />
        <p className={note}>{t('tr.weight_note')}</p>
      </Panel>

      <Panel title={t('tr.how')} action={<BarNote>{t('tr.how_tag')}</BarNote>}>
        <ol className="policy-list list-decimal">
          {['tr.how_1', 'tr.how_2', 'tr.how_3', 'tr.how_4'].map((k) => <Html key={k} as="li" k={k} t={t} />)}
        </ol>
      </Panel>

      <Panel title={t('tr.rules')} action={<BarNote>{t('tr.rules_tag')}</BarNote>}>
        <ul className="policy-list">
          {['tr.rules_ph', 'tr.rules_tags', 'tr.rules_plural'].map((k) => <Html key={k} as="li" k={k} t={t} />)}
        </ul>
        <p className={note}>{t('tr.rules_line')}</p>
      </Panel>

      <Panel title={t('tr.links')} action={<BarNote>{t('tr.links_tag')}</BarNote>}>
        <ul className="policy-list">
          <li><a href="https://github.com/GustavoHSCruz/SteamProfiler.i18n" target="_blank" rel="noopener">{t('tr.repo')}</a></li>
          <li><a href="https://github.com/GustavoHSCruz/SteamProfiler.i18n/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener">{t('tr.contributing')}</a></li>
          <li><Link to="/feedback">{t('tr.say')}</Link></li>
        </ul>
        <p className={note}>{t('tr.note')}</p>
      </Panel>
    </Sheet>
  );
}
