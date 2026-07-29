/* steamprofiler.org - the dashboard view: any public profile, drawn to scale.
   Shared helpers come from lib.js. The router decides when this runs. */

/* Games with a layout of their own lend the index their key colour, so a link
   already looks like the page it leads to. Keyed by appid, because the visitor's
   library is what decides which of these show up. */
const TINTS = {
  570: '#c8aa6e',      // Dota 2
  730: '#f0a92e',      // Counter-Strike 2
  107410: '#8a9a5b',   // Arma 3
  236390: '#e8871e',   // War Thunder
  1938090: '#ff7a1a',  // Call of Duty
  489830: '#8fc7d8',   // Skyrim
  227300: '#3fbd77',   // Euro Truck Simulator 2
  1250410: '#3ea0e0',  // Flight Simulator
  271590: '#ff5fa2',   // GTA V
  33930: '#b06a3c',    // Arma 2: Operation Arrowhead
  892970: '#b8863b',   // Valheim
  12210: '#b9c66a',    // GTA IV
  33910: '#9aa06e',    // Arma 2
  275850: '#5fd4ff',   // No Man's Sky
  1172470: '#da2f34',  // Apex Legends
  1144200: '#46a0d8',  // Ready or Not
  255710: '#2fb3a6',   // Cities: Skylines
  218620: '#d92b2b',   // PAYDAY 2
  1547000: '#e8862a',  // GTA: San Andreas
  813820: '#f2b23c',   // Realm Royale
  221100: '#9aa88f',   // DayZ
  4000: '#e08b2c',     // Garry's Mod
  270880: '#c94f2e',   // American Truck Simulator
  286570: '#e10600',   // F1 2015
};

/* ── Treemap ───────────────────────────────────────────────────────
   Squarified layout (Bruls, Huizing & van Wijk): fill the shorter side of the
   remaining rectangle with a row of cells, and close the row as soon as adding
   one more would make its aspect ratios worse. Keeping cells near-square is the
   only way a map of this many games stays readable. */

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

function buildMap(library, totalHours, query) {
  const box = el('map');
  const readout = el('readout');
  const W = box.clientWidth || 1000;
  const H = box.clientHeight || 500;

  // Anything under ~12 h lands below a legible cell, so the tail is drawn as a
  // single block instead of a hundred slivers - and it says how many it holds.
  const named = library.filter((g) => g.hours >= 12).slice(0, 72);
  const tail = library.slice(named.length);
  const tailHours = tail.reduce((s, g) => s + g.hours, 0);

  const items = named.map((g) => ({ value: g.hours, item: g }));
  if (tailHours > 0) {
    items.push({
      value: tailHours,
      item: {
        name: t('dash.tail', { n: tail.length }),
        hours: Math.round(tailHours),
        share: (tailHours / totalHours) * 100,
        tail: true,
      },
    });
  }

  const rects = squarify(items, 0, 0, W, H);
  const top = items[0].value;

  box.textContent = '';
  const nodes = [];

  for (const r of rects) {
    const g = r.item;
    // Every game that was launched gets a page, so every cell is a link.
    const node = document.createElement(g.appid ? 'a' : 'div');
    node.className = 'cell';
    node.setAttribute('role', 'listitem');
    if (g.appid) node.href = `/u/${query}/${g.appid}`;

    node.style.left = `${(r.x / W) * 100}%`;
    node.style.top = `${(r.y / H) * 100}%`;
    node.style.width = `${(r.w / W) * 100}%`;
    node.style.height = `${(r.h / H) * 100}%`;

    // Amber intensity carries magnitude. The exponent keeps the long tail from
    // collapsing into one flat dark mass.
    if (g.tail) {
      // Striped, because this block is a group of games rather than one game:
      // its area is honest, but the intensity ramp would not be.
      node.style.background =
        'repeating-linear-gradient(-45deg, rgba(255,180,84,.05) 0 6px, rgba(255,180,84,.11) 6px 12px)';
    } else {
      const alpha = 0.05 + 0.92 * Math.pow(g.hours / top, 0.42);
      node.style.background = `rgba(255, 180, 84, ${alpha.toFixed(3)})`;
      if (alpha > 0.42) node.dataset.dark = '1';
    }

    if (r.w > 84 && r.h > 40) {
      if (r.w > 200 && r.h > 120) node.dataset.big = '1';
      const n = document.createElement('span');
      n.className = 'cell-name';
      n.textContent = g.name;
      const hEl = document.createElement('span');
      hEl.className = 'cell-h';
      hEl.textContent = g.tail
        ? t('dash.tail_hours', { hours: hrs(g.hours) })
        : `${num(g.hours)} h · ${num(g.share, 1)}%`;
      node.append(n, hEl);
    } else {
      node.dataset.tiny = '1';
    }

    node.title = `${g.name} - ${num(g.hours)} h`;
    node.addEventListener('pointerenter', () => show(g, node));
    node.addEventListener('focus', () => show(g, node));
    nodes.push(node);
    box.append(node);
  }

  function show(g, node) {
    for (const n of nodes) delete n.dataset.on;
    node.dataset.on = '1';
    readout.textContent = '';
    const b = document.createElement('b');
    b.textContent = g.name;
    const share = document.createElement('span');
    share.className = 'r-share';
    share.textContent = t('dash.of_total', { share: num(g.share, g.share < 10 ? 2 : 1) });
    readout.append(b, document.createTextNode(`${num(g.hours)} h · `), share);
    if (g.themed) readout.append(document.createTextNode(` · ${t('dash.themed')}`));
    readout.dataset.on = '1';
  }

  box.addEventListener('pointerleave', () => {
    for (const n of nodes) delete n.dataset.on;
    delete readout.dataset.on;
  });
}

/* ── Panel fillers ─────────────────────────────────────────────────── */

function rowsInto(parent, rows) {
  parent.textContent = '';
  const max = Math.max(...rows.map((r) => r.value), 1);
  const animate = !still();
  rows.forEach((r, i) => {
    const div = document.createElement('div');
    div.className = 'row';
    if (i === 0) div.dataset.lead = '1';

    const name = document.createElement('span');
    name.className = 'row-name';
    name.textContent = r.name;
    name.title = r.name;

    const meter = document.createElement('span');
    meter.className = 'meter';
    if (animate) meter.dataset.animate = '1';
    const fill = document.createElement('i');
    fill.style.width = `${(r.value / max) * 100}%`;
    if (animate) fill.style.animationDelay = `${i * 55}ms`;
    meter.append(fill);

    const fig = document.createElement('span');
    fig.className = 'row-fig';
    fig.textContent = r.figure;

    div.append(name, meter, fig);
    parent.append(div);
  });
}

function kvInto(parent, rows) {
  parent.textContent = '';
  for (const [k, v] of rows) {
    if (v == null || v === '') continue;
    const dt = document.createElement('dt');
    dt.textContent = k;
    const dd = document.createElement('dd');
    dd.textContent = v;
    parent.append(dt, dd);
  }
}

function buildNow(now) {
  const games = (now.games || []).filter((g) => g.hours > 0).slice(0, 6);
  el('now-total').textContent = `${num(now.hours_2weeks, 1)} h`;

  if (now.playing) {
    const mod = el('mod-now');
    mod.hidden = false;
    mod.dataset.live = '1';
    el('mod-now-text').textContent = t('nav.playing', { game: now.playing });
  }

  if (!games.length) {
    el('now-note').textContent = t('dash.recent_none');
    return;
  }
  rowsInto(el('now-rows'), games.map((g) => ({
    name: g.name, value: g.hours, figure: `${num(g.hours, 1)} h`,
  })));
  el('now-note').textContent = t('dash.recent_note', {
    game: games[0].name, share: num((games[0].hours / now.hours_2weeks) * 100),
  });
}

function buildPlatform(p) {
  el('plat-share').textContent = `${num(p.linux_share, 1)}%`;
  el('plat-meter').firstElementChild.style.width = `${p.linux_share}%`;
  kvInto(el('plat-kv'), [
    [t('dash.linux'), `${num(p.linux_hours)} h`],
    [t('dash.windows'), `${num(p.windows_hours)} h`],
    [t('dash.no_os'), `${num(p.unattributed_hours)} h`],
  ]);
  el('plat-note').textContent = t('dash.system_note', {
    un: num(p.unattributed_hours), at: num(p.attributed_hours),
  });
}

function buildAccount(pf) {
  if (pf.avatar) {
    const img = el('avatar');
    img.src = pf.avatar;
    img.alt = `Avatar de ${pf.persona}`;
  }
  el('persona').textContent = pf.persona || '-';
  el('acct-level').textContent = pf.level != null ? t('dash.level', { n: num(pf.level) }) : '-';
  if (pf.member_since) el('member-since').textContent = t('dash.opened', { date: longDate(pf.member_since) });
  kvInto(el('acct-kv'), [
    [t('dash.achievements'), pf.achievements_total != null ? num(pf.achievements_total) : null],
    [t('dash.perfect'), pf.perfect_games != null ? num(pf.perfect_games) : null],
    [t('dash.avg_completion'), pf.avg_completion != null ? `${num(pf.avg_completion, 1)}%` : null],
    [t('dash.badges'), pf.badge_count != null ? num(pf.badge_count) : null],
    [t('dash.xp'), pf.xp != null ? num(pf.xp) : null],
    [t('dash.friends'), pf.friends != null ? num(pf.friends) : null],
    [t('dash.screenshots'), pf.screenshots != null ? num(pf.screenshots) : null],
    [t('dash.reviews'), pf.reviews != null ? num(pf.reviews) : null],
  ]);
}

function buildShowcase(pf) {
  const wrap = el('panel-showcase');
  if (!pf.showcase?.length && !pf.bio) {
    wrap.remove();
    return;
  }
  const pre = el('showcase');
  pre.textContent = '';
  for (const line of pf.showcase || []) {
    const i = line.indexOf(':');
    const span = document.createElement('span');
    if (i > 0) {
      const k = document.createElement('span');
      k.className = 'k';
      k.textContent = `${line.slice(0, i + 1)} `;
      const v = document.createElement('span');
      v.className = 'v';
      v.textContent = line.slice(i + 1).trim();
      span.append(k, v);
    } else {
      span.className = 'lead';
      span.textContent = line;
    }
    pre.append(span, document.createTextNode('\n'));
  }

  // The bio is already a shell session; it only had to be set like one.
  if (pf.bio) {
    el('bio-wrap').hidden = false;
    el('bio').textContent = pf.bio.trim();
  }
}

function buildPages(games, query) {
  el('pages-count').textContent = t('dash.pages_count', { n: games.length });
  const ul = el('pages');
  ul.textContent = '';
  for (const g of games) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `/u/${query}/${g.appid}`;
    if (TINTS[g.appid]) a.style.setProperty('--tint', TINTS[g.appid]);

    const n = document.createElement('span');
    n.className = 'pg-name';
    n.textContent = g.name;
    const hEl = document.createElement('span');
    hEl.className = 'pg-hours';
    hEl.textContent = `${num(g.hours)} h · ${num(g.share, 1)}%`;
    const line = document.createElement('span');
    line.className = 'pg-line';
    // The one thing worth promising up front: whether this game has a layout of
    // its own or falls back to the generic one.
    line.textContent = t(g.themed ? 'dash.page_own' : 'dash.page_plain');
    if (!g.themed) line.dataset.plain = '1';

    a.append(n, hEl, line);
    li.append(a);
    ul.append(li);
  }
}

function buildTable(rows, query) {
  const body = el('table-body');
  body.textContent = '';
  // Steam does not hand out a last-played date for every profile. A column of
  // dashes says nothing, so it comes out entirely.
  const dated = rows.some((g) => g.last_played);
  document.querySelector('.ranked th.c-date').hidden = !dated;
  rows.forEach((g, i) => {
    const tr = document.createElement('tr');
    if (i === 0) tr.dataset.lead = '1';

    const rank = document.createElement('td');
    rank.className = 'c-rank';
    rank.textContent = i + 1;

    const name = document.createElement('td');
    name.className = 't-name';
    const a = document.createElement('a');
    a.href = `/u/${query}/${g.appid}`;
    a.textContent = g.name;
    name.append(a);

    const hours = document.createElement('td');
    hours.className = 'c-num t-hours';
    hours.textContent = num(g.hours);

    const share = document.createElement('td');
    share.className = 'c-num t-share';
    share.textContent = `${num(g.share, 1)}%`;

    const linux = document.createElement('td');
    linux.className = 'c-num c-os';
    const lh = g.linux_minutes / 60;
    // A game with eight recorded minutes is not "0 h", and it is not nothing.
    linux.textContent = lh >= 1 ? num(lh) : g.linux_minutes > 0 ? '<1' : '-';
    if (!g.linux_minutes) linux.classList.add('t-dim');

    const when = document.createElement('td');
    when.className = 'c-date';
    when.hidden = !dated;
    when.textContent = shortDate(g.last_played) || '-';

    tr.append(rank, name, hours, share, linux, when);
    body.append(tr);
  });
}

/* ── The whole library ─────────────────────────────────────────────────
   The table above is the top 25 and the treemap collapses everything under
   ~12 h, so until now the long tail was visible only as an area. This is the
   plain list: every game owned, played or not, searchable.

   Rendered in pages of 150. A library of five thousand is not rare, and
   putting all of it in the document at once is what turns a scroll into a
   stutter on a phone. */

const PAGE = 150;

function buildLibrary(library, unplayed, query) {
  const list = el('all-list');
  const more = el('all-more');
  const find = el('all-find');
  const sorts = el('all-sorts');
  if (!list) return;

  // The unplayed games get the same shape as the rest, with the fields they
  // genuinely do not have left null rather than zeroed.
  const all = library.concat((unplayed || []).map((g) => ({
    appid: g.appid, name: g.name, rank: null, hours: null,
    share: null, last_played: null, themed: false, never: true,
  })));

  el('all-count').textContent = t('dash.all_count', { n: num(all.length) });
  find.setAttribute('aria-label', t('dash.all_find'));
  sorts.setAttribute('aria-label', t('dash.all_sort'));

  const ORDERS = {
    hours: (a, b) => (b.hours ?? -1) - (a.hours ?? -1),
    name: (a, b) => a.name.localeCompare(b.name, locale()),
    last: (a, b) => (b.last_played || '').localeCompare(a.last_played || ''),
  };
  let order = 'hours';
  let shown = PAGE;

  sorts.textContent = '';
  for (const key of ['hours', 'name', 'last']) {
    const b = h('button', { cls: 'all-sort', text: t(`dash.sort_${key}`), attr: { type: 'button' } });
    if (key === order) b.dataset.on = '1';
    b.addEventListener('click', () => {
      order = key;
      shown = PAGE;
      for (const other of sorts.children) delete other.dataset.on;
      b.dataset.on = '1';
      draw();
    });
    sorts.append(b);
  }

  function matching() {
    const q = find.value.trim().toLowerCase();
    const rows = q ? all.filter((g) => g.name.toLowerCase().includes(q)) : all;
    return rows.slice().sort(ORDERS[order]);
  }

  function draw() {
    const rows = matching();
    list.textContent = '';
    for (const g of rows.slice(0, shown)) {
      const li = document.createElement('li');
      const a = h('a', { cls: 'all-row', attr: { href: `/u/${query}/${g.appid}` } });
      if (g.never) a.dataset.never = '1';
      if (g.themed) a.dataset.themed = '1';

      a.append(
        h('span', { cls: 'all-rank', text: g.rank ? `${g.rank}` : '-' }),
        h('span', { cls: 'all-name', text: g.name }),
        h('span', { cls: 'all-h', text: g.hours == null ? t('dash.never') : `${hrs(g.hours)} h` }),
        h('span', { cls: 'all-share', text: g.share == null ? '' : `${num(g.share, 1)}%` }),
        h('span', { cls: 'all-date', text: shortDate(g.last_played) || '' }));
      li.append(a);
      list.append(li);
    }

    const left = rows.length - shown;
    more.hidden = left <= 0;
    more.textContent = left > 0 ? t('dash.all_more', { n: num(Math.min(left, PAGE)) }) : '';
    el('all-note').textContent = t('dash.all_note', {
      shown: num(Math.min(shown, rows.length)), total: num(rows.length),
      played: num(library.length), never: num((unplayed || []).length),
    });
  }

  more.addEventListener('click', () => { shown += PAGE; draw(); });
  // Typing filters as you go; the list is already in memory, so there is
  // nothing to wait for and no reason to make the reader press anything.
  find.addEventListener('input', () => { shown = PAGE; draw(); });
  draw();
}

/* ── The years ─────────────────────────────────────────────────────────
   Steam hands out one date per game - when it was last launched - and nothing
   about the sessions before it. So this is a chart of endings: which year each
   game was put down in, and how many hours it had by then.

   That makes a game played every year for a decade appear once, in the most
   recent one. The note under the chart says so, because the shape invites the
   other reading and the other reading would be wrong. */

function buildTimeline(library) {
  const chart = el('time-chart');
  const out = el('time-out');
  if (!chart) return;

  const years = new Map();
  for (const g of library) {
    if (!g.last_played) continue;
    const y = g.last_played.slice(0, 4);
    const bucket = years.get(y) || { hours: 0, games: [] };
    bucket.hours += g.hours;
    bucket.games.push(g);
    years.set(y, bucket);
  }
  if (!years.size) return;

  const keys = [...years.keys()].sort();
  // Every year between the first and the last, including the empty ones: a
  // gap is information, and a chart that closes it up hides a break.
  const span = [];
  for (let y = Number(keys[0]); y <= Number(keys[keys.length - 1]); y++) span.push(String(y));
  const top = Math.max(...[...years.values()].map((b) => b.hours), 1);

  el('time-span').textContent = t('time.span', { from: keys[0], to: keys[keys.length - 1] });

  const say = (y, b) => {
    if (!b) { out.textContent = t('time.empty_year', { year: y }); return; }
    const biggest = b.games.slice().sort((x, z) => z.hours - x.hours)[0];
    out.textContent = t('time.readout', {
      year: y, n: num(b.games.length), h: hrs(b.hours), game: biggest.name,
    });
  };

  chart.textContent = '';
  for (const y of span) {
    const b = years.get(y);
    const col = h('button', { cls: 'time-col', attr: { type: 'button' } });
    const bar = h('i');
    bar.style.height = `${b ? Math.max(2, (b.hours / top) * 100) : 0}%`;
    if (!b) col.dataset.empty = '1';
    // The bar needs a box of its own to be a percentage of; see .time-bar.
    col.append(h('span', { cls: 'time-bar' }, bar), h('span', { text: y.slice(2) }));
    col.addEventListener('pointerenter', () => say(y, b));
    col.addEventListener('focus', () => say(y, b));
    col.addEventListener('click', () => say(y, b));
    chart.append(col);
  }

  // Opens on the heaviest year rather than on nothing.
  const peak = keys.reduce((best, y) => (years.get(y).hours > years.get(best).hours ? y : best), keys[0]);
  say(peak, years.get(peak));
}

/* ── Two profiles ──────────────────────────────────────────────────────
   The same treemap twice, at the same scale, plus the part that only exists
   when there are two of them: the games both people played, and which of them
   put more hours into each. */

/** The treemap again, smaller and without the hover machinery. Laid out
 *  against a fixed box and positioned in percentages, so it keeps its shape
 *  at whatever width the column turns out to be. */
function miniMap(box, library, totalHours) {
  const W = 600, H = 340;
  const named = library.filter((g) => g.hours >= 12).slice(0, 48);
  const tail = library.slice(named.length);
  const tailHours = tail.reduce((s, g) => s + g.hours, 0);

  const items = named.map((g) => ({ value: g.hours, item: g }));
  if (tailHours > 0) items.push({ value: tailHours, item: { tail: true } });

  const top = named[0]?.hours || 1;
  for (const r of squarify(items, 0, 0, W, H)) {
    const cell = h('div', { cls: 'v-cell' });
    cell.style.left = `${(r.x / W) * 100}%`;
    cell.style.top = `${(r.y / H) * 100}%`;
    cell.style.width = `${(r.w / W) * 100}%`;
    cell.style.height = `${(r.h / H) * 100}%`;
    if (r.item.tail) {
      cell.dataset.tail = '1';
    } else {
      const alpha = 0.05 + 0.92 * Math.pow(r.item.hours / top, 0.42);
      cell.style.background = `rgba(255, 180, 84, ${alpha.toFixed(3)})`;
      cell.title = `${r.item.name} - ${num(r.item.hours)} h`;
    }
    box.append(cell);
  }
}

function renderVersus(a, b, qa, qb, root) {
  const wrap = h('div', { cls: 'v' });
  const ha = a.totals.hours, hb = b.totals.hours;

  const side = (d, q, cls) => h('a', { cls: `v-who ${cls}`, attr: { href: `/u/${q}` } },
    d.profile.avatar
      ? h('img', { cls: 'v-face', attr: { src: d.profile.avatar, alt: '', width: '56', height: '56', loading: 'lazy' } })
      : null,
    h('div', {},
      h('b', { text: d.profile.persona || q }),
      h('span', { text: t('vs.hours_games', { h: num(d.totals.hours), n: num(d.totals.played) }) })));

  wrap.append(h('header', { cls: 'v-head' },
    side(a, qa, 'v-who--a'),
    h('span', { cls: 'v-vs', text: 'vs' }),
    side(b, qb, 'v-who--b')));

  // One bar, split where the two totals meet. It is the only number on the
  // page that needs no explanation at all.
  const split = h('div', { cls: 'v-split' });
  const ia = h('i', { cls: 'v-split-a' });
  const ib = h('i', { cls: 'v-split-b' });
  const sum = ha + hb || 1;
  ia.style.width = `${(ha / sum) * 100}%`;
  ib.style.width = `${(hb / sum) * 100}%`;
  split.append(ia, ib);
  wrap.append(split, h('p', { cls: 'v-split-note',
    text: t('vs.split_note', {
      lead: (ha >= hb ? a : b).profile.persona,
      x: num(Math.round((Math.max(ha, hb) / Math.max(1, Math.min(ha, hb))) * 10) / 10, 1),
    }) }));

  const maps = h('div', { cls: 'v-maps' });
  for (const [d, q] of [[a, qa], [b, qb]]) {
    const box = h('div', { cls: 'v-map' });
    miniMap(box, d.library, d.totals.hours);
    maps.append(h('div', { cls: 'v-mapwrap' },
      h('p', { cls: 'v-maplabel', text: d.profile.persona || q }), box));
  }
  wrap.append(maps);

  // What only exists with two libraries: the overlap.
  const byId = new Map(b.library.map((g) => [g.appid, g]));
  const common = a.library
    .filter((g) => byId.has(g.appid))
    .map((g) => ({ name: g.name, appid: g.appid, a: g.hours, b: byId.get(g.appid).hours }))
    .sort((x, y) => (y.a + y.b) - (x.a + x.b));

  wrap.append(h('h2', { cls: 'v-h', text: t('vs.common') }));
  if (!common.length) {
    wrap.append(h('p', { cls: 'v-note', text: t('vs.none_common') }));
  } else {
    const list = h('div', { cls: 'v-common' });
    for (const g of common.slice(0, 30)) {
      const total = g.a + g.b || 1;
      const row = h('div', { cls: 'v-row' },
        h('span', { cls: 'v-row-a', text: `${hrs(g.a)} h` }),
        h('span', { cls: 'v-row-name' },
          h('a', { attr: { href: `/u/${qa}/${g.appid}` }, text: g.name })),
        h('span', { cls: 'v-row-b', text: `${hrs(g.b)} h` }));
      const bar = h('div', { cls: 'v-bar' });
      const ba = h('i', { cls: 'v-bar-a' });
      const bb = h('i', { cls: 'v-bar-b' });
      ba.style.width = `${(g.a / total) * 100}%`;
      bb.style.width = `${(g.b / total) * 100}%`;
      bar.append(ba, bb);
      list.append(h('div', { cls: 'v-item' }, row, bar));
    }
    wrap.append(list,
      h('p', { cls: 'v-note', text: t('vs.common_note', {
        n: num(common.length), shown: num(Math.min(30, common.length)),
        onlya: num(a.library.length - common.length),
        onlyb: num(b.library.length - common.length),
      }) }));
  }
  root.append(wrap);
}

/** The field that starts a comparison. It lives at the foot of the library,
 *  because that is where someone is already looking at what they own. */
function buildCompare(query) {
  const form = el('cmp');
  if (!form) return;
  const input = el('cmp-who');
  input.setAttribute('aria-label', t('vs.compare_with'));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const other = input.value.trim();
    if (other) location.href = `/u/${query}/vs/${encodeURIComponent(other)}`;
  });
}

/* ── What it cost ──────────────────────────────────────────────────────
   The one number here that people will screenshot, and therefore the one
   most worth being exact about: it is the store's price today, not what
   anybody paid. Steam does not publish what anybody paid.

   Both this and the genres below are drawn from a cache that is still being
   filled while the page is open, so both are redrawn by pollStore() and both
   print how much of the library they have actually seen. */

function buildMoney(m, cov) {
  const wrap = el('panel-money');
  if (!wrap) return;
  // No money in the payload at all means it predates this panel - a browser
  // holding a cached copy from before a deploy. Take the panel out rather than
  // leaving a dead one full of dashes.
  if (!m || !cov) {
    wrap.remove();
    return;
  }
  el('money-head').textContent = t('money.head', {
    n: num(cov.priced), total: num(cov.owned),
  });
  el('money-total').textContent = m.read ? cash(m.total, m.currency) : '-';

  kvInto(el('money-kv'), [
    [t('money.paid'), m.paid ? num(m.paid) : null],
    [t('money.free'), m.free ? num(m.free) : null],
    [t('money.unsold'), m.unsold ? num(m.unsold) : null],
    [t('money.waiting'), cov.owned - cov.priced > 0 ? num(cov.owned - cov.priced) : null],
    [t('money.never_worth'), m.never ? cash(m.never, m.currency) : null],
    [t('money.hour'), m.per_hour ? t('money.rate', { v: cash(m.per_hour, m.currency) }) : null],
  ]);

  // The two ends of the same list: what an hour cost at its cheapest and at
  // its dearest. A game bought and barely opened is the dearest hour anyone
  // ever buys, and that is the honest shape of the number rather than noise.
  const rates = el('money-rates');
  rates.textContent = '';
  const section = (label, rows) => {
    if (!rows.length) return;
    rates.append(h('p', { cls: 'rate-cap', text: label }));
    for (const r of rows) {
      rates.append(h('div', { cls: 'rate-line' },
        h('a', { cls: 'rate-name', text: r.name, attr: { href: `/u/${MONEY_Q}/${r.appid}` } }),
        h('span', { cls: 'rate-fig' },
          txt(t('money.rate', { v: cash(r.per_hour, m.currency) })),
          h('em', { text: `${hrs(r.hours)} h` }))));
    }
  };
  section(t('money.cheapest'), (m.cheapest || []).slice(0, 3));
  section(t('money.dearest'), (m.dearest || []).slice(0, 3));

  el('money-note').textContent = m.read
    ? t('money.note', { n: num(cov.priced), total: num(cov.owned) })
    : t('money.none');
}

/** The profile segment the money panel links its game names with. Set once by
 *  renderDashboard; the panel is redrawn on a timer and should not have to be
 *  handed it again on every tick. */
let MONEY_Q = '';

function buildGenres(genres, cov) {
  const wrap = el('panel-gen');
  if (!wrap) return;
  if (!cov) {
    wrap.remove();
    return;
  }
  el('gen-head').textContent = t('gen.head', {
    h: num(cov.genre_hours), total: num(cov.hours),
  });
  const rows = genres || [];
  if (!rows.length) {
    el('gen-note').textContent = t('gen.none');
    return;
  }
  // A genre id the dictionary has never seen falls back to the English name
  // the store sent, which is better than printing "genre.9001".
  const label = (g) => {
    const key = `genre.${g.id}`;
    const said = t(key);
    return said === key ? (g.name || key) : said;
  };
  rowsInto(el('gen-rows'), rows.map((g) => ({
    name: label(g), value: g.hours,
    figure: `${hrs(g.hours)} h · ${num(g.share, 1)}%`,
  })));
  el('gen-note').textContent = t('gen.note', {
    h: num(cov.genre_hours), total: num(cov.hours),
  });
}

/** Ask again for as long as it is still worth asking. meta.py crawls the
 *  storefront at one request every two seconds, so a long library is complete
 *  minutes after the page opened rather than before it drew. */
function pollStore(steamid) {
  const full = (c) => c.priced >= c.owned && c.detailed >= c.owned;
  let left = 30;
  const tick = async () => {
    let got;
    try {
      got = await api(`/meta?id=${steamid}&cc=${store()}`);
    } catch {
      return; // A refusal here is not worth an error on an otherwise fine page.
    }
    buildMoney(got.money, got.coverage);
    buildGenres(got.genres, got.coverage);
    if (--left > 0 && !full(got.coverage)) setTimeout(tick, 6000);
  };
  setTimeout(tick, 4000);
}

/* ── Friends ───────────────────────────────────────────────────────── */

function buildFriends(fl, query) {
  const wrap = el('panel-mates');
  if (!wrap) return;
  if (!fl || !fl.people?.length) {
    // A private friend list is the normal case, not an error worth a panel.
    wrap.remove();
    return;
  }
  el('fr-head').textContent = t('fr.head', { n: num(fl.total) });
  const list = el('fr-list');
  list.textContent = '';
  for (const p of fl.people.slice(0, 60)) {
    const face = h('img', {
      attr: {
        src: p.avatar, alt: '', width: '52', height: '52',
        loading: 'lazy', decoding: 'async',
      },
    });
    const label = p.public
      ? t('fr.compare', { who: p.persona })
      : t('fr.private', { who: p.persona });
    // Private profiles are not links: the lookup can only end in an error, and
    // spending one to find that out helps nobody.
    const tile = p.public
      ? h('a', {
        cls: 'mate',
        attr: { href: `/u/${query}/vs/${p.steamid}`, title: label, 'aria-label': label },
      }, face)
      : h('span', { cls: 'mate', data: { private: '1' }, attr: { title: label } }, face);
    list.append(h('li', {}, tile));
  }
  el('fr-note').textContent = t('fr.note');
}

/* ── The rarest things here ────────────────────────────────────────────
   Behind a button because it is the most expensive thing the site can be
   asked for: three calls to Steam per game, against the owner's key. */

function buildRarities(steamid, howMany) {
  const go = el('rar-go');
  if (!go) return;
  if (!steamid) {
    el('raridades')?.remove();
    return;
  }
  go.textContent = t('rar.go', { n: num(howMany) });
  el('rar-note').textContent = t('rar.hint');

  go.addEventListener('click', async () => {
    go.disabled = true;
    go.textContent = t('rar.loading', { n: num(howMany) });
    let got;
    try {
      got = await api(`/rarities?id=${steamid}`);
    } catch (e) {
      go.disabled = false;
      go.textContent = t('rar.go', { n: num(howMany) });
      el('rar-note').textContent = e.message;
      return;
    }
    go.remove();

    const list = el('rar-list');
    list.textContent = '';
    for (const a of got.rarest) {
      const row = h('a', {
        cls: 'rare',
        attr: { href: `/u/${MONEY_Q}/${a.appid}`, title: a.description || a.name },
      });
      if (a.icon) {
        row.append(h('img', {
          attr: { src: a.icon, alt: '', width: '40', height: '40', loading: 'lazy' },
        }));
      } else {
        row.append(h('span'));
      }
      row.append(
        h('span', { cls: 'rare-txt' },
          h('b', { cls: 'rare-name', text: a.name }),
          h('span', { cls: 'rare-game', text: a.game })),
        h('span', { cls: 'rare-pct', text: rarity(a.rarity) }));
      list.append(h('li', {}, row));
    }

    el('rar-head').textContent = t('rar.head', { n: num(got.rarest.length) });
    el('rar-note').textContent = got.rarest.length
      ? t('rar.note', { n: num(got.scanned), m: num(got.with_achievements) })
      : t('rar.none', { n: num(got.scanned) });
  });
}

/* ── The pile ──────────────────────────────────────────────────────────
   /u/<perfil>/backlog - every game owned and never once launched.

   The art is Steam's small header, straight from the CDN and lazily: the
   local hero cache exists for pages somebody opened, and filling it with
   three hundred games nobody did would be a hundred megabytes of nothing. */

const PILE_PAGE = 60;
const HEADER_ART = 'https://cdn.cloudflare.steamstatic.com/steam/apps';

async function renderBacklog(d, query) {
  const games = d.unplayed || [];
  const list = el('bl-list');
  const more = el('bl-more');
  const find = el('bl-find');
  const sorts = el('bl-sorts');

  el('bl-count').textContent = num(games.length);
  document.title = `${d.profile.persona} - ${t('bl.title')} - steamprofiler.org`;

  if (!games.length) {
    el('bl-lede').textContent = t('bl.empty');
    el('bl-note').textContent = '';
    return;
  }

  // Prices and years come from the store cache, which knows nothing about any
  // profile and may still be filling. The page draws either way.
  let apps = {};
  let money = null;
  try {
    const got = await api(`/meta?id=${d.steamid}&cc=${store()}`);
    apps = got.apps || {};
    money = got.money;
  } catch {
    /* The pile is a real page without a single price on it. */
  }

  const priceOf = (appid) => (apps[appid] || [])[0] ?? null;
  const yearOf = (appid) => (apps[appid] || [])[1] ?? null;
  const freeOf = (appid) => (apps[appid] || [])[2] === 1;
  const currency = money?.currency;

  el('bl-lede').textContent = money?.never
    ? t('bl.lede', {
      n: num(games.length), owned: num(d.totals.owned),
      worth: cash(money.never, currency),
    })
    : t('bl.lede_bare', { n: num(games.length), owned: num(d.totals.owned) });
  el('bl-worth').textContent = money?.never
    ? t('bl.worth', { v: cash(money.never, currency) })
    : num(games.length);

  const ORDERS = {
    price: (a, b) => (priceOf(b.appid) ?? -1) - (priceOf(a.appid) ?? -1),
    name: (a, b) => a.name.localeCompare(b.name, locale()),
    year: (a, b) => (yearOf(a.appid) ?? 9999) - (yearOf(b.appid) ?? 9999),
  };
  let order = 'price';
  let shown = PILE_PAGE;

  sorts.textContent = '';
  for (const key of ['price', 'name', 'year']) {
    const b = h('button', {
      cls: 'all-sort',
      text: t(key === 'name' ? 'dash.sort_name' : `bl.sort_${key}`),
      attr: { type: 'button' },
    });
    if (key === order) b.dataset.on = '1';
    b.addEventListener('click', () => {
      order = key;
      shown = PILE_PAGE;
      for (const other of sorts.children) delete other.dataset.on;
      b.dataset.on = '1';
      draw();
    });
    sorts.append(b);
  }

  function matching() {
    const q = find.value.trim().toLowerCase();
    const rows = q ? games.filter((g) => g.name.toLowerCase().includes(q)) : games;
    return rows.slice().sort(ORDERS[order]);
  }

  function draw() {
    const rows = matching();
    list.textContent = '';
    for (const g of rows.slice(0, shown)) {
      const price = priceOf(g.appid);
      const year = yearOf(g.appid);
      const bits = [
        price ? cash(price, currency) : freeOf(g.appid) ? t('bl.free') : t('bl.no_price'),
        year ? String(year) : null,
      ].filter(Boolean);

      const art = h('img', {
        cls: 'pile-art',
        attr: {
          src: `${HEADER_ART}/${g.appid}/header.jpg`, alt: '',
          width: '460', height: '215', loading: 'lazy', decoding: 'async',
        },
      });
      // Old and delisted apps have no header. The frame stays - dropping it
      // would leave one short card in a grid of tall ones, which reads as a
      // broken layout rather than as a game with no picture.
      art.addEventListener('error', () => { art.removeAttribute('src'); });

      list.append(h('li', {},
        h('a', { cls: 'pile-row', attr: { href: `/u/${query}/${g.appid}` } },
          art,
          h('span', { cls: 'pile-txt' },
            h('b', { cls: 'pile-name', text: g.name }),
            h('span', { cls: 'pile-meta', text: bits.join(' · ') })))));
    }

    const left = rows.length - shown;
    more.hidden = left <= 0;
    more.textContent = left > 0 ? t('dash.all_more', { n: num(Math.min(left, PILE_PAGE)) }) : '';
    el('bl-note').textContent = t('bl.note', {
      shown: num(Math.min(shown, rows.length)), total: num(rows.length),
    });
  }

  more.addEventListener('click', () => { shown += PILE_PAGE; draw(); });
  find.addEventListener('input', () => { shown = PILE_PAGE; draw(); });
  draw();
}

/* ── Entry point ──────────────────────────────────────────────────── */

/** Fill the dashboard skeleton in profile.html from a /api/profile payload. */
function renderDashboard(d, query) {
  const totals = d.totals;
  const top = d.library[0];
  const pf = d.profile;

  document.title = `${pf.persona} - steamprofiler.org`;
  el('h-hours').textContent = num(totals.hours);
  el('float-span').textContent = pf.member_since
    ? `${pf.member_since.slice(0, 4)} - ${new Date().getFullYear()}`
    : '';
  el('float-who').textContent = pf.persona || query;

  const years = pf.days_since ? Math.floor(pf.days_since / 365) : null;
  el('h-lede').innerHTML =
    t('dash.lede', {
      days: num(totals.days),
      years: years ? t('dash.lede_years', { years: num(years) }) : '',
      owned: num(totals.owned),
      never: num(totals.never_played),
    })
    + (top ? t('dash.lede_top', { game: top.name, share: num(top.share, 1) }) : '');

  buildMap(d.library, totals.hours, query);
  let timer;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(() => buildMap(d.library, totals.hours, query), 180);
  });

  buildNow(d.now);
  buildPlatform(d.platform);
  buildAccount(pf);
  buildShowcase(pf);
  buildPages(d.top_games, query);
  buildTable(d.top_games, query);
  buildTimeline(d.library);
  buildLibrary(d.library, d.unplayed, query);
  buildCompare(query);

  MONEY_Q = query;
  buildMoney(d.money, d.store_coverage);
  buildGenres(d.genres, d.store_coverage);
  buildFriends(d.friend_list, query);
  buildRarities(d.steamid, d.rarity_games || 12);
  // The store cache is still filling behind this page. Both panels redraw
  // themselves until it stops changing or until asking again stops being
  // worth it.
  pollStore(d.steamid);

  const pile = el('all-pile-link');
  if (pile && d.unplayed?.length) {
    pile.href = `/u/${query}/backlog`;
    pile.textContent = t('dash.pile_link', { n: num(d.unplayed.length) });
  } else if (pile) {
    pile.parentElement.remove();
  }
  el('table-share').textContent = t('dash.table_share', { share: num(totals.top10_share) });

  if (d.generated_at) {
    const time = el('g-generated');
    time.dateTime = d.generated_at;
    time.textContent = stamp(d.generated_at);
  }
}
