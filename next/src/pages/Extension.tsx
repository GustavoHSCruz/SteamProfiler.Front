import { Panel } from '../ui-kit/react';
import { BarNote, Sheet } from '../sheet';
import { Link } from '../router';
import type { T } from '../i18n';
import type { PageProps } from '../routes';
import './extension.css';

/* /extension: SteamProfiler Companion, what it draws on a store page, the
   whole of what it may touch, and how to install it while it is not in the
   stores. Nothing live on the page. */

/* The panel as it appears on a store page. The numbers are made up, which is
   why the caption says it is drawn rather than fetched: nothing else on this
   site prints a figure it did not read, and a picture of a panel is the one
   place where the alternative is an empty box. */
function Drawn({ t }: { t: T }) {
  return (
    <figure className="m-0">
      <div className="cmp-panel" aria-hidden="true">
        <div className="cmp-head">
          <div className="cmp-identity">
            <span className="cmp-mark">SP</span>
            <div>
              <p className="cmp-kicker">{t('ext.pv_kicker')}</p>
              <p className="cmp-title">Portal 2</p>
            </div>
          </div>
          <span className="cmp-brand">steamprofiler.org</span>
        </div>
        <div className="cmp-metrics">
          {[['9,142', 'ext.pv_players'], ['98%', 'ext.pv_positive'], ['352,714', 'ext.pv_reviews'], ['2011', 'ext.pv_release']].map(([n, k]) => (
            <div key={k} className="cmp-metric"><strong>{n}</strong><span>{t(k)}</span></div>
          ))}
        </div>
        <div className="cmp-insights">
          <div className="cmp-insight">
            <span>{t('ext.pv_review_xray')}</span>
            <strong><b>98%</b> <i>{t('ext.pv_all')}</i> · <b>94%</b> <i>{t('ext.pv_recent')}</i></strong>
            <em>{t('ext.pv_review_down')}</em>
          </div>
          <div className="cmp-insight">
            <span>{t('ext.pv_activity')}</span>
            <strong>{t('ext.pv_activity_value')}</strong>
            <em>{t('ext.pv_activity_age')}</em>
          </div>
          <div className="cmp-insight">
            <span>{t('ext.pv_audience')}</span>
            <strong>{t('ext.pv_audience_value')}</strong>
          </div>
          <div className="cmp-insight cmp-personal">
            <span>{t('ext.pv_mine')}</span>
            <strong>{t('ext.pv_mine_off')}</strong>
            <em>{t('ext.pv_mine_note')}</em>
          </div>
        </div>
        <div className="cmp-actions">
          <span className="cmp-btn cmp-btn--primary">{t('ext.pv_open')}</span>
          <span className="cmp-btn">{t('ext.pv_trailer')}</span>
        </div>
      </div>
      <figcaption className="font-mono mt-2.5 text-[11px] text-faint">{t('ext.pv_note')}</figcaption>
    </figure>
  );
}

const Html = ({ as: As = 'p', k, t }: { as?: 'p' | 'li'; k: string; t: T }) =>
  <As className={As === 'p' ? 'policy-p' : undefined} dangerouslySetInnerHTML={{ __html: t(k) }} />;

export default function Extension({ t }: PageProps) {
  return (
    <Sheet eyebrow={t('ext.eyebrow')} h1={t('ext.h1')} lede={t('ext.lede')}>
      <Drawn t={t} />

      <Panel title={t('ext.draws')} action={<BarNote>{t('ext.draws_tag')}</BarNote>}>
        {['ext.draws_1', 'ext.draws_2', 'ext.draws_3'].map((k) => <Html key={k} k={k} t={t} />)}
      </Panel>

      <Panel title={t('ext.asks')} action={<BarNote>{t('ext.asks_tag')}</BarNote>}>
        <Html k="ext.asks_1" t={t} />
        <ul className="policy-list">
          {['ext.asks_pages', 'ext.asks_call', 'ext.asks_profile', 'ext.asks_prefs', 'ext.asks_never'].map((k) => <Html key={k} as="li" k={k} t={t} />)}
        </ul>
      </Panel>

      <Panel title={t('ext.get')} action={<BarNote>{t('ext.get_tag')}</BarNote>}>
        <Html k="ext.get_stores" t={t} />
        <ul className="policy-list">
          {['ext.get_chrome', 'ext.get_firefox'].map((k) => <Html key={k} as="li" k={k} t={t} />)}
        </ul>
        <p className="font-mono mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-faint">{t('ext.get_note')}</p>
      </Panel>

      <Panel title={t('ext.links')} action={<BarNote>{t('ext.links_tag')}</BarNote>}>
        <ul className="policy-list">
          <li><a href="https://github.com/GustavoHSCruz/SteamProfiler.Companion" target="_blank" rel="noopener">{t('ext.repo')}</a></li>
          <li><a href="https://github.com/GustavoHSCruz/SteamProfiler.Companion/blob/main/PRIVACY.md" target="_blank" rel="noopener">{t('ext.repo_privacy')}</a></li>
          <li><Link to="/privacy">{t('ext.site_privacy')}</Link></li>
          <li><Link to="/feedback">{t('ext.say')}</Link></li>
        </ul>
        <p className="font-mono mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-faint">{t('ext.note')}</p>
      </Panel>
    </Sheet>
  );
}
