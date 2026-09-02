/* steamprofiler.org - the policy archive.

   Reads POLICY_LOG (policy-log.js) and draws one block per revision, newest
   first, each with the diff against the one before it and the text it replaced.

   The diff is computed here rather than stored, so there is nothing to keep in
   step: the only thing this file trusts is the archived text itself, and if a
   revision were quietly altered the diff against its neighbours would say so.

   Two decisions worth stating, because they are the difference between an
   archive and a paraphrase of one:

   The diff runs over the prose with the markup taken out, because a reader
   comparing two policies wants to compare two sentences, not two strings with
   `<b>` in them. Everything it emits is a text node, never innerHTML, so a
   diff can never execute anything. The full-text view does use innerHTML, the
   same way /privacy does, because there the markup is the point.

   A change that touches only the markup would show as an empty diff, which
   would read as "nothing changed" - a small lie. So that case is detected and
   named rather than drawn. */

// The front repo, not the old combined one: SteamProfiler was split into
// .Front and .Api and the old name is a 404 now. It never showed while every
// revision had a null commit, which is how it stayed wrong this long.
const GITHUB = 'https://github.com/GustavoHSCruz/SteamProfiler.Front/commit/';

/** The archived strings of one revision. POLICY_LOG carries the dates and the
 *  summaries and is small enough for /privacy to load; the text lives apart in
 *  POLICY_TEXT, because it grows by 41 strings in three languages every time
 *  the policy is touched and only this page ever reads it. */
const textOf = (rev, lang) => (POLICY_TEXT[rev.version] || {})[lang] || {};

/* ── The diff ──────────────────────────────────────────────────────── */

/** Prose, with the tags taken out. Not a sanitiser - the input is our own
 *  dictionary - just the readable half of a string we wrote. */
function prose(s) {
  const box = document.createElement('div');
  box.innerHTML = s;
  return (box.textContent || '').replace(/\s+/g, ' ').trim();
}

/** Split keeping the whitespace, so rejoining is lossless. */
const words = (s) => s.split(/(\s+)/).filter((w) => w !== '');

/** Word-level diff, longest common subsequence. One policy paragraph against
 *  another is a few hundred tokens, so the plain O(n·m) table is some tens of
 *  thousands of cells - cheaper than being clever, and it reads. */
function diffWords(before, after) {
  const A = words(before), B = words(after);
  const n = A.length, m = B.length;
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    }
  }
  const out = [];
  // Runs rather than tokens: three deleted words in a row are one <del>, which
  // is what a person reads and a quarter of the elements.
  const push = (op, word) => {
    const last = out[out.length - 1];
    if (last && last[0] === op) last[1] += word;
    else out.push([op, word]);
  };
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) push('=', A[i++]), j++;
    else if (L[i + 1][j] >= L[i][j + 1]) push('-', A[i++]);
    else push('+', B[j++]);
  }
  while (i < n) push('-', A[i++]);
  while (j < m) push('+', B[j++]);
  return out;
}

/* ── The heading of a block ────────────────────────────────────────── */

/** What the paragraph is about, in words.
 *
 *  The key used to be the whole heading, on the argument that it is the stable
 *  name of that paragraph and a prettier label would be a second name for the
 *  same thing. The argument was right and the page was still wrong: a column of
 *  `priv.kept_lang` reads as a translation that failed to load, not as a
 *  policy. So the words come first now and the name stays beside them, which
 *  costs nothing and is still checkable against /privacy.
 *
 *  The label is read out of the text rather than kept in a table. Almost every
 *  one of these strings opens with a bold lead-in that is already the title of
 *  its paragraph, and a table would be one more thing to keep in step with a
 *  file that grows by 41 strings every time the policy is touched. */
function labelFor(text) {
  const lead = /^\s*<b>([\s\S]*?)<\/b>/i.exec(text || '');
  if (lead) return prose(lead[1]).replace(/[.:;,]\s*$/, '');
  const flat = prose(text || '');
  if (flat.length <= 58) return flat;
  return `${flat.slice(0, 58).replace(/\s+\S*$/, '')}…`;
}

/** The line above a block: the label, the key, and the tag when there is one.
 *  A removed key has no `after`, so the label comes from whichever side exists;
 *  if neither does there is nothing to name and the key carries the line. */
function keyHead(key, text, tag) {
  const label = labelFor(text);
  return h('h3', { cls: 'dk-h' },
    label ? h('span', { cls: 'dk-name', text: label }) : null,
    h('code', { text: key }),
    tag ? h('span', { cls: 'dk-tag', text: t(`pol.${tag}`) }) : null);
}

/** One changed key, drawn. Text nodes only. */
function diffLine(key, before, after) {
  const body = h('p', { cls: 'dk-text' });
  const a = prose(before == null ? '' : before);
  const b = prose(after == null ? '' : after);

  if (a === b) {
    // Same sentence, different markup - a link added, a word emboldened. Saying
    // "nothing changed" here would be false, and drawing an empty diff would
    // look like it.
    body.append(h('em', { cls: 'dk-only', text: t('pol.markup_only') }));
  } else {
    for (const [op, text] of diffWords(a, b)) {
      if (op === '=') body.append(txt(text));
      else if (op === '-') body.append(h('del', { text }));
      else body.append(h('ins', { text }));
    }
  }

  const tag = before == null ? 'added' : after == null ? 'removed' : 'changed';
  return h('section', { cls: 'dk', data: { kind: tag } },
    keyHead(key, after == null ? before : after, tag),
    body);
}

/** Every key that differs between two revisions, in the reader's language. */
function changedKeys(prev, rev) {
  const a = prev ? textOf(prev, LANG) : {};
  const b = textOf(rev, LANG);
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  return keys.filter((k) => a[k] !== b[k]);
}

/* ── The revisions ─────────────────────────────────────────────────── */

function fullInto(node, rev) {
  const text = textOf(rev, LANG);
  for (const key of Object.keys(text).sort()) {
    node.append(h('section', { cls: 'dk' },
      keyHead(key, text[key], null),
      // innerHTML on purpose: this view exists to show the policy as it read,
      // and it read with its links and its bold. Same treatment /privacy gives
      // the same strings.
      h('p', { cls: 'dk-text', html: text[key] })));
  }
}

function revisionInto(root, rev, prev, isLatest) {
  const changed = prev ? changedKeys(prev, rev) : [];
  const body = h('div', { cls: 'rev-body' });

  const panel = h('article', { cls: 'panel rev' },
    h('div', { cls: 'panel-bar' },
      h('span', { text: t('pol.rev', { n: rev.version, date: longDate(rev.date) }) }),
      h('b', { text: isLatest ? t('pol.current') : t('pol.superseded') })),
    h('div', { cls: 'panel-body' },
      h('p', { cls: 'card-body', text: (rev.summary || {})[LANG] || (rev.summary || {}).en || '' }),
      h('p', { cls: 'form-note' }, rev.commit
        ? h('a', {
            cls: 'rev-commit', text: t('pol.commit', { sha: rev.commit.slice(0, 7) }),
            attr: { href: GITHUB + rev.commit, rel: 'noopener noreferrer', target: '_blank' },
          })
        : h('em', { text: t('pol.no_commit') })),
      body));

  // The first revision has nothing behind it, so there is one view and no
  // switch. Everything after it opens on what changed, because that is the
  // question somebody came to this page with.
  if (prev) {
    const tabs = h('div', { cls: 'rev-tabs' });
    const show = (mode) => {
      body.textContent = '';
      for (const b of tabs.children) b.dataset.on = b.dataset.mode === mode ? '1' : '';
      if (mode === 'full') return fullInto(body, rev);
      if (!changed.length) return body.append(h('p', { cls: 'dk-none', text: t('pol.no_change') }));
      const a = textOf(prev, LANG), b = textOf(rev, LANG);
      for (const key of changed) body.append(diffLine(key, a[key], b[key]));
    };
    for (const mode of ['diff', 'full']) {
      const b = h('button', { cls: 'btn btn--quiet', text: t(`pol.${mode}`), attr: { type: 'button' } });
      b.dataset.mode = mode;
      b.addEventListener('click', () => show(mode));
      tabs.append(b);
    }
    panel.querySelector('.panel-body').insertBefore(tabs, body);
    panel.querySelector('.panel-bar b').textContent =
      `${isLatest ? t('pol.current') : t('pol.superseded')} · ${t('pol.n_changed', { n: changed.length, raw: changed.length })}`;
    show('diff');
  } else {
    fullInto(body, rev);
  }

  root.append(panel);
}

/* ── Boot ──────────────────────────────────────────────────────────── */

(() => {
  applyStatic();
  langSwitchInto(el('langs'));
  creditInto(el('credit-slot'));

  const root = el('log');
  const log = (typeof POLICY_LOG === 'undefined' ? [] : POLICY_LOG)
    .slice().sort((a, b) => a.version - b.version);

  if (!log.length) {
    el('none').hidden = false;
    return;
  }
  // Newest first: the current policy is what a reader is standing in front of,
  // and the history is what they scroll down into.
  for (let i = log.length - 1; i >= 0; i--) {
    revisionInto(root, log[i], i > 0 ? log[i - 1] : null, i === log.length - 1);
  }
})();
