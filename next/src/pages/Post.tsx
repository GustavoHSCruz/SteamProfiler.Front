import { useEffect, useState } from 'react';
import { Notice, Panel } from '../ui-kit/react';
import { Link } from '../router';
import { failure, formats, useApi } from '../lib';
import { Prose } from '../prose';
import { Vote } from '../vote';
import type { PageProps } from '../routes';

/* /blog/<id>/<title>: one post.

   Only the id is asked about. The title after it is the post's own title in
   some language, there to be read before the click and ignored after it -
   which is what makes a link work when it was made in a language the person
   opening it does not read. What they get is their language, and the address
   bar is then corrected to match, without a reload: see the replaceState. */

type Step = { url: string; title: string };
type Post = {
  pid: number;
  url: string;
  title: string;
  lede?: string;
  body: string;
  tags: string[];
  lang: string;
  translated: boolean;
  machine?: boolean;
  published_at?: string;
  updated_at?: string;
  votes: number;
  voted?: boolean;
  prev?: Step | null;
  next?: Step | null;
};

export default function PostPage({ t, lang, path }: PageProps) {
  const key = path.split('/').filter(Boolean)[1] ?? '';
  const [got] = useApi<Post>(`/blog/post?key=${encodeURIComponent(key)}&lang=${lang}`);
  const { shortDate, longDate } = formats(lang);
  const [said, setSaid] = useState<string | null>(null);
  const item = got.state === 'ok' ? got.data : null;

  useEffect(() => {
    if (!item) return;
    document.title = `${item.title} - steamprofiler.org`;
    /* The address bar, put right: the post that arrived is in this reader's
       language and has an address of its own in it, which is almost never the
       one they clicked. replaceState and not a redirect - the text is already
       here, and the back button should not get an entry for it. */
    if (item.url && item.url !== window.location.pathname) {
      window.history.replaceState(null, '', item.url + window.location.search + window.location.hash);
    }
  }, [item]);

  if (got.state === 'failed') {
    return (
      <main className="feedgrid">
        <Panel title={t('blog.eyebrow')}>
          <h1 className="sp-display text-[clamp(1.5rem,2.2vw,2rem)]">{failure(t, got.error)}</h1>
          <p className="mt-3"><Link to="/blog" className="text-amber">{t('blog.all')}</Link></p>
        </Panel>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="feedgrid">
        <Panel title={t('blog.eyebrow')}><p className="font-mono text-[12px] text-faint" aria-busy="true">{t('blog.loading')}</p></Panel>
      </main>
    );
  }

  const published = (item.published_at ?? '').slice(0, 10);
  const updated = (item.updated_at ?? '').slice(0, 10);

  return (
    <main className="feedgrid">
      <article className="min-w-0">
        <Panel title={item.tags.join(' · ') || t('blog.eyebrow')}>
          <header className="mx-auto max-w-[72ch]">
            <h1 className="sp-display text-[clamp(1.7rem,3vw,2.6rem)] leading-[1.05]">{item.title}</h1>
            {item.lede && <p className="mt-3 text-[16px] leading-snug text-dim">{item.lede}</p>}
            <p className="font-mono mt-3 text-[11px] text-faint">
              {longDate(published)}
              {updated && updated !== published && `  ·  ${t('blog.updated', { when: shortDate(updated) })}`}
            </p>
            {/* Two different admissions, so two lines: one says you are
                reading another language than you asked for, the other says a
                machine wrote the words. A post can owe the reader both. */}
            {!item.translated && (
              <Notice className="mt-3">{t('blog.not_translated', { want: t(`lang.${lang}`), got: t(`lang.${item.lang}`) })}</Notice>
            )}
            {item.machine && <Notice className="mt-3">{t('blog.machine')}</Notice>}
          </header>
          <div className="mx-auto mt-6 max-w-[72ch]">
            <Prose body={item.body} />
          </div>
        </Panel>
      </article>

      <aside className="stick grid content-start gap-[var(--gap)]">
        <Panel title={t('blog.agree')}>
          <div className="flex items-center gap-3">
            <Vote t={t} endpoint="/blog/vote" body={{ key: item.pid }} votes={item.votes} voted={item.voted} agree={t('blog.agree')} onError={setSaid} />
            <span className="font-mono text-[11px] text-faint">{said ?? t('blog.agree')}</span>
          </div>
          <p className="font-mono mt-4 border-t border-line pt-3 text-[10.5px] leading-relaxed text-faint" dangerouslySetInnerHTML={{ __html: t('blog.vote_note') }} />
        </Panel>
        <Panel title={t('blog.eyebrow')} tight>
          <nav className="grid">
            {[['prev', item.prev], ['next', item.next]].map(([dir, step]) => step && typeof step === 'object' && (
              <Link key={dir as string} to={step.url} className="grid gap-0.5 border-b border-line px-4 py-3 no-underline hover:bg-panel-2">
                <span className="font-mono text-[10px] uppercase tracking-[.12em] text-faint">{t(`blog.${dir}`)}</span>
                <b className="text-[13.5px] font-semibold text-text">{step.title}</b>
              </Link>
            ))}
            <Link to="/blog" className="font-mono px-4 py-3 text-[11px] text-amber no-underline hover:bg-panel-2">{t('blog.all')}</Link>
          </nav>
        </Panel>
      </aside>
    </main>
  );
}
