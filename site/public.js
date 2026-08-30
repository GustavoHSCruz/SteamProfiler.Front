/* steamprofiler.org - one game, belonging to nobody.

     /g/<appid>

   Every other page on this site starts from a person: /u/<who> is a library,
   /u/<who>/<appid> is that person's record in one game, and both are disallowed
   in robots.txt because an account is not a thing to put in a search index.
   That left the most expensive work on the site - the themed game pages - in a
   place no crawler is allowed to look, and behind a step (find a profile) that
   somebody arriving from a search has no reason to take.

   This page is the same site with the person removed. What is left is what was
   always true of the game rather than of anyone playing it: its name, its key
   art, what it costs today, and the whole achievement set with Steam's own
   global rarity on each one - the figure that says how many of everyone who
   owns the game has done that thing. None of that needs a steamid, and none of
   the calls behind it takes one.

   Games that have a complete visual composition in the profile keep that
   composition here as well. Their facts are different by design: hours, rank
   and unlock dates belong to a person, so the public variants fill those same
   visual systems only with Steam's global achievement and storefront data. */

const APPID = (() => {
  const seg = location.pathname.split('/').filter(Boolean);
  return seg[0] === 'g' && /^\d{1,8}$/.test(seg[1] || '') ? Number(seg[1]) : null;
})();

const root = () => el('gp-root');

function themeFromHead() {
  const tag = document.querySelector('meta[name="sp-game"]');
  return tag && tag.content.trim() || '';
}

function waitOpen() {
  const theme = themeFromHead();
  if (theme) document.documentElement.dataset.game = theme;
  const wait = el('gp-wait');
  wait.dataset.theme = theme || 'generic';
  bootSkeleton(el('gp-wait-shape'), 'game', APPID, theme);
  wait.hidden = false;
  return performance.now();
}

function fail(message) {
  el('gp-wait').hidden = true;
  el('gp').hidden = true;
  el('failure').hidden = false;
  el('failure-text').textContent = message;
}

/* ── The pieces ────────────────────────────────────────────────────── */

/** The game's key art, full width, with the page's background coming up over
 *  the bottom of it so the title sits on the picture rather than under a hard
 *  edge. Removes itself if there is no art: a broken image on the first screen
 *  is worse than starting at the title. */
function artBand(g) {
  if (!g.art) return null;
  const band = h('div', { cls: 'gp-art' });
  const img = h('img', {
    attr: { src: g.art, alt: '', 'aria-hidden': 'true', loading: 'eager', decoding: 'async' },
  });
  img.addEventListener('error', () => band.remove(), { once: true });
  band.append(img);
  return band;
}

/** Name, and the three facts that are true of the game rather than of a copy of
 *  it. Each one is dropped when it is not known, rather than printed as a dash:
 *  this page has few enough facts on it that a row of dashes would be most of
 *  what is above the fold. */
function heading(g) {
  const s = g.store || {};
  const bits = [];
  if (s.year) bits.push(`${t('gp.released')} ${s.year}`);
  if (s.free) bits.push(t('gp.free'));
  // meta.py keeps the store's genres as `{id, name}` - the id is the stable
  // half and the name is the English one that travels with it - so this reads
  // the name off the object and takes a bare string too. Four at most: the
  // store hands out as many as nine, and the tail of that list is where "Indie"
  // and "Casual" live, which say nothing about any particular game.
  const genres = (s.genres || [])
    .map((x) => (typeof x === 'string' ? x : (x && x.name) || null))
    .filter(Boolean)
    .slice(0, 4);
  if (genres.length) bits.push(genres.join(' · '));

  return h('header', { cls: 'gp-head' },
    bits.length ? h('p', { cls: 'gp-kicker', text: bits.join('  ·  ') }) : null,
    h('h1', { cls: 'gp-title display', text: g.name }),
    h('p', { cls: 'gp-steam' },
      h('a', {
        cls: 'btn-steam',
        text: t('gp.on_steam'),
        attr: {
          href: `https://store.steampowered.com/app/${g.appid}/`,
          target: '_blank', rel: 'noopener',
        },
      })));
}

/* ── Public versions of the profile's eight original themed screens ─────
   These use the same objects and class names as /u/<profile>/<appid>, but not
   its facts. A public game has no hours, rank or unlock dates. Its honest
   material is the store record and Steam's global achievement rarity, so each
   screen recasts those facts in the game's existing visual grammar. */

const publicKnown = (g) => ((g.achievements || {}).list || [])
  .filter((a) => a.rarity != null).slice().sort((a, b) => a.rarity - b.rarity);
const publicMedian = (g) => {
  const list = publicKnown(g);
  return list.length ? list[Math.floor(list.length / 2)].rarity : null;
};
const publicCommon = (g) => publicKnown(g).filter((a) => a.rarity >= 50).length;
const publicGenres = (g) => ((g.store || {}).genres || [])
  .map((x) => typeof x === 'string' ? x : x?.name).filter(Boolean);
const publicKicker = (g) => [t('gp.global'), (g.store || {}).year, ...publicGenres(g).slice(0, 2)]
  .filter(Boolean).join('  ·  ');
const publicFacts = (g) => [
  [t('gp.total_ach'), num((g.achievements || {}).total || 0)],
  [t('gp.median'), rarity(publicMedian(g))],
  [t('gp.common'), num(publicCommon(g))],
];

function publicDota(g, root) {
  const wrap = h('div', { cls: 'd' });
  const hero = h('header', { cls: 'd-hero' });
  if (g.art) hero.append(h('img', {
    cls: 'd-hero-art', attr: { src: g.art, alt: '', 'aria-hidden': 'true', loading: 'eager' },
  }));
  hero.append(h('div', { cls: 'd-hero-in' },
    h('p', { cls: 'd-kicker', text: publicKicker(g) }),
    h('h1', { cls: 'd-title', text: g.name }),
    h('div', { cls: 'd-tally' },
      h('div', { cls: 'd-side d-side--r' }, h('b', { text: num((g.achievements || {}).total || 0) }),
        h('span', { text: t('gp.total_ach') })),
      h('div', { cls: 'd-scale' }, h('div', { cls: 'd-scale-bar', data: { blank: '1' } },
        h('i', { cls: 'd-w' }), h('i', { cls: 'd-l' }))),
      h('div', { cls: 'd-side d-side--d' }, h('b', { text: rarity(publicMedian(g)) }),
        h('span', { text: t('gp.median') })))));
  wrap.append(hero);

  const grid = h('div', { cls: 'd-stats' });
  publicFacts(g).forEach(([label, value]) => grid.append(
    h('div', { cls: 'd-stat' }, h('b', { text: value }), h('span', { text: label }))));
  wrap.append(h('section', { cls: 'd-panel' },
    h('div', { cls: 'd-panel-head' }, h('h2', { text: t('gp.global') })), grid,
    h('p', { cls: 'd-note', text: t('gp.ach_none') })));
  root.append(wrap);
}

function publicCs2(g, root) {
  const set = g.achievements || {};
  const list = publicKnown(g);
  const wrap = h('div', { cls: 'cs' });
  wrap.append(h('header', { cls: 'cs-top' },
    h('p', { cls: 'cs-kicker', text: publicKicker(g) }),
    h('h1', { cls: 'cs-title', text: g.name }),
    h('p', { cls: 'cs-sub', text: t('gp.rarest_note') }),
    h('div', { cls: 'cs-hud' }, ...publicFacts(g).map(([label, value], i) =>
      h('div', { cls: i === 2 ? 'cs-hud-cell cs-hud-cell--money' : 'cs-hud-cell' },
        h('span', { text: label }), h('b', { text: value }))))));

  const guns = h('div', { cls: 'cs-guns' });
  list.forEach((a, i) => guns.append(h('article', { cls: 'cs-gun', data: i === 0 ? { lead: '1' } : {} },
    h('span', { cls: 'cs-gun-name', text: a.name }),
    h('b', { cls: 'cs-gun-kills', text: rarity(a.rarity) }),
    h('span', { cls: 'cs-gun-acc', text: a.description || t('gp.of_owners') }),
    fillBar('cs-gun-bar', a.rarity, i * 30))));
  wrap.append(h('div', { cls: 'cs-section' },
    h('h2', { cls: 'cs-h', text: t('gp.ach_head') }),
    list.length ? h('section', { cls: 'cs-buy' },
      h('nav', { cls: 'cs-rail' }, h('span', { cls: 'cs-rail-item' },
        h('span', { text: t('gp.rarity') }), h('em', { text: num(set.total || list.length) }))),
      h('div', { cls: 'cs-cats' }, h('section', { cls: 'cs-cat' }, guns)))
      : h('p', { cls: 'cs-note', text: t('gp.ach_none') })));
  root.append(wrap);
}

function publicArma3(g, root) {
  const list = publicKnown(g);
  const brief = h('section', { cls: 'a3-brief' },
    h('p', { cls: 'a3-stamp', text: t('g.briefing') }),
    h('h1', { cls: 'a3-title', text: g.name }));
  const def = h('dl', { cls: 'a3-def' });
  publicFacts(g).forEach(([label, value]) => def.append(h('dt', { text: label }), h('dd', { text: value })));
  const genres = publicGenres(g);
  if (genres.length) def.append(h('dt', { text: t('gp.genres') }), h('dd', { text: genres.join(' · ') }));
  brief.append(def);
  const tasks = h('ul', { cls: 'a3-tasks' });
  list.slice(0, 12).forEach((a) => {
    const task = h('li', {},
      h('i', { cls: 'a3-tick' }),
      h('div', {},
        h('b', { text: a.name }),
        h('span', { cls: 'a3-task-meta',
          text: `${rarity(a.rarity)} · ${t('gp.of_owners')}` })));
    tasks.append(task);
  });
  brief.append(h('h2', { cls: 'a3-h', text: t('gp.ach_sub') }), tasks);
  root.append(h('div', { cls: 'a3' }, brief));
}

function publicWarThunder(g, root) {
  const list = publicKnown(g);
  const bands = [[0, 1, '< 1%'], [1, 5, '1–5%'], [5, 20, '5–20%'], [20, 101, '20%+']];
  const tree = h('section', { cls: 'wt-tree' });
  bands.forEach(([from, to, label]) => {
    const entries = list.filter((a) => a.rarity >= from && a.rarity < to);
    if (!entries.length) return;
    const nodes = h('div', { cls: 'wt-nodes' });
    entries.forEach((a) => {
      const icon = a.icon
        ? h('img', { cls: 'wt-node-icon', attr: { src: a.icon, alt: '', loading: 'lazy' } })
        : h('span', { cls: 'wt-node-icon wt-node-icon--none' });
      nodes.append(h('article', { cls: 'wt-node', attr: { title: a.description || a.name } },
        icon,
        h('div', { cls: 'wt-node-text' },
          h('b', { text: a.name }), h('span', { text: rarity(a.rarity) }))));
    });
    tree.append(h('div', { cls: 'wt-rank' },
      h('div', { cls: 'wt-rank-head' }, h('span', { cls: 'wt-year', text: label }),
        h('span', { cls: 'wt-count', text: num(entries.length) })), nodes));
  });
  root.append(h('div', { cls: 'wt' },
    h('header', { cls: 'wt-head' }, h('p', { cls: 'wt-kicker', text: publicKicker(g) }),
      h('h1', { cls: 'wt-title', text: g.name }),
      h('div', { cls: 'wt-gauges' }, ...publicFacts(g).map(([label, value]) =>
        h('div', { cls: 'wt-gauge' }, h('b', { text: value }), h('span', { text: label }))))),
    h('h2', { cls: 'wt-h', text: t('g.research_tree') }), tree));
}

function publicHash(value) {
  let x = 2166136261;
  for (let i = 0; i < value.length; i++) { x ^= value.charCodeAt(i); x = Math.imul(x, 16777619); }
  return (x >>> 0) / 4294967295;
}

function publicSkyrim(g, root) {
  const list = publicKnown(g);
  const sky = h('figure', { cls: 'sk-sky' }, h('i', { cls: 'sk-aurora', attr: { 'aria-hidden': 'true' } }),
    h('i', { cls: 'sk-dust', attr: { 'aria-hidden': 'true' } }));
  list.forEach((a, i) => {
    const star = h('button', { cls: 'sk-star', attr: { type: 'button', title: `${a.name} · ${rarity(a.rarity)}` },
      data: a.rarity < 5 ? { bright: '1' } : {} }, h('span', { cls: 'sk-star-label' },
        h('b', { text: a.name }), h('em', { text: `${rarity(a.rarity)} · ${t('gp.of_owners')}` })));
    star.style.left = `${8 + publicHash(`${a.key || a.name}:x`) * 84}%`;
    star.style.top = `${10 + publicHash(`${a.key || a.name}:y`) * 62}%`;
    star.style.setProperty('--size', `${(6 + Math.max(0, 1 - a.rarity / 30) * 10).toFixed(1)}px`);
    sky.append(star);
  });
  sky.append(h('i', { cls: 'sk-ridge', attr: { 'aria-hidden': 'true' } }));
  root.append(h('div', { cls: 'sk' },
    h('header', { cls: 'sk-head' }, h('p', { cls: 'sk-kicker', text: publicKicker(g) }),
      h('h1', { cls: 'sk-title', text: g.name }), h('p', { cls: 'sk-sub', text: t('gp.ach_sub') })),
    sky, h('p', { cls: 'sk-note', text: t('gp.rarest_note') })));
}

function publicGauge(value, max, label, readout) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const span = 0.75;
  const frac = Math.max(0, Math.min(1, (value || 0) / max));
  const ns = 'http://www.w3.org/2000/svg';
  const dial = document.createElementNS(ns, 'svg');
  dial.setAttribute('viewBox', '0 0 100 100');
  dial.setAttribute('class', 'fs-dial');
  dial.setAttribute('aria-hidden', 'true');
  for (const [cls, length] of [['fs-dial-track', span], ['fs-dial-fill', span * frac]]) {
    const circle = document.createElementNS(ns, 'circle');
    circle.setAttribute('cx', '50');
    circle.setAttribute('cy', '50');
    circle.setAttribute('r', String(radius));
    circle.setAttribute('class', cls);
    circle.setAttribute('stroke-dasharray', `${(circumference * length).toFixed(2)} ${circumference}`);
    circle.setAttribute('transform', 'rotate(135 50 50)');
    dial.append(circle);
  }
  for (let i = 0; i <= 10; i += 1) {
    const angle = (135 + i * 27) * (Math.PI / 180);
    const tick = document.createElementNS(ns, 'line');
    tick.setAttribute('x1', String(50 + Math.cos(angle) * 33));
    tick.setAttribute('y1', String(50 + Math.sin(angle) * 33));
    tick.setAttribute('x2', String(50 + Math.cos(angle) * (i % 5 === 0 ? 26 : 29)));
    tick.setAttribute('y2', String(50 + Math.sin(angle) * (i % 5 === 0 ? 26 : 29)));
    tick.setAttribute('class', 'fs-dial-tick');
    dial.append(tick);
  }
  return h('figure', { cls: 'fs-gauge' }, dial,
    h('div', { cls: 'fs-gauge-read' }, h('b', { text: readout }), h('span', { text: label })));
}

function publicMsfs(g, root) {
  const list = publicKnown(g);
  const log = h('table', { cls: 'fs-log' }, h('thead', {}, h('tr', {},
    h('th', { text: t('gp.rarity') }), h('th', { text: t('g.achievement') }), h('th', { text: t('gp.of_owners') }))));
  const body = h('tbody');
  list.forEach((a) => body.append(h('tr', {}, h('td', { cls: 'fs-log-date', text: rarity(a.rarity) }),
    h('td', {}, h('b', { text: a.name }), a.description ? h('span', { text: a.description }) : null),
    h('td', { cls: 'fs-log-rare', text: rarity(a.rarity) }))));
  log.append(body);
  root.append(h('div', { cls: 'fs' },
    h('header', { cls: 'fs-head' }, h('p', { cls: 'fs-kicker', text: publicKicker(g) }),
      h('h1', { cls: 'fs-title', text: g.name }), h('p', { cls: 'fs-sub', text: t('gp.rarest_note') })),
    h('section', { cls: 'fs-panel' },
      publicGauge((g.achievements || {}).total || 0, 100, t('gp.total_ach'), num((g.achievements || {}).total || 0)),
      publicGauge(publicMedian(g), 100, t('gp.median'), rarity(publicMedian(g))),
      publicGauge(publicCommon(g), Math.max(1, list.length), t('gp.common'), num(publicCommon(g)))),
    h('section', { cls: 'fs-logwrap' }, h('h2', { cls: 'fs-h', text: t('g.logbook') }),
      h('div', { cls: 'fs-log-scroll' }, log))));
}

function publicGta(g, root) {
  const list = publicKnown(g);
  const rows = [
    [t('gp.total_ach'), (g.achievements || {}).total || 0, 100, num((g.achievements || {}).total || 0)],
    [t('gp.median'), publicMedian(g) || 0, 100, rarity(publicMedian(g))],
    [t('gp.common'), publicCommon(g), Math.max(1, list.length), num(publicCommon(g))],
  ];
  const stats = h('div', { cls: 'gta-stats' });
  rows.forEach(([label, value, max, read]) => {
    const seg = h('div', { cls: 'gta-seg' });
    const filled = Math.round((value / max) * 20);
    for (let i = 0; i < 20; i++) seg.append(h('i', { data: i < filled ? { on: '1' } : {} }));
    stats.append(h('div', { cls: 'gta-stat' }, h('span', { cls: 'gta-stat-label', text: label }), seg,
      h('b', { cls: 'gta-stat-val', text: read })));
  });
  const cards = h('div', { cls: 'gta-cards' });
  list.slice(0, 9).forEach((a) => {
    cards.append(h('article', { cls: 'gta-card' },
      a.icon ? h('img', { cls: 'gta-card-icon', attr: { src: a.icon, alt: '', loading: 'lazy' } }) : null,
      h('div', { cls: 'gta-card-text' },
        h('b', { text: a.name }),
        a.description ? h('p', { text: a.description }) : null,
        h('span', { cls: 'gta-card-meta',
          text: `${rarity(a.rarity)} · ${t('gp.of_owners')}` }))));
  });
  root.append(h('div', { cls: 'gta' }, h('div', { cls: 'gta-shell' },
    h('nav', { cls: 'gta-tabs' }, h('span', { cls: 'gta-tab', data: { on: '1' }, text: t('gp.global') }),
      h('a', { cls: 'gta-tab', attr: { href: '#gta-global' }, text: t('gp.ach_head') })),
    h('div', { cls: 'gta-body' }, h('p', { cls: 'gta-kicker', text: publicKicker(g) }),
      h('h1', { cls: 'gta-title', text: g.name }), stats)),
    h('h2', { cls: 'gta-h', attr: { id: 'gta-global' }, text: t('gp.ach_sub') }), cards));
}

function publicCod(g, root) {
  const list = publicKnown(g);
  const one = list[0];
  const total = (g.achievements || {}).total || 0;
  const wrap = h('div', { cls: 'cod' },
    h('div', { cls: 'cod-tag' }, h('span', { cls: 'cod-tag-line', text: t('gp.global') }),
      h('p', { cls: 'cod-hours' }, h('b', { text: num(total) })),
      h('span', { cls: 'cod-tag-meta', text: g.name })),
    h('section', { cls: 'cod-face' },
      h('div', { cls: 'cod-face-cell' }, h('b', { text: num(total) }), h('span', { text: t('gp.total_ach') })),
      h('div', { cls: 'cod-face-sep', text: '×' }),
      h('div', { cls: 'cod-face-cell cod-face-cell--hot' }, h('b', { text: rarity(one?.rarity) }),
        h('span', { text: t('gp.rarest') }))));
  if (one) wrap.append(h('article', { cls: 'cod-one' },
    one.icon ? h('img', { cls: 'cod-one-icon', attr: { src: one.icon, alt: '', loading: 'lazy' } }) : null,
    h('div', {}, h('span', { cls: 'cod-one-label', text: t('gp.rarest') }), h('b', { text: one.name }),
      one.description ? h('p', { text: one.description }) : null,
      h('span', { cls: 'cod-one-meta', text: `${rarity(one.rarity)} · ${t('gp.of_owners')}` }))));
  root.append(wrap);
}

function publicRepoFace(cls) {
  const face = h('div', { cls, attr: { 'aria-hidden': 'true' } });
  const pupils = [h('i', { cls: 'repo-pupil' }), h('i', { cls: 'repo-pupil' })];
  pupils.forEach((pupil) => face.append(h('span', { cls: 'repo-eye' }, pupil)));
  return { face, pupils };
}

function publicRepo(g, root) {
  const wrap = h('div', { cls: 'repo repo-public' });
  const pupils = [];
  const crew = h('div', { cls: 'repo-crew' });
  ['a', 'b', 'c', 'd'].forEach((tone, index) => {
    const bot = h('div', { cls: 'repo-bot', data: { tone } });
    const eyes = publicRepoFace('repo-face');
    bot.append(eyes.face);
    bot.style.setProperty('--delay', `${index * 230}ms`);
    pupils.push(...eyes.pupils);
    crew.append(bot);
  });
  wrap.append(crew, h('h1', { cls: 'repo-public-title', text: g.name }));

  if (g.live?.players != null) wrap.append(h('div', { cls: 'repo-pill' },
    h('b', { text: num(g.live.players) }), h('em', { text: t('gp.online') })));
  wrap.append(h('p', { cls: 'repo-cap', text: t('gp.repo_shift') }));

  const c = g.catalog || {};
  const review = g.reviews || {};
  const positive = review.total && review.positive != null ? review.positive / review.total * 100 : null;
  const facts = [
    [t('gp.reviews'), review.total != null ? num(review.total) : null],
    [t('gp.positive'), positive != null ? `${num(positive, 1)}%` : null],
    [t('gp.recommendations'), c.recommendations != null ? num(c.recommendations) : null],
    [t('gp.released_full'), c.release?.date || null],
    ['Metacritic', c.metacritic?.score != null ? num(c.metacritic.score) : null],
  ].filter(([, value]) => value != null);
  const blobs = h('div', { cls: 'repo-blobs' });
  facts.forEach(([label, value], index) => {
    const blob = h('div', { cls: 'repo-blob', data: { tone: 'abcde'[index % 5] } });
    blob.style.setProperty('--tilt', `${[-2.5, 1.8, -1.2, 2.6, -2][index % 5]}deg`);
    const eyes = publicRepoFace('repo-face repo-face--sm');
    pupils.push(...eyes.pupils);
    blob.append(eyes.face, h('b', { cls: 'repo-huh', text: value }),
      h('span', { cls: 'repo-blob-label', text: label }));
    blobs.append(blob);
  });
  if (facts.length) wrap.append(blobs);
  root.append(wrap);

  if (still()) return;
  let frame = 0;
  let orbit = null;
  let dizzyTimer = 0;

  const followOrbit = (event) => {
    const now = performance.now();
    if (!orbit || now - orbit.lastAt > 350 || now - orbit.startedAt > 12000) {
      orbit = {
        startedAt: now, lastAt: now, startX: event.clientX, startY: event.clientY,
        x: event.clientX, y: event.clientY, angle: null, turn: 0, distance: 0,
      };
      return;
    }
    const dx = event.clientX - orbit.x;
    const dy = event.clientY - orbit.y;
    const step = Math.hypot(dx, dy);
    if (step < 2) return;
    const angle = Math.atan2(dy, dx);
    if (orbit.angle != null) {
      const delta = Math.atan2(Math.sin(angle - orbit.angle), Math.cos(angle - orbit.angle));
      // A circular gesture turns gradually. A sharp reversal is ordinary mouse
      // use, so it breaks the accumulated turn instead of producing dizziness.
      if (Math.abs(delta) < 1.2) orbit.turn += delta;
      else orbit.turn = 0;
    }
    orbit.angle = angle;
    orbit.x = event.clientX;
    orbit.y = event.clientY;
    orbit.lastAt = now;
    orbit.distance += step;

    const closed = Math.hypot(event.clientX - orbit.startX, event.clientY - orbit.startY);
    // Five complete turns: long enough to be a deliberate secret gesture,
    // never something somebody produces while merely reading the page.
    if (Math.abs(orbit.turn) < Math.PI * 9.9 || orbit.distance < 700 ||
        closed > Math.max(90, orbit.distance * .32)) return;
    wrap.dataset.dizzy = '1';
    clearTimeout(dizzyTimer);
    dizzyTimer = setTimeout(() => { delete wrap.dataset.dizzy; }, 3800);
    orbit = null;
  };

  window.addEventListener('pointermove', (event) => {
    followOrbit(event);
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      frame = 0;
      pupils.forEach((pupil) => {
        const box = pupil.parentElement.getBoundingClientRect();
        const dx = event.clientX - (box.left + box.width / 2);
        const dy = event.clientY - (box.top + box.height / 2);
        const angle = Math.atan2(dy, dx);
        const reach = Math.min(Math.hypot(dx, dy) / 14, box.width * .22);
        pupil.style.setProperty('--px', `${Math.cos(angle) * reach}px`);
        pupil.style.setProperty('--py', `${Math.sin(angle) * reach}px`);
      });
    });
  }, { passive: true });
}

const PUBLIC_LAYOUTS = {
  'dota-2': publicDota,
  'counter-strike-2': publicCs2,
  'arma-3': publicArma3,
  'war-thunder': publicWarThunder,
  'skyrim': publicSkyrim,
  'msfs': publicMsfs,
  'gta-v': publicGta,
  'call-of-duty': publicCod,
  'repo': publicRepo,
};

/** The set, rarest first.
 *
 *  Sorted ascending on purpose, and it is the whole idea of the page: a profile
 *  shows you what one person unlocked, which tells you nothing about whether it
 *  was hard. The global percentage does, and it is the one number here that no
 *  amount of looking at your own account will give you.
 *
 *  An achievement with no published percentage sorts last rather than first: an
 *  unknown is not a rarity of zero, and putting it at the top would hand the
 *  headline to the one line that has nothing to say. */
function ladder(g) {
  const set = g.achievements;
  if (!set || !(set.list || []).length) {
    return h('section', { cls: 'gp-panel gp-none' },
      h('h2', { cls: 'gp-h', text: t('gp.ach_none_head') }),
      h('p', { cls: 'gp-note', text: t('gp.ach_none') }));
  }

  const list = set.list.slice().sort((a, b) => {
    if (a.rarity == null) return 1;
    if (b.rarity == null) return -1;
    return a.rarity - b.rarity;
  });
  const known = list.filter((a) => a.rarity != null);
  const total = set.total || list.length;

  const wrap = h('section', { cls: 'gp-panel' });
  wrap.append(h('div', { cls: 'gp-bar' },
    h('h2', { cls: 'gp-h', text: t('gp.ach_head') }),
    h('b', { text: num(total) })));

  // The headline: the hardest thing in the game and how few people have done
  // it. Only drawn when the rarest one has a published figure - "the rarest is
  // unknown" is not a headline, it is an absence.
  const first = known[0];
  if (first) {
    wrap.append(h('div', { cls: 'gp-rarest' },
      first.icon ? h('img', {
        cls: 'gp-rarest-icon',
        attr: { src: first.icon, alt: '', 'aria-hidden': 'true', loading: 'lazy' },
      }) : null,
      h('div', { cls: 'gp-rarest-body' },
        h('p', { cls: 'gp-label', text: t('gp.rarest') }),
        h('p', { cls: 'gp-rarest-name', text: first.name }),
        first.description
          ? h('p', { cls: 'gp-rarest-desc', text: first.description })
          : null),
      h('p', { cls: 'gp-rarest-pct' },
        h('b', { text: rarity(first.rarity) }),
        h('small', { text: t('gp.of_owners') }))));

    // Where the middle of the set sits. One number that says whether this is a
    // game most people finish or one most people put down, and it costs nothing
    // to work out from the list already on the page.
    if (known.length > 3) {
      const mid = known[Math.floor(known.length / 2)];
      wrap.append(h('p', { cls: 'gp-note gp-half',
        text: t('gp.half_note', { pct: rarity(mid.rarity) }) }));
    }
  }

  wrap.append(h('p', { cls: 'gp-label gp-sub', text: t('gp.ach_sub') }));

  const rows = h('ol', { cls: 'gp-list' });
  for (const a of list) {
    // The bar is the percentage itself and nothing else - no rescaling to make
    // the rare ones visible. A sliver is what 0.4% looks like, and stretching
    // it would be drawing a different number from the one printed beside it.
    rows.append(h('li', { cls: 'gp-row' },
      a.icon ? h('img', {
        cls: 'gp-row-icon',
        attr: { src: a.icon, alt: '', 'aria-hidden': 'true', loading: 'lazy', decoding: 'async' },
      }) : h('span', { cls: 'gp-row-icon gp-row-icon--none', attr: { 'aria-hidden': 'true' } }),
      h('div', { cls: 'gp-row-body' },
        h('p', { cls: 'gp-row-name', text: a.name }),
        a.description ? h('p', { cls: 'gp-row-desc', text: a.description }) : null,
        fillBar('gp-row-bar', a.rarity == null ? 0 : a.rarity)),
      h('span', { cls: 'gp-row-pct', text: rarity(a.rarity) })));
  }
  wrap.append(rows);
  wrap.append(h('p', { cls: 'gp-note', text: t('gp.rarest_note') }));
  return wrap;
}

/* ── The catalogue behind the game ─────────────────────────────────── */

function screenshotGallery(shots, gameName) {
  const grid = h('div', { cls: 'gp-cat-shots' });
  const image = h('img', { cls: 'gp-lightbox-image', attr: { alt: '' } });
  const count = h('span', { cls: 'gp-lightbox-count' });
  const close = h('button', {
    cls: 'gp-lightbox-close', text: '×',
    attr: { type: 'button', 'aria-label': t('gp.gallery_close') },
  });
  const prev = h('button', {
    cls: 'gp-lightbox-nav gp-lightbox-prev', text: '‹',
    attr: { type: 'button', 'aria-label': t('gp.gallery_prev') },
  });
  const next = h('button', {
    cls: 'gp-lightbox-nav gp-lightbox-next', text: '›',
    attr: { type: 'button', 'aria-label': t('gp.gallery_next') },
  });
  const dialog = h('dialog', {
    cls: 'gp-lightbox', attr: { 'aria-label': t('gp.screenshots') },
  }, h('div', { cls: 'gp-lightbox-stage' }, image, close, prev, next, count));
  let index = 0;

  const show = (at) => {
    index = (at + shots.length) % shots.length;
    image.src = shots[index].full;
    image.alt = `${gameName} — ${index + 1}`;
    count.textContent = t('gp.gallery_item', { n: index + 1, total: shots.length });
  };
  shots.forEach((item, at) => {
    const button = h('button', {
      cls: 'gp-shot',
      attr: { type: 'button', 'aria-label': t('gp.gallery_open', { n: at + 1 }) },
    }, h('img', {
      attr: { src: item.thumbnail || item.full, alt: '', loading: 'lazy', decoding: 'async' },
    }));
    button.addEventListener('click', () => {
      show(at);
      dialog.showModal();
    });
    grid.append(button);
  });
  close.addEventListener('click', () => dialog.close());
  prev.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') show(index - 1);
    if (event.key === 'ArrowRight') show(index + 1);
  });
  return h('div', { cls: 'gp-cat-gallery' }, grid, dialog);
}

function catalogueBlock(g) {
  const c = g.catalog;
  if (!c) return null;
  const wrap = h('section', { cls: 'gp-catalogue' });
  wrap.append(h('div', { cls: 'gp-cat-head' },
    h('div', {}, h('p', { cls: 'gp-label', text: t('gp.catalog_kicker') }),
      h('h2', { cls: 'gp-cat-title', text: t('gp.catalog_head') })),
    g.catalog_at ? h('time', { cls: 'gp-cat-time', text: t('gp.updated', { date: stamp(g.catalog_at) }),
      attr: { datetime: g.catalog_at } }) : null));

  const review = g.reviews || {};
  const positive = review.total && review.positive != null ? review.positive / review.total * 100 : null;
  const facts = [
    [t('gp.online'), g.live?.players != null ? num(g.live.players) : null],
    [t('gp.reviews'), review.total != null ? num(review.total) : null],
    [t('gp.positive'), positive != null ? `${num(positive, 1)}%` : null],
    [t('gp.released_full'), c.release?.date || null],
    [t('gp.recommendations'), c.recommendations != null ? num(c.recommendations) : null],
    ['Metacritic', c.metacritic?.score != null ? num(c.metacritic.score) : null],
  ].filter(([, value]) => value != null);
  if (facts.length) {
    const grid = h('div', { cls: 'gp-cat-facts' });
    facts.forEach(([label, value]) => grid.append(h('div', { cls: 'gp-cat-fact' },
      h('b', { text: value }), h('span', { text: label }))));
    wrap.append(grid);
  }

  const about = c.description && c.about?.includes(c.description)
    ? c.about.replace(c.description, '').trim() : c.about;
  if (c.description || about) wrap.append(h('section', { cls: 'gp-cat-about' },
    h('h3', { cls: 'gp-h', text: t('gp.about_game') }),
    c.description ? h('p', { cls: 'gp-cat-lede', text: c.description }) : null,
    about ? h('p', { cls: 'gp-cat-copy', text: about }) : null));

  const credits = [
    [t('gp.developers'), c.developers], [t('gp.publishers'), c.publishers],
    [t('gp.platforms'), Object.entries(c.platforms || {}).filter(([, on]) => on).map(([name]) => name)],
  ].filter(([, values]) => values?.length);
  if (credits.length) {
    const dl = h('dl', { cls: 'gp-cat-credits' });
    credits.forEach(([label, values]) => dl.append(h('dt', { text: label }), h('dd', { text: values.join(' · ') })));
    wrap.append(dl);
  }

  const groups = [
    [t('gp.features'), (c.categories || []).map((item) => item.name)],
    [t('gp.languages'), c.languages || []],
  ].filter(([, values]) => values.length);
  groups.forEach(([label, values]) => wrap.append(h('section', { cls: 'gp-cat-group' },
    h('h3', { cls: 'gp-h', text: label }),
    h('div', { cls: 'gp-cat-tags' }, ...values.map((value) => h('span', { text: value }))))));

  const inventory = [
    [t('gp.dlc'), c.dlc?.length], [t('gp.packages'), c.packages?.length],
    [t('gp.schema_stats'), g.stat_schema?.length],
    [t('gp.age'), c.required_age ? `${c.required_age}+` : null],
  ].filter(([, value]) => value != null);
  if (inventory.length) {
    const counts = h('div', { cls: 'gp-cat-inventory' });
    inventory.forEach(([label, value]) => counts.append(h('p', {},
      h('b', { text: typeof value === 'number' ? num(value) : value }), h('span', { text: label }))));
    wrap.append(counts);
  }

  const shots = (c.screenshots || []).filter((item) => item.full);
  if (shots.length) wrap.append(h('section', { cls: 'gp-cat-media' },
    h('h3', { cls: 'gp-h', text: t('gp.screenshots') }),
    screenshotGallery(shots, g.name)));

  const requirements = Object.entries(c.requirements || {});
  if (requirements.length) wrap.append(h('section', { cls: 'gp-cat-reqs' },
    h('h3', { cls: 'gp-h', text: t('gp.requirements') }),
    ...requirements.map(([platform, req]) => h('details', {},
      h('summary', { text: platform }),
      req.minimum ? h('div', {}, h('b', { text: t('gp.minimum') }), h('p', { text: req.minimum })) : null,
      req.recommended ? h('div', {}, h('b', { text: t('gp.recommended') }), h('p', { text: req.recommended })) : null))));

  const links = [];
  if (c.website) links.push(h('a', { cls: 'close', text: t('gp.website'),
    attr: { href: c.website, target: '_blank', rel: 'noopener' } }));
  if (c.support?.url) links.push(h('a', { cls: 'close', text: t('gp.support'),
    attr: { href: c.support.url, target: '_blank', rel: 'noopener' } }));
  if (links.length) wrap.append(h('nav', { cls: 'gp-cat-links' }, ...links));

  if (g.news?.length) wrap.append(h('section', { cls: 'gp-cat-news' },
    h('h3', { cls: 'gp-h', text: t('gp.news') }),
    h('div', { cls: 'gp-cat-news-list' }, ...g.news.map((item) => h('article', {},
      item.image ? h('img', { cls: 'gp-cat-news-image',
        attr: { src: item.image, alt: '', loading: 'lazy', decoding: 'async' } }) : null,
      h('p', { cls: 'gp-label', text: [item.feed, item.date ? shortDate(new Date(item.date * 1000).toISOString()) : null]
        .filter(Boolean).join(' · ') }),
      h('h4', {}, h('a', { text: item.title, attr: { href: item.url, target: '_blank', rel: 'noopener' } })),
      item.excerpt ? h('p', { text: item.excerpt }) : null)))));
  return wrap;
}

/* ── What it costs ─────────────────────────────────────────────────────
   Through /api/price rather than through the payload above, and on purpose:
   that route has existed since before this page did, it is already appid-only
   for exactly the reason this page is - "what a game costs is the game's, not
   the player's" is the comment on it - and it owns its own cache and its own
   retry. Reusing it means the price on this page cannot disagree with the price
   on the profile pages, because it is the same answer from the same place. */

function priceBlock(g) {
  const slot = h('section', { cls: 'gp-panel gp-price', data: { state: 'pending' } });
  slot.append(h('h2', { cls: 'gp-h', text: t('gp.price_head') }));
  const body = h('p', { cls: 'gp-price-body' });
  slot.append(body);

  // Field names are /price's own - `price`, `initial`, `discount` - and not a
  // renaming of them. game.js normalises those through priceFacts() for the
  // themed blocks; copying that vocabulary here would be a second place for the
  // same translation to drift.
  const draw = (p) => {
    slot.dataset.state = p.state || 'down';
    if (p.stale) slot.dataset.stale = '1'; else delete slot.dataset.stale;
    body.textContent = '';

    if (p.state === 'free' || p.state === 'free_now') {
      body.append(h('b', { cls: 'gp-price-now', text: t('gp.free') }));
      return true;
    }
    if (p.price != null) {
      body.append(h('b', { cls: 'gp-price-now', text: cash(p.price, p.currency) }));
      if (p.discount && p.initial != null) {
        body.append(h('s', { cls: 'gp-price-was', text: cash(p.initial, p.currency) }));
        body.append(h('em', { cls: 'gp-price-cut', text: `-${p.discount}%` }));
      }
      return true;
    }
    // The storefront has nothing for this app in this country, or did not
    // answer. Neither is an error on this page, and neither is worth a
    // paragraph: the block leaves rather than explaining Steam's regional
    // availability to somebody who came here to read achievements.
    slot.remove();
    return false;
  };

  (async () => {
    let p;
    try {
      p = await api(`/price?appid=${g.appid}&cc=${store()}`);
    } catch {
      slot.remove();
      return;
    }
    if (!draw(p)) return;
    // The same wait the money panel takes. "unknown" is the gap between the
    // batched price pass and the per-app detail pass behind it, and it closes
    // itself - so the page asks once more rather than making anybody reload.
    if (p.state === 'unknown' && !p.stale) {
      setTimeout(async () => {
        try { draw(await api(`/price?appid=${g.appid}&cc=${store()}`)); } catch { /* it said what it could */ }
      }, 8000);
    }
  })();

  return slot;
}

/* ── The cards ─────────────────────────────────────────────────────────
   Most games on Steam drop trading cards, and the set is a fact about the game
   in exactly the way its price is: the same eight cards for everybody, and one
   number - what one of each costs on the market right now - that otherwise
   takes fifteen tabs to add up.

   The panel is not drawn at all for a game with no cards, and not drawn while
   the api has not read the market yet. Neither is an error and neither is
   worth a paragraph explaining Valve's economy to somebody who came here to
   read achievements. */

function cardsBlock(g) {
  const slot = h('section', { cls: 'gp-panel gp-cards' });
  slot.append(h('h2', { cls: 'gp-h', text: t('gp.cards_head') }));
  const body = h('p', { cls: 'gp-cards-body' });
  const strip = h('ul', { cls: 'gp-cards-strip' });
  const note = h('p', { cls: 'gp-note' });
  slot.append(body, strip, note);

  (async () => {
    let c;
    try {
      c = await api(`/game/cards?appid=${g.appid}`);
    } catch {
      slot.remove();
      return;
    }
    if (!c.count || !(c.cards || []).length) {
      slot.remove();
      return;
    }

    body.textContent = c.cost != null
      ? t('gp.cards_body', { n: num(c.count), v: cash(c.cost, c.currency) })
      : t('gp.cards_bare', { n: num(c.count) });

    for (const card of c.cards) {
      const img = h('img', {
        cls: 'gp-card-art',
        attr: {
          src: card.icon || '', alt: card.name,
          width: '96', height: '96', loading: 'lazy', decoding: 'async',
        },
      });
      img.addEventListener('error', () => { img.removeAttribute('src'); });
      strip.append(h('li', { cls: 'gp-card' },
        img,
        h('b', { cls: 'gp-card-name', text: card.name }),
        h('span', {
          cls: 'gp-card-price',
          text: card.cents != null ? cash(card.cents, c.currency) : t('cd.no_cards'),
        })));
    }

    if (c.checked_at) note.textContent = t('gp.cards_note', { when: stamp(c.checked_at) });
  })();

  return slot;
}

/* ── The way back in ───────────────────────────────────────────────────
   This page is the front door and the profile pages are the house. Somebody who
   arrived here from a search has the game in front of them and no reason to
   guess that typing a profile name gets them the same game with their own
   record on it - so it is said, once, at the bottom, where they have finished
   reading. The handle goes straight to /u/<who>/<appid>: the same game, not the
   dashboard, because the game is what they were already looking at. */

function lookup(g) {
  const input = h('input', {
    cls: 'gp-find-in',
    attr: { type: 'text', name: 'q', autocomplete: 'off', spellcheck: 'false',
            'aria-label': t('gp.yours_ph'), placeholder: t('gp.yours_ph') },
  });
  const form = h('form', { cls: 'gp-find-form', attr: { action: '/', method: 'get' } },
    input,
    h('button', { cls: 'gp-find-go', text: t('gp.yours_go'), attr: { type: 'submit' } }));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const who = steamHandle(input.value);
    if (!who) { input.focus(); return; }
    location.href = `/u/${encodeURIComponent(who)}/${g.appid}`;
  });

  return h('section', { cls: 'gp-panel gp-find' },
    h('h2', { cls: 'gp-h', text: t('gp.yours_head') }),
    h('p', { cls: 'gp-note', text: t('gp.yours_body') }),
    form);
}

/* ── Boot ──────────────────────────────────────────────────────────── */

(async () => {
  applyStatic();
  langSwitchInto(el('langs'));
  creditInto(el('credit-slot'));

  if (APPID == null) {
    fail(t('gp.err_appid'));
    return;
  }

  const waitAt = waitOpen();

  let g;
  try {
    g = await api(`/game/public?appid=${APPID}&cc=${store()}&l=${encodeURIComponent(LANG)}`);
  } catch (e) {
    fail(e.message);
    return;
  }

  // The palette, if this game has one of its own. Set here as well as by the
  // SSI include in the head, because a dev server without SSI never answered
  // that include and the page should still wear the right colours.
  if (g.theme) document.documentElement.dataset.game = g.theme;
  // Production knew the theme in the SSI-rendered head. A plain dev server
  // does not, so redraw the still-visible opening as soon as the API does.
  if (g.theme && el('gp-wait').dataset.theme !== g.theme) {
    el('gp-wait').dataset.theme = g.theme;
    bootSkeleton(el('gp-wait-shape'), 'game', APPID, g.theme);
  }
  document.title = `${g.name} - steamprofiler.org`;

  // A cached response can return before the browser paints once. A very short
  // floor lets a themed opening exist without turning a fast page into a wait.
  const waitFloor = g.theme ? 520 : 0;
  const remaining = waitFloor - (performance.now() - waitAt);
  if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));

  el('gp-wait').hidden = true;
  el('gp').hidden = false;

  const out = root();
  const themed = PUBLIC_LAYOUTS[g.theme];
  if (themed) {
    if (g.theme !== 'dota-2') put(out, artBand(g));
    themed(g, out);
    put(out, catalogueBlock(g), priceBlock(g), cardsBlock(g), lookup(g));
  } else {
    put(out, artBand(g), heading(g), catalogueBlock(g), ladder(g), priceBlock(g),
      cardsBlock(g), lookup(g));
  }

  // "Read from Steam. Fetched ." with nothing after it is what the footer said
  // on every page that failed before it had an answer, so the sentence is held
  // back until there is a date to end it with.
  const when = el('gp-generated');
  if (when && g.generated_at) {
    when.dateTime = g.generated_at;
    when.textContent = stamp(g.generated_at);
    el('gp-fetched').hidden = false;
  }
})();
