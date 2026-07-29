/* steamprofiler.org - the blog index. One card per published post.

   The list is asked for in the reader's language and the server answers with
   whichever text it actually has, saying which of the two that was. So a post
   written only in English still appears on the Portuguese index, with the note
   on it, rather than quietly not existing for that reader. */

/* One vote per address per post, toggled. Same contract as the message board,
   and the same weakness, which the page states under the list. */
function voteButton(item) {
  const votes = h('button', {
    cls: 'vote',
    attr: { type: 'button', title: t(item.voted ? 'msg.unvote' : 'blog.agree') },
    data: item.voted ? { on: '1' } : {},
  }, h('i', { text: '▲' }), h('b', { text: String(item.votes) }));

  votes.addEventListener('click', async () => {
    votes.disabled = true;
    try {
      const got = await post('/blog/vote', { slug: item.slug });
      votes.lastElementChild.textContent = String(got.votes);
      if (got.voted) votes.dataset.on = '1';
      else delete votes.dataset.on;
      votes.title = t(got.voted ? 'msg.unvote' : 'blog.agree');
    } catch (e) {
      votes.title = e.message;
    }
    votes.disabled = false;
  });
  return votes;
}

function cardFor(item) {
  const meta = h('p', { cls: 'card-meta' },
    txt(shortDate((item.published_at || '').slice(0, 10)) || ''),
    // Only when it is actually a different date. "published today, updated
    // today" is noise on every fresh post.
    item.updated_at && item.updated_at.slice(0, 10) !== (item.published_at || '').slice(0, 10)
      ? txt(`  ·  ${t('blog.updated', { when: shortDate(item.updated_at.slice(0, 10)) })}`)
      : null,
    item.translated ? null : txt(`  ·  ${t('blog.in_original', { lang: t(`lang.${item.lang}`) })}`));

  const head = h('div', { cls: 'card-head' },
    h('a', { cls: 'card-title post-link', attr: { href: `/blog/${item.slug}` }, text: item.title }));
  for (const tag of item.tags) head.append(h('span', { cls: 'tag', text: tag }));

  return h('article', { cls: 'card' },
    voteButton(item),
    h('div', {}, head,
      item.excerpt ? h('p', { cls: 'card-body', text: item.excerpt }) : null,
      meta));
}

(async () => {
  applyStatic();
  langSwitchInto(el('langs'));
  creditInto(el('credit-slot'));

  let items = [];
  try {
    ({ items } = await api(`/blog?lang=${LANG}`));
  } catch (e) {
    el('post-count').textContent = t('blog.unavailable');
    el('posts-empty').hidden = false;
    el('posts-empty').textContent = e.message;
    return;
  }

  el('post-count').textContent = items.length
    ? (items.length === 1 ? t('blog.count_one') : t('blog.count', { n: items.length }))
    : t('blog.count_none');
  el('posts-empty').hidden = items.length > 0;

  const box = el('posts');
  for (const item of items) box.append(cardFor(item));
})();
