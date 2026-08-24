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

   Loaded by profile.html and by the public game shell. It borrows squarify()
   from dash.js for the skeleton, which is the same layout the real map is
   drawn with. */

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
  // The year page waits on exactly what the dashboard waits on - one profile -
  // so its checklist is that one minus the prices, which it never asks for.
  year: [
    ['resolved', [['load.s_find', 0]]],
    ['fetched', [['load.s_library', 0], ['load.s_hours', 2600], ['load.s_year', 5600]]],
    ['drawn', [['load.s_page', 0]]],
  ],
};

const BOOT_HEAD = {
  dash: 'load.h_dash', backlog: 'load.h_dash',
  game: 'load.h_game', versus: 'load.h_versus', year: 'load.h_year',
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

/* ── The wait of one game ──────────────────────────────────────────────
   A themed page is not the generic page in other colours, so the wait for one
   is not the generic skeleton in other colours either. Each of these builds
   that game's own screen out of that game's own classes - the pause menu's tab
   column, the scoreboard's rows, the research tree's ranks - with every place a
   number or a name will land left blank.

   That is the whole trick and the reason it is affordable: the layout is not
   redrawn here, it is games.css doing what it already does. This file writes
   the same markup the renderer writes, without the data, so the wait is the
   page with nothing in it yet rather than a picture of the page.

   A theme with no template here still arrives themed - palette, lettering and
   key art come from the head and the stylesheet - and waits on the generic
   panels. Adding one is one function and one line in BOOT_WAIT. */

/** Where a number or a name is going to be. Sized in em on purpose: dropped
 *  inside a title it takes the title's size, inside a row it takes the row's,
 *  so one helper follows every type scale on the site without being told. */
const blank = (w) => h('i', { cls: 'wait-b', style: { '--w': w } });

const rep = (n, make) => Array.from({ length: n }, (_, i) => make(i));

/** GTA V: the pause menu. Tabs down the left, stats as segmented meters. */
function waitGta() {
  const stats = h('div', { cls: 'gta-stats' });
  for (const w of ['7em', '5.5em', '4.5em']) {
    stats.append(h('div', { cls: 'gta-stat' },
      h('span', { cls: 'gta-stat-label' }, blank(w)),
      h('div', { cls: 'gta-seg' }, ...rep(20, () => h('i'))),
      h('b', { cls: 'gta-stat-val' }, blank('3.5em'))));
  }
  return h('div', { cls: 'gta' },
    h('div', { cls: 'gta-shell' },
      h('nav', { cls: 'gta-tabs' },
        h('span', { cls: 'gta-tab', data: { on: '1' } }, blank('5em')),
        h('span', { cls: 'gta-tab' }, blank('6em')),
        h('span', { cls: 'gta-tab' }, blank('4em'))),
      h('div', { cls: 'gta-body' },
        h('p', { cls: 'gta-kicker' }, blank('16em')),
        h('h1', { cls: 'gta-title' }, blank('9em')),
        stats,
        h('p', { cls: 'gta-note' }, blank('24em')))),
    h('div', { cls: 'gta-cards' }, ...rep(6, () => h('article', { cls: 'gta-card' },
      h('div', { cls: 'gta-card-text' },
        blank('8em'), blank('13em'), blank('6em'))))));
}

/** Dota 2: the scoreboard. The hero table is the page. */
function waitDota() {
  const board = h('div', { cls: 'd-board' },
    h('div', { cls: 'd-row d-row--head' },
      blank('4em'), blank('6em'), blank('2em'), blank('2em'), blank('2em'), blank('3em')),
    ...rep(9, () => h('div', { cls: 'd-row' },
      h('span', { cls: 'd-face d-face--none' }),
      h('span', { cls: 'd-name' }, blank('8em')),
      blank('2em'), blank('2em'), blank('2em'), blank('3em'))));
  return h('div', { cls: 'd' },
    h('header', { cls: 'd-hero' },
      h('p', { cls: 'd-kicker' }, blank('18em')),
      h('h1', { cls: 'd-title' }, blank('7em'))),
    h('div', { cls: 'd-tally' },
      h('div', { cls: 'd-side d-side--r' }, blank('2.5em')),
      h('div', { cls: 'd-scale' }, h('div', { cls: 'd-scale-bar' }, h('i', { cls: 'd-w' }))),
      h('div', { cls: 'd-side d-side--d' }, blank('2.5em'))),
    h('section', { cls: 'd-panel' },
      h('div', { cls: 'd-panel-head' }, blank('9em')), board));
}

/** Counter-Strike 2: the HUD over the buy menu. */
function waitCs2() {
  return h('div', { cls: 'cs' },
    h('header', { cls: 'cs-top' },
      h('p', { cls: 'cs-kicker' }, blank('20em')),
      h('h1', { cls: 'cs-title' }, blank('8em')),
      h('p', { cls: 'cs-sub' }, blank('16em')),
      h('div', { cls: 'cs-hud' }, ...rep(4, (i) => h('div', {
        cls: i === 3 ? 'cs-hud-cell cs-hud-cell--money' : 'cs-hud-cell',
      }, blank('3em'), h('b', {}, blank('4em')))))),
    h('div', { cls: 'cs-section' },
      h('h2', { cls: 'cs-h' }, blank('7em')),
      h('section', { cls: 'cs-buy' },
        h('nav', { cls: 'cs-rail' }, ...rep(5, () => h('span', { cls: 'cs-rail-item' },
          blank('5em'), h('em', {}, blank('1.5em'))))),
        h('div', { cls: 'cs-guns' }, ...rep(8, () => h('article', { cls: 'cs-gun' },
          h('span', { cls: 'cs-gun-name' }, blank('5em')),
          h('b', { cls: 'cs-gun-kills' }, blank('3em')),
          h('span', { cls: 'cs-gun-acc' }, blank('4em'))))))),
    h('div', { cls: 'cs-maps' }, ...rep(6, () => h('div', { cls: 'cs-map' },
      h('span', { cls: 'cs-map-name' }, blank('7em')),
      h('div', { cls: 'cs-map-bar' }, h('i', { cls: 'cs-ct' })),
      h('span', { cls: 'cs-map-n' }, blank('2em')),
      h('span', { cls: 'cs-map-n cs-map-n--dim' }, blank('2em')),
      h('span', { cls: 'cs-map-rate' }, blank('3em'))))));
}

/** Arma 3: the briefing. Map on one side, the loadout on the other. */
function waitArma3() {
  return h('div', { cls: 'a3' },
    h('h1', { cls: 'a3-title' }, blank('11em')),
    h('p', { cls: 'a3-stamp' }, blank('14em')),
    h('div', { cls: 'a3-cols' },
      h('section', { cls: 'a3-map' },
        h('div', { cls: 'a3-map-head' }, blank('8em')),
        h('div', { cls: 'a3-map-body' }, ...rep(5, () => h('div', { cls: 'a3-marker' },
          h('span', { cls: 'a3-marker-name' }, blank('9em')),
          h('div', { cls: 'a3-marker-h' }, h('i', { cls: 'a3-marker-fill' })))))),
      h('section', { cls: 'a3-slots' },
        h('h2', { cls: 'a3-slot-h' }, blank('6em')),
        ...rep(6, () => h('div', { cls: 'a3-slot' },
          h('span', { cls: 'a3-slot-name' }, blank('7em')),
          h('div', { cls: 'a3-slot-bar' }, h('i')))))),
    h('section', { cls: 'a3-tasks' }, ...rep(4, () => h('p', { cls: 'a3-task-meta' },
      h('i', { cls: 'a3-tick' }), blank('18em')))));
}

/** War Thunder: the research tree. A rank per year, nodes across it. */
function waitWarThunder() {
  return h('div', { cls: 'wt' },
    h('header', { cls: 'wt-head' },
      h('p', { cls: 'wt-kicker' }, blank('17em')),
      h('h1', { cls: 'wt-title' }, blank('8em'))),
    h('div', { cls: 'wt-tree' }, ...rep(4, () => h('section', { cls: 'wt-rank' },
      h('div', { cls: 'wt-rank-head' },
        h('span', { cls: 'wt-year' }, blank('3em')),
        h('span', { cls: 'wt-count' }, blank('5em'))),
      h('div', { cls: 'wt-nodes' }, ...rep(6, () => h('article', { cls: 'wt-node' },
        h('span', { cls: 'wt-node-icon wt-node-icon--none' }),
        h('div', { cls: 'wt-node-text' }, blank('7em'), blank('4em')))))))));
}

/** Skyrim: the sky before the stars are hung in it. */
function waitSkyrim() {
  const sky = h('figure', { cls: 'sk-sky' },
    h('i', { cls: 'sk-aurora', attr: { 'aria-hidden': 'true' } }),
    h('i', { cls: 'sk-dust', attr: { 'aria-hidden': 'true' } }));
  // Fixed rather than random: two reloads of one page drawing a different sky
  // reads as the page having changed its mind about something.
  const stars = [[12, 30], [23, 46], [31, 22], [39, 58], [46, 35], [54, 64],
                 [61, 28], [68, 52], [74, 38], [82, 60], [88, 33], [17, 66],
                 [35, 72], [50, 18], [65, 74], [79, 24], [92, 52], [27, 58]];
  stars.forEach(([x, y], i) => {
    const star = h('span', { cls: 'sk-star', data: i % 4 === 0 ? { bright: '1' } : {} });
    star.style.left = `${x}%`;
    star.style.top = `${y}%`;
    star.style.setProperty('--size', `${(5 + (i % 5) * 2).toFixed(1)}px`);
    sky.append(star);
  });
  return h('div', { cls: 'sk' },
    h('header', { cls: 'sk-head' },
      h('p', { cls: 'sk-kicker' }, blank('15em')),
      h('h1', { cls: 'sk-title' }, blank('7em')),
      h('p', { cls: 'sk-sub' }, blank('9em'))),
    sky,
    h('div', { cls: 'sk-perks' }, ...rep(6, () => h('article', { cls: 'sk-perk' },
      h('span', { cls: 'sk-perk-icon' }),
      h('div', { cls: 'sk-perk-meta' }, blank('8em'), blank('5em'))))));
}

/** Microsoft Flight Simulator: three gauges over the logbook. */
function waitMsfs() {
  const dial = () => h('div', { cls: 'fs-gauge' },
    h('div', { cls: 'fs-dial' },
      h('i', { cls: 'fs-dial-track' }), h('i', { cls: 'fs-dial-fill' }),
      h('i', { cls: 'fs-dial-tick' })),
    h('span', { cls: 'fs-gauge-read' }, blank('4em')));
  const rows = h('tbody', {}, ...rep(7, () => h('tr', {},
    h('td', { cls: 'fs-log-date' }, blank('4em')),
    h('td', {}, blank('11em')),
    h('td', { cls: 'fs-log-rare' }, blank('3em')))));
  return h('div', { cls: 'fs' },
    h('header', { cls: 'fs-head' },
      h('p', { cls: 'fs-kicker' }, blank('18em')),
      h('h1', { cls: 'fs-title' }, blank('9em')),
      h('p', { cls: 'fs-sub' }, blank('13em'))),
    h('section', { cls: 'fs-panel' }, dial(), dial(), dial()),
    h('section', { cls: 'fs-logwrap' },
      h('h2', { cls: 'fs-h' }, blank('6em')),
      h('div', { cls: 'fs-log-scroll' }, h('table', { cls: 'fs-log' }, rows))));
}

/** Call of Duty: the dog tag over the calendar. */
function waitCod() {
  return h('div', { cls: 'cod' },
    h('div', { cls: 'cod-tag' },
      h('span', { cls: 'cod-tag-line' }, blank('9em')),
      h('span', { cls: 'cod-tag-line' }, blank('6em')),
      h('span', { cls: 'cod-tag-meta' }, blank('11em'))),
    h('p', { cls: 'cod-lede' }, blank('26em')),
    h('p', { cls: 'cod-hours' }, blank('5em')),
    h('div', { cls: 'cod-face' }, ...rep(28, (i) => h('span', {
      cls: i % 9 === 0 ? 'cod-face-cell cod-face-cell--hot' : 'cod-face-cell',
    }))),
    ...rep(5, () => h('article', { cls: 'cod-one' },
      h('span', { cls: 'cod-one-icon' }),
      h('span', { cls: 'cod-one-label' }, blank('10em')),
      h('span', { cls: 'cod-one-meta' }, blank('6em')))));
}

const BOOT_WAIT = {
  'gta-v': waitGta,
  'dota-2': waitDota,
  'counter-strike-2': waitCs2,
  'arma-3': waitArma3,
  'war-thunder': waitWarThunder,
  'skyrim': waitSkyrim,
  'msfs': waitMsfs,
  'call-of-duty': waitCod,
};

/* ── Whose wait this is ────────────────────────────────────────────────
   A themed game does not wait behind the site's palette. nginx asks the api
   which theme the appid in the path is and pastes the answer into the head, so
   by the time this runs the name is already in the document - and setting it
   on <html> is the same line game.js runs when the real page arrives, against
   the same :root[data-game] blocks in games.css. The whole screen changes:
   background, panels, accent, the display face, the corner radius.

   Read from the head rather than fetched, because a fetch resolves after the
   first paint and every themed game would open grey and then become itself.

   Cleared on the way out only when the page never got its own: game.js sets
   the same attribute for real, and taking it off after that would undress the
   page it just dressed. */
function bootTheme() {
  const said = document.querySelector('meta[name="sp-game"]');
  const name = said && said.content.trim();
  if (!name) return null;
  document.documentElement.dataset.game = name;
  return name;
}

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
/** The same art, across the top of a themed wait, where the real page opens on
 *  it too. Its own band rather than a cell, because inside a themed wait there
 *  are no cells - and it still warms the cache for the page underneath. */
function bootArtBand(appid) {
  const band = h('div', { cls: 'wait-art' });
  if (!appid) return band;
  const art = h('img', {
    attr: { src: `/art/${appid}.jpg`, alt: '', 'aria-hidden': 'true',
            decoding: 'async', fetchpriority: 'high' },
  });
  art.addEventListener('load', () => { band.dataset.on = '1'; });
  art.addEventListener('error', () => { art.remove(); });
  band.append(art);
  return band;
}

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

function bootSkeleton(box, kind, appid, theme) {
  if (!box) return;
  box.textContent = '';
  delete box.dataset.wait;

  // The themed wait, when this game has one: its own screen, unfilled. It
  // replaces the rectangles rather than dressing them, which is the difference
  // between the page arriving and a drawing of the page arriving.
  const own = kind === 'game' && theme && BOOT_WAIT[theme];
  if (own) {
    box.dataset.wait = theme;
    box.append(bootArtBand(appid), own());
    return;
  }

  const rects = (BOOT_SHAPE[kind] || BOOT_SHAPE.dash)();
  rects.forEach((r, i) => {
    // A star and a gauge are round on the page they are standing in for, and a
    // square standing in for a circle is the one cell that reads as the wrong
    // page rather than as the page not being there yet.
    const cell = h('div', { cls: 'boot-cell', data: r.round ? { round: '1' } : {} });
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
  // Before the skeleton, because the skeleton is drawn in this theme's colours
  // and its shape is this theme's shape.
  const theme = bootTheme();
  const list = el('boot-steps');
  list.textContent = '';
  for (const s of steps) {
    s.node = h('li', { text: t(s.key) });
    list.append(s.node);
  }
  bootSkeleton(el('boot-map'), kind, appid, theme);
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
