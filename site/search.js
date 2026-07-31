/* steamprofiler.org - the landing page. One job: turn what someone typed into a URL.

   The profile is resolved here rather than after navigating, so a typo answers
   in place instead of loading a page that only then says it failed. */

applyStatic();
langSwitchInto(el('langs'));

const form = el('find');
const input = el('q');
const button = el('find-go');
const error = el('find-error');

/* ── What you looked up before ──────────────────────────────────────────
   Five handles in localStorage, newest first, and nothing else: no time, no
   persona, no avatar, no count. The list exists because typing a steamID64
   twice is a thing this site made somebody do, and it stops exactly there -
   anything richer would be a profile of the person reading, kept by a site
   whose whole argument is that it does not keep one.

   It never leaves the browser. The server is not told the list exists, and a
   name only reaches it when it is clicked, as the lookup it would have been
   anyway. Written after the handle resolved, so a typo is never remembered. */
const RECENT_KEY = 'sp-recent';
const RECENT_MAX = 5;

function recentRead() {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((q) => typeof q === 'string' && q).slice(0, RECENT_MAX) : [];
  } catch {
    // A hand-edited or half-written entry is not worth a broken landing page.
    return [];
  }
}

function recentWrite(list) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
  } catch {
    // Private windows and full quotas both land here. The lookup still works;
    // it is only the remembering that does not.
  }
}

function recentAdd(q) {
  // Case-insensitively, because a vanity name typed with a capital is the same
  // profile and two rows saying so is the list wasting its five slots.
  const kept = recentRead().filter((old) => old.toLowerCase() !== q.toLowerCase());
  recentWrite([q, ...kept]);
}

function recentDraw() {
  const box = el('recent');
  const list = el('recent-list');
  if (!box || !list) return;
  const items = recentRead();
  box.hidden = !items.length;
  list.textContent = '';
  for (const q of items) {
    list.append(h('li', {},
      h('a', { cls: 'recent-chip', attr: { href: `/u/${encodeURIComponent(q)}` }, text: q })));
  }
}

el('recent-clear')?.addEventListener('click', () => {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch { /* nothing to remove is the state being asked for anyway */ }
  recentDraw();
  input.focus();
});

recentDraw();

function complain(message) {
  error.hidden = false;
  error.textContent = message;
  input.focus();
  input.select();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  // A pasted profile URL becomes the name inside it before it ever reaches the
  // address bar: the whole URL would go in percent-encoded, which is neither
  // readable nor shareable, and its slashes would read as extra path segments.
  const q = steamHandle(input.value);
  error.hidden = true;

  if (!q) {
    complain(t('land.empty'));
    return;
  }

  button.disabled = true;
  button.textContent = t('land.searching');
  try {
    // Only to check it exists; the URL keeps the name, not a steamid, so it
    // stays readable.
    await api(`/resolve?q=${encodeURIComponent(q)}`);
    // After it resolved and before leaving: what gets remembered is a profile
    // that exists, never a typo somebody is still fixing.
    recentAdd(q);
    location.assign(`/u/${encodeURIComponent(q)}`);
  } catch (err) {
    complain(err.message);
    button.disabled = false;
    button.textContent = t('land.go');
  }
});

creditInto(el('credit-slot'));
