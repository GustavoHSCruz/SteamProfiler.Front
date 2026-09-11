import { useEffect, useMemo, useRef, useState } from 'react';
import { LANGS, LANG_NAMES, pickLang, translator } from './copy';
import { boot, SERVER } from './boot';
import type { Lang } from './copy';
import { Doors, Emb, Ext, Find, Live, Map, News, Parts, Rail } from './panels';
import { NewsPage, PostPage } from './news';
import { AboutPage, PrivacyPage, StatusPage } from './pages-view';
import { Link, usePath } from './router';
import * as api from './api';

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
  const [lang, setLang] = useState<Lang>(() => (SERVER ? boot.lang : pickLang()));
  const [live, setLive] = useState<api.Status | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const t = useMemo(() => translator(lang), [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
    localStorage.setItem('sp-lang', lang);
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
        <Link to="/" className="mono flex items-center gap-2.5 text-[12.5px] font-semibold text-text no-underline">
          <span className="dot" />
          steamprofiler<span className="font-normal text-faint">.org</span>
        </Link>
        <nav className="mono flex items-center gap-1.5 overflow-x-auto text-[11px] [scrollbar-width:none]">
          {/* The addresses this cut answers itself are routes; the rest are
              the served site and open where they live. */}
          {([['w.news', '/news'], ['abt.eyebrow', '/about'], ['st.eyebrow', '/status'], ['priv.eyebrow', '/privacy']] as const).map(([key, to]) => (
            <Link
              key={to}
              to={to}
              className={`whitespace-nowrap rounded-full border px-3 py-1 no-underline transition-colors ${
                path.startsWith(to)
                  ? 'border-amber-d bg-amber/10 text-amber'
                  : 'border-line text-dim hover:border-line-2 hover:text-text'
              } ${to === '/news' ? '' : 'hidden sm:inline-block'}`}
            >
              {t(key)}
            </Link>
          ))}
          {[['nav.blog', '/blog'], ['nav.messages', '/feedback'], ['nav.support', '/support']].map(([key, href]) => (
            <a
              key={href}
              href={`${api.SITE}${href}`} {...api.OUT}
              className="hidden whitespace-nowrap rounded-full border border-line px-3 py-1 text-dim no-underline transition-colors hover:border-line-2 hover:text-text lg:inline-block"
            >
              {t(key)}
            </a>
          ))}
          <select
            className="lang ml-1"
            value={lang}
            aria-label={t('w.lang')}
            onChange={(e) => setLang(e.target.value as Lang)}
          >
            {LANGS.map((l) => (
              <option key={l} value={l}>{LANG_NAMES[l]}</option>
            ))}
          </select>
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
        <p className="mono flex flex-wrap gap-x-5 gap-y-1 text-[10.5px]">
          {[
            [t('foot.example'), `${api.SITE}/u/gordziilla`],
            [t('nav.blog'), `${api.SITE}/blog`],
            [t('foot.bugs_ideas'), `${api.SITE}/feedback`],
            [t('nav.extension'), `${api.SITE}/extension`],
            [t('nav.support'), `${api.SITE}/support`],

            [t('foot.front_repo'), 'https://github.com/GustavoHSCruz/SteamProfiler.Front'],
            [t('foot.api_repo'), 'https://github.com/GustavoHSCruz/SteamProfiler.Api'],
          ].map(([label, href]) => (
            <a key={href} href={href} target="_blank" rel="noopener" className="text-dim no-underline hover:text-amber">
              {label}
            </a>
          ))}
        </p>
        <p className="mono mt-2.5 max-w-[120ch] text-[10px] leading-relaxed text-faint">{t('foot.disclaimer')}</p>
      </footer>
    </>
  );
}
