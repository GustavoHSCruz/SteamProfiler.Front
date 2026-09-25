import { Empty, Notice, Panel, Tag } from '../ui-kit/react';
import { BarNote, Sheet } from '../sheet';
import { Link } from '../router';
import { failure, formats, useApi } from '../lib';
import { Vote } from '../vote';
import type { PageProps } from '../routes';

/* /blog: one row per published post.

   The list is asked for in the reader's language and the server answers with
   whichever text it has, saying which of the two that was. So a post written
   only in English still appears on the Portuguese index, with the note on it,
   rather than quietly not existing for that reader. The address comes with
   each row for the same reason: a post has one per language, and which one
   this reader should be handed is a question for the side holding the
   titles. */

export type PostCard = {
  pid: number;
  url: string;
  title: string;
  excerpt?: string;
  tags: string[];
  lang: string;
  translated: boolean;
  published_at?: string;
  updated_at?: string;
  votes: number;
  voted?: boolean;
};

export default function Blog({ t, lang }: PageProps) {
  const [got] = useApi<{ items: PostCard[] }>(`/blog?lang=${lang}`);
  const { shortDate } = formats(lang);
  const items = got.state === 'ok' ? got.data.items : [];
  const count = got.state === 'failed' ? t('blog.unavailable')
    : got.state === 'loading' ? '-'
    : !items.length ? t('blog.count_none')
    : items.length === 1 ? t('blog.count_one') : t('blog.count', { n: items.length });

  return (
    <Sheet
      eyebrow={t('blog.eyebrow')}
      h1={t('blog.h1')}
      lede={t('blog.lede')}
      side={
        /* The vote is counted per address today, and the page says so
           rather than implying it is one per person. */
        <p className="font-mono mt-4 border-t border-line pt-3 text-[10.5px] leading-relaxed text-faint" dangerouslySetInnerHTML={{ __html: t('blog.vote_note') }} />
      }
    >
      <Panel title={t('blog.posts_bar')} action={<BarNote>{count}</BarNote>} tight>
        {got.state === 'failed' && <Notice tone="bad" className="m-4">{failure(t, got.error)}</Notice>}
        {got.state === 'ok' && !items.length && <Empty className="m-4">{t('blog.empty')}</Empty>}
        {items.map((item) => {
          const published = (item.published_at ?? '').slice(0, 10);
          const updated = (item.updated_at ?? '').slice(0, 10);
          return (
            <article key={item.pid} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 border-b border-line px-4 py-3.5 last:border-b-0">
              <Vote t={t} endpoint="/blog/vote" body={{ key: item.pid }} votes={item.votes} voted={item.voted} agree={t('blog.agree')} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={item.url} className="sp-display text-[17px] leading-tight text-text no-underline hover:text-amber">{item.title}</Link>
                  {item.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}
                </div>
                {item.excerpt && <p className="policy-p mt-1.5">{item.excerpt}</p>}
                <p className="font-mono mt-1.5 text-[10.5px] text-faint">
                  {shortDate(published)}
                  {/* Only when it is actually a different day: "published
                      today, updated today" is noise on every fresh post. */}
                  {updated && updated !== published && `  ·  ${t('blog.updated', { when: shortDate(updated) })}`}
                  {!item.translated && `  ·  ${t('blog.in_original', { lang: t(`lang.${item.lang}`) })}`}
                </p>
              </div>
            </article>
          );
        })}
      </Panel>
    </Sheet>
  );
}
