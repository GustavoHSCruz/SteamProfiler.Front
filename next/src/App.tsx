import { useEffect, useMemo, useRef, useState } from 'react';
import { LANGS, LANG_NAMES, loadDict, pickLang, translator } from './i18n';
import { boot, SERVER } from './boot';
import type { Lang } from './i18n';
import { Doors, Emb, Ext, Find, Live, Map, News, Parts, Rail } from './panels';
import { NewsPage, PostPage } from './news';
import { AboutPage, PrivacyPage, StatusPage } from './pages-view';
import { Link, usePath } from './router';
import { Select } from './ui-kit/react';
import * as api from './api';
import { SITE_VERSION } from './site-version';

/* The bench: a status bar, nine panels tiled under it, and a legal line.
   No scroll narrative, no band that is one idea and half a screen of air.
   What moves is what the reader is pointing at, what they have focused, and
   the four numbers on their way in from the service. */
/* Every address this cut draws itself. Anything else falls through to the
   bench, which is also what a mistyped path gets: a front page is a better
   answer to a wrong address than a page saying it was wrong. */
const ROUTED = /^\/(news|privacy|about|status)(\/|$)/;

export default function App() {
  const path = usePath();
  /* boot.lang is the language the served file was rendered in, and the
     dictionary for it is already loaded; the first render has to match the
     markup, so it starts there even when the stored choice says otherwise. */
  const [lang, setLangNow] = useState<Lang>(boot.lang);
  const setLang = (next: Lang) => { loadDict(next).then(() => setLangNow(next)); };

  /* A reader whose choice disagrees with the file that arrived - a cookie that
     was refused, or a first visit guessed from the browser - is switched after
     the hydration, not during it. */
  useEffect(() => {
    if (SERVER) return;
    const wanted = pickLang();
    if (wanted !== boot.lang) setLang(wanted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [live, setLive] = useState<api.Status | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const t = useMemo(() => translator(lang), [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
    try { localStorage.setItem('sp-lang', lang); } catch { /* the cookie below still works */ }
    /* The server picks which prerendered file to serve from this cookie, the
       same way it already picks which dictionary to send. Writing it here is
       what makes the next visit arrive already in the right language instead
       of arriving in English and correcting itself. */
    document.cookie = `sp-lang=${lang};path=/;max-age=31536000;samesite=lax`;
  }, [lang]);

  /* Only the bench draws the four counts, so only the bench asks for them.
     /status asks for the same payload on its own and gets the same promise
     back, so moving between the two is still one request. */
  const onBench = !ROUTED.test(path);
  useEffect(() => {
    if (!onBench) return;
    let alive = true;
    api.status().then((out) => alive && setLive(out)).catch(() => alive && setLive(null));
    return () => { alive = false; };
  }, [onBench]);

  /* The two panels that offer a lookup do not go anywhere themselves: they
     hand the caret to the field in the corner, which is the only address bar
     this page has. */
  const toField = () => {
    input.current?.focus();
    input.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  return (
    <>
      <header className="sticky top-0 z-40 flex h-[42px] items-center justify-between gap-4 border-b border-line bg-ink/80 px-3 backdrop-blur-xl md:px-4">
        <Link to="/" className="sp-wordmark">
          steamprofiler<span>.org</span>
        </Link>
        <nav className="font-mono flex items-center gap-1.5 overflow-x-auto text-[11px] [scrollbar-width:none]">
          {/* The addresses this cut answers itself are routes; the rest are
              the served site and open where they live. */}
          {([['w.news', '/news'], ['abt.eyebrow', '/about'], ['st.eyebrow', '/status'], ['priv.eyebrow', '/privacy']] as const).map(([key, to]) => (
            <Link
              key={to}
              to={to}
              aria-current={path.startsWith(to) ? 'page' : undefined}
              className={`sp-pill sp-pill--quiet ${to === '/news' ? '' : 'hidden sm:inline-flex'}`}
            >
              {t(key)}
            </Link>
          ))}
          {[['nav.blog', '/blog'], ['nav.messages', '/feedback'], ['nav.support', '/support']].map(([key, href]) => (
            <a
              key={href}
              href={`${api.SITE}${href}`} {...api.OUT}
              className="sp-pill sp-pill--quiet hidden lg:inline-flex"
            >
              {t(key)}
            </a>
          ))}
          <Select
            pill
            className="ml-1"
            value={lang}
            aria-label={t('w.lang')}
            onChange={(e) => setLang(e.target.value as Lang)}
          >
            {LANGS.map((l) => (
              <option key={l} value={l}>{LANG_NAMES[l]}</option>
            ))}
          </Select>
        </nav>
      </header>

      {path === '/privacy' && <PrivacyPage t={t} />}
      {path === '/about' && <AboutPage t={t} />}
      {path === '/status' && <StatusPage t={t} lang={lang} />}
      {path === '/news' && <NewsPage t={t} lang={lang} />}
      {path.startsWith('/news/') && <PostPage t={t} lang={lang} id={decodeURIComponent(path.slice('/news/'.length))} />}
      {onBench && (
        <main className="bench">
          <Find t={t} inputRef={input} />
          <Map t={t} />
          <Live t={t} lang={lang} live={live} />
          <Rail t={t} />
          <News t={t} lang={lang} />
          <Doors t={t} />
          <Ext t={t} />
          <Emb t={t} onLookup={toField} />
          <Parts t={t} />
        </main>
      )}

      {/* Outside the bench, because it is not a panel: it is the line every
          public page of this project carries, and the links that go with it. */}
      <footer className="px-3 pb-5 pt-1 md:px-4">
        <p className="font-mono flex flex-wrap gap-x-5 gap-y-1 text-[10.5px]">
          {[
            [t('foot.example'), `${api.SITE}/u/gordziilla`],
            [t('nav.blog'), `${api.SITE}/blog`],
            [t('foot.bugs_ideas'), `${api.SITE}/feedback`],
            [t('nav.extension'), `${api.SITE}/extension`],
            [t('nav.support'), `${api.SITE}/support`],
            [t('nav.terms'), `${api.SITE}/terms`],

            [t('foot.front_repo'), 'https://github.com/GustavoHSCruz/SteamProfiler.Front'],
            [t('foot.api_repo'), 'https://github.com/GustavoHSCruz/SteamProfiler.Api'],
          ].map(([label, href]) => (
            <a key={href} href={href} target="_blank" rel="noopener" className="text-dim no-underline hover:text-amber">
              {label}
            </a>
          ))}
        </p>
        <p className="font-mono mt-2 text-[10px] text-faint">
          {t('foot.site_version')} · {SITE_VERSION.commit ? (
            <a href={`https://github.com/GustavoHSCruz/SteamProfiler.Front/commit/${SITE_VERSION.commit}`} target="_blank" rel="noopener noreferrer" className="text-dim no-underline hover:text-amber">
              {SITE_VERSION.commit.slice(0, 7)}
            </a>
          ) : 'local'}
          {SITE_VERSION.dirty && <> · {t('foot.local_changes')}</>}
        </p>
        <p className="font-mono mt-2.5 max-w-[120ch] text-[10px] leading-relaxed text-faint">{t('foot.disclaimer')}</p>
      </footer>
    </>
  );
}
