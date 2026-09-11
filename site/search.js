/* steamprofiler.org - the landing page. One job: turn what someone typed into a URL.

   The profile is resolved here rather than after navigating, so a typo answers
   in place instead of loading a page that only then says it failed. */

applyStatic();
langSwitchInto(el('langs'));

const form = el('find');
const input = el('q');
const button = el('find-go');
const error = el('find-error');
const results = el('game-results');
let kind = 'profile';
let gameItems = [];
let gameIndex = -1;
let searchTimer = 0;
let searchSerial = 0;

function gameClose() {
  results.hidden = true;
  results.textContent = '';
  input.setAttribute('aria-expanded', 'false');
  gameItems = [];
  gameIndex = -1;
}

function gameSelect(index) {
  gameIndex = index;
  results.querySelectorAll('a').forEach((a, i) => a.setAttribute('aria-selected', String(i === index)));
  results.querySelectorAll('a')[index]?.scrollIntoView({ block: 'nearest' });
}

function gameDraw(items) {
  gameItems = items;
  results.textContent = '';
  for (const item of items) {
    results.append(h('li', { cls: 'game-result', attr: { role: 'option' } },
      h('a', { attr: { href: `/g/${item.appid}`, 'aria-selected': 'false' } },
        h('span', { text: item.name }), h('small', { text: `app ${item.appid}` }))));
  }
  results.hidden = !items.length;
  input.setAttribute('aria-expanded', String(Boolean(items.length)));
  gameIndex = -1;
}

async function gameSuggest() {
  const q = input.value.trim();
  if (kind !== 'game' || q.length < 2) return gameClose();
  const serial = ++searchSerial;
  try {
    const out = await api(`/game/search?q=${encodeURIComponent(q)}`);
    if (serial !== searchSerial || kind !== 'game' || input.value.trim() !== q) return;
    gameDraw(out.items || []);
  } catch { if (serial === searchSerial) gameClose(); }
}

function setKind(next) {
  kind = next;
  document.querySelectorAll('.find-kind-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.kind === kind)));
  el('find-label').textContent = t(kind === 'game' ? 'land.game_field' : 'land.field');
  input.placeholder = t(kind === 'game' ? 'land.game_placeholder' : 'land.placeholder');
  button.textContent = t(kind === 'game' ? 'land.game_go' : 'land.go');
  el('find-help').innerHTML = t(kind === 'game' ? 'land.game_help' : 'land.help');
  error.hidden = true;
  input.value = '';
  searchSerial += 1;
  gameClose();
  input.focus();
}

document.querySelectorAll('.find-kind-btn').forEach((b) => b.addEventListener('click', () => setKind(b.dataset.kind)));
input.addEventListener('input', () => {
  if (kind !== 'game') return;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(gameSuggest, 180);
});
input.addEventListener('keydown', (e) => {
  if (kind !== 'game' || results.hidden) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const step = e.key === 'ArrowDown' ? 1 : -1;
    gameSelect((gameIndex + step + gameItems.length) % gameItems.length);
  } else if (e.key === 'Enter' && gameIndex >= 0) {
    e.preventDefault();
    location.assign(`/g/${gameItems[gameIndex].appid}`);
  } else if (e.key === 'Escape') gameClose();
});
document.addEventListener('click', (e) => { if (!form.contains(e.target)) gameClose(); });

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
  if (kind === 'game') {
    const raw = input.value.trim();
    if (gameIndex >= 0) return location.assign(`/g/${gameItems[gameIndex].appid}`);
    if (/^\d{1,8}$/.test(raw) && raw !== '0') return location.assign(`/g/${raw}`);
    if (gameItems.length === 1) return location.assign(`/g/${gameItems[0].appid}`);
    complain(t('land.game_choose'));
    return;
  }
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

/* ── The shape behind the field ────────────────────────────────────────
   A treemap of the proportions in demo.js, laid out by the same squarify()
   the dashboard runs, filling the tile the window floats on.

   Deliberately mute: no names, no figures, no links, no hover. It is not a
   library, it is the shape of one, and anything that invited a reader to point
   at a rectangle would be promising an answer that is not behind it. The one
   place a real library is drawn on this site is a profile page, and the field
   in the window is how you get there.

   Laid out against the box's measured size rather than a fixed one, and laid
   out again when that size changes, because squarify decides which rectangles
   sit beside which from the aspect ratio it is handed. */

const SHAPE_TOP = DEMO_SHAPE[0] || 1;

let demoDrawn = false;
function demoDraw() {
  const box = el('demo-map');
  if (!box) return;
  const W = box.clientWidth;
  const H = box.clientHeight;
  // Display:none, a zero-height parent, a print stylesheet: all of them land
  // here, and none of them is worth dividing by.
  if (!W || !H) return;

  const rects = squarify(DEMO_SHAPE.map((value) => ({ value, item: value })), 0, 0, W, H);
  // Once, on arrival. A relayout is somebody resizing a window they are
  // already looking at, and replaying the reveal at every step of that is the
  // page flinching rather than the page arriving.
  const animate = !still() && !demoDrawn;
  demoDrawn = true;
  box.textContent = '';
  box.dataset.animate = animate ? '1' : '0';

  rects.forEach((r, i) => {
    const node = h('div', { cls: 'cell' });
    node.style.left = `${(r.x / W) * 100}%`;
    node.style.top = `${(r.y / H) * 100}%`;
    node.style.width = `${(r.w / W) * 100}%`;
    node.style.height = `${(r.h / H) * 100}%`;

    // The dashboard's ramp runs to 0.97, and it can: its map is one tile in a
    // page. This one is the whole first screen, and at that size the top of
    // that ramp is a wall of amber with the site's violet-black nowhere in it.
    // Same curve, same order, three quarters of the ceiling.
    const alpha = 0.16 + 0.68 * Math.pow(r.item / SHAPE_TOP, 0.42);
    node.style.background = `rgba(255, 180, 84, ${alpha.toFixed(3)})`;

    // Biggest first, so the shape assembles the way it is read. Capped,
    // because seventy-two cells at 18ms each is over a second of a page still
    // arriving, and the last of them are specks nobody was waiting for.
    if (animate) node.style.animationDelay = `${Math.min(i * 16, 620)}ms`;
    box.append(node);
  });
}

/* Only on a real change of width. A phone hides and shows its address bar by
   changing the viewport height, which fires resize, and relaying the shape
   every time somebody scrolls is a page that flickers while being read. */
let demoWidth = 0;
let demoTimer = 0;
function demoResize() {
  const box = el('demo-map');
  if (!box) return;
  const w = box.clientWidth;
  if (w === demoWidth) return;
  demoWidth = w;
  clearTimeout(demoTimer);
  demoTimer = setTimeout(() => { demoDraw(); miniDraw(); }, 120);
}

/* ── The rail ──────────────────────────────────────────────────────────
   The list twice over, in one lane, moving by exactly half its own width: at
   the end of a pass the second copy is standing where the first one started,
   so the loop has no seam to hide. The duplicate is hidden from assistive
   technology - it is the same thirty-eight links a second time, and a reader
   tabbing through them should reach the end of the list once.

   Reduced motion turns the animation off in home.css and turns the strip into
   something that scrolls by hand, which is why the copy is appended either
   way: half a lane of blank space at the end would be the cost of dropping it,
   and nothing here is measured in the reader's attention. */

function railDraw() {
  const track = el('rail-track');
  if (!track) return;
  const lane = h('div', {
    cls: 'rail-lane', attr: { role: 'list', 'aria-labelledby': 'rail-head' },
  });
  if (!still()) lane.dataset.animate = '1';

  for (const pass of [0, 1]) {
    for (const [appid, name] of DEMO_RAIL) {
      const art = h('img', {
        attr: {
          src: `${HEADER_ART}/${appid}/capsule_231x87.jpg`, alt: '',
          width: '231', height: '87', decoding: 'async', fetchpriority: 'low',
        },
      });
      // An app old enough to have no capsule keeps its frame, empty, rather
      // than collapsing one card in a row of otherwise equal ones.
      art.addEventListener('error', () => { art.removeAttribute('src'); });
      lane.append(h('a', {
        cls: 'rail-card',
        attr: pass ? { href: `/g/${appid}`, 'aria-hidden': 'true', tabindex: '-1' }
                   : { href: `/g/${appid}`, role: 'listitem' },
      }, art, h('span', { cls: 'rail-name', text: name })));
    }
  }
  track.textContent = '';
  track.append(lane);
}

/* ── The ten ───────────────────────────────────────────────────────────
   The franchise screens, on the front page, as ten plates in their own
   colours. Built out of franchise-list.js rather than written into this file:
   that table is what the screens themselves are drawn from, so a franchise
   added there appears here without anybody having to remember this place.

   Not another rail. The rail is a strip that loops because the thing it shows
   has 157 members and no end worth reaching; this has ten, they fit, and a
   grid says "ten" the way a moving strip cannot.

   The picture is the storefront capsule and not the key art the screens use:
   `library_hero.jpg` is around 400 KB and there would be ten of them on the
   front page. A capsule is about fifteen. */

function fxsDraw() {
  const grid = el('fxs-grid');
  if (!grid || typeof FRANCHISES === 'undefined') return;

  grid.textContent = '';
  grid.setAttribute('role', 'list');
  grid.setAttribute('aria-labelledby', 'fxs-head');

  // A slice and not the whole table. There are enough of these that the grid
  // would be the front page rather than a way into it; the button under the
  // copy is what leads to all of them.
  for (const fr of FRANCHISES.slice(0, 10)) {
    const last = Math.max(...[...fr.apps, ...(fr.after || [])].map((a) => a.year));
    const total = fr.apps.length + (fr.after?.length || 0);

    const art = h('img', {
      cls: 'fxs-art',
      attr: {
        src: `${HEADER_ART}/${fr.flagship}/capsule_231x87.jpg`, alt: '',
        width: '231', height: '87', loading: 'lazy', decoding: 'async',
        fetchpriority: 'low',
      },
    });
    // A plate with no capsule keeps its frame and its colour, which is most of
    // what it was carrying anyway.
    art.addEventListener('error', () => art.remove(), { once: true });

    const plate = h('a', {
      cls: 'fxs-plate',
      attr: { href: `/franchises/${fr.slug}`, role: 'listitem' },
      style: { '--tint': fr.tint },
    });
    put(plate, art, h('span', { cls: 'fxs-veil' }),
      h('span', { cls: 'fxs-in' },
        h('b', { cls: 'fxs-name', text: fr.name }),
        h('span', { cls: 'fxs-span', text: t('fx.span', {
          from: fr.born, to: last, n: num(total), raw: total,
        }) })));
    grid.append(plate);
  }
}

/* ── The same shape, small ─────────────────────────────────────────────
   The first tile of "what a profile turns into" claims a library can be drawn
   to scale, and it is the one of the nine that can show it rather than say
   it. Same proportions as the stage and the same squarify(), a third of the
   rectangles, because seventy-two of them in a box that size is a texture and
   not a map. */

function miniDraw() {
  const box = el('surf-mini');
  if (!box) return;
  const W = box.clientWidth;
  const H = box.clientHeight;
  if (!W || !H) return;

  const shape = DEMO_SHAPE.slice(0, 26);
  const top = shape[0] || 1;
  box.textContent = '';
  for (const r of squarify(shape.map((value) => ({ value, item: value })), 0, 0, W, H)) {
    const node = h('div', { cls: 'cell' });
    node.style.left = `${(r.x / W) * 100}%`;
    node.style.top = `${(r.y / H) * 100}%`;
    node.style.width = `${(r.w / W) * 100}%`;
    node.style.height = `${(r.h / H) * 100}%`;
    node.style.background = `rgba(255, 180, 84, ${(0.18 + 0.62 * Math.pow(r.item / top, 0.42)).toFixed(3)})`;
    box.append(node);
  }
}

/* ── The chart the generator makes ────────────────────────────────────
   Drawn from the same proportions as the stage, for the same reason the stage
   uses them: a bar chart with names down the side would be somebody's library
   on the front page of the site. The curve is flattened harder than the map's
   because a bar is read against its neighbour and a power law drawn honestly
   is one bar and eight stubs. */

function embDraw() {
  const box = el('emb-chart');
  if (!box) return;
  const bars = DEMO_SHAPE.slice(0, 9);
  const top = bars[0] || 1;
  box.textContent = '';
  for (const value of bars) {
    const bar = h('i');
    bar.style.height = `${(14 + 86 * Math.pow(value / top, 0.42)).toFixed(1)}%`;
    box.append(bar);
  }
}

/* ── What it knows right now ──────────────────────────────────────────
   Four counts out of /api/status, which is the service's own public payload.
   Nothing about anybody is in it and nothing here is about a profile: how
   much of Steam has been read in full, how much of the catalogue is known,
   how many companies are behind it, how many are graded for the Deck.

   The panel stays hidden until they arrive and stays hidden if they never do.
   A front page whose first tile is four dashes and an error is worse than a
   front page with three tiles, and nothing else on this page needs the
   service to be up. */

async function liveDraw() {
  const panel = el('live');
  const body = el('live-body');
  if (!panel || !body) return;
  let out;
  try {
    out = await api('/status');
  } catch {
    return;
  }
  const known = (out && out.known) || {};
  const counts = [
    [known.detailed, 'land.live_games'],
    [known.catalogue, 'land.live_cat'],
    [known.houses, 'land.live_houses'],
    [known.deck && known.deck.rated, 'land.live_deck'],
  ].filter(([value]) => typeof value === 'number' && value > 0);
  if (!counts.length) return;

  const grid = h('div', { cls: 'live-grid' });
  for (const [value, key] of counts) {
    grid.append(h('div', { cls: 'live-cell' },
      h('b', { cls: 'live-n', text: num(value) }),
      h('span', { cls: 'live-k', text: t(key) })));
  }
  body.textContent = '';
  body.append(grid);
  panel.hidden = false;
}

/* ── The languages ────────────────────────────────────────────────────
   Out of coverage.js, which the strings repository writes beside the
   dictionaries. A file and not a request: once English has been merged
   underneath a language, the dictionary that ships can no longer say which
   half of it was translated, so the count has to come from where the merge
   happened. */

function ecoDraw() {
  const box = el('eco-langs');
  if (!box || typeof COVERAGE === 'undefined') return;
  const langs = COVERAGE.languages || [];
  if (!langs.length) return;

  put(box, h('b', { text: t('land.eco_langs', { n: num(COVERAGE.keys), k: langs.length }) }));
  for (const lang of langs) {
    const pct = COVERAGE.keys ? Math.round((lang.done / COVERAGE.keys) * 100) : 0;
    put(box, txt(' · '), txt(`${lang.code.toUpperCase()} `),
        h('span', { cls: 'pct', text: `${pct}%` }));
  }
}

/* The two buttons under a paragraph do not go anywhere. They put the field at
   the top into the mode that paragraph was about and hand it the caret, which
   is the whole of what "look a game up" and "look a profile up" mean on a page
   whose only address bar is that field. */
function intoField(next) {
  setKind(next);
  el('find')?.scrollIntoView({ block: 'center' });
  input.focus();
}
el('rail-go')?.addEventListener('click', () => intoField('game'));
el('emb-go')?.addEventListener('click', () => intoField('profile'));

demoDraw();
miniDraw();
embDraw();
railDraw();
fxsDraw();
ecoDraw();
liveDraw();
demoWidth = el('demo-map')?.clientWidth || 0;
addEventListener('resize', demoResize);

creditInto(el('credit-slot'));
