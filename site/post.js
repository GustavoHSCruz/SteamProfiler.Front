/* steamprofiler.org - one post.

   The slug is the path, the same way a profile is: nginx serves this shell for
   every /blog/<slug> and the script reads location.pathname.

   The text arrives as the owner typed it and is turned into elements here,
   node by node, with textContent - never innerHTML. That is not caution about
   the author, who is the only person who can write a post; it is that a page
   built out of createElement cannot be made to execute anything by a stray
   angle bracket in a sentence about HTML, and this blog will contain sentences
   about HTML. It also keeps the site's CSP honest: script-src 'self' means
   what it says on this page too. */

const slug = decodeURIComponent(location.pathname).split('/').filter(Boolean)[1] || '';

/* ── The little marker set ─────────────────────────────────────────────
   Not markdown, and deliberately not: it is the six things a post here
   actually needs, each of which maps onto one element. Anything unrecognised
   stays as the characters that were typed, which is the right answer for a
   post that is quoting the syntax rather than using it. */

/** Only three shapes of href are ever emitted: same-site, http(s), and an
 *  anchor. Anything else - javascript:, data:, a bare word - is left as text,
 *  so a mistyped link reads as a mistyped link and not as a surprise. */
function safeHref(url) {
  const raw = (url || '').trim();
  if (/^(https?:\/\/|\/(?!\/)|#)/i.test(raw)) return raw;
  return null;
}

const INLINE = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\))/g;

/** `**bold**`, `*italic*`, `` `code` `` and `[text](url)`, into `into`. */
function inlineInto(into, text) {
  let at = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > at) into.append(txt(text.slice(at, m.index)));
    const token = m[0];
    at = m.index + token.length;
    if (token.startsWith('**')) {
      into.append(h('b', { text: token.slice(2, -2) }));
    } else if (token.startsWith('`')) {
      into.append(h('code', { text: token.slice(1, -1) }));
    } else if (token.startsWith('[')) {
      const cut = token.indexOf('](');
      const label = token.slice(1, cut);
      const href = safeHref(token.slice(cut + 2, -1));
      if (href) {
        const a = h('a', { attr: { href }, text: label });
        if (/^https?:/i.test(href)) a.setAttribute('rel', 'noopener noreferrer');
        into.append(a);
      } else {
        into.append(txt(token));
      }
    } else {
      into.append(h('em', { text: token.slice(1, -1) }));
    }
  }
  if (at < text.length) into.append(txt(text.slice(at)));
  return into;
}

const line = (tag, cls, text) => inlineInto(h(tag, cls ? { cls } : {}), text);

/** The whole body, block by block. Fenced code is read first and verbatim:
 *  inside it nothing is a marker, which is the entire point of having it. */
function renderProse(body, into) {
  const lines = (body || '').replace(/\r\n?/g, '\n').split('\n');
  let i = 0;

  const gather = (test, strip) => {
    const out = [];
    while (i < lines.length && test(lines[i])) out.push(strip(lines[i++]));
    return out;
  };

  while (i < lines.length) {
    const raw = lines[i];

    if (!raw.trim()) { i += 1; continue; }

    if (raw.startsWith('```')) {
      i += 1;
      const code = [];
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++]);
      i += 1;                                   // the closing fence, if it is there
      into.append(h('pre', {}, h('code', { text: code.join('\n') })));
      continue;
    }

    if (/^#{2,4}\s+/.test(raw)) {
      const depth = raw.match(/^#+/)[0].length;
      into.append(line(`h${Math.min(depth, 4)}`, 'prose-h', raw.replace(/^#+\s+/, '')));
      i += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(raw.trim())) {
      into.append(h('hr'));
      i += 1;
      continue;
    }

    if (/^[-*]\s+/.test(raw) || /^\d+\.\s+/.test(raw)) {
      const ordered = /^\d+\.\s+/.test(raw);
      const test = ordered ? (l) => /^\d+\.\s+/.test(l) : (l) => /^[-*]\s+/.test(l);
      const strip = (l) => l.replace(ordered ? /^\d+\.\s+/ : /^[-*]\s+/, '');
      const list = h(ordered ? 'ol' : 'ul', { cls: 'prose-list' });
      for (const item of gather(test, strip)) list.append(line('li', null, item));
      into.append(list);
      continue;
    }

    if (raw.startsWith('>')) {
      const quote = h('blockquote', { cls: 'prose-quote' });
      const said = gather((l) => l.startsWith('>'), (l) => l.replace(/^>\s?/, ''));
      quote.append(line('p', null, said.join(' ')));
      into.append(quote);
      continue;
    }

    // A paragraph runs until a blank line, and a single newline inside one is
    // a wrapped line rather than a break: prose typed in a textarea is full of
    // them and none of them were meant as <br>.
    const para = gather((l) => l.trim() && !/^(```|#{2,4}\s|[-*]\s|\d+\.\s|>)/.test(l), (l) => l);
    into.append(line('p', null, para.join(' ')));
  }
  return into;
}

/* ── The page ──────────────────────────────────────────────────────── */

function voteInto(node, item) {
  const votes = h('button', {
    cls: 'vote',
    attr: { type: 'button', title: t(item.voted ? 'msg.unvote' : 'blog.agree') },
    data: item.voted ? { on: '1' } : {},
  }, h('i', { text: '▲' }), h('b', { text: String(item.votes) }));

  const label = h('span', { cls: 'form-note', text: t('blog.agree') });

  votes.addEventListener('click', async () => {
    votes.disabled = true;
    try {
      const got = await post('/blog/vote', { slug: item.slug });
      votes.lastElementChild.textContent = String(got.votes);
      if (got.voted) votes.dataset.on = '1';
      else delete votes.dataset.on;
      votes.title = t(got.voted ? 'msg.unvote' : 'blog.agree');
    } catch (e) {
      label.textContent = e.message;
    }
    votes.disabled = false;
  });

  node.append(votes, label);
}

function navInto(node, item) {
  if (item.prev) {
    node.append(h('a', { cls: 'post-step', attr: { href: `/blog/${item.prev.slug}` } },
      h('span', { cls: 'post-step-dir', text: t('blog.prev') }),
      h('b', { text: item.prev.title })));
  }
  if (item.next) {
    node.append(h('a', { cls: 'post-step post-step--next', attr: { href: `/blog/${item.next.slug}` } },
      h('span', { cls: 'post-step-dir', text: t('blog.next') }),
      h('b', { text: item.next.title })));
  }
}

(async () => {
  applyStatic();
  langSwitchInto(el('langs'));
  creditInto(el('credit-slot'));

  let item;
  try {
    item = await api(`/blog/post?slug=${encodeURIComponent(slug)}&lang=${LANG}`);
  } catch (e) {
    el('loading').hidden = true;
    el('failure').hidden = false;
    el('failure-text').textContent = e.message;
    return;
  }

  document.title = `${item.title} - steamprofiler.org`;
  el('loading').hidden = true;
  el('post').hidden = false;

  el('post-title').textContent = item.title;
  el('post-tags').textContent = item.tags.join(' · ');
  if (item.lede) {
    el('post-lede').hidden = false;
    el('post-lede').textContent = item.lede;
  }

  const dates = el('post-stamp');
  dates.append(txt(longDate((item.published_at || '').slice(0, 10)) || ''));
  if (item.updated_at && item.updated_at.slice(0, 10) !== (item.published_at || '').slice(0, 10)) {
    dates.append(txt(`  ·  ${t('blog.updated', { when: shortDate(item.updated_at.slice(0, 10)) })}`));
  }

  // Said on the page rather than left to be noticed: the reader asked for one
  // language and is being handed another, and the honest thing is to name it.
  if (!item.translated) {
    const note = el('post-lang');
    note.hidden = false;
    note.textContent = t('blog.not_translated', {
      want: t(`lang.${LANG}`), got: t(`lang.${item.lang}`),
    });
  }

  // Same principle one step further: the text is in your language, and a
  // machine put it there. Saying so costs nothing and is the difference
  // between a translation and a text pretending to have been written.
  if (item.machine) {
    const note = el('post-machine');
    note.hidden = false;
    note.textContent = t('blog.machine', { origin: t(`lang.${item.origin}`) });
  }

  renderProse(item.body, el('post-body'));
  voteInto(el('post-vote'), item);
  navInto(el('post-nav'), item);
})();
