/* steamprofiler.org - shared helpers. Loaded first on every page.
   The CSP forbids inline style attributes, so geometry always goes through the
   CSSOM (el.style.x = ...), never through innerHTML. */

const num = (n, d = 0) =>
  n == null ? '-' : n.toLocaleString(locale(), { minimumFractionDigits: d, maximumFractionDigits: d });

/* Dates go through Intl rather than a hardcoded month table, so all three
   languages get their own month names and their own word order for free. */
const SHORT_FMT = new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short', year: 'numeric' });
const LONG_FMT = new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'long', year: 'numeric' });
const STAMP_FMT = new Intl.DateTimeFormat(locale(), {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

/** '2026-06-23' formatted for the active language. Parsed as a plain date, at
 *  noon UTC, so no timezone can shift it onto the day before. */
function asDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d, 12));
}
const shortDate = (iso) => { const d = asDate(iso); return d ? SHORT_FMT.format(d) : null; };
/** Day and month, without the year. For the one page where every row is inside
 *  the same year already: repeating it five times says nothing and is the
 *  difference between a date that fits its column and one that wraps. */
const DAY_FMT = new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short' });
const dayMonth = (iso) => { const d = asDate(iso); return d ? DAY_FMT.format(d) : null; };
const longDate = (iso) => { const d = asDate(iso); return d ? LONG_FMT.format(d) : null; };
const stamp = (iso) => (iso ? STAMP_FMT.format(new Date(iso)) : '');

/** Steam rarity goes well below a tenth of a percent, and rounding those to
 *  "0,0%" reads as a bug rather than as "almost nobody has this". */
const rarity = (r) => (r == null ? '-' : r > 0 && r < 0.05 ? '<0,1%' : `${num(r, 1)}%`);

/** Hours, readable at both ends of the scale: a game with 1.4 h should not read
 *  "1 h", and 5.901 h has no business showing a decimal. */
const hrs = (n) => (n == null ? '-' : n < 10 ? num(n, 1) : num(n, 0));
/** "1 hora" / "1,4 horas" / "5.901 horas". */
const hoursText = (n) => `${hrs(n)} ${n === 1 ? 'hora' : 'horas'}`;

/** Money, in the currency the store quoted rather than in one assumed here.
 *  The prices are the Brazilian store's, so a reader in another language still
 *  sees BRL - that is the number that is true, and relabelling it would not
 *  make it theirs. */
const CASH = {};
function cash(cents, currency) {
  if (cents == null) return '-';
  const cur = currency || 'BRL';
  CASH[cur] = CASH[cur] || new Intl.NumberFormat(locale(), {
    style: 'currency', currency: cur, maximumFractionDigits: 2,
  });
  return CASH[cur].format(cents / 100);
}

/** What someone typed, reduced to the one thing a /u/ path should carry: a
 *  vanity name or a steamID64. People paste the profile URL far more often than
 *  they read the name out of it, and both Steam shapes hold the handle in the
 *  same place:
 *
 *    https://steamcommunity.com/id/gordziilla/
 *    https://steamcommunity.com/profiles/76561198086380973/
 *
 *  Whatever is not a URL comes back trimmed and untouched. This decides what
 *  the address bar looks like, not what exists - the API still answers that. */
function steamHandle(text) {
  const s = (text || '').trim();
  const m = /steamcommunity\.com\/(?:id|profiles)\/([A-Za-z0-9_-]{2,64})/i.exec(s);
  return m ? m[1] : s;
}

/** decodeURIComponent throws on a half-written escape, and a URL somebody
 *  trimmed by hand is exactly where that happens. A path segment that cannot be
 *  decoded is still worth reading as it stands. */
function unesc(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

const el = (id) => document.getElementById(id);
const still = () => !window.matchMedia('(prefers-reduced-motion: no-preference)').matches;

/** Terse element builder. `style` goes through the CSSOM, never an attribute. */
function h(tag, opts = {}, ...kids) {
  const e = document.createElement(tag);
  if (opts.cls) e.className = opts.cls;
  if (opts.text != null) e.textContent = opts.text;
  if (opts.html != null) e.innerHTML = opts.html;
  for (const [k, v] of Object.entries(opts.attr || {})) e.setAttribute(k, v);
  for (const [k, v] of Object.entries(opts.data || {})) e.dataset[k] = v;
  for (const [k, v] of Object.entries(opts.style || {})) e.style.setProperty(k, v);
  for (const kid of kids) if (kid) e.append(kid);
  return e;
}

/** append(), without the surprise in it.
 *
 *  `Element.append(null)` does not skip the null: it stringifies it, and the
 *  word "null" lands on the page as text. h() has always skipped falsy
 *  children - `for (const kid of kids) if (kid)` - so a block built with h()
 *  was safe and the same helper appended one at a time was not. That is how
 *  "null" showed up under a price: priceRate() returns null for a game with
 *  no hours on the clock, and the line below the figure appended it directly.
 *
 *  Same courtesy as h(), for the places that append outside of it. */
function put(parent, ...kids) {
  for (const kid of kids) if (kid) parent.append(kid);
  return parent;
}

const txt = (s) => document.createTextNode(s);

/** A bar that fills to `pct`, measured out once unless stillness was asked for. */
function fillBar(cls, pct, delay = 0) {
  const bar = h('div', { cls });
  const i = h('i');
  i.style.width = `${Math.max(0, Math.min(100, pct || 0))}%`;
  if (!still()) {
    bar.dataset.animate = '1';
    i.style.animationDelay = `${delay}ms`;
  }
  bar.append(i);
  return bar;
}

/** Where a game's small header picture lives. Steam's CDN and not /art/: that
 *  one caches `library_hero.jpg`, which is 400 KB and belongs on a page opened
 *  to look at one game. A row of cover thumbnails is 40 KB each and lazy. */
const HEADER_ART = 'https://cdn.cloudflare.steamstatic.com/steam/apps';

/* ── Treemap ───────────────────────────────────────────────────────
   Squarified layout (Bruls, Huizing & van Wijk): fill the shorter side of the
   remaining rectangle with a row of cells, and close the row as soon as adding
   one more would make its aspect ratios worse. Keeping cells near-square is the
   only way a map of this many games stays readable.

   Shared rather than owned by the dashboard, because the landing page draws the
   same map out of the snapshot in demo.js. Both hand it `{value, item}` in
   descending order and get back rectangles in the same box. */

function squarify(items, x0, y0, w0, h0) {
  const out = [];
  const total = items.reduce((s, i) => s + i.value, 0);
  if (!total || w0 <= 0 || h0 <= 0) return out;

  const scale = (w0 * h0) / total;
  let x = x0, y = y0, w = w0, h = h0;
  const queue = items.slice();
  let row = [];
  let rowArea = 0;

  /** Worst aspect ratio in a row of these areas laid along a side of `len`. */
  const worst = (areas, sum, len) => {
    if (!areas.length || sum <= 0) return Infinity;
    let mx = -Infinity, mn = Infinity;
    for (const a of areas) { if (a > mx) mx = a; if (a < mn) mn = a; }
    const s2 = sum * sum, l2 = len * len;
    return Math.max((l2 * mx) / s2, s2 / (l2 * mn));
  };

  const flush = () => {
    if (!row.length) return;
    const len = Math.min(w, h);
    const thick = rowArea / len;
    let off = 0;
    for (const r of row) {
      const side = (r.area / rowArea) * len;
      if (w >= h) out.push({ item: r.item, x, y: y + off, w: thick, h: side });
      else out.push({ item: r.item, x: x + off, y, w: side, h: thick });
      off += side;
    }
    if (w >= h) { x += thick; w = Math.max(0, w - thick); }
    else { y += thick; h = Math.max(0, h - thick); }
    row = [];
    rowArea = 0;
  };

  while (queue.length) {
    const it = queue[0];
    const area = it.value * scale;
    const len = Math.min(w, h);
    if (len <= 0) break;
    const areas = row.map((r) => r.area);
    if (!row.length || worst(areas, rowArea, len) >= worst(areas.concat(area), rowArea + area, len)) {
      row.push({ item: it.item, area });
      rowArea += area;
      queue.shift();
    } else {
      flush();
    }
  }
  flush();
  return out;
}

/* ── The API ───────────────────────────────────────────────────────── */

/** GET a JSON endpoint. Throws an Error carrying the server's own message,
 *  which is written for the visitor rather than for a log. */
async function api(path, headers = {}) {
  const r = await fetch(`/api${path}`, { headers: { Accept: 'application/json', ...headers } });
  let body = null;
  try {
    body = await r.json();
  } catch {
    /* fall through to the status-based message */
  }
  if (!r.ok) {
    // The API answers with a key, not a sentence - translate it here so every
    // call site gets a message in the reader's language for free.
    const err = new Error(ts((body && body.error) || '') || t('err.request', { status: r.status }));
    err.status = r.status;
    throw err;
  }
  return body;
}

/** POST JSON and read JSON back. Same error contract as api(). */
async function post(path, body, headers = {}) {
  const r = await fetch(`/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  let out = null;
  try {
    out = await r.json();
  } catch {
    /* fall through to the status-based message */
  }
  if (!r.ok) {
    const err = new Error(ts((out && out.error) || '') || t('err.failed', { status: r.status }));
    err.status = r.status;
    throw err;
  }
  return out;
}

/** Copy text to the clipboard. The Clipboard API only exists in a secure
 *  context, and this site runs on plain HTTP until TLS is in front of it, so
 *  the fallback selects the text and says what to press. */
async function copy(text, node) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return t('copy.done');
    }
  } catch {
    /* fall through */
  }
  if (node) {
    const range = document.createRange();
    range.selectNodeContents(node);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
  return t('copy.select');
}

/* ── Footer credit ─────────────────────────────────────────────────── */

/** "made with ♥ by <persona>" - the persona is whatever Steam shows today, so
 *  it is read live rather than written into the page. */
async function creditInto(node) {
  if (!node) return;
  let owner;
  try {
    owner = await api('/owner');
  } catch {
    return; // The footer keeps its plain fallback text.
  }
  const a = h('a', { cls: 'credit', attr: { href: owner.url, title: t('credit.see_stats') } });
  if (owner.avatar) {
    a.append(h('img', {
      cls: 'credit-face',
      attr: { src: owner.avatar, alt: '', width: '20', height: '20', loading: 'lazy' },
    }));
  }
  a.append(
    h('span', { cls: 'credit-text' },
      txt(`${t('credit.made')} `),
      h('i', { cls: 'credit-heart', text: '♥' }),
      txt(` ${t('credit.by')} `),
      h('b', { text: owner.persona })),
  );
  node.textContent = '';
  node.append(a);
}
