/* steamprofiler.org - the wait.

   A cold lookup is not fast and cannot be made fast from here. /profile is one
   call to Steam for the library, three more for the level, the badges and the
   recent games, a scrape of the profile page, and then the store cache for
   what all of it cost. On a library of four hundred games that is ten seconds,
   and nothing on this side of the wire makes Steam answer sooner.

   What this side does own is what those ten seconds look like. One mono line
   reading "reading gordziilla on Steam…" for ten seconds reads as a page that
   has stopped; the same ten seconds spent watching the map tile itself in
   behind a window ticking off what it is doing reads as work being done. Same
   wait. Only one of the two gets closed.

   Three rules hold this together, and they are the difference between a wait
   that is being explained and one that is being faked:

     the bar never lies    it moves on real events - the handle resolved, the
                           payload arrived - and between them it only creeps
                           towards the next one without ever reaching it. It
                           fills when the answer is actually here.

     the steps are real    every line in the checklist is something the server
                           genuinely does, in the order it does it. They walk
                           forward on a clock because the API sends one
                           response and not five, but no line names work that
                           nobody is doing, and no line is ticked off by the
                           clock - only its event does that.

     it admits the wait    past five seconds the window says out loud that
                           this is taking a while, and past thirty it offers
                           the reload. Pretending nothing is happening is what
                           makes a wait feel like a fault.

   Loaded by profile.html only, and it borrows squarify() from dash.js for the
   skeleton, which is the same layout the real map is drawn with. */

/* Where the bar stands the moment each real event lands, and how fast it
   drifts towards the next one while nothing is happening. The drift is
   exponential: it always moves and it never arrives, which is the only honest
   shape for a wait whose length nobody knows in advance. */
const BOOT_MARKS = { start: 0.05, resolved: 0.30, fetched: 0.94, drawn: 1 };
const BOOT_TAU = { resolved: 2600, fetched: 9000, drawn: 700 };

/* One plan per view, because /u/<name>, /u/<name>/1234 and /u/<a>/vs/<b> wait
   on different things and a checklist that named the wrong ones would be
   decoration. Each phase is the event that closes it and the steps the server
   works through before sending it; the numbers are milliseconds into the
   phase, measured against real cold lookups rather than reported by anyone. */
const BOOT_PLAN = {
  dash: [
    ['resolved', [['load.s_find', 0]]],
    ['fetched', [['load.s_library', 0], ['load.s_hours', 2600],
                 ['load.s_extras', 5400], ['load.s_prices', 8800]]],
    ['drawn', [['load.s_draw', 0]]],
  ],
  backlog: [
    ['resolved', [['load.s_find', 0]]],
    ['fetched', [['load.s_library', 0], ['load.s_hours', 2600], ['load.s_never', 6000]]],
    ['drawn', [['load.s_page', 0]]],
  ],
  game: [
    ['resolved', [['load.s_find', 0]]],
    ['fetched', [['load.s_library', 0], ['load.s_records', 3200], ['load.s_rank', 7000]]],
    ['drawn', [['load.s_page', 0]]],
  ],
  versus: [
    ['resolved', [['load.s_both', 0]]],
    ['fetched', [['load.s_two', 0], ['load.s_hours', 3400], ['load.s_extras', 7200]]],
    ['drawn', [['load.s_draw', 0]]],
  ],
};

const BOOT_HEAD = {
  dash: 'load.h_dash', backlog: 'load.h_dash',
  game: 'load.h_game', versus: 'load.h_versus',
};

/* What the window says once the wait stops being short, and when. Three
   phrasings per tier, picked at random and never repeated inside one wait, so
   somebody who looks up two profiles in a row is not read the same joke twice.
   The last tier is one line and it is the useful one: at half a minute the
   thing a reader wants is not a joke, it is permission to reload. */
const BOOT_SAYS = [
  [5500, ['load.big_1', 'load.big_2', 'load.big_3']],
  [12000, ['load.slow_1', 'load.slow_2', 'load.slow_3']],
  [21000, ['load.deep_1', 'load.deep_2', 'load.deep_3']],
  [33000, ['load.long']],
];

let boot = null;

/* ── The skeleton ──────────────────────────────────────────────────────
   The shape of the answer, before the answer. Every kind gets the layout it
   is actually about to receive, so the tiling is a preview and not a spinner
   wearing a costume. Nothing here carries a name or a number: a skeleton that
   showed figures would be showing figures nobody has yet. */

/** A stand-in library: one game holding a large share of the hours and a long
 *  tail behind it, which is the shape every Steam library has. Laid out by the
 *  same squarifier the real map uses, against a 16:9 box and converted to
 *  percentages after - squarifying in percent units would chase square
 *  percentages and come out as slivers on a wide screen. */
function bootTiles(n, x0, y0, w0, h0) {
  const items = [];
  for (let i = 0; i < n; i++) {
    items.push({ value: (0.7 + Math.random() * 0.6) / ((i + 1) ** 1.15), item: i });
  }
  items.sort((a, b) => b.value - a.value);
  const W = 1000, H = 560;
  return squarify(items, 0, 0, W, H).map((r) => ({
    x: x0 + (r.x / W) * w0, y: y0 + (r.y / H) * h0,
    w: (r.w / W) * w0, h: (r.h / H) * h0,
  }));
}

/** The backlog is a list, so its skeleton is one. */
function bootPile() {
  const out = [{ x: 0, y: 0, w: 100, h: 12 }];
  for (let i = 0; i < 11; i++) out.push({ x: 0, y: 15 + i * 7.7, w: 100, h: 7.7 });
  return out;
}

/** A game page: the key art across the top, three figures under it, then the
 *  grid of panels that carries whatever that game happens to publish. */
function bootPanels() {
  const out = [{ x: 0, y: 0, w: 100, h: 34 }];
  for (let i = 0; i < 3; i++) out.push({ x: i * 33.4, y: 36, w: 33.4, h: 20 });
  for (let i = 0; i < 8; i++) {
    out.push({ x: (i % 4) * 25, y: 58 + Math.floor(i / 4) * 21, w: 25, h: 21 });
  }
  return out;
}

const BOOT_SHAPE = {
  dash: () => bootTiles(40, 0, 0, 100, 100),
  backlog: () => bootPile(),
  game: () => bootPanels(),
  versus: () => [...bootTiles(18, 0, 0, 49.4, 100), ...bootTiles(18, 50.6, 0, 49.4, 100)],
};

/** The game's own art, in the cell where the page is about to put it.
 *
 *  Everything else on this screen is deliberately anonymous, because nothing
 *  about the profile is known yet. The game is the exception: the appid is in
 *  the URL, and /art/<appid>.jpg answers to the appid alone - nginx serves it
 *  from the cache or the api fetches it from Steam - so the one thing that can
 *  honestly be shown before the data arrives is which game this is. The same
 *  request warms the cache for the page underneath.
 *
 *  A game with no art keeps the plain skeleton: the image removes itself and
 *  nothing has to know in advance which games have one. */
function bootArt(box, appid) {
  const first = box.firstElementChild;
  if (!first || !appid) return;
  const art = h('img', {
    cls: 'boot-art',
    attr: { src: `/art/${appid}.jpg`, alt: '', 'aria-hidden': 'true',
            decoding: 'async', fetchpriority: 'high' },
  });
  art.addEventListener('load', () => { first.dataset.art = '1'; });
  art.addEventListener('error', () => { art.remove(); });
  first.append(art);
}

function bootSkeleton(box, kind, appid) {
  if (!box) return;
  box.textContent = '';
  const rects = (BOOT_SHAPE[kind] || BOOT_SHAPE.dash)();
  rects.forEach((r, i) => {
    const cell = h('div', { cls: 'boot-cell' });
    cell.style.left = `${r.x}%`;
    cell.style.top = `${r.y}%`;
    // The gap is taken out here rather than out of the rectangles, because the
    // real map has none: its cells are told apart by their colour, and these
    // are all one colour and would read as a single grey slab.
    cell.style.width = `calc(${r.w}% - 3px)`;
    cell.style.height = `calc(${r.h}% - 3px)`;
    // Biggest first, because that is the order the eye reads a treemap in, and
    // the wave that crosses them afterwards is set off by position so it moves
    // across the map rather than blinking all of it at once.
    const lead = Math.min(i * 24, 900);
    cell.style.setProperty('--in', `${lead}ms`);
    cell.style.setProperty('--wave', `${lead + 520 + (r.x + r.y) * 7}ms`);
    box.append(cell);
  });
  if (kind === 'game') bootArt(box, appid);
}

/* ── The window ────────────────────────────────────────────────────── */

/** The one thing here a screen reader is given, because the checklist changing
 *  six times and a map of forty unlabelled rectangles are both noise out loud. */
function bootSay(text) {
  const node = el('boot-say');
  if (node) node.textContent = text;
}

function bootBar(pct) {
  const w = Math.max(0, Math.min(1, pct));
  el('boot-fill').style.width = `${(w * 100).toFixed(1)}%`;
  el('boot-track').setAttribute('aria-valuenow', Math.round(w * 100));
}

function bootPaint() {
  const done = Math.min(boot.k, boot.steps.length);
  boot.steps.forEach((s, i) => {
    s.node.dataset.at = i < done ? 'done' : i === done ? 'now' : 'next';
  });
  el('boot-count').textContent = `${done} / ${boot.steps.length}`;
}

function bootQuip(elapsed) {
  const tier = BOOT_SAYS[boot.tier];
  if (!tier || elapsed < tier[0]) return;
  // The game view is not waiting on a library, so the first thing it says
  // cannot be "big library" - it borrows the tier that blames Steam instead.
  const pool = boot.tier === 0 && boot.kind === 'game' ? BOOT_SAYS[1][1] : tier[1];
  boot.tier++;
  const fresh = pool.filter((k) => !boot.said.includes(k));
  const from = fresh.length ? fresh : pool;
  const key = from[Math.floor(Math.random() * from.length)];
  boot.said.push(key);

  const node = el('boot-quip');
  node.textContent = t(key);
  node.hidden = false;
  // Restart the fade, so a replacement reads as a new line rather than as text
  // that changed under somebody mid-sentence.
  node.removeAttribute('data-in');
  void node.offsetWidth;
  node.dataset.in = '1';
}

function bootTick() {
  if (!boot) return;
  const now = performance.now();
  const phase = boot.phases[boot.at];
  const since = now - boot.since;

  bootBar(boot.base + (BOOT_MARKS[phase.mark] - boot.base)
    * (1 - Math.exp(-since / BOOT_TAU[phase.mark])));

  // Walk the checklist forward while the one response this phase is waiting on
  // has not arrived. The last step of a phase is deliberately out of reach:
  // the clock can say what the server is probably doing, and only the event
  // itself is allowed to say something is finished.
  let moved = false;
  while (boot.k + 1 < boot.steps.length
         && boot.steps[boot.k + 1].phase === boot.at
         && since >= boot.steps[boot.k + 1].at) {
    boot.k++;
    moved = true;
  }
  if (moved) {
    bootPaint();
    bootSay(t(boot.steps[boot.k].key));
  }

  bootQuip(now - boot.began);
}

/** Put the screen up. `kind` picks the checklist and the shape of the
 *  skeleton together, so what tiles in is the layout that is coming. */
function bootStart(kind, who, appid) {
  const root = el('loading');
  if (!root || !BOOT_PLAN[kind]) return;

  const phases = BOOT_PLAN[kind].map(([mark, steps]) => ({ mark, steps }));
  const steps = [];
  phases.forEach((p, pi) => p.steps.forEach(([key, at]) => steps.push({ key, at, phase: pi })));

  boot = {
    kind,
    phases,
    steps,
    at: 0,                    // the phase still waiting on its event
    k: 0,                     // the step in hand
    base: BOOT_MARKS.start,
    since: performance.now(),
    began: performance.now(),
    said: [],
    tier: 0,
    timer: 0,
  };

  el('boot-who').textContent = who;
  el('boot-head').textContent = t(BOOT_HEAD[kind]);
  const list = el('boot-steps');
  list.textContent = '';
  for (const s of steps) {
    s.node = h('li', { text: t(s.key) });
    list.append(s.node);
  }
  bootSkeleton(el('boot-map'), kind, appid);
  // The window opens empty however many times it is opened: nothing here
  // starts a second wait today, and a line left over from a previous one is
  // the page talking about something that already finished.
  const quip = el('boot-quip');
  quip.hidden = true;
  quip.textContent = '';
  quip.removeAttribute('data-in');

  root.hidden = false;
  bootBar(BOOT_MARKS.start);
  bootPaint();
  bootSay(t('dash.loading', { who }));
  boot.timer = setInterval(bootTick, 90);
}

/** A real event landed: everything this phase was waiting on is genuinely
 *  done, so the checklist catches up to it however far behind it had fallen.
 *  An event for a phase already past is ignored rather than replayed - the
 *  versus view resolves two handles and only the second one closes the
 *  phase. */
function bootMark(name) {
  if (!boot || boot.phases[boot.at]?.mark !== name) return;
  boot.base = BOOT_MARKS[name];
  boot.at++;
  const next = boot.steps.findIndex((s) => s.phase === boot.at);
  boot.k = next === -1 ? boot.steps.length : next;
  boot.since = performance.now();
  bootBar(boot.base);
  bootPaint();
  if (boot.k < boot.steps.length) bootSay(t(boot.steps[boot.k].key));
}

/** Take the screen down and stop every clock behind it. Also the failure path:
 *  an error message sitting under a bar that is still creeping forward is the
 *  page giving two answers at once. */
function bootStop() {
  if (boot) clearInterval(boot.timer);
  boot = null;
  const root = el('loading');
  if (root) root.hidden = true;
}

/** The view is drawn and the screen has nothing left to explain. Whatever the
 *  checklist had not reached is closed on the way out: it is all genuinely
 *  done by the time anything calls this. */
function bootDone() {
  while (boot && boot.at < boot.phases.length) bootMark(boot.phases[boot.at].mark);
  bootStop();
}
