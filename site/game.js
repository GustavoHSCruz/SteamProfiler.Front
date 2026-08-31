/* steamprofiler.org - the game views. One renderer per game, each themed after the
   game rather than poured into a shared grid: Dota's post-match scoreboard, CS2's
   buy menu, Arma's briefing and map, War Thunder's tech tree, Skyrim's
   constellation, the MSFS panel, GTA's pause menu, ETS2's freight market, and so
   on. The point is that the page feels like the game, not that it reproduces the
   game's interface. Anything without a layout of its own falls back to
   renderGeneric.

   Keyed by theme, because the visitor's library decides which of these run.
   Shared helpers come from lib.js; the router decides when this runs. */

/** Section heading with an optional right-hand note. Only the panel-shaped
 *  layouts use it, so it lives here rather than in lib.js. */
const head = (cls, title, meta) =>
  h('div', { cls }, h('h2', { text: title }), meta ? h('span', { text: meta }) : null);

/* ── Dota 2 - the post-match scoreboard ───────────────────────────── */

/* The medal, drawn rather than fetched. Valve ships the rank art with the game
   and not on a CDN this page is allowed to load from, so the badge is built out
   of the one thing the tier actually encodes: a colour and a star count. Each
   entry is the tier's own colour in the game's rank panel. */
const DOTA_TIERS = {
  1: '#8d8a83', 2: '#7f9a5c', 3: '#8b9bb4', 4: '#6d76bd',
  5: '#a05fc0', 6: '#4fa6c8', 7: '#4a7fd8', 8: '#d8a94a',
};

/** Medal badge plus the three numbers underneath it. Immortal has no stars -
 *  it has a leaderboard position - so the pips only come out below tier 8. */
function dotaRank(r) {
  const tier = r.tier ? Math.floor(r.tier / 10) : 0;
  const badge = h('div', { cls: 'd-medal' });
  // No tier means uncalibrated or unpublished, and the fallback for --tier is
  // the accent - which is the gold this scale ends at. A blank medal that reads
  // as Immortal is worse than no medal, so it is greyed instead.
  if (tier) badge.style.setProperty('--tier', DOTA_TIERS[tier] || 'var(--accent)');
  else badge.dataset.blank = '1';
  badge.append(h('span', { cls: 'd-medal-tier', text: String(tier || '-') }));
  if (!r.immortal && r.stars) {
    const pips = h('span', { cls: 'd-medal-stars' });
    for (let i = 0; i < r.stars; i++) pips.append(h('i'));
    badge.append(pips);
  }

  const facts = [
    [t('g.medal_current'), r.medal || t('g.unranked')],
    [t('g.mmr_est'), r.mmr != null ? num(r.mmr) : '-'],
    [t('g.mmr_turbo'), r.mmr_turbo != null ? num(r.mmr_turbo) : '-'],
    [t('g.leaderboard'), r.leaderboard_rank != null ? `#${num(r.leaderboard_rank)}` : '-'],
  ];
  const grid = h('div', { cls: 'd-rank-facts' });
  for (const [k, v] of facts) {
    grid.append(h('div', { cls: 'd-rank-fact' }, h('b', { text: v }), h('span', { text: k })));
  }

  return h('section', { cls: 'd-panel' },
    head('d-panel-head', t('g.the_medal'), r.medal || t('g.unranked')),
    h('div', { cls: 'd-rank' }, badge, grid),
    // Valve publishes the medal and nothing else. The MMR figure is an estimate
    // built from public matches, and printing it without saying so would pass
    // somebody else's arithmetic off as the number on the account.
    h('p', { cls: 'd-note', text: t('g.dota_rank_note') }));
}

/* What a profile with no published match history stands in for. Every field the
   scoreboard reads, present and empty, so the page below draws the same panels
   in the same order whether or not OpenDota has ever seen this account. num()
   already prints null as "-", which is what most of these become. */
const DOTA_BLANK = {
  matches: null, wins: null, losses: null, win_rate: null, medal: null,
  rank: {}, kills: null, deaths: null, assists: null, kda: null,
  avg_gpm: null, avg_xpm: null, avg_last_hits: null, avg_denies: null,
  avg_duration_min: null, heroes_played: null, heroes_total: null, heroes: [],
  sides: { radiant: {}, dire: {} }, in_match_hours: null,
};

/* The one panel that only exists on a profile with nothing to show: what is
   missing, why Valve is not the reason, and the setting that fixes it. It sits
   directly under the hero, where the win/loss scale it explains just came up
   empty, and it is built as a d-panel because it is part of this page rather
   than a notice bolted on top of it. */
function dotaGap() {
  return h('section', { cls: 'd-panel d-panel--gap' },
    head('d-panel-head', t('g.dota_gap_head'), t('g.dota_gap_meta')),
    h('div', { cls: 'd-gap' },
      h('p', { cls: 'd-gap-what', text: t('g.gap_dota_what') }),
      h('p', { cls: 'd-gap-why', text: t('g.gap_dota_why') }),
      h('p', { cls: 'd-gap-fix-h', text: t('g.dota_gap_how') }),
      h('p', { cls: 'd-gap-fix', text: t('g.gap_dota_fix') })));
}

function renderDota(g, root) {
  // A profile that never turned the setting on keeps Dota's scoreboard rather
  // than being sent to a page of its own; the numbers are blank and one panel
  // says why. See DOTA_BLANK.
  const blank = !g.dota;
  const d = g.dota || DOTA_BLANK;
  const wrap = h('div', { cls: 'd' });
  const art = d.heroes.find((x) => x.art);

  const hero = h('header', { cls: 'd-hero' });
  if (art) {
    hero.append(h('img', {
      cls: 'd-hero-art',
      attr: { src: art.art, alt: '', 'aria-hidden': 'true', loading: 'eager' },
    }));
  }

  const meta = [d.medal, `${num(g.record_hours)} h`,
                blank ? null : t('g.heroes_count', { n: num(d.heroes_played), total: num(d.heroes_total) })]
    .filter(Boolean).join('  ·  ');

  const tally = h('div', { cls: 'd-tally' },
    h('div', { cls: 'd-side d-side--r' },
      h('b', { text: num(d.wins) }), h('span', { text: t('g.wins') })),
    h('div', { cls: 'd-scale' },
      (() => {
        const bar = h('div', { cls: 'd-scale-bar' });
        const w = h('i', { cls: 'd-w' });
        const l = h('i', { cls: 'd-l' });
        // Left flat rather than measured out when there is no rate: a bar that
        // animated to nothing would read as a loss streak instead of as no data.
        if (d.win_rate != null) {
          w.style.width = `${d.win_rate}%`;
          l.style.width = `${100 - d.win_rate}%`;
          if (!still()) bar.dataset.animate = '1';
        } else {
          bar.dataset.blank = '1';
        }
        bar.append(w, l, h('span', { cls: 'd-even' }));
        return bar;
      })(),
      h('p', { cls: 'd-even-note',
        text: d.win_rate != null ? t('g.dota_even', { pct: num(d.win_rate, 1) })
                                 : t('g.dota_even_blank') })),
    h('div', { cls: 'd-side d-side--d' },
      h('b', { text: num(d.losses) }), h('span', { text: t('g.losses') })));

  hero.append(h('div', { cls: 'd-hero-in' },
    h('p', { cls: 'd-kicker', text: meta }),
    h('h1', { cls: 'd-title', text: t('g.n_matches', { n: num(d.matches) }) }),
    tally));
  wrap.append(hero);

  if (blank) wrap.append(dotaGap());

  // Always drawn now: the medal is the panel a reader looks for first, and an
  // unranked-looking badge says more than the panel not being there at all.
  wrap.append(dotaRank(d.rank || {}));

  // The scoreboard. Column order is Dota's own: hero, then the counts.
  const board = h('section', { cls: 'd-panel' },
    head('d-panel-head', t('g.heroes_most'),
         blank ? null : t('g.heroes_of', { n: d.heroes.length, total: num(d.heroes_played) })));

  const table = h('div', { cls: 'd-board' });
  table.append(h('div', { cls: 'd-row d-row--head' },
    h('span'), h('span', { text: t('g.hero') }), h('span', { text: t('g.matches_short') }),
    h('span', { text: 'v' }), h('span', { text: 'd' }), h('span', { text: t('g.rate') })));

  d.heroes.forEach((x, i) => {
    const row = h('div', { cls: 'd-row', data: x.win_rate >= 50 ? { won: '1' } : {} },
      x.face
        ? h('img', { cls: 'd-face', attr: { src: x.face, alt: '', loading: 'lazy' } })
        : h('span', { cls: 'd-face d-face--none' }),
      h('span', { cls: 'd-name', text: x.name }),
      h('span', { cls: 'd-n', text: num(x.games) }),
      h('span', { cls: 'd-n d-v', text: num(x.wins) }),
      h('span', { cls: 'd-n d-l', text: num(x.losses) }),
      h('span', { cls: 'd-n d-rate', text: `${num(x.win_rate, 1)}%` }),
      fillBar('d-rowbar', x.win_rate, i * 40));
    table.append(row);
  });
  // The column headers stay: they are what makes this read as the scoreboard
  // waiting to be filled rather than as a panel that failed to load.
  if (!d.heroes.length) {
    table.append(h('p', { cls: 'd-board-blank', text: t('g.dota_no_heroes') }));
  }
  board.append(table, h('p', { cls: 'd-note',
    text: blank ? t('g.dota_board_blank_note') : t('g.dota_board_note') }));
  wrap.append(board);

  // Match details: the block Dota shows under the scoreboard.
  const stats = [
    [t('g.kills'), num(d.kills)], [t('g.deaths'), num(d.deaths)], [t('g.assists'), num(d.assists)],
    ['kda', num(d.kda, 2)], [t('g.gpm'), num(d.avg_gpm)], [t('g.xpm'), num(d.avg_xpm)],
    [t('g.last_hits'), num(d.avg_last_hits)], [t('g.denies'), num(d.avg_denies, 1)],
    [t('g.avg_duration'), t('g.n_min', { n: num(d.avg_duration_min) })],
  ];
  const grid = h('div', { cls: 'd-stats' });
  for (const [k, v] of stats) {
    grid.append(h('div', { cls: 'd-stat' }, h('b', { text: v }), h('span', { text: k })));
  }
  wrap.append(h('section', { cls: 'd-panel' },
    head('d-panel-head', t('g.match_details'), t('g.avg_per_game')), grid));

  const sides = Object.entries(d.sides || {});
  if (sides.length) {
    const cols = h('div', { cls: 'd-sides' });
    for (const [side, v] of sides) {
      cols.append(h('div', { cls: `d-sidecard d-sidecard--${side}` },
        h('p', { cls: 'd-sidecard-name', text: side === 'radiant' ? 'Radiant' : 'Dire' }),
        h('b', { cls: 'd-sidecard-rate',
                 text: v.win_rate != null ? `${num(v.win_rate, 1)}%` : '-' }),
        h('span', { cls: 'd-sidecard-meta', text: t('g.of_matches', { won: num(v.wins), total: num(v.games) }) }),
        fillBar('d-sidecard-bar', v.win_rate)));
    }
    const r = d.sides.radiant, dr = d.sides.dire;
    wrap.append(h('section', { cls: 'd-panel' },
      head('d-panel-head', t('g.map_side'),
           blank ? null : t('g.n_matches', { n: num((r?.games || 0) + (dr?.games || 0)) })),
      cols,
      // Both sides have to have a rate before they can be subtracted; on a blank
      // profile they are two empty objects, and NaN is what that used to print.
      r?.win_rate != null && dr?.win_rate != null ? h('p', { cls: 'd-note',
        text: t('g.dota_sides', { pts: num(r.win_rate - dr.win_rate, 1) }) }) : null));
  }

  if (d.in_match_hours || blank) {
    const outside = blank ? null : g.record_hours - d.in_match_hours;
    wrap.append(h('section', { cls: 'd-panel d-panel--quiet' },
      head('d-panel-head', t('g.clock'), t('g.clock_sub')),
      h('div', { cls: 'd-clock' },
        h('div', { cls: 'd-clock-part' }, h('b', { text: `${num(d.in_match_hours)} h` }), h('span', { text: t('g.in_match') })),
        h('div', { cls: 'd-clock-part d-clock-part--dim' }, h('b', { text: `${num(outside)} h` }), h('span', { text: t('g.menu_queue') }))),
      fillBar('d-clockbar', blank ? 0 : (d.in_match_hours / g.record_hours) * 100),
      h('p', { cls: 'd-note',
        text: blank
          ? t('g.dota_clock_blank_note', { total: hrs(g.record_hours) })
          : t('g.dota_clock_note', { n: num(d.matches), inside: num(d.in_match_hours), total: hrs(g.record_hours) }) })));
  }

  root.append(wrap);
}

/* ── Counter-Strike 2 - the buy menu ──────────────────────────────── */

/* The buy menu's own tabs, in the game's order. Matching is by prefix so the
   combined entries Valve reports ("M4A4 / M4A1-S") land in the right tab. */
const CS_CATEGORIES = [
  ['pistolas', ['Glock', 'USP', 'P2000', 'P250', 'Five-SeveN', 'Tec-9', 'CZ75', 'Dual Berettas', 'Desert Eagle', 'R8']],
  ['pesadas', ['Nova', 'XM1014', 'MAG-7', 'Sawed-Off', 'M249', 'Negev']],
  ['submetralhadoras', ['MP9', 'MAC-10', 'MP7', 'MP5', 'UMP-45', 'P90', 'PP-Bizon']],
  ['rifles', ['AK-47', 'M4A', 'AWP', 'FAMAS', 'Galil', 'SG 553', 'AUG', 'SSG 08', 'SCAR-20', 'G3SG1']],
  ['equipamento', ['Faca', 'Zeus', 'Granada', 'Molotov', 'Coquetel', 'C4']],
];

function csCategory(name) {
  for (const [cat, list] of CS_CATEGORIES) {
    if (list.some((p) => name.startsWith(p))) return cat;
  }
  return 'equipamento';
}

/* The rank panel. CS Rating, the Premier number and the old skill group all
   live on the game coordinator, which only the game client talks to - none of
   them come out of the Web API, for anybody. What Steam does keep is the ladder
   underneath, so that is what the panel prints, with the gap stated instead of
   filled in. */
function csRank(r) {
  const cells = [
    [t('g.comp_wins'), num(r.competitive_wins)],
    [t('g.matches_won'), num(r.matches_won)],
    [t('g.match_rate'), r.match_win_rate != null ? `${num(r.match_win_rate, 1)}%` : '-'],
    [t('g.xp_games'), num(r.xp_games)],
    [t('g.score_total'), num(r.contribution_score)],
    [t('g.score_round'), r.score_per_round != null ? num(r.score_per_round, 1) : '-'],
  ];
  const strip = h('div', { cls: 'cs-hud cs-hud--rank' });
  for (const [k, v] of cells) {
    strip.append(h('div', { cls: 'cs-hud-cell' }, h('span', { text: k }), h('b', { text: v })));
  }

  const modes = h('div', { cls: 'cs-modes' });
  const rows = [
    [t('g.mode_comp'), r.matches_won, r.matches],
    [t('g.mode_gg'), r.gg_won, r.gg_played],
    [t('g.mode_prog'), r.progressive_wins, null],
  ];
  for (const [name, won, played] of rows) {
    if (!won && !played) continue;
    modes.append(h('div', { cls: 'cs-mode' },
      h('span', { cls: 'cs-mode-name', text: name }),
      h('b', { cls: 'cs-mode-n', text: num(won) }),
      h('span', { cls: 'cs-mode-meta',
        text: played ? t('g.of_n_matches', { n: num(played) }) : t('g.wins_only') }),
      played ? fillBar('cs-mode-bar', (won / played) * 100) : null));
  }

  return h('div', { cls: 'cs-section' },
    h('h2', { cls: 'cs-h', text: t('g.the_rank') }),
    h('p', { cls: 'cs-note', text: t('g.cs_rank_note') }),
    strip, modes);
}

/* The one per-match record in the whole block. Everything else on this page is
   a running total since 2012; this is a single scoreboard, still sitting there
   because Steam never cleared it. */
function csLastMatch(m) {
  const board = h('div', { cls: 'cs-last' });
  const cells = [
    [t('g.scoreline'), `${num(m.ct_wins)} : ${num(m.t_wins)}`],
    [t('g.rounds'), num(m.rounds)],
    [t('g.kills'), num(m.kills)],
    [t('g.deaths'), num(m.deaths)],
    ['k/d', m.kd != null ? num(m.kd, 2) : '-'],
    [t('g.mvp'), num(m.mvps)],
    [t('g.damage_one'), num(m.damage)],
    [t('g.score_match'), num(m.score)],
    [t('g.money_spent'), `$${num(m.money_spent)}`],
    [t('g.dominations'), num(m.dominations)],
    [t('g.revenges'), num(m.revenges)],
    [t('g.players'), num(m.players)],
  ];
  for (const [k, v] of cells) {
    board.append(h('div', { cls: 'cs-last-cell' }, h('b', { text: v }), h('span', { text: k })));
  }

  const fav = m.weapon
    ? h('p', { cls: 'cs-note cs-note--fav', text: t('g.last_fav', {
        weapon: ts(m.weapon),
        n: num(m.weapon_kills),
        pct: m.weapon_accuracy != null ? `${num(m.weapon_accuracy, 1)}%` : '-',
      }) })
    : null;

  return h('div', { cls: 'cs-section' },
    h('h2', { cls: 'cs-h', text: t('g.last_match') }),
    h('p', { cls: 'cs-note', text: t('g.cs_last_note') }),
    board, fav);
}

function renderCs2(g, root) {
  const c = g.cs2;
  const wrap = h('div', { cls: 'cs' });

  wrap.append(h('header', { cls: 'cs-top' },
    h('p', { cls: 'cs-kicker', text: t('g.cs_kicker', { name: g.name, h: hrs(g.record_hours), n: num(c.matches) }) }),
    h('h1', { cls: 'cs-title', text: t('g.n_kills', { n: num(c.kills) }) }),
    h('p', { cls: 'cs-sub', html:
      `<b>${num(c.rounds)}</b> rounds jogados, <b>${num(c.round_win_rate, 1)}%</b> ganhos. ` +
      `De <b>${num(c.shots_fired)}</b> tiros, <b>${num(c.shots_hit)}</b> acertaram alguma coisa.` }),
    // The HUD strip, in the order the game puts it on screen.
    h('div', { cls: 'cs-hud' },
      h('div', { cls: 'cs-hud-cell' }, h('span', { text: 'k/d' }), h('b', { text: num(c.kd, 2) })),
      h('div', { cls: 'cs-hud-cell' }, h('span', { text: t('g.head') }), h('b', { text: `${num(c.headshot_rate, 1)}%` })),
      h('div', { cls: 'cs-hud-cell' }, h('span', { text: t('g.mvp') }), h('b', { text: num(c.mvps) })),
      h('div', { cls: 'cs-hud-cell cs-hud-cell--money' },
        h('span', { text: t('g.money_total') }), h('b', { text: `$${num(c.money)}` })))));

  // Buy menu: category rail on the left, panels on the right, as in the game.
  const buy = h('section', { cls: 'cs-buy' });
  const used = CS_CATEGORIES.map(([name]) => name)
    .map((name) => [name, c.weapons.filter((w) => csCategory(w.name) === name)])
    .filter(([, list]) => list.length);

  buy.append(h('nav', { cls: 'cs-rail' },
    ...used.map(([name, list], i) => h('a', {
      cls: 'cs-rail-item', attr: { href: `#cat-${i}` },
    }, h('span', { text: name }), h('em', { text: String(list.length) })))));

  const cats = h('div', { cls: 'cs-cats' });
  used.forEach(([name, list], i) => {
    const guns = h('div', { cls: 'cs-guns' });
    const max = Math.max(...list.map((w) => w.kills), 1);
    list.forEach((w, j) => {
      guns.append(h('article', { cls: 'cs-gun', data: j === 0 && i === 0 ? { lead: '1' } : {} },
        h('span', { cls: 'cs-gun-name', text: w.name }),
        h('b', { cls: 'cs-gun-kills', text: num(w.kills) }),
        h('span', { cls: 'cs-gun-acc',
          text: w.accuracy == null ? 'sem registro de acertos' : t('g.pct_accuracy', { pct: num(w.accuracy, 1) }) }),
        fillBar('cs-gun-bar', (w.kills / max) * 100, j * 40)));
    });
    cats.append(h('section', { cls: 'cs-cat', attr: { id: `cat-${i}` } },
      h('h2', { cls: 'cs-cat-name' }, h('span', { text: name }),
        h('em', { text: t('g.n_kills', { n: num(list.reduce((sum, w) => sum + w.kills, 0)) }) })),
      guns));
  });
  buy.append(cats);
  wrap.append(h('div', { cls: 'cs-section' },
    h('h2', { cls: 'cs-h', text: t('g.buy_menu') }),
    h('p', { cls: 'cs-note', text: t('g.cs_buy_note') }),
    buy));

  // Map scoreboard: rounds won against rounds lost, in the CT/T colours.
  const maps = h('div', { cls: 'cs-maps' });
  maps.append(h('div', { cls: 'cs-map cs-map--head' },
    h('span', { text: t('g.map') }), h('span', { text: '' }),
    h('span', { text: t('g.won') }), h('span', { text: t('g.lost') }), h('span', { text: t('g.rate') })));
  c.maps.forEach((m, i) => {
    const lost = m.rounds - m.won;
    const bar = h('div', { cls: 'cs-map-bar' });
    const won = h('i', { cls: 'cs-ct' });
    const los = h('i', { cls: 'cs-t' });
    won.style.width = `${m.win_rate}%`;
    los.style.width = `${100 - m.win_rate}%`;
    if (!still()) { bar.dataset.animate = '1'; won.style.animationDelay = `${i * 40}ms`; }
    bar.append(won, los);
    maps.append(h('div', { cls: 'cs-map' },
      h('span', { cls: 'cs-map-name', text: m.name }),
      bar,
      h('span', { cls: 'cs-map-n', text: num(m.won) }),
      h('span', { cls: 'cs-map-n cs-map-n--dim', text: num(lost) }),
      h('span', { cls: 'cs-map-rate', text: `${num(m.win_rate, 1)}%` })));
  });
  const top = c.maps[0];
  wrap.append(h('div', { cls: 'cs-section' },
    h('h2', { cls: 'cs-h', text: t('g.map_score') }),
    maps,
    top ? h('p', { cls: 'cs-note',
      text: t('g.cs_map_note', { map: top.name, pct: num((top.rounds / c.rounds) * 100, 1) }) }) : null));

  if (c.rank) wrap.append(csRank(c.rank));
  if (c.last_match) wrap.append(csLastMatch(c.last_match));

  const agg = h('div', { cls: 'cs-agg' });
  const rows = [
    [t('g.rounds'), num(c.rounds)], [t('g.rounds_won'), num(c.round_wins)],
    [t('g.matches'), num(c.matches)], [t('g.damage'), num(c.damage)],
    [t('g.dmg_round'), num(c.damage_per_round)], [t('g.bombs_planted'), num(c.bombs_planted)],
    [t('g.bombs_defused'), num(c.bombs_defused)], [t('g.pistol_rounds'), num(c.pistol_round_wins)],
    [t('g.knife_kills'), num(c.knife_kills)], [t('g.zeus_kills'), num(c.taser_kills)],
    [t('g.overall_acc'), `${num(c.accuracy, 1)}%`], [t('g.time_in_match'), `${num(c.in_match_hours)} h`],
  ];
  for (const [k, v] of rows) {
    agg.append(h('div', { cls: 'cs-agg-cell' }, h('b', { text: v }), h('span', { text: k })));
  }
  wrap.append(h('div', { cls: 'cs-section' }, h('h2', { cls: 'cs-h', text: t('g.aggregate') }), agg));

  root.append(wrap);
}

/* ── Arma 3 - the briefing and the map ────────────────────────────── */

function renderArma3(g, root) {
  const a = g.arma3;
  const ach = g.achievements;
  const wrap = h('div', { cls: 'a3' });
  const top = a.terrains[0];

  const brief = h('section', { cls: 'a3-brief' },
    h('p', { cls: 'a3-stamp', text: t('g.briefing') }),
    h('h1', { cls: 'a3-title', text: t('g.arma_title', { n: hrs(g.record_hours) }) }));

  const def = h('dl', { cls: 'a3-def' });
  const lines = [
    // These four were written in Portuguese and half of them never went
    // through t(), so an English or Russian reader got a briefing in a
    // language they had not asked for. The numbers are the same; the sentence
    // around them now comes from the dictionary like everything else.
    [t('g.situation'), t('g.a3_situation', { mp: num(a.mp_hours), sp: num(a.sp_hours) }) + ' - ' +
      t('g.mp_share_note', { pct: num(a.mp_share, 1) })],
    [t('g.mission'), t('g.a3_mission', { h: num(a.zeus_hours, 1), units: num(a.zeus_units_created) })],
    [t('g.terrain'), t('g.a3_terrain', { name: ts(top.name), h: num(top.hours, 1) })],
    [t('g.clock_field'), t('g.a3_clock', { inner: num(a.in_match_hours), steam: num(g.record_hours) }) + ' ' +
      t('g.arma_clock_tail')],
  ];
  for (const [k, v] of lines) def.append(h('dt', { text: k }), h('dd', { text: v }));
  brief.append(def);

  if (ach?.list?.length) {
    brief.append(h('h2', { cls: 'a3-h', text: t('g.tasks_done_n', { done: ach.unlocked, total: ach.total }) }));
    const tasks = h('ul', { cls: 'a3-tasks' });
    for (const t of ach.rarest.slice(0, 8)) {
      tasks.append(h('li', {},
        h('i', { cls: 'a3-tick' }),
        h('div', {},
          h('b', { text: ts(t.name) }),
          h('span', { cls: 'a3-task-meta',
            text: [shortDate(t.date), t.rarity != null ? `${rarity(t.rarity)} das contas` : null]
              .filter(Boolean).join('  ·  ') }))));
    }
    brief.append(tasks);
  }

  // The map: terrains as unit boxes on graph paper, width proportional to hours.
  const board = h('div', { cls: 'a3-map-body' });
  const maxT = Math.max(...a.terrains.map((x) => x.hours));
  a.terrains.forEach((t, i) => {
    // Full-width boxes with a proportional fill: a bar sized by hours would
    // squeeze the smaller terrains until their names could not be read.
    const fill = h('i', { cls: 'a3-marker-fill' });
    fill.style.width = `${(t.hours / maxT) * 100}%`;
    if (!still()) {
      fill.dataset.animate = '1';
      fill.style.animationDelay = `${i * 60}ms`;
    }
    board.append(h('div', { cls: 'a3-marker' }, fill,
      h('span', { cls: 'a3-marker-name', text: ts(t.name) }),
      h('span', { cls: 'a3-marker-h', text: `${num(t.hours, 1)} h` })));
  });

  const legend = h('div', { cls: 'a3-legend' });
  for (const act of a.activities) {
    legend.append(h('div', { cls: 'a3-legend-row' },
      h('span', { text: ts(act.name) }), h('b', { text: `${num(act.hours, 1)} h` })));
  }

  const map = h('aside', { cls: 'a3-map' },
    h('div', { cls: 'a3-map-head' }, h('span', { text: t('g.map_terrain') }),
      h('span', { text: t('g.n_terrains', { n: num(a.terrains.length), raw: a.terrains.length }) })),
    board,
    h('div', { cls: 'a3-map-head a3-map-head--sub' }, h('span', { text: t('g.activities') }),
      h('span', { text: t('g.overlap') })),
    legend,
    h('p', { cls: 'a3-note', text: t('g.arma_overlap_note') }));

  wrap.append(h('div', { cls: 'a3-cols' }, brief, map));

  if (a.items?.length) {
    const slots = h('div', { cls: 'a3-slots' });
    const maxI = Math.max(...a.items.map((i) => i.hours));
    a.items.forEach((it, i) => {
      slots.append(h('div', { cls: 'a3-slot' },
        h('span', { cls: 'a3-slot-name', text: it.name }),
        h('b', { cls: 'a3-slot-h', text: `${num(it.hours, 1)} h` }),
        fillBar('a3-slot-bar', (it.hours / maxI) * 100, i * 35)));
    });
    wrap.append(h('section', { cls: 'a3-gear' },
      h('h2', { cls: 'a3-h', text: t('g.gear') }),
      slots,
      h('p', { cls: 'a3-note', text: t('g.arma_gear_note') })));
  }

  root.append(wrap);
}

/* ── War Thunder - the research tree ──────────────────────────────── */

function renderWarThunder(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'wt' });

  const gauges = h('div', { cls: 'wt-gauges' });
  for (const c of g.counters || []) {
    gauges.append(h('div', { cls: 'wt-gauge' },
      h('b', { text: num(c.value) }), h('span', { text: ts(c.name) })));
  }

  wrap.append(h('header', { cls: 'wt-head' },
    h('p', { cls: 'wt-kicker', text: t('g.wt_kicker', { name: g.name, h: hrs(g.record_hours), total: num(ach.total) }) }),
    h('h1', { cls: 'wt-title', text: `${num(ach.unlocked)} pesquisadas` }),
    gauges,
    g.counters_note ? h('p', { cls: 'wt-note', text: ts(g.counters_note) }) : null));

  // The tree: one rank per year, nodes in unlock order, joined by the spine.
  const tree = h('section', { cls: 'wt-tree' });
  const byYear = new Map();
  for (const a of ach.list) {
    const y = a.date.slice(0, 4);
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y).push(a);
  }
  for (const [year, list] of byYear) {
    const nodes = h('div', { cls: 'wt-nodes' });
    for (const a of list) {
      nodes.append(h('article', { cls: 'wt-node', attr: { title: a.description || a.name } },
        a.icon
          ? h('img', { cls: 'wt-node-icon', attr: { src: a.icon, alt: '', loading: 'lazy' } })
          : h('span', { cls: 'wt-node-icon wt-node-icon--none' }),
        h('div', { cls: 'wt-node-text' },
          h('b', { text: a.name }),
          h('span', { text: a.rarity != null ? t('g.of_accounts', { pct: rarity(a.rarity) }) : shortDate(a.date) }))));
    }
    tree.append(h('div', { cls: 'wt-rank' },
      h('div', { cls: 'wt-rank-head' },
        h('span', { cls: 'wt-year', text: year }),
        h('span', { cls: 'wt-count', text: t('g.in_year', { n: list.length }) })),
      nodes));
  }
  wrap.append(h('h2', { cls: 'wt-h', text: t('g.research_tree') }),
    h('p', { cls: 'wt-note wt-note--wide',
      text: t('g.wt_tree_note') }),
    tree);

  root.append(wrap);
}

/* ── Skyrim - the constellation ───────────────────────────────────── */

/** Stable pseudo-random from a string, so a star never moves between builds. */
function hash(s) {
  let x = 2166136261;
  for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); }
  return ((x >>> 0) % 100000) / 100000;
}

function renderSkyrim(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'sk' });

  wrap.append(h('header', { cls: 'sk-head' },
    h('p', { cls: 'sk-kicker', text: t('g.sk_kicker', { h: num(g.record_hours) }) }),
    h('h1', { cls: 'sk-title', text: t('g.n_of_n', { done: num(ach.unlocked), total: num(ach.total) }) }),
    h('p', { cls: 'sk-sub', text: t('g.ach_unlocked') })));

  /* Skyrim's skill menu is the only character screen in games that asks you to
     look *up*: an aurora over the Throat of the World, and the skills hanging
     in it as constellations. So that is the page.

     One constellation per year, rather than one long chain across the whole
     save. The chain was the old version of this page and it drew a zigzag
     through a decade as if it were one sitting; a year is a thing that
     actually happened, and Steam gives an unlock date for every star here. */
  const years = new Map();
  for (const a of ach.list) {
    if (!a.date) continue;
    const y = a.date.slice(0, 4);
    if (!years.has(y)) years.set(y, []);
    years.get(y).push(a);
  }
  const groups = [...years.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  const sky = h('figure', { cls: 'sk-sky' });
  sky.append(h('i', { cls: 'sk-aurora', attr: { 'aria-hidden': 'true' } }),
    h('i', { cls: 'sk-dust', attr: { 'aria-hidden': 'true' } }));

  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'sk-lines');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  sky.append(svg);

  const rarest = Math.max(...ach.list.map((a) => (a.rarity == null ? 100 : a.rarity)), 1);
  const span = groups.length || 1;
  const tags = [];

  groups.forEach(([year, list], gi) => {
    // Each year owns a column of the sky. Stars scatter inside it from the
    // achievement's own key, so the same save always draws the same shape.
    const x0 = 4 + (gi / span) * 92;
    const w = (92 / span) * 0.82;
    const pts = list.map((a, i) => {
      const jx = hash(`${a.key || a.name}x`);
      const jy = hash(`${a.key || a.name}y`);
      // Spread down the column rather than sideways, so a busy year grows
      // taller instead of colliding with the year beside it.
      const rows = Math.max(1, Math.ceil(list.length / 2));
      const row = i % rows;
      return {
        a,
        x: x0 + w * (0.18 + jx * 0.64),
        y: 12 + (row / Math.max(1, rows - 1 || 1)) * 56 + (jy - 0.5) * 9,
      };
    });

    const line = document.createElementNS(ns, 'polyline');
    line.setAttribute('points', pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' '));
    svg.append(line);

    for (const p of pts) {
      const pct = p.a.rarity == null ? rarest : p.a.rarity;
      // Rarer burns brighter, which is the only ranking a sky can show.
      const weight = 1 - Math.min(1, pct / rarest);
      const star = h('button', {
        cls: 'sk-star',
        attr: { type: 'button', title: `${p.a.name} - ${shortDate(p.a.date)}` },
        data: weight > 0.55 ? { bright: '1' } : {},
      }, h('span', { cls: 'sk-star-label' },
        h('b', { text: p.a.name }),
        h('em', { text: p.a.rarity != null
          ? t('g.of_accounts', { pct: rarity(p.a.rarity) }) : shortDate(p.a.date) })));
      star.style.left = `${p.x}%`;
      star.style.top = `${p.y}%`;
      star.style.setProperty('--size', `${(5 + weight * 11).toFixed(1)}px`);
      sky.append(star);
    }

    const tag = h('span', { cls: 'sk-year' },
      h('b', { text: year }),
      h('em', { text: t('g.sk_stars', { n: num(list.length), raw: list.length }) }));
    tag.style.left = `${x0 + w / 2}%`;
    tags.push(tag);
  });

  // The Throat of the World, which is the horizon every one of those skies has
  // underneath it. Drawn rather than photographed: it is the shape, not a place.
  // Appended after the stars so it occludes the ones that sit low, and before
  // the year labels so it does not swallow them - which is what it did the
  // first time round.
  sky.append(h('i', { cls: 'sk-ridge', attr: { 'aria-hidden': 'true' } }));
  for (const tag of tags) sky.append(tag);

  if (ach.first && ach.last) {
    sky.append(h('figcaption', { cls: 'sk-cap',
      text: t('g.sk_caption', { from: shortDate(ach.first.date), to: shortDate(ach.last.date) }) }));
  }
  wrap.append(sky);

  const undated = ach.unlocked - ach.list.filter((a) => a.date).length;
  wrap.append(h('p', { cls: 'sk-note', text: undated > 0
    ? t('g.sk_note_undated', { n: num(groups.length), u: num(undated) })
    : t('g.sk_note', { n: num(groups.length) }) }));

  const perks = h('div', { cls: 'sk-perks' });
  for (const a of ach.rarest.slice(0, 8)) {
    perks.append(h('article', { cls: 'sk-perk' },
      a.icon ? h('img', { cls: 'sk-perk-icon', attr: { src: a.icon, alt: '', loading: 'lazy' } }) : null,
      h('div', {},
        h('b', { text: a.name }),
        a.description ? h('p', { text: a.description }) : null,
        h('span', { cls: 'sk-perk-meta',
          text: [a.rarity != null ? t('g.of_accounts', { pct: rarity(a.rarity) }) : null, shortDate(a.date)]
            .filter(Boolean).join('  ·  ') }))));
  }
  wrap.append(h('h2', { cls: 'sk-h', text: t('g.rarest') }), perks);

  root.append(wrap);
}

/* ── Microsoft Flight Simulator - the instrument panel ────────────── */

/** A round gauge drawn as a dashed circle: 270° of arc, needle-free. */
function gauge(value, max, label, readout) {
  const R = 42, C = 2 * Math.PI * R, SPAN = 0.75; // three quarters of the dial
  const frac = Math.max(0, Math.min(1, value / max));
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('class', 'fs-dial');
  svg.setAttribute('aria-hidden', 'true');

  for (const [cls, len] of [['fs-dial-track', SPAN], ['fs-dial-fill', SPAN * frac]]) {
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', '50'); c.setAttribute('cy', '50'); c.setAttribute('r', String(R));
    c.setAttribute('class', cls);
    c.setAttribute('stroke-dasharray', `${(C * len).toFixed(2)} ${C}`);
    c.setAttribute('transform', 'rotate(135 50 50)');
    svg.append(c);
  }
  // Ticks every tenth, the way a real instrument is graduated.
  for (let i = 0; i <= 10; i++) {
    const ang = (135 + i * 27) * (Math.PI / 180);
    const tick = document.createElementNS(ns, 'line');
    tick.setAttribute('x1', String(50 + Math.cos(ang) * 33));
    tick.setAttribute('y1', String(50 + Math.sin(ang) * 33));
    tick.setAttribute('x2', String(50 + Math.cos(ang) * (i % 5 === 0 ? 26 : 29)));
    tick.setAttribute('y2', String(50 + Math.sin(ang) * (i % 5 === 0 ? 26 : 29)));
    tick.setAttribute('class', 'fs-dial-tick');
    svg.append(tick);
  }

  return h('figure', { cls: 'fs-gauge' }, svg,
    h('div', { cls: 'fs-gauge-read' }, h('b', { text: readout }), h('span', { text: label })));
}

function renderMsfs(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'fs' });
  const rarities = ach.list.map((a) => a.rarity).filter((r) => r != null);
  const avgRarity = rarities.length ? rarities.reduce((s, r) => s + r, 0) / rarities.length : null;

  wrap.append(h('header', { cls: 'fs-head' },
    h('p', { cls: 'fs-kicker', text: t('g.fs_kicker', { name: g.name, h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'fs-title', text: t('g.n_of_ach', { done: num(ach.unlocked), total: num(ach.total) }) }),
    h('p', { cls: 'fs-sub',
      text: t('g.fs_window', { from: shortDate(ach.first.date), to: shortDate(ach.last.date) }) })));

  wrap.append(h('section', { cls: 'fs-panel' },
    gauge(ach.completion, 100, t('g.completion'), `${num(ach.completion, 1)}%`),
    gauge(g.record_hours, 500, t('g.hours_logged_f'), hrs(g.record_hours)),
    // The dial reads low when the achievements are rare, which is the useful direction.
    avgRarity != null ? gauge(avgRarity, 100, t('g.avg_rarity'), `${num(avgRarity, 1)}%`) : null));

  const log = h('table', { cls: 'fs-log' });
  log.append(h('thead', {}, h('tr', {},
    h('th', { text: t('g.date') }), h('th', { text: t('g.achievement') }),
    h('th', { text: t('g.rarity') }))));
  const body = h('tbody');
  for (const a of ach.list) {
    body.append(h('tr', {},
      h('td', { cls: 'fs-log-date', text: shortDate(a.date) }),
      h('td', {}, h('b', { text: a.name }), a.description ? h('span', { text: a.description }) : null),
      h('td', { cls: 'fs-log-rare', text: a.rarity != null ? `${rarity(a.rarity)}` : '-' })));
  }
  log.append(body);
  wrap.append(h('section', { cls: 'fs-logwrap' },
    h('h2', { cls: 'fs-h', text: t('g.logbook') }),
    h('div', { cls: 'fs-log-scroll' }, log)));

  root.append(wrap);
}

/* ── GTA V - the pause menu ───────────────────────────────────────── */

function renderGta(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'gta' });

  const rows = [
    [t('g.pause_ach'), ach.unlocked, ach.total, `${ach.unlocked} / ${ach.total}`],
    [t('g.completion'), ach.completion, 100, `${num(ach.completion, 1)}%`],
    [t('g.hours'), g.record_hours, 400, `${hrs(g.record_hours)} h`],
  ];
  const stats = h('div', { cls: 'gta-stats' });
  for (const [label, v, max, read] of rows) {
    // Segmented bars, the way the pause menu draws every stat in this game.
    const seg = h('div', { cls: 'gta-seg' });
    const filled = Math.round((v / max) * 20);
    for (let i = 0; i < 20; i++) seg.append(h('i', { data: i < filled ? { on: '1' } : {} }));
    stats.append(h('div', { cls: 'gta-stat' },
      h('span', { cls: 'gta-stat-label', text: label }), seg,
      h('b', { cls: 'gta-stat-val', text: read })));
  }

  // Pause-menu tabs, but every one of them actually goes somewhere.
  const shell = h('div', { cls: 'gta-shell' },
    h('nav', { cls: 'gta-tabs' },
      h('span', { cls: 'gta-tab', data: { on: '1' }, text: t('g.statistics') }),
      h('a', { cls: 'gta-tab', attr: { href: '#gta-raras' }, text: t('g.pause_ach') }),
      h('a', { cls: 'gta-tab', attr: { href: '/#jogos' }, text: t('g.pause_exit') })),
    h('div', { cls: 'gta-body' },
      h('p', { cls: 'gta-kicker', text: t('g.gta_kicker', { date: shortDate(g.last_played) || '-' }) }),
      h('h1', { cls: 'gta-title', text: 'Grand Theft Auto V' }),
      stats,
      h('p', { cls: 'gta-note',
        text: t('g.gta_note', { done: ach.unlocked, total: ach.total, year: Object.entries(ach.by_year).sort((a, b) => b[1] - a[1])[0][0] }) })));
  wrap.append(shell);

  const cards = h('div', { cls: 'gta-cards' });
  for (const a of ach.rarest.slice(0, 9)) {
    cards.append(h('article', { cls: 'gta-card' },
      a.icon ? h('img', { cls: 'gta-card-icon', attr: { src: a.icon, alt: '', loading: 'lazy' } }) : null,
      h('div', { cls: 'gta-card-text' },
        h('b', { text: a.name }),
        a.description ? h('p', { text: a.description }) : null,
        h('span', { cls: 'gta-card-meta',
          text: [a.rarity != null ? t('g.of_accounts', { pct: rarity(a.rarity) }) : null, shortDate(a.date)]
            .filter(Boolean).join('  ·  ') }))));
  }
  wrap.append(h('h2', { cls: 'gta-h', attr: { id: 'gta-raras' }, text: 'as mais raras' }), cards);

  root.append(wrap);
}

/* ── Euro Truck Simulator 2 - the freight market ──────────────────── */

function renderEts2(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'ets' });

  wrap.append(h('header', { cls: 'ets-sign' },
    h('div', { cls: 'ets-sign-in' },
      h('span', { cls: 'ets-eu' }, h('i'), h('i'), h('i'), h('i')),
      h('h1', { cls: 'ets-title', text: 'Euro Truck Simulator 2' }),
      h('span', { cls: 'ets-exit', text: `${num(g.record_hours)} h` }))));

  // The dashboard: an odometer reading hours, and the completion dial.
  const odo = h('div', { cls: 'ets-odo' });
  for (const ch of String(Math.round(g.record_hours)).padStart(6, '0')) {
    odo.append(h('i', { text: ch }));
  }
  wrap.append(h('section', { cls: 'ets-dash' },
    h('div', { cls: 'ets-cluster' },
      h('span', { cls: 'ets-cluster-label', text: t('g.ets_wheel') }),
      odo),
    h('div', { cls: 'ets-cluster' },
      h('span', { cls: 'ets-cluster-label', text: t('g.pause_ach') }),
      h('div', { cls: 'ets-gauge' },
        h('b', { text: `${num(ach.completion, 1)}%` }),
        fillBar('ets-gauge-bar', ach.completion),
        h('span', { text: t('g.n_of_m', { n: num(ach.unlocked), m: num(ach.total) }) })))));

  // Achievements as freight jobs: rarity reads like a distance, and the
  // hardest hauls are the ones almost nobody takes.
  const jobs = h('div', { cls: 'ets-jobs' });
  jobs.append(h('div', { cls: 'ets-job ets-job--head' },
    h('span', { text: t('g.ets_cargo') }), h('span', { text: t('g.ets_delivered') }), h('span', { text: t('g.ets_taken') })));
  for (const a of ach.list.slice().sort((x, y) => (x.rarity ?? 100) - (y.rarity ?? 100))) {
    jobs.append(h('div', { cls: 'ets-job' },
      h('span', { cls: 'ets-job-cargo' },
        h('b', { text: a.name }),
        a.description ? h('em', { text: a.description }) : null),
      h('span', { cls: 'ets-job-date', text: shortDate(a.date) }),
      h('span', { cls: 'ets-job-rare', text: a.rarity != null ? `${rarity(a.rarity)}` : '-' })));
  }
  wrap.append(h('section', { cls: 'ets-market' },
    h('h2', { cls: 'ets-h', text: t('g.ets_market') }),
    h('p', { cls: 'ets-note',
      text: t('g.ets_note') }),
    jobs));

  root.append(wrap);
}

/* ── Call of Duty - the combat record ─────────────────────────────── */

function renderCod(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'cod' });
  const one = ach?.list?.[0] || ach?.rarest?.[0];

  wrap.append(h('div', { cls: 'cod-tag' },
    h('span', { cls: 'cod-tag-line', text: t('g.cod_record') }),
    h('p', { cls: 'cod-hours' }, h('b', { text: num(g.record_hours) }), h('em', { text: 'h' })),
    h('span', { cls: 'cod-tag-meta',
      text: t('g.cod_meta', { rank: g.rank, pct: num(g.share, 1) }) })));

  // The whole page is one contrast: an enormous number against a single unlock.
  wrap.append(h('section', { cls: 'cod-face' },
    h('div', { cls: 'cod-face-cell' },
      h('b', { text: num(g.record_hours) }), h('span', { text: t('g.hours') })),
    h('div', { cls: 'cod-face-sep', text: t('g.cod_to') }),
    h('div', { cls: 'cod-face-cell cod-face-cell--hot' },
      h('b', { text: num(ach.unlocked) }), h('span', { text: t('g.of_n_ach', { total: num(ach.total) }) }))));

  wrap.append(h('p', { cls: 'cod-lede',
    text: t('g.cod_lede', { per: num(g.record_hours / Math.max(ach.unlocked, 1)), rank: g.rank, total: num(ach.total), done: num(ach.unlocked) }) }));

  if (one) {
    wrap.append(h('article', { cls: 'cod-one' },
      one.icon ? h('img', { cls: 'cod-one-icon', attr: { src: one.icon, alt: '', loading: 'lazy' } }) : null,
      h('div', {},
        h('span', { cls: 'cod-one-label', text: t('g.the_only') }),
        h('b', { text: one.name }),
        one.description ? h('p', { text: one.description }) : null,
        h('span', { cls: 'cod-one-meta',
          text: [shortDate(one.date), one.rarity != null ? `${rarity(one.rarity)} das contas` : null]
            .filter(Boolean).join('  ·  ') }))));
  }

  root.append(wrap);
}

/* ── Arma 2: Operation Arrowhead - the redacted dossier ───────────── */

function renderArma2Oa(g, root) {
  const wrap = h('div', { cls: 'oa' });
  const file = h('article', { cls: 'oa-file' },
    h('p', { cls: 'oa-class', text: t('g.confidential') }),
    h('h1', { cls: 'oa-title', text: t('g.oa_title', { n: hrs(g.record_hours) }) }));

  // The blanks are the content: Steam publishes nothing else about this game,
  // so the fields it cannot fill are struck out rather than quietly dropped.
  const fields = [
    [t('g.hours_logged_f'), `${hrs(g.record_hours)} h`],
    [t('g.lib_position'), `#${g.rank}`],
    [t('g.share_of_total'), g.share != null ? `${num(g.share, 1)}%` : '-'],
    [t('g.last_operation'), shortDate(g.last_played)],
    [t('g.pause_ach'), null], [t('g.combat_stats'), null],
    [t('g.maps_played'), null], [t('g.time_per_mission'), null], [t('g.casualties'), null],
  ];
  const dl = h('dl', { cls: 'oa-fields' });
  for (const [k, v] of fields) {
    dl.append(h('dt', { text: k }),
      v ? h('dd', { text: v }) : h('dd', { cls: 'oa-redact' }, h('span', { text: t('g.not_published') })));
  }
  file.append(dl, h('p', { cls: 'oa-note',
    text: t('g.oa_note') }));
  wrap.append(file);
  root.append(wrap);
}

/* ── Valheim - the rune stone ─────────────────────────────────────── */

function renderValheim(g, root) {
  const wrap = h('div', { cls: 'vh' });
  wrap.append(h('article', { cls: 'vh-stone' },
    h('p', { cls: 'vh-runes', text: 'ᚹ ᚨ ᛚ ᚺ ᛖ ᛁ ᛗ' }),
    h('p', { cls: 'vh-hours' }, h('b', { text: num(g.record_hours) }), h('em', { text: t('g.hours') })),
    h('p', { cls: 'vh-sub', text: t('g.rank_share', { rank: g.rank, pct: num(g.share, 1) }) }),
    h('p', { cls: 'vh-saga',
      text: t('g.vh_saga', { n: hrs(g.record_hours), date: shortDate(g.last_played) || '-' }) })));
  root.append(wrap);
}

/* ── GTA IV - the phone ───────────────────────────────────────────── */

function renderGta4(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'g4' });

  const menu = h('div', { cls: 'g4-menu' });
  const rows = [
    ['Horas', `${num(g.record_hours)} h`],
    ['Conquistas', `${num(ach.unlocked)} / ${num(ach.total)}`],
    [t('g.position_f'), `#${g.rank}`],
    ['Última vez', shortDate(g.last_played)],
  ];
  rows.forEach(([k, v], i) => {
    menu.append(h('div', { cls: 'g4-row', data: i === 0 ? { on: '1' } : {} },
      h('span', { text: k }), h('b', { text: v })));
  });

  const phone = h('div', { cls: 'g4-phone' },
    h('div', { cls: 'g4-screen' },
      h('div', { cls: 'g4-status' },
        h('span', { text: 'Liberty City' }), h('span', { text: '▮▮▮▯' })),
      h('p', { cls: 'g4-screen-title', text: t('g.stats_screen') }),
      menu));

  const side = h('div', { cls: 'g4-side' },
    h('p', { cls: 'g4-kicker', text: t('g.g4_kicker', { name: g.name, rank: g.rank }) }),
    h('h1', { cls: 'g4-title', text: t('g.g4_title', { n: hrs(g.record_hours) }) }),
    h('p', { cls: 'g4-lede',
      text: t('g.g4_lede', { done: num(ach.unlocked), total: num(ach.total) }) }));

  const cards = h('div', { cls: 'g4-cards' });
  for (const a of ach.list.length ? ach.list : ach.rarest) {
    cards.append(h('article', { cls: 'g4-card' },
      a.icon ? h('img', { attr: { src: a.icon, alt: '', loading: 'lazy' } }) : null,
      h('div', {},
        h('b', { text: a.name }),
        a.description ? h('p', { text: a.description }) : null,
        h('span', { cls: 'g4-card-meta',
          text: [shortDate(a.date), a.rarity != null ? t('g.of_accounts', { pct: rarity(a.rarity) }) : null]
            .filter(Boolean).join('  ·  ') }))));
  }
  side.append(cards);
  wrap.append(h('div', { cls: 'g4-cols' }, phone, side));
  root.append(wrap);
}

/* ── Arma 2 - the 2D mission editor ───────────────────────────────── */

function renderArma2(g, root) {
  const wrap = h('div', { cls: 'a2' });

  const canvas = h('div', { cls: 'a2-canvas' },
    h('div', { cls: 'a2-unit' },
      h('span', { cls: 'a2-unit-h', text: `${num(g.record_hours)} h` }),
      h('span', { cls: 'a2-unit-name', text: 'Chernarus' })),
    h('span', { cls: 'a2-grid-ref', text: '0 · 0' }));

  const props = h('dl', { cls: 'a2-props' });
  const fields = [
    [t('g.hours'), `${hrs(g.record_hours)} h`],
    [t('g.position_f'), `#${g.rank}`],
    [t('g.share_f'), g.share != null ? `${num(g.share, 1)}%` : '-'],
    [t('g.last_f'), shortDate(g.last_played) || '-'],
    [t('g.pause_ach'), t('g.dont_exist')],
    [t('g.statistics'), t('g.dont_exist')],
  ];
  for (const [k, v] of fields) props.append(h('dt', { text: k }), h('dd', { text: v }));

  wrap.append(h('div', { cls: 'a2-editor' },
    h('div', { cls: 'a2-bar' },
      h('span', { text: t('g.editor_bar') }),
      h('span', { text: t('g.one_unit') })),
    h('div', { cls: 'a2-work' }, canvas,
      h('aside', { cls: 'a2-side' },
        h('p', { cls: 'a2-side-head', text: t('g.properties') }), props,
        h('p', { cls: 'a2-note',
          text: t('g.a2_note') })))));
  root.append(wrap);
}

/* ── No Man's Sky - the discovery log ─────────────────────────────── */

function renderNms(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'nms' });

  wrap.append(h('header', { cls: 'nms-head' },
    h('p', { cls: 'nms-kicker', text: t('g.nms_kicker', { name: g.name, h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'nms-title', text: `${num(ach.unlocked)} descobertas registradas` }),
    h('p', { cls: 'nms-sub',
      text: t('g.nms_sub', { total: num(ach.total), pct: num(ach.completion, 1), from: shortDate(ach.first.date), to: shortDate(ach.last.date) }) })));

  const log = h('div', { cls: 'nms-log' });
  for (const a of ach.list) {
    log.append(h('article', { cls: 'nms-entry' },
      h('div', { cls: 'nms-entry-icon' },
        a.icon ? h('img', { attr: { src: a.icon, alt: '', loading: 'lazy' } }) : null),
      h('div', { cls: 'nms-entry-text' },
        h('span', { cls: 'nms-entry-label', text: 'registrado' }),
        h('b', { text: a.name }),
        a.description ? h('p', { text: a.description }) : null,
        h('span', { cls: 'nms-entry-meta',
          text: [shortDate(a.date), a.rarity != null ? t('g.of_travellers', { pct: rarity(a.rarity) }) : null]
            .filter(Boolean).join('  ·  ') }))));
  }
  wrap.append(log);
  root.append(wrap);
}

/* ── Apex Legends - the banner card ───────────────────────────────── */

function renderApex(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'apx' });
  const rare = ach.rarest.filter((a) => a.rarity != null).slice(0, 3);

  const badges = h('div', { cls: 'apx-badges' });
  for (const a of rare) {
    badges.append(h('div', { cls: 'apx-badge' },
      a.icon ? h('img', { attr: { src: a.icon, alt: '', loading: 'lazy' } }) : null,
      h('span', { text: a.name }),
      h('em', { text: `${rarity(a.rarity)}` })));
  }

  wrap.append(h('section', { cls: 'apx-banner' },
    h('div', { cls: 'apx-banner-in' },
      h('p', { cls: 'apx-kicker', text: t('g.g4_kicker', { name: g.name, rank: g.rank }) }),
      h('h1', { cls: 'apx-title', text: t('g.n_of_n', { done: num(ach.unlocked), total: num(ach.total) }) }),
      h('p', { cls: 'apx-sub',
        text: t('g.apx_sub', { h: hrs(g.record_hours) }) }),
      badges)));

  const list = h('div', { cls: 'apx-list' });
  for (const a of ach.list) {
    list.append(h('div', { cls: 'apx-item' },
      a.icon ? h('img', { cls: 'apx-item-icon', attr: { src: a.icon, alt: '', loading: 'lazy' } }) : null,
      h('div', { cls: 'apx-item-text' },
        h('b', { text: a.name }),
        a.description ? h('span', { text: a.description }) : null),
      h('span', { cls: 'apx-item-rare', text: a.rarity != null ? `${rarity(a.rarity)}` : '-' })));
  }
  wrap.append(h('h2', { cls: 'apx-h', text: t('g.all_eleven') }), list);
  root.append(wrap);
}

/* ── Ready or Not - the mission debrief ───────────────────────────── */

function renderReadyOrNot(g, root) {
  const r = g.ron;
  const ach = g.achievements;
  const wrap = h('div', { cls: 'ron' });

  wrap.append(h('header', { cls: 'ron-head' },
    h('p', { cls: 'ron-kicker', text: t('g.ron_kicker', { name: g.name, h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'ron-title', text: t('g.after_action') }),
    h('p', { cls: 'ron-sub',
      html: t('g.ron_sub', { perfect: num(r.perfect), total: num(r.missions.length), avg: num(r.avg_score, 1) }) })));

  const board = h('div', { cls: 'ron-board' });
  board.append(h('div', { cls: 'ron-row ron-row--head' },
    h('span', { text: t('g.mission') }), h('span', { text: t('g.score') }),
    h('span', { text: '' }), h('span', { text: t('g.grade') })));
  r.missions.forEach((m, i) => {
    const full = m.score >= 99.95;
    board.append(h('div', { cls: 'ron-row', data: full ? { full: '1' } : {} },
      h('span', { cls: 'ron-n', text: String(m.n).padStart(2, '0') }),
      h('span', { cls: 'ron-score', text: `${num(m.score, 1)}%` }),
      fillBar('ron-bar', m.score, i * 30),
      h('span', { cls: 'ron-grade', text: t(full ? 'g.done_f' : 'g.with_faults') })));
  });
  wrap.append(h('h2', { cls: 'ron-h', text: t('g.missions') }), board,
    h('p', { cls: 'ron-note',
      text: t('g.ron_note') }));

  const tools = h('div', { cls: 'ron-tools' });
  for (const t of r.tools) {
    tools.append(h('div', { cls: 'ron-tool' },
      h('b', { text: num(t.value) }), h('span', { text: ts(t.name) })));
  }
  wrap.append(h('h2', { cls: 'ron-h', text: t('g.gear_used') }), tools);

  if (ach?.rarest?.length) {
    const list = h('div', { cls: 'ron-ach' });
    for (const a of ach.rarest.slice(0, 8)) {
      list.append(h('div', { cls: 'ron-ach-row' },
        a.icon ? h('img', { attr: { src: a.icon, alt: '', loading: 'lazy' } }) : null,
        h('div', {}, h('b', { text: a.name }),
          a.description ? h('span', { text: a.description }) : null),
        h('em', { text: a.rarity != null ? `${rarity(a.rarity)}` : '-' })));
    }
    wrap.append(h('h2', { cls: 'ron-h', text: t('g.ron_medals', { done: ach.unlocked, total: ach.total }) }), list);
  }
  root.append(wrap);
}

/* ── Cities: Skylines - the zoning grid ───────────────────────────── */

function renderCities(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'ck' });
  const ZONES = ['res', 'com', 'ind'];

  wrap.append(h('header', { cls: 'ck-head' },
    h('p', { cls: 'ck-kicker', text: `cities: skylines  ·  ${num(g.record_hours)} h construindo` }),
    h('h1', { cls: 'ck-title', text: t('g.ck_title', { n: num(ach.unlocked) }) }),
    h('p', { cls: 'ck-sub',
      text: t('g.ck_sub', { total: num(ach.total) }) })));

  // The map is the completion rate: one plot per achievement in the game.
  const map = h('div', { cls: 'ck-map' });
  for (let i = 0; i < ach.total; i++) {
    const a = ach.list[i];
    map.append(a
      ? h('span', {
          cls: 'ck-plot',
          data: { zone: ZONES[i % ZONES.length] },
          attr: { title: `${a.name} - ${shortDate(a.date)}` },
        })
      : h('span', { cls: 'ck-plot ck-plot--empty' }));
  }
  wrap.append(map);

  const legend = h('div', { cls: 'ck-legend' },
    h('span', { cls: 'ck-key', data: { zone: 'res' } }, h('i'), h('em', { text: t('g.built_zoned') })),
    h('span', { cls: 'ck-key ck-key--empty' }, h('i'), h('em', { text: t('g.vacant') })));
  wrap.append(legend);

  const list = h('div', { cls: 'ck-list' });
  for (const a of ach.rarest.slice(0, 9)) {
    list.append(h('article', { cls: 'ck-card' },
      a.icon ? h('img', { attr: { src: a.icon, alt: '', loading: 'lazy' } }) : null,
      h('div', {}, h('b', { text: a.name }),
        a.description ? h('p', { text: a.description }) : null,
        h('span', { cls: 'ck-card-meta',
          text: a.rarity != null ? t('g.of_mayors', { pct: rarity(a.rarity) }) : shortDate(a.date) }))));
  }
  wrap.append(h('h2', { cls: 'ck-h', text: 'as mais raras' }), list);
  root.append(wrap);
}

/* ── PAYDAY 2 - the contract board ────────────────────────────────── */

function renderPayday(g, root) {
  const p = g.payday2;
  const ach = g.achievements;
  const wrap = h('div', { cls: 'pd' });

  wrap.append(h('header', { cls: 'pd-head' },
    h('div', { cls: 'pd-level' }, h('b', { text: num(p.level) }), h('span', { text: t('g.level') })),
    h('div', { cls: 'pd-head-text' },
      h('p', { cls: 'pd-kicker', text: `payday 2  ·  ${num(g.record_hours)} h  ·  ${num(p.heists_total)} contratos diferentes` }),
      h('h1', { cls: 'pd-title', text: `${num(p.runs_total)} assaltos` }),
      h('p', { cls: 'pd-sub',
        html: t('g.pd_sub', { kills: num(p.kills), shots: num(p.shots), acc: num(p.accuracy, 1), done: num(ach.unlocked), total: num(ach.total) }) }))));

  const board = h('div', { cls: 'pd-board' });
  const maxRuns = Math.max(...p.heists.map((x) => x.runs), 1);
  p.heists.forEach((x, i) => {
    board.append(h('article', { cls: 'pd-contract', data: x.mapped ? {} : { raw: '1' } },
      h('span', { cls: 'pd-contract-n', text: String(i + 1).padStart(2, '0') }),
      h('b', { cls: 'pd-contract-name', text: ts(x.name) }),
      h('span', { cls: 'pd-contract-runs', text: `${num(x.runs)}×` }),
      fillBar('pd-contract-bar', (x.runs / maxRuns) * 100, i * 30)));
  });
  wrap.append(h('h2', { cls: 'pd-h', text: t('g.contracts') }), board,
    p.unmapped ? h('p', { cls: 'pd-note',
      text: t('g.pd_codenames', { n: p.unmapped }) }) : null);

  const guns = h('div', { cls: 'pd-guns' });
  guns.append(h('div', { cls: 'pd-gun pd-gun--head' },
    h('span', { text: t('g.weapon') }), h('span', { text: t('g.casualties') }),
    h('span', { text: t('g.shots') }), h('span', { text: t('g.accuracy') })));
  for (const w of p.weapons) {
    guns.append(h('div', { cls: 'pd-gun' },
      h('span', { cls: 'pd-gun-name', text: w.name }),
      h('span', { cls: 'pd-gun-n', text: num(w.kills) }),
      h('span', { cls: 'pd-gun-n pd-gun-n--dim', text: num(w.shots) }),
      h('span', { cls: 'pd-gun-n pd-gun-acc', text: w.accuracy == null ? '-' : `${num(w.accuracy, 1)}%` })));
  }
  wrap.append(h('h2', { cls: 'pd-h', text: t('g.arsenal') }), guns,
    h('p', { cls: 'pd-note', text: t('g.pd_ids_note') }));

  const foes = h('div', { cls: 'pd-foes' });
  const maxKills = Math.max(...p.enemies.map((e) => e.kills), 1);
  p.enemies.forEach((e, i) => {
    foes.append(h('div', { cls: 'pd-foe' },
      h('span', { cls: 'pd-foe-name', text: ts(e.name) }),
      fillBar('pd-foe-bar', (e.kills / maxKills) * 100, i * 35),
      h('b', { text: num(e.kills) })));
  });
  wrap.append(h('h2', { cls: 'pd-h', text: t('g.who_took') }), foes);
  root.append(wrap);
}

/* ── GTA: San Andreas - the stat screen ───────────────────────────── */

function renderGtaSa(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'sa' });
  const years = Object.entries(ach.by_year || {});

  wrap.append(h('header', { cls: 'sa-head' },
    h('p', { cls: 'sa-kicker', text: `san andreas - definitive edition  ·  ${num(g.record_hours)} h` }),
    h('h1', { cls: 'sa-title', text: t('g.stats_screen') })));

  // San Andreas draws every stat as a segmented skill bar, so these do too.
  const rows = [
    [t('g.progress'), ach.completion, 100, `${num(ach.completion, 1)}%`],
    [t('g.pause_ach'), ach.unlocked, ach.total, `${ach.unlocked} de ${ach.total}`],
    [t('g.hours'), g.record_hours, 120, `${hrs(g.record_hours)} h`],
    [t('g.position_f'), 26 - g.rank, 25, `#${g.rank} de 436`],
  ];
  const panel = h('div', { cls: 'sa-panel' });
  for (const [label, v, max, read] of rows) {
    const bar = h('div', { cls: 'sa-bar' });
    const filled = Math.round((v / max) * 24);
    for (let i = 0; i < 24; i++) bar.append(h('i', { data: i < filled ? { on: '1' } : {} }));
    panel.append(h('div', { cls: 'sa-stat' },
      h('span', { cls: 'sa-stat-label', text: label }), bar,
      h('b', { cls: 'sa-stat-val', text: read })));
  }
  wrap.append(panel);

  if (years.length) {
    wrap.append(h('p', { cls: 'sa-note',
      text: t('g.sa_note', { year: years.sort((a, b) => b[1] - a[1])[0][0], n: years[0][1], total: ach.unlocked }) }));
  }

  const cards = h('div', { cls: 'sa-cards' });
  for (const a of ach.rarest.slice(0, 9)) {
    cards.append(h('article', { cls: 'sa-card' },
      a.icon ? h('img', { attr: { src: a.icon, alt: '', loading: 'lazy' } }) : null,
      h('div', {}, h('b', { text: a.name }),
        a.description ? h('p', { text: a.description }) : null,
        h('span', { cls: 'sa-card-meta',
          text: a.rarity != null ? t('g.of_accounts', { pct: rarity(a.rarity) }) : shortDate(a.date) }))));
  }
  wrap.append(h('h2', { cls: 'sa-h', text: 'as mais raras' }), cards);
  root.append(wrap);
}

/* ── Realm Royale - the forge ─────────────────────────────────────── */

/** Steam rarity in four bands, drawn the way a loot game draws item tiers. */
function tier(rarity) {
  if (rarity == null) return 0;
  if (rarity < 15) return 3;
  if (rarity < 35) return 2;
  if (rarity < 60) return 1;
  return 0;
}
const TIER_KEYS = ['g.common', 'g.rare', 'g.epic', 'g.legendary'];

function renderRealmRoyale(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'rr' });

  wrap.append(h('header', { cls: 'rr-head' },
    h('p', { cls: 'rr-kicker', text: `realm royale reforged  ·  ${num(g.record_hours)} h` }),
    h('h1', { cls: 'rr-title', text: t('g.the_forge') }),
    h('p', { cls: 'rr-sub',
      text: t('g.rr_sub', { done: num(ach.unlocked), total: num(ach.total) }) })));

  const forge = h('div', { cls: 'rr-forge' });
  for (const a of ach.list.length ? ach.list : ach.rarest) {
    const band = tier(a.rarity);
    forge.append(h('article', { cls: 'rr-slot', data: { tier: String(band) } },
      h('div', { cls: 'rr-slot-art' },
        a.icon ? h('img', { attr: { src: a.icon, alt: '', loading: 'lazy' } }) : null),
      h('b', { cls: 'rr-slot-name', text: a.name }),
      h('span', { cls: 'rr-slot-tier', text: t(TIER_KEYS[band]) }),
      h('span', { cls: 'rr-slot-meta',
        text: a.rarity != null ? t('g.of_accounts', { pct: rarity(a.rarity) }) : shortDate(a.date) })));
  }
  wrap.append(forge);

  const legend = h('div', { cls: 'rr-legend' });
  TIER_KEYS.forEach((key, i) => {
    legend.append(h('span', { cls: 'rr-key', data: { tier: String(i) } }, h('i'), h('em', { text: t(key) })));
  });
  wrap.append(legend);
  root.append(wrap);
}

/* ── DayZ - the death screen ──────────────────────────────────────── */

function renderDayz(g, root) {
  const ach = g.achievements;
  const unlocked = ach ? ach.unlocked : 0;
  const total = ach ? ach.total : 13;
  const wrap = h('div', { cls: 'dz' });

  // The death screen is the joke only while nothing has been unlocked. Once
  // something has, the page says so instead.
  wrap.append(h('section', { cls: 'dz-dead' },
    h('h1', { cls: 'dz-title', text: t(unlocked ? 'g.you_survived' : 'g.you_dead') }),
    h('p', { cls: 'dz-sub',
      text: unlocked
        ? t('g.dz_sub_some', { h: hrs(g.record_hours), done: num(unlocked), total: num(total) })
        : t('g.dz_sub_none', { h: hrs(g.record_hours) }) })));

  const hud = h('div', { cls: 'dz-hud' });
  const cells = [
    [t('g.hours'), `${hrs(g.record_hours)} h`],
    [t('g.position_f'), `#${g.rank}`],
    [t('g.share_of_total'), g.share != null ? `${num(g.share, 1)}%` : '-'],
    [t('g.last_f'), shortDate(g.last_played) || '-'],
    [t('g.pause_ach'), `${num(unlocked)} de ${num(total)}`],
    [t('g.statistics'), 'nenhuma'],
  ];
  for (const [k, v] of cells) {
    hud.append(h('div', { cls: 'dz-cell' }, h('b', { text: v }), h('span', { text: k })));
  }
  wrap.append(hud);

  if (unlocked && ach.rarest.length) {
    const list = h('div', { cls: 'dz-list' });
    for (const a of ach.rarest) {
      list.append(h('div', { cls: 'dz-row' },
        a.icon ? h('img', { attr: { src: a.icon, alt: '', loading: 'lazy' } }) : null,
        h('div', {}, h('b', { text: a.name }),
          a.description ? h('span', { text: a.description }) : null),
        h('em', { text: a.rarity != null ? `${rarity(a.rarity)}` : '-' })));
    }
    wrap.append(list);
  } else {
    wrap.append(h('p', { cls: 'dz-note',
      text: t('g.dz_note', { total: num(total), h: hrs(g.record_hours) }) }));
  }
  root.append(wrap);
}

/* ── Garry's Mod - the spawn menu ─────────────────────────────────── */

function renderGmod(g, root) {
  const gm = g.gmod;
  const ach = g.achievements;
  const wrap = h('div', { cls: 'gm' });
  // Matched on a Portuguese prefix once, back when the counters travelled as
  // prose. They travel as keys now, so it matched nothing and the console
  // block below had quietly stopped rendering for everybody.
  const errors = gm.counters.find((c) => c.name === '@gmod.lua_errors');

  wrap.append(h('header', { cls: 'gm-head' },
    h('p', { cls: 'gm-kicker', text: t('g.gm_kicker', { name: g.name, steam: hrs(g.record_hours), game: num(gm.in_game_hours) }) }),
    h('h1', { cls: 'gm-title', text: t('g.spawn_menu') })));

  const grid = h('div', { cls: 'gm-grid' });
  const max = Math.max(...gm.counters.map((c) => c.value), 1);
  gm.counters.forEach((c, i) => {
    grid.append(h('article', { cls: 'gm-tile' },
      h('b', { cls: 'gm-tile-n', text: num(c.value) }),
      h('span', { cls: 'gm-tile-name', text: ts(c.name) }),
      fillBar('gm-tile-bar', (c.value / max) * 100, i * 30)));
  });
  wrap.append(h('div', { cls: 'gm-panel' },
    h('div', { cls: 'gm-tabs' },
      h('span', { cls: 'gm-tab', data: { on: '1' }, text: t('g.counters') }),
      h('span', { cls: 'gm-tab',
        text: t('g.n_entries', { n: num(gm.counters.length), raw: gm.counters.length }) })),
    grid));

  if (errors) {
    wrap.append(h('pre', { cls: 'gm-console' },
      h('span', { cls: 'gm-console-err',
        text: `[ERROR] ${t('g.gm_errors', { n: num(errors.value) })}` }),
      txt('\n'),
      h('span', { text: t('g.gm_errors_rate', { h: num(gm.in_game_hours), rate: num(errors.value / Math.max(gm.in_game_hours, 1)) }) })));
  }

  if (ach?.rarest?.length) {
    const list = h('div', { cls: 'gm-ach' });
    for (const a of ach.rarest) {
      list.append(h('div', { cls: 'gm-ach-row' },
        a.icon ? h('img', { attr: { src: a.icon, alt: '', loading: 'lazy' } }) : null,
        h('div', {}, h('b', { text: a.name }),
          a.description ? h('span', { text: a.description }) : null),
        h('em', { text: a.rarity != null ? `${rarity(a.rarity)}` : '-' })));
    }
    wrap.append(h('h2', { cls: 'gm-h', text: t('g.ach_of', { done: ach.unlocked, total: ach.total }) }), list);
  }
  root.append(wrap);
}

/* ── American Truck Simulator - the route shield ──────────────────── */

function renderAts(g, root) {
  const a = g.ats;
  const ach = g.achievements;
  const wrap = h('div', { cls: 'at' });

  wrap.append(h('header', { cls: 'at-head' },
    h('div', { cls: 'at-shield' },
      h('span', { cls: 'at-shield-top', text: t('g.hours') }),
      h('b', { text: num(g.record_hours) })),
    h('div', { cls: 'at-head-text' },
      h('p', { cls: 'at-kicker', text: t('g.g4_kicker', { name: g.name, rank: g.rank }) }),
      h('h1', { cls: 'at-title', text: t('g.west') }),
      h('p', { cls: 'at-sub',
        text: t('g.at_sub', { done: num(ach.unlocked), total: num(ach.total) }) }))));

  const board = h('div', { cls: 'at-board' });
  const max = Math.max(...a.counters.map((c) => c.value), 1);
  a.counters.forEach((c, i) => {
    board.append(h('div', { cls: 'at-row' },
      h('span', { cls: 'at-row-name', text: ts(c.name) }),
      fillBar('at-row-bar', (c.value / max) * 100, i * 35),
      h('b', { text: num(c.value) })));
  });
  wrap.append(h('h2', { cls: 'at-h', text: t('g.progress') }), board,
    g.counters_note ? h('p', { cls: 'at-note', text: ts(g.counters_note) }) : null);

  const list = h('div', { cls: 'at-ach' });
  for (const x of ach.rarest) {
    list.append(h('article', { cls: 'at-card' },
      x.icon ? h('img', { attr: { src: x.icon, alt: '', loading: 'lazy' } }) : null,
      h('div', {}, h('b', { text: x.name }),
        x.description ? h('p', { text: x.description }) : null,
        h('span', { cls: 'at-card-meta',
          text: x.rarity != null ? t('g.of_accounts', { pct: rarity(x.rarity) }) : shortDate(x.date) }))));
  }
  wrap.append(h('h2', { cls: 'at-h', text: t('g.pause_ach') }), list);
  root.append(wrap);
}

/* ── F1 2015 - the timing tower ───────────────────────────────────── */

function renderF1(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'f1' });

  wrap.append(h('header', { cls: 'f1-head' },
    h('p', { cls: 'f1-kicker', text: t('g.f1_kicker', { name: g.name, h: hrs(g.record_hours), rank: g.rank }) }),
    h('h1', { cls: 'f1-title', text: t('g.classification') }),
    h('p', { cls: 'f1-sub',
      text: t('g.f1_sub', { done: num(ach.unlocked), total: num(ach.total) }) })));

  const tower = h('div', { cls: 'f1-tower' });
  const ranked = ach.list.slice().sort((x, y) => (x.rarity ?? 100) - (y.rarity ?? 100));
  const best = ranked[0]?.rarity ?? 0;
  ranked.forEach((a, i) => {
    const gap = a.rarity == null ? null : a.rarity - best;
    tower.append(h('div', { cls: 'f1-row', data: i === 0 ? { p1: '1' } : {} },
      h('span', { cls: 'f1-pos', text: String(i + 1) }),
      h('span', { cls: 'f1-name', text: a.name }),
      h('span', { cls: 'f1-time', text: a.rarity != null ? `${rarity(a.rarity)}` : '-' }),
      h('span', { cls: 'f1-gap', text: i === 0 ? t('g.leader') : gap == null ? '' : `+${num(gap, 1)}` })));
  });
  wrap.append(tower);
  wrap.append(h('p', { cls: 'f1-note',
    text: t('g.first_last', { from: shortDate(ach.first.date), to: shortDate(ach.last.date) }) }));
  root.append(wrap);
}

/* ── The generic page ─────────────────────────────────────────────────
   For every game without a layout of its own. It has to work with a lot
   (hundreds of achievements) or with almost nothing (hours and a date),
   so the structure is a single column that simply stops early. */

function renderGeneric(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'gx' });

  const facts = [t('g.rank_in_library', { n: num(g.rank) })];
  if (g.share != null) facts.push(t('g.of_total_time', { pct: num(g.share, 1) }));
  if (g.last_played) facts.push(t('g.last_on', { date: shortDate(g.last_played) || '-' }));

  wrap.append(h('header', { cls: 'gx-head' },
    h('p', { cls: 'gx-kicker', text: facts.join('  ·  ') }),
    h('h1', { cls: 'gx-title', text: g.name }),
    h('p', { cls: 'gx-hours' },
      h('b', { text: hrs(g.record_hours) }),
      h('em', { text: t(g.record_hours === 1 ? 'g.hour_logged' : 'g.hours_logged') }))));

  if (ach && ach.unlocked) {
    const rare = ach.rarest.find((a) => a.rarity != null);
    wrap.append(h('section', { cls: 'gx-stats' },
      h('div', { cls: 'gx-stat' },
        h('b', { text: `${num(ach.unlocked)}/${num(ach.total)}` }),
        h('span', { text: t('g.pause_ach') })),
      h('div', { cls: 'gx-stat' },
        h('b', { text: `${num(ach.completion, 1)}%` }), h('span', { text: t('g.completed') })),
      ach.first ? h('div', { cls: 'gx-stat' },
        h('b', { text: shortDate(ach.first.date) }), h('span', { text: t('g.first') })) : null,
      rare ? h('div', { cls: 'gx-stat' },
        h('b', { text: `${rarity(rare.rarity)}` }), h('span', { text: t('g.rarest_one') })) : null));

    wrap.append(fillBar('gx-bar', ach.completion));

    const list = h('div', { cls: 'gx-list' });
    for (const a of ach.rarest) {
      list.append(h('article', { cls: 'gx-item' },
        a.icon ? h('img', { attr: { src: a.icon, alt: '', loading: 'lazy' } }) : null,
        h('div', {},
          h('b', { text: a.name }),
          a.description ? h('p', { text: a.description }) : null,
          h('span', { cls: 'gx-item-meta',
            text: [a.rarity != null ? t('g.of_accounts', { pct: rarity(a.rarity) }) : null, shortDate(a.date)]
              .filter(Boolean).join('  ·  ') }))));
    }
    wrap.append(h('h2', { cls: 'gx-h', text: t('g.rarest') }), list);

    const years = Object.entries(ach.by_year || {});
    if (years.length > 1) {
      const rows = h('div', { cls: 'gx-years' });
      const max = Math.max(...years.map(([, n]) => n));
      years.forEach(([year, n], i) => {
        rows.append(h('div', { cls: 'gx-year' },
          h('span', { text: year }),
          fillBar('gx-year-bar', (n / max) * 100, i * 40),
          h('b', { text: num(n) })));
      });
      wrap.append(h('h2', { cls: 'gx-h', text: t('g.when_unlocked') }), rows);
    }
  } else {
    // Nothing but the clock. Say that plainly instead of showing empty panels.
    wrap.append(h('p', { cls: 'gx-empty',
      text: ach ? t('g.empty_zero', { total: num(ach.total) }) : t('g.empty_none') }));
  }

  root.append(wrap);
}

/* ── Dispatch ─────────────────────────────────────────────────────── */

/** A row of counters. Enough layouts want exactly this that it earns a helper;
 *  the class prefix keeps each theme free to style it as its own. */
function cells(cls, rows) {
  const box = h('div', { cls });
  for (const [value, label] of rows) {
    if (value == null) continue;
    box.append(h('div', { cls: `${cls}-i` }, h('b', { text: value }), h('span', { text: label })));
  }
  return box;
}

/* ── Team Fortress 2 - the Player Statistics screen ───────────────────
   TF2 is the only game here that groups its own numbers by something the
   player chose, so the page is that grouping: one card per class, ordered by
   time, with the personal bests TF2 itself keeps beside each of them. */

function renderTf2(g, root) {
  const s = g.tf2;
  const wrap = h('div', { cls: 'tf' });
  const top = s.top;

  wrap.append(h('header', { cls: 'tf-head' },
    h('p', { cls: 'tf-kicker', text: t('g.tf_kicker', { name: g.name, h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'tf-title', text: top ? t('g.tf_title', { cls: top.name }) : t('g.statistics') }),
    h('p', { cls: 'tf-sub', text: t('g.tf_sub', { k: num(s.kills), d: num(s.deaths), p: num(s.points) }) })));

  const grid = h('div', { cls: 'tf-classes' });
  for (const c of s.classes) {
    const share = s.in_game_hours ? (c.hours / s.in_game_hours) * 100 : 0;
    const card = h('article', { cls: 'tf-class', data: c === top ? { top: '1' } : {} },
      h('div', { cls: 'tf-class-head' },
        h('b', { cls: 'tf-class-name', text: c.name }),
        h('span', { cls: 'tf-class-h', text: `${hrs(c.hours)} h` })),
      fillBar('tf-class-bar', share),
      cells('tf-class-stats', [
        [num(c.kills), t('g.kills')],
        [num(c.deaths), t('g.deaths')],
        [c.kd != null ? num(c.kd, 2) : '-', 'k/d'],
        [num(c.points), t('g.score')],
      ]));

    // Only the numbers this class actually has: healing is the Medic's, and a
    // zero under every other class would say something untrue about them.
    const own = [
      [c.healed, t('g.tf_healed')], [c.ubers, t('g.tf_ubers')],
      [c.backstabs, t('g.tf_backstabs')], [c.sentry_kills, t('g.tf_sentry')],
      [c.headshots, t('g.head')], [c.dominations, t('g.tf_dominations')],
    ].filter(([v]) => v);
    if (own.length) {
      card.append(cells('tf-class-own', own.map(([v, l]) => [num(v), l])));
    }
    card.append(h('p', { cls: 'tf-best',
      text: t('g.tf_best', { k: num(c.best_kills), p: num(c.best_points), d: num(c.best_damage) }) }));
    grid.append(card);
  }
  wrap.append(grid);

  if (s.maps?.length) {
    const list = h('div', { cls: 'tf-maps' });
    const top1 = s.maps[0].value || 1;
    s.maps.forEach((m, i) => {
      list.append(h('div', { cls: 'tf-map' },
        h('code', { text: m.name }),
        fillBar('tf-map-bar', (m.value / top1) * 100, i * 30),
        h('em', { text: num(m.value) })));
    });
    wrap.append(h('h2', { cls: 'tf-h', text: t('g.maps_played') }), list,
      h('p', { cls: 'tf-note', text: t('g.tf_maps_note') }));
  }
  root.append(wrap);
}

/* ── Rust - the island's ledger ───────────────────────────────────────
   Rust names its counters after the thing itself, so the page can be a plain
   ledger: what came out of the island, what died on it, and what killed you. */

function renderRust(g, root) {
  const s = g.rust;
  const wrap = h('div', { cls: 'rs' });

  wrap.append(h('header', { cls: 'rs-head' },
    h('p', { cls: 'rs-kicker', text: t('g.rs_kicker', { name: g.name, h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'rs-title', text: t('g.rs_title', { n: num(s.deaths) }) }),
    cells('rs-top', [
      [num(s.kill_player), t('g.rs_players_killed')],
      [num(s.deaths), t('g.deaths')],
      [s.accuracy != null ? `${num(s.accuracy, 1)}%` : '-', t('g.accuracy')],
      [num(s.bullets), t('g.rs_bullets')],
    ])));

  const ledger = (title, rows, cls) => {
    if (!rows?.length) return null;
    const top = rows[0].value || 1;
    const box = h('div', { cls: `rs-list ${cls}` });
    rows.forEach((r, i) => {
      box.append(h('div', { cls: 'rs-row' },
        h('span', { cls: 'rs-row-name', text: ts(r.name) }),
        fillBar('rs-row-bar', (r.value / top) * 100, i * 40),
        h('b', { text: num(r.value) })));
    });
    return h('section', { cls: 'rs-panel' }, h('h2', { cls: 'rs-h', text: title }), box);
  };

  put(wrap,
    ledger(t('g.rs_harvested'), s.harvest, 'rs-list--harvest'),
    ledger(t('g.rs_killed'), s.kills, 'rs-list--kills'),
    ledger(t('g.rs_died_of'), s.deaths_by, 'rs-list--deaths'));

  const misc = [
    [s.headshots, t('g.head')], [s.arrows, t('g.rs_arrows')], [s.rockets, t('g.rs_rockets')],
    [s.barrels, t('g.rs_barrels')], [s.blueprints, t('g.rs_blueprints')],
    [s.placed, t('g.rs_placed')], [s.upgraded, t('g.rs_upgraded')],
    [s.missions, t('g.rs_missions')], [s.fish, t('g.rs_fish')],
    [s.notes_played, t('g.rs_notes')], [s.horse_km ? `${num(s.horse_km)} km` : null, t('g.rs_horse')],
  ].filter(([v]) => v);
  if (misc.length) {
    wrap.append(h('h2', { cls: 'rs-h', text: t('g.counters') }),
      cells('rs-misc', misc.map(([v, l]) => [typeof v === 'string' ? v : num(v), l])));
  }
  root.append(wrap);
}

/* ── Dead by Daylight - the two sides of the same clock ───────────────
   DBD counts the killer and the survivor apart, so the page splits down the
   middle and lets the pips say which side this profile actually plays. */

function renderDbd(g, root) {
  const s = g.dbd;
  const wrap = h('div', { cls: 'db' });
  const k = s.killer, v = s.survivor;

  wrap.append(h('header', { cls: 'db-head' },
    h('p', { cls: 'db-kicker', text: t('g.db_kicker', { name: g.name, h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'db-title',
      text: s.side ? t(s.side === 'killer' ? 'g.db_is_killer' : 'g.db_is_survivor') : t('g.db_both') })));

  const side = (cls, title, pips, rows) => h('section', { cls: `db-side ${cls}` },
    h('h2', { text: title }),
    h('p', { cls: 'db-pips', text: t('g.db_pips', { n: num(pips) }) }),
    cells('db-stats', rows));

  wrap.append(h('div', { cls: 'db-split' },
    side('db-side--k', t('g.db_killer'), k.pips, [
      [num(k.sacrificed), t('g.db_sacrificed')],
      [num(k.killed), t('g.db_killed')],
      [num(k.total), t('g.db_total_taken')],
    ]),
    side('db-side--s', t('g.db_survivor'), v.pips, [
      [num(v.escapes), t('g.db_escapes')],
      [num(v.hatch), t('g.db_hatch')],
      [num(v.generators, 1), t('g.db_generators')],
      [num(v.heals, 1), t('g.db_heals')],
      [num(v.unhooks), t('g.db_unhooks')],
      [num(v.skill_checks), t('g.db_skill_checks')],
    ])));

  wrap.append(h('section', { cls: 'db-blood' },
    h('h2', { text: t('g.db_bloodweb') }),
    cells('db-stats', [
      [num(s.bloodweb.points), t('g.db_points')],
      [num(s.bloodweb.level), t('g.db_max_level')],
      [num(s.bloodweb.prestige), t('g.db_prestige')],
    ]),
    h('p', { cls: 'db-note', text: t('g.db_note') })));
  root.append(wrap);
}

/* ── Stardew Valley - the end-of-year summary ─────────────────────────
   Seven counters, and each one is a whole sentence about the farm. The only
   other light page on the site, because this is the only other game that is
   not played after dark. */

function renderStardew(g, root) {
  const s = g.stardew;
  const wrap = h('div', { cls: 'sv' });

  wrap.append(h('header', { cls: 'sv-head' },
    h('p', { cls: 'sv-kicker', text: t('g.sv_kicker', { name: g.name, h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'sv-title', text: t('g.sv_earned', { g: num(s.money) }) })));

  const board = h('div', { cls: 'sv-board' });
  const top = Math.max(...s.rows.map((r) => r.value), 1);
  s.rows.forEach((r, i) => {
    board.append(h('div', { cls: 'sv-row' },
      h('span', { cls: 'sv-row-name', text: ts(r.name) }),
      fillBar('sv-row-bar', (r.value / top) * 100, i * 60),
      h('b', { text: num(r.value) })));
  });
  wrap.append(h('section', { cls: 'sv-paper' },
    h('h2', { cls: 'sv-h', text: t('g.sv_journal') }), board));

  if (g.achievements?.unlocked) {
    const ach = g.achievements;
    wrap.append(h('p', { cls: 'sv-ach',
      text: t('g.sv_ach', { done: num(ach.unlocked), total: num(ach.total) }) }));
  }
  root.append(wrap);
}

/* ── Path of Exile - four landmarks ───────────────────────────────────
   A game with a hundred systems exposes four counters. They are landmarks
   rather than totals, and the page is built to say exactly that. */

function renderPoe(g, root) {
  const s = g.poe;
  const ach = g.achievements;
  const wrap = h('div', { cls: 'pe' });

  wrap.append(h('header', { cls: 'pe-head' },
    h('p', { cls: 'pe-kicker', text: t('g.pe_kicker', { name: g.name, h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'pe-title', text: t('g.pe_title') })));

  const web = h('div', { cls: 'pe-web' });
  for (const r of s.rows) {
    web.append(h('div', { cls: 'pe-node' },
      h('i'), h('b', { text: num(r.value) }), h('span', { text: ts(r.name) })));
  }
  wrap.append(web, h('p', { cls: 'pe-note', text: t('g.pe_note') }));

  if (ach?.unlocked) {
    const list = h('div', { cls: 'pe-ach' });
    for (const a of ach.rarest.slice(0, 8)) {
      list.append(h('div', { cls: 'pe-ach-row' },
        a.icon ? h('img', { attr: { src: a.icon, alt: '', loading: 'lazy' } }) : null,
        h('b', { text: a.name }),
        h('em', { text: a.rarity != null ? rarity(a.rarity) : '-' })));
    }
    wrap.append(h('h2', { cls: 'pe-h', text: t('g.rarest') }), list);
  }
  root.append(wrap);
}

/* ── Slay the Spire 2 - one card ──────────────────────────────────────
   Shipped with no achievements and a version counter. The hours are the whole
   content, so the page is a single card with them printed on it. */

function renderSts2(g, root) {
  const wrap = h('div', { cls: 'sp' });
  wrap.append(h('div', { cls: 'sp-card' },
    h('div', { cls: 'sp-cost', text: hrs(g.record_hours) }),
    h('h1', { cls: 'sp-name', text: g.name }),
    h('p', { cls: 'sp-type', text: t('g.sp_type') }),
    h('div', { cls: 'sp-art' }, h('img', { attr: { src: g.art, alt: '', loading: 'lazy' } })),
    h('p', { cls: 'sp-text', text: t('g.sp_text', { h: hrs(g.record_hours), date: shortDate(g.last_played) || '-' }) }),
    h('p', { cls: 'sp-flavor', text: t('g.sp_flavor') })));
  root.append(wrap);
}

/* ── VRChat - a room with a clock in it ───────────────────────────────
   No achievements, no stats, nothing to fetch. The hours are the page. */

function renderVrchat(g, root) {
  const wrap = h('div', { cls: 'vr' });
  const o = g.os || {};
  const total = (o.windows || 0) + (o.linux || 0) + (o.mac || 0) + (o.deck || 0);

  wrap.append(h('header', { cls: 'vr-head' },
    h('p', { cls: 'vr-kicker', text: t('g.vr_kicker', { name: g.name }) }),
    h('h1', { cls: 'vr-title', text: t('g.vr_title', { h: hrs(g.record_hours) }) }),
    h('p', { cls: 'vr-sub', text: t('g.vr_sub', { date: shortDate(g.last_played) || '-' }) })));

  wrap.append(cells('vr-stats', [
    [`${hrs(g.record_hours)} h`, t('g.hours_logged_f')],
    [num(g.rank), t('g.lib_position')],
    [`${num(g.share, 2)}%`, t('g.share_of_total')],
    [total ? `${hrs(total / 60)} h` : null, t('g.os_all')],
  ]));
  wrap.append(h('p', { cls: 'vr-note', text: t('g.vr_note') }));
  root.append(wrap);
}

/** The list every achievement page ends with. Shape is shared; the class
 *  prefix is not, so each theme still draws it as its own. */
function achRows(cls, items) {
  const box = h('div', { cls });
  for (const a of items) {
    box.append(h('div', { cls: `${cls}-row` },
      a.icon ? h('img', { attr: { src: a.icon, alt: '', loading: 'lazy' } }) : h('i'),
      h('div', { cls: `${cls}-text` },
        h('b', { text: a.name }),
        a.description ? h('span', { text: a.description }) : null),
      h('em', { text: a.rarity != null ? rarity(a.rarity) : '-' })));
  }
  return box;
}

/** The three rarest, which is the one thing an achievement list has that a
 *  count does not: what this person did that almost nobody else did. */
const rarestThree = (ach) => ach.rarest.filter((a) => a.rarity != null).slice(0, 3);

/* ── Palworld - the Paldeck ───────────────────────────────────────────
   Palworld's own index is a numbered deck of entries, filled in as you catch
   them. An achievement list is the same shape: numbered, and either in or out. */

function renderPalworld(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'pw' });

  wrap.append(h('header', { cls: 'pw-head' },
    h('p', { cls: 'pw-kicker', text: t('g.pw_kicker', { name: g.name, h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'pw-title', text: t('g.pw_title', { done: num(ach.unlocked), total: num(ach.total) }) }),
    fillBar('pw-bar', ach.completion)));

  const deck = h('div', { cls: 'pw-deck' });
  ach.list.forEach((a, i) => {
    deck.append(h('article', { cls: 'pw-card' },
      h('span', { cls: 'pw-no', text: `№ ${String(i + 1).padStart(3, '0')}` }),
      a.icon ? h('img', { attr: { src: a.icon, alt: '', loading: 'lazy' } }) : null,
      h('b', { text: a.name }),
      h('span', { cls: 'pw-meta', text: [shortDate(a.date), rarity(a.rarity)].filter(Boolean).join(' · ') })));
  });
  wrap.append(deck);
  root.append(wrap);
}

/* ── PUBG - the end-of-match card ─────────────────────────────────────
   One screen everybody who played this game has seen, and the only honest
   thing to put on it is the count that is actually known. */

function renderPubg(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'pg2' });

  wrap.append(h('section', { cls: 'pg2-card' },
    h('p', { cls: 'pg2-kicker', text: t('g.pg2_kicker', { name: g.name }) }),
    h('h1', { cls: 'pg2-title', text: t('g.pg2_title', { done: num(ach.unlocked), total: num(ach.total) }) }),
    h('p', { cls: 'pg2-sub', text: t('g.pg2_sub', { h: hrs(g.record_hours), rank: num(g.rank) }) })));

  const rare = rarestThree(ach);
  if (rare.length) {
    const crate = h('div', { cls: 'pg2-crate' });
    for (const a of rare) {
      crate.append(h('div', { cls: 'pg2-drop' },
        a.icon ? h('img', { attr: { src: a.icon, alt: '', loading: 'lazy' } }) : null,
        h('b', { text: a.name }), h('em', { text: rarity(a.rarity) })));
    }
    wrap.append(h('h2', { cls: 'pg2-h', text: t('g.rarest') }), crate);
  }
  wrap.append(h('h2', { cls: 'pg2-h', text: t('g.achievements') }), achRows('pg2-list', ach.list));
  root.append(wrap);
}

/* ── The Binding of Isaac - the collection page ───────────────────────
   641 achievements, which is the largest set on the site by a wide margin, and
   Isaac's own collection page is exactly a grid of everything you might have. */

function renderIsaac(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'is' });

  wrap.append(h('header', { cls: 'is-head' },
    h('p', { cls: 'is-kicker', text: t('g.is_kicker', { name: g.name, h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'is-title', text: t('g.is_title', { done: num(ach.unlocked), total: num(ach.total) }) }),
    h('p', { cls: 'is-sub', text: t('g.is_sub', { pct: num(ach.completion, 1) }) })));

  // One tile per achievement in the set, lit if it is held. The empty ones are
  // the point: this is a game about the size of what is still missing.
  const grid = h('div', { cls: 'is-grid' });
  const held = new Map(ach.list.map((a) => [a.key, a]));
  const total = ach.total || ach.list.length;
  for (let i = 0; i < total; i++) {
    const a = ach.list[i];
    const cell = h('div', { cls: 'is-cell', data: i < ach.unlocked ? { on: '1' } : {} });
    if (i < ach.unlocked && a?.icon) {
      cell.append(h('img', { attr: { src: a.icon, alt: '', loading: 'lazy' } }));
      cell.title = `${a.name} - ${rarity(a.rarity)}`;
    }
    grid.append(cell);
  }
  wrap.append(grid);
  wrap.append(h('h2', { cls: 'is-h', text: t('g.rarest') }), achRows('is-list', ach.rarest.slice(0, 10)));
  root.append(wrap);
}

/* ── Marvel Rivals - the hero card ────────────────────────────────────  */

function renderMarvelRivals(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'mr' });
  const rare = rarestThree(ach);

  const badges = h('div', { cls: 'mr-badges' });
  for (const a of rare) {
    badges.append(h('div', { cls: 'mr-badge' },
      a.icon ? h('img', { attr: { src: a.icon, alt: '', loading: 'lazy' } }) : null,
      h('span', { text: a.name }), h('em', { text: rarity(a.rarity) })));
  }

  wrap.append(h('section', { cls: 'mr-hero' },
    h('div', { cls: 'mr-hero-in' },
      h('p', { cls: 'mr-kicker', text: t('g.mr_kicker', { name: g.name, h: hrs(g.record_hours) }) }),
      h('h1', { cls: 'mr-title', text: t('g.n_of_n', { done: num(ach.unlocked), total: num(ach.total) }) }),
      badges)));
  wrap.append(h('h2', { cls: 'mr-h', text: t('g.achievements') }), achRows('mr-list', ach.list));
  root.append(wrap);
}

/* ── Battlefield 6 - the dog tag ──────────────────────────────────────  */

function renderBf6(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'bf' });

  wrap.append(h('section', { cls: 'bf-tag' },
    h('span', { cls: 'bf-hole' }),
    h('p', { cls: 'bf-kicker', text: t('g.bf_kicker') }),
    h('h1', { cls: 'bf-title', text: g.name }),
    cells('bf-tagstats', [
      [`${hrs(g.record_hours)} h`, t('g.hours_logged_f')],
      [t('g.n_of_n', { done: num(ach.unlocked), total: num(ach.total) }), t('g.ach_unlocked')],
      [shortDate(g.last_played) || '-', t('g.last_f')],
    ])));

  wrap.append(h('h2', { cls: 'bf-h', text: t('g.achievements') }), achRows('bf-list', ach.list));
  root.append(wrap);
}

/* ── Warframe - the Codex ─────────────────────────────────────────────
   Warframe's interface is a cut-cornered gold-on-dark console, and its Codex
   is a list of entries you have personally filled in. */

function renderWarframe(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'wf' });

  wrap.append(h('header', { cls: 'wf-head' },
    h('p', { cls: 'wf-kicker', text: t('g.wf_kicker', { name: g.name, h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'wf-title', text: t('g.wf_title', { done: num(ach.unlocked), total: num(ach.total) }) }),
    fillBar('wf-bar', ach.completion),
    h('p', { cls: 'wf-sub', text: t('g.wf_sub', { pct: num(ach.completion, 1) }) })));

  const years = Object.entries(ach.by_year || {}).sort();
  if (years.length) {
    const strip = h('div', { cls: 'wf-years' });
    const top = Math.max(...years.map(([, n]) => n), 1);
    for (const [y, n] of years) {
      const col = h('div', { cls: 'wf-year' }, h('i'), h('b', { text: num(n) }), h('span', { text: y }));
      col.querySelector('i').style.height = `${(n / top) * 100}%`;
      strip.append(col);
    }
    wrap.append(h('h2', { cls: 'wf-h', text: t('g.by_year') }), strip);
  }

  wrap.append(h('h2', { cls: 'wf-h', text: t('g.rarest') }), achRows('wf-list', ach.rarest.slice(0, 10)));
  root.append(wrap);
}

/* ── Baldur's Gate 3 - the character sheet ────────────────────────────  */

function renderBg3(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'bg' });

  wrap.append(h('header', { cls: 'bg-head' },
    h('p', { cls: 'bg-kicker', text: t('g.bg_kicker', { name: g.name }) }),
    h('h1', { cls: 'bg-title', text: t('g.bg_title') })));

  wrap.append(h('section', { cls: 'bg-sheet' },
    cells('bg-scores', [
      [hrs(g.record_hours), t('g.hours')],
      [num(ach.unlocked), t('g.ach_unlocked')],
      [num(ach.total), t('g.achievements')],
      [`${num(ach.completion, 0)}%`, t('g.completion') ],
      [num(g.rank), t('g.lib_position')],
      [ach.last ? shortDate(ach.last.date) : '-', t('g.last')],
    ])));

  wrap.append(h('h2', { cls: 'bg-h', text: t('g.bg_deeds') }), achRows('bg-list', ach.list));
  root.append(wrap);
}

/* ── Delta Force - the briefing sheet ─────────────────────────────────  */

function renderDeltaForce(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'df' });

  wrap.append(h('header', { cls: 'df-head' },
    h('p', { cls: 'df-kicker', text: t('g.df_kicker') }),
    h('h1', { cls: 'df-title', text: g.name }),
    h('p', { cls: 'df-sub', text: t('g.df_sub', { h: hrs(g.record_hours), done: num(ach.unlocked), total: num(ach.total) }) })));

  const rows = [
    [t('g.hours_logged_f'), `${hrs(g.record_hours)} h`],
    [t('g.ach_unlocked'), `${num(ach.unlocked)} / ${num(ach.total)}`],
    [t('g.completion'), `${num(ach.completion, 1)}%`],
    [t('g.lib_position'), `#${num(g.rank)}`],
    [t('g.last_f'), shortDate(g.last_played) || '-'],
  ];
  const sheet = h('div', { cls: 'df-sheet' });
  for (const [k, v] of rows) {
    sheet.append(h('div', { cls: 'df-line' }, h('span', { text: k }), h('i'), h('b', { text: v })));
  }
  wrap.append(sheet);
  wrap.append(h('h2', { cls: 'df-h', text: t('g.achievements') }), achRows('df-list', ach.list));
  root.append(wrap);
}

/* ── Rainbow Six Siege - the roster board ─────────────────────────────  */

function renderR6(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'r6' });

  wrap.append(h('header', { cls: 'r6-head' },
    h('span', { cls: 'r6-slash' }),
    h('p', { cls: 'r6-kicker', text: t('g.r6_kicker', { name: g.name, h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'r6-title', text: t('g.n_of_n', { done: num(ach.unlocked), total: num(ach.total) }) })));

  const board = h('div', { cls: 'r6-board' });
  for (const a of ach.list) {
    board.append(h('article', { cls: 'r6-op' },
      a.icon ? h('img', { attr: { src: a.icon, alt: '', loading: 'lazy' } }) : null,
      h('b', { text: a.name }),
      h('em', { text: a.rarity != null ? rarity(a.rarity) : '-' })));
  }
  wrap.append(board);
  root.append(wrap);
}

/* ── Geometry Dash - the wave ─────────────────────────────────────────
   547 achievements, and the game is a line of blocks you either clear or hit.
   So the page is that line, one block each, lit where it was cleared. */

function renderGeometryDash(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'gd' });

  wrap.append(h('header', { cls: 'gd-head' },
    h('p', { cls: 'gd-kicker', text: t('g.gd_kicker', { name: g.name, h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'gd-title', text: t('g.gd_title', { done: num(ach.unlocked), total: num(ach.total) }) })));

  const line = h('div', { cls: 'gd-line' });
  const total = ach.total || ach.list.length;
  for (let i = 0; i < total; i++) {
    const on = i < ach.unlocked;
    const b = h('i', { cls: 'gd-block', data: on ? { on: '1' } : {} });
    if (on && ach.list[i]) b.title = ach.list[i].name;
    line.append(b);
  }
  wrap.append(line, h('p', { cls: 'gd-note', text: t('g.gd_note', { pct: num(ach.completion, 1) }) }));
  wrap.append(h('h2', { cls: 'gd-h', text: t('g.rarest') }), achRows('gd-list', ach.rarest.slice(0, 10)));
  root.append(wrap);
}

/* ── Cyberpunk 2077 - the reading ────────────────────────────────────
   This game names its story achievements after the tarot - The Fool, The
   Lovers, The Devil, The World, and the four kings that came with Phantom
   Liberty - and then paints those same cards on the walls of Night City as
   graffiti you go out and photograph. That is not decoration on top of the
   achievement list: it is the achievement list, already arranged by the people
   who made the game. So the page is the reading.

   Underneath it, the eight that ask for every gig and every police call in one
   district, which between them are a map of the city. Everything else is what
   Night City calls a shard, and it goes at the bottom in the order it was
   found. The tables both blocks are dealt from live in lib.js, because the
   page at /g/1091500 lays out the same two out of public.js. */

function renderCyberpunk(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'cp' });
  const held = new Map(ach.list.map((a) => [a.key, a]));
  const when = (a) => (a && a.date ? shortDate(a.date) : null);

  /* The character screen keeps two meters side by side, and both of them are
     honest here for different reasons. Street cred is the completion figure
     outright. The level meter has no ceiling to be read against - hours never
     do - so it is drawn against a hundred, which is roughly what this game and
     Phantom Liberty cost end to end, and the line under it says so rather than
     leaving a full bar to imply a finish line Steam never draws. */
  const meter = (label, value, pct, note) => h('div', { cls: 'cp-bar' },
    h('span', { cls: 'cp-bar-label', text: label }),
    h('b', { cls: 'cp-bar-val', text: value }),
    cpNotch(pct),
    h('span', { cls: 'cp-bar-note', text: note }));

  wrap.append(h('header', { cls: 'cp-hud' },
    h('p', { cls: 'cp-kicker', text: t('g.cp_kicker') }),
    h('h1', { cls: 'cp-title', text: g.name }),
    h('div', { cls: 'cp-bars' },
      meter(t('g.cp_level'), `${hrs(g.record_hours)} h`, g.record_hours,
        t('g.cp_level_note')),
      meter(t('g.cp_cred'), `${num(ach.completion, 1)}%`, ach.completion,
        t('g.cp_cred_note', { done: num(ach.unlocked), total: num(ach.total) }))),
    cells('cp-stats', [
      [g.rank != null ? `#${num(g.rank)}` : null, t('g.lib_position')],
      [ach.first ? shortDate(ach.first.date) : null, t('g.cp_first')],
      [ach.last ? shortDate(ach.last.date) : null, t('g.cp_last')],
      [ach.missing != null ? num(ach.missing) : null, t('g.cp_missing')],
    ])));

  const spread = h('div', { cls: 'cp-spread' });
  for (const [key, numeral] of CP_ARCANA) {
    const a = held.get(key) || null;
    spread.append(cpCard(numeral, a, when(a)));
  }
  wrap.append(h('h2', { cls: 'cp-h', text: t('g.cp_spread') }),
    h('p', { cls: 'cp-note', text: t('g.cp_spread_note', { n: num(CP_ARCANA.length) }) }),
    spread);

  const board = h('div', { cls: 'cp-board' });
  for (const [key, name] of CP_DISTRICTS) {
    const a = held.get(key) || null;
    board.append(cpPin(name, a, when(a)));
  }
  wrap.append(h('h2', { cls: 'cp-h', text: t('g.cp_map') }),
    h('p', { cls: 'cp-note', text: t('g.cp_map_note') }), board);

  /* What a hundred percent still costs, which is the one thing an achievement
     page usually leaves out: the api has sent the rarest and the commonest
     thing still locked with every game since the day it started counting them,
     and no page had ever spent them. On a board in Night City they are the two
     contracts nobody has taken - the one almost nobody manages, and the one
     almost everybody already has. */
  const open = [
    [t('g.cp_hardest'), ach.hardest_missing],
    [t('g.cp_easiest'), ach.easiest_missing],
  ].filter(([, a]) => a);
  if (open.length) {
    const wall = h('div', { cls: 'cp-wall' });
    for (const [label, a] of open) {
      wall.append(h('article', { cls: 'cp-contract' },
        a.icon ? h('img', { cls: 'cp-contract-art', attr: { src: a.icon, alt: '', loading: 'lazy' } })
               : h('i', { cls: 'cp-contract-art' }),
        h('div', { cls: 'cp-contract-text' },
          h('span', { cls: 'cp-contract-label', text: label }),
          h('b', { text: a.name }),
          a.description ? h('p', { text: a.description }) : null),
        h('em', { text: a.rarity != null ? rarity(a.rarity) : '-' })));
    }
    wrap.append(h('h2', { cls: 'cp-h', text: t('g.cp_wall') }), wall);
  }

  const rest = ach.list.filter((a) => !CP_NAMED.has(a.key));
  if (rest.length) {
    const shards = h('div', { cls: 'cp-shards' });
    rest.forEach((a, i) => {
      shards.append(h('article', { cls: 'cp-shard' },
        h('span', { cls: 'cp-idx', text: String(i + 1).padStart(2, '0') }),
        a.icon ? h('img', { cls: 'cp-shard-art', attr: { src: a.icon, alt: '', loading: 'lazy' } })
               : h('i', { cls: 'cp-shard-art' }),
        h('div', { cls: 'cp-shard-text' },
          h('b', { text: a.name }),
          a.description ? h('span', { text: a.description }) : null),
        h('em', { text: [when(a), a.rarity != null ? rarity(a.rarity) : null]
          .filter(Boolean).join('  ·  ') })));
    });
    wrap.append(h('h2', { cls: 'cp-h', text: t('g.cp_shards') }),
      h('p', { cls: 'cp-note', text: t('g.cp_shards_note') }), shards);
  }

  root.append(wrap);
}

/* ── Overwatch 2 - the career profile ────────────────────────────────  */

function renderOverwatch(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'ow' });

  wrap.append(h('header', { cls: 'ow-head' },
    h('p', { cls: 'ow-kicker', text: t('g.ow_kicker', { name: g.name }) }),
    h('h1', { cls: 'ow-title', text: t('g.ow_title', { done: num(ach.unlocked), total: num(ach.total) }) }),
    cells('ow-stats', [
      [`${hrs(g.record_hours)} h`, t('g.hours_logged_f')],
      [`${num(ach.completion, 1)}%`, t('g.completion')],
      [num(g.rank), t('g.lib_position')],
      [ach.last ? shortDate(ach.last.date) : '-', t('g.last')],
    ])));

  wrap.append(h('h2', { cls: 'ow-h', text: t('g.achievements') }), achRows('ow-list', ach.list));
  root.append(wrap);
}

/* ══ The rest of the hundred ═══════════════════════════════════════════
   Ranks 25–100 of the owner's library. Fifteen of these have a stat block of
   their own; the rest are built on achievements or on the clock alone. Same
   rule as everything above: the layout comes from the game, not from a grid. */

/** A labelled row list, biggest bar first. The two dozen pages below all want
 *  some version of this, and each styles it as its own through the prefix. */
function statRows(cls, rows, max) {
  const box = h('div', { cls });
  const top = max || Math.max(1, ...rows.map((r) => r.value));
  rows.forEach((r, i) => {
    box.append(h('div', { cls: `${cls}-row` },
      h('span', { cls: `${cls}-name`, text: ts(r.name) }),
      fillBar(`${cls}-bar`, (r.value / top) * 100, i * 40),
      h('b', { text: num(r.value) })));
  });
  return box;
}

/* ── Clicker Heroes - the zone counter ────────────────────────────────
   The game keeps two numbers that only mean something against each other:
   clicks, and monsters killed. Seven hundred and seventy-three of the second
   per one of the first is the genre stated as arithmetic, so it is the page. */

function renderClicker(g, root) {
  const c = g.clicker;
  const wrap = h('div', { cls: 'ch' });

  wrap.append(h('header', { cls: 'ch-head' },
    h('p', { cls: 'ch-kicker', text: t('g.ch_kicker', { h: hrs(g.record_hours) }) }),
    h('div', { cls: 'ch-zone' },
      h('span', { text: t('g.ch_zone') }), h('b', { text: num(c.zone) }))));

  wrap.append(h('section', { cls: 'ch-gap' },
    h('div', { cls: 'ch-gap-i' }, h('b', { text: num(c.clicks) }), h('span', { text: t('g.ch_clicks') })),
    h('div', { cls: 'ch-gap-x', text: '×' }),
    h('div', { cls: 'ch-gap-i' }, h('b', { text: num(c.killed) }), h('span', { text: t('g.ch_killed') }))));
  if (c.per_click) {
    wrap.append(h('p', { cls: 'ch-verdict', text: t('g.ch_verdict', { n: num(c.per_click) }) }));
  }

  if (c.rows.length) {
    wrap.append(h('h2', { cls: 'ch-h', text: t('g.ch_progress') }), statRows('ch-rows', c.rows));
  }
  root.append(wrap);
}

/* ── Infestation: The New Z - the survivor's tab ───────────────────────
   The game counts the living and the dead in separate columns, so the page is
   those two columns, and the calibres underneath the one they belong to. */

function renderInfestation(g, root) {
  const s = g.infest;
  const wrap = h('div', { cls: 'nz' });

  wrap.append(h('header', { cls: 'nz-head' },
    h('p', { cls: 'nz-kicker', text: t('g.nz_kicker', { n: num(s.characters) }) }),
    h('h1', { cls: 'nz-title', text: t('g.nz_title', { h: hrs(g.record_hours) }) }),
    cells('nz-top', [
      [num(s.kills), t('g.nz_players')],
      [num(s.zombies), t('g.nz_undead')],
      [num(s.headshots), t('g.head')],
      [num(s.streak), t('g.nz_streak')],
    ])));

  const split = h('div', { cls: 'nz-split' });
  if (s.weapons.length) {
    split.append(h('section', { cls: 'nz-col' },
      h('h2', { text: t('g.nz_by_weapon') }), statRows('nz-rows', s.weapons)));
  }
  if (s.undead.length) {
    split.append(h('section', { cls: 'nz-col' },
      h('h2', { text: t('g.nz_by_kind') }), statRows('nz-rows', s.undead)));
  }
  wrap.append(split);

  wrap.append(cells('nz-foot', [
    [num(s.gold), t('g.nz_gold')],
    [num(Math.round(s.minutes / 60)), t('g.nz_server_hours')],
    [num(s.skins), t('g.nz_skins')],
    [num(s.trades), t('g.nz_trades')],
  ]));
  root.append(wrap);
}

/* ── Unturned - the blocky stat card ──────────────────────────────────
   Unturned is made of cubes, so the page is too: everything sits in a hard
   grid with no rounded corner anywhere. It counts three separate things -
   what was killed, what was picked up, how far it was carried - and keeps the
   third split between on foot and in a vehicle, which is worth keeping. */

function renderUnturned(g, root) {
  const s = g.unturned;
  const wrap = h('div', { cls: 'unt' });

  wrap.append(h('header', { cls: 'unt-head' },
    h('p', { cls: 'unt-kicker', text: t('g.unt_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'unt-title', text: t('g.unt_title', { n: num(s.zombies) }) })));

  wrap.append(cells('unt-grid', [
    [num(s.zombies), t('g.unt_zombies')],
    [num(s.players), t('g.unt_players')],
    [num(s.deaths), t('g.deaths')],
    [num(s.headshots), t('g.head')],
  ]));

  if (s.accuracy != null) {
    wrap.append(h('section', { cls: 'unt-acc' },
      h('div', { cls: 'unt-acc-top' },
        h('b', { text: `${num(s.accuracy, 1)}%` }),
        h('span', { text: t('g.unt_accuracy', { hit: num(s.hits), shot: num(s.shots) }) })),
      fillBar('unt-acc-bar', s.accuracy)));
  }

  // Two ways of covering ground, drawn as one bar so the ratio is the point.
  const far = s.foot_km + s.vehicle_km;
  if (far > 0) {
    const bar = h('div', { cls: 'unt-travel' });
    const onfoot = h('i', { data: { how: 'foot' } });
    onfoot.style.width = `${(s.foot_km / far) * 100}%`;
    const driven = h('i', { data: { how: 'vehicle' } });
    driven.style.width = `${(s.vehicle_km / far) * 100}%`;
    bar.append(onfoot, driven);
    wrap.append(h('h2', { cls: 'unt-h', text: t('g.unt_travelled') }), bar,
      h('div', { cls: 'unt-legend' },
        h('span', { data: { how: 'foot' } }, h('i'), h('em', { text: t('g.unt_on_foot', { km: num(s.foot_km, 1) }) })),
        h('span', { data: { how: 'vehicle' } }, h('i'), h('em', { text: t('g.unt_by_vehicle', { km: num(s.vehicle_km, 1) }) }))));
  }

  if (s.found.length) {
    wrap.append(h('h2', { cls: 'unt-h', text: t('g.unt_found') }), statRows('unt-rows', s.found));
  }
  root.append(wrap);
}

/* ── Insurgency - the two modes ───────────────────────────────────────
   Insurgency keeps every counter twice, once against people and once against
   bots, and the game itself never adds them up on screen without saying which
   is which. The page is that split: one column each, mirrored, and the side
   that was actually played marked rather than merely implied. */

function renderInsurgency(g, root) {
  const s = g.insurgency;
  const wrap = h('div', { cls: 'ins' });

  wrap.append(h('header', { cls: 'ins-head' },
    h('p', { cls: 'ins-kicker', text: t('g.ins_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'ins-title', text: t('g.ins_title', { n: num(s.kills) }) })));

  const ROWS = [
    ['kills', t('g.kills')], ['captures', t('g.ins_captures')],
    ['mvps', t('g.ins_mvps')], ['hero', t('g.ins_hero')],
  ];
  const table = h('div', { cls: 'ins-table' });
  table.append(h('div', { cls: 'ins-thead' },
    h('span', {}),
    h('b', { data: s.side === 'versus' ? { on: '1' } : {}, text: t('g.ins_versus') }),
    h('b', { data: s.side === 'coop' ? { on: '1' } : {}, text: t('g.ins_coop') })));
  for (const [key, label] of ROWS) {
    const a = s.versus[key], b = s.coop[key];
    const top = Math.max(1, a, b);
    table.append(h('div', { cls: 'ins-row' },
      h('span', { cls: 'ins-row-name', text: label }),
      h('div', { cls: 'ins-cell' }, h('b', { text: num(a) }), fillBar('ins-cell-bar', (a / top) * 100)),
      h('div', { cls: 'ins-cell' }, h('b', { text: num(b) }), fillBar('ins-cell-bar', (b / top) * 100))));
  }
  wrap.append(table);
  wrap.append(h('p', { cls: 'ins-note', text: t('g.ins_note') }));
  root.append(wrap);
}

/* ── The Mighty Quest For Epic Loot - the two castles ──────────────────
   You raid other people's castles and you build your own, and the game keeps
   the two apart. The raids are also split by whether the castle outranked you,
   which is the only difficulty rating this stat block has. */

function renderMightyQuest(g, root) {
  const s = g.mquest;
  const wrap = h('div', { cls: 'mq' });

  wrap.append(h('header', { cls: 'mq-head' },
    h('p', { cls: 'mq-kicker', text: t('g.mq_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'mq-title', text: t('g.mq_title', { n: num(s.castles.total) }) })));

  const tiers = [
    ['higher', t('g.mq_higher')], ['same', t('g.mq_same')], ['lower', t('g.mq_lower')],
  ];
  const keep = h('div', { cls: 'mq-tiers' });
  for (const [key, label] of tiers) {
    keep.append(h('div', { cls: 'mq-tier', data: { tier: key } },
      h('b', { text: num(s.castles[key]) }), h('span', { text: label })));
  }
  wrap.append(keep);

  wrap.append(cells('mq-side', [
    [num(s.streak), t('g.mq_streak')],
    [num(s.gold), t('g.mq_gold')],
    [num(s.own.rooms), t('g.mq_rooms')],
    [num(s.own.creatures), t('g.mq_garrison')],
  ]));

  if (s.rows.length) {
    wrap.append(h('h2', { cls: 'mq-h', text: t('g.mq_tally') }), statRows('mq-rows', s.rows));
  }
  root.append(wrap);
}

/* ── Arma Reforger - the debrief line ─────────────────────────────────
   Three counters, named the way a debrief names them. Two are what was done
   and one is what was done back, so the page sets them against each other. */

function renderReforger(g, root) {
  const s = g.reforger;
  const wrap = h('div', { cls: 'rf' });

  wrap.append(h('header', { cls: 'rf-head' },
    h('p', { cls: 'rf-kicker', text: t('g.rf_kicker') }),
    h('h1', { cls: 'rf-title', text: t('g.rf_title', { h: hrs(g.record_hours) }) })));

  const line = h('dl', { cls: 'rf-line' });
  const rows = [
    [t('g.rf_neutralized'), num(s.neutralized)],
    [t('g.rf_vehicles'), num(s.vehicles)],
    [t('g.rf_killed'), num(s.deaths)],
  ];
  if (s.ratio != null) rows.push([t('g.rf_ratio'), num(s.ratio, 2)]);
  for (const [k, v] of rows) line.append(h('dt', { text: k }), h('dd', { text: v }));
  wrap.append(line);
  wrap.append(h('p', { cls: 'rf-note', text: t('g.rf_note') }));
  root.append(wrap);
}

/* ── Insurgency: Sandstorm - two counters, stated as two ───────────────
   The game exposes exactly two numbers. Padding that out into a dashboard
   would be dressing; the page prints them at the size they deserve. */

function renderSandstorm(g, root) {
  const s = g.sandstorm;
  const wrap = h('div', { cls: 'sst' });

  wrap.append(h('header', { cls: 'sst-head' },
    h('p', { cls: 'sst-kicker', text: t('g.sst_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'sst-title', text: t('g.sst_title') })));

  wrap.append(h('div', { cls: 'sst-pair' },
    h('div', { cls: 'sst-one' }, h('b', { text: num(s.captures) }), h('span', { text: t('g.sst_captures') })),
    h('div', { cls: 'sst-one' }, h('b', { text: num(s.calls) }), h('span', { text: t('g.sst_calls') }))));
  wrap.append(h('p', { cls: 'sst-note', text: t('g.sst_note') }));
  root.append(wrap);
}

/* ── Cats - one number ────────────────────────────────────────────────
   The game is clicking a cat. There is one counter and it is the whole game,
   so the page is that counter at the size of the screen, and the two divisions
   that turn it into something a person can picture. */

function renderCats(g, root) {
  const s = g.cats;
  const wrap = h('div', { cls: 'cts' });

  wrap.append(h('p', { cls: 'cts-kicker', text: t('g.cts_kicker', { h: hrs(g.record_hours) }) }));
  wrap.append(h('b', { cls: 'cts-big', text: num(s.clicks) }));
  wrap.append(h('p', { cls: 'cts-label', text: t('g.cts_clicks') }));

  const rate = [];
  if (s.per_hour) rate.push([num(s.per_hour), t('g.cts_per_hour')]);
  if (s.per_minute) rate.push([num(s.per_minute, 1), t('g.cts_per_minute')]);
  if (rate.length) wrap.append(cells('cts-rate', rate));
  wrap.append(h('p', { cls: 'cts-note', text: t('g.cts_note') }));
  root.append(wrap);
}

/* ── Spec Ops: The Line - the campaign, and the multiplayer nobody asked
   for. Steam keeps stats only for the latter, and there are eight of them
   totalling three kills. The page is honest about that: the achievements are
   the campaign, and the stat block is shown as the footnote it is. */

function renderSpecOps(g, root) {
  const ach = g.achievements;
  const s = g.specops;
  const wrap = h('div', { cls: 'spo' });

  wrap.append(h('header', { cls: 'spo-head' },
    h('p', { cls: 'spo-kicker', text: t('g.spo_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'spo-title', text: ach
      ? t('g.spo_title', { done: num(ach.unlocked), total: num(ach.total) })
      : t('g.spo_title_bare') })));

  if (ach && ach.unlocked) {
    wrap.append(fillBar('spo-bar', ach.completion));
    wrap.append(h('h2', { cls: 'spo-h', text: t('g.rarest') }), achRows('spo-list', ach.rarest.slice(0, 10)));
  }

  if (s) {
    wrap.append(h('h2', { cls: 'spo-h', text: t('g.spo_mp') }),
      cells('spo-mp', [
        [num(s.kills), t('g.kills')], [num(s.deaths), t('g.deaths')],
        [num(s.level), t('g.spo_level')], [num(s.streak), t('g.spo_streak')],
      ]),
      h('p', { cls: 'spo-note', text: t('g.spo_note') }));
  }
  root.append(wrap);
}

/* ── Besiege - the tally a siege engine is judged on ───────────────────  */

function renderBesiege(g, root) {
  const s = g.besiege;
  const wrap = h('div', { cls: 'bsg' });

  wrap.append(h('header', { cls: 'bsg-head' },
    h('p', { cls: 'bsg-kicker', text: t('g.bsg_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'bsg-title', text: t('g.bsg_title', { n: num(s.killed) }) })));

  wrap.append(cells('bsg-cells', [
    [num(s.killed), t('g.bsg_killed')],
    [num(s.secondaries), t('g.bsg_secondaries')],
    s.ips ? [num(s.ips), t('g.bsg_ips')] : null,
  ].filter(Boolean)));
  wrap.append(h('p', { cls: 'bsg-note', text: t('g.bsg_note') }));
  root.append(wrap);
}

/* ── Tribal Wars - the village report ─────────────────────────────────
   A browser game that arrived on Steam, and it reports like one: a points
   total at the top and a list of what the village did underneath. */

function renderTribalWars(g, root) {
  const s = g.tribal;
  const wrap = h('div', { cls: 'twr' });

  wrap.append(h('header', { cls: 'twr-head' },
    h('p', { cls: 'twr-kicker', text: t('g.twr_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'twr-title', text: t('g.twr_title', { n: num(s.points) }) })));
  wrap.append(statRows('twr-rows', s.rows));
  root.append(wrap);
}

/* ── The Forest - the survival log ────────────────────────────────────
   Eighteen days survived, and the game keeps a count of the cannibalism on
   those days. That is its own joke and the page does not quietly drop it. */

function renderForest(g, root) {
  const s = g.forest;
  const wrap = h('div', { cls: 'frs' });

  wrap.append(h('header', { cls: 'frs-head' },
    h('p', { cls: 'frs-kicker', text: t('g.frs_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'frs-title' },
      h('b', { text: num(s.days) }), h('em', { text: t('g.frs_days') }))));

  wrap.append(cells('frs-cells', [
    [num(s.days), t('g.frs_survived')],
    [num(s.peaceful), t('g.frs_peaceful')],
    s.cannibalism ? [num(s.cannibalism), t('g.frs_cannibalism')] : null,
  ].filter(Boolean)));

  if (s.rows.length) {
    wrap.append(h('h2', { cls: 'frs-h', text: t('g.frs_log') }), statRows('frs-rows', s.rows));
  }
  root.append(wrap);
}

/* ── GeoGuessr - the duel scoreline ───────────────────────────────────
   Two counters, and the second is a subset of the first: duels won, and duels
   won without dropping a round. The relation is the page. */

function renderGeoguessr(g, root) {
  const s = g.geoguessr;
  const wrap = h('div', { cls: 'geo' });

  wrap.append(h('header', { cls: 'geo-head' },
    h('p', { cls: 'geo-kicker', text: t('g.geo_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'geo-title', text: t('g.geo_title', { n: num(s.wins) }) })));

  const ring = h('div', { cls: 'geo-ring' });
  ring.style.setProperty('--pct', `${s.share || 0}%`);
  ring.append(h('b', { text: `${num(s.share, 1)}%` }), h('span', { text: t('g.geo_flawless_share') }));
  wrap.append(h('section', { cls: 'geo-body' }, ring,
    cells('geo-cells', [
      [num(s.wins), t('g.geo_wins')],
      [num(s.flawless), t('g.geo_flawless')],
    ])));
  wrap.append(h('p', { cls: 'geo-note', text: t('g.geo_note') }));
  root.append(wrap);
}

/* ── Strife - the win column ──────────────────────────────────────────
   Thirteen games, six of them won, spread across five heroes. Small numbers,
   but exact ones, so the page draws them one hero at a time rather than
   rounding them into a rate and losing what actually happened. */

function renderStrife(g, root) {
  const s = g.strife;
  const wrap = h('div', { cls: 'stf' });

  wrap.append(h('header', { cls: 'stf-head' },
    h('p', { cls: 'stf-kicker', text: t('g.stf_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'stf-title', text: t('g.stf_title', { w: num(s.wins), l: num(s.losses) }) })));

  const bar = h('div', { cls: 'stf-bar' });
  const won = h('i', { data: { side: 'w' } });
  won.style.width = `${s.played ? (s.wins / s.played) * 100 : 0}%`;
  const lost = h('i', { data: { side: 'l' } });
  lost.style.width = `${s.played ? (s.losses / s.played) * 100 : 0}%`;
  bar.append(won, lost);
  wrap.append(bar, h('p', { cls: 'stf-rate', text: t('g.stf_rate', { pct: num(s.winrate, 1), n: num(s.played) }) }));

  if (s.heroes.length) {
    const list = h('div', { cls: 'stf-heroes' });
    for (const hero of s.heroes) {
      list.append(h('div', { cls: 'stf-hero' },
        h('b', { text: hero.name }),
        h('span', { text: t('g.stf_hero_wins', { n: num(hero.value) }) })));
    }
    wrap.append(h('h2', { cls: 'stf-h', text: t('g.stf_by_hero') }), list);
  }
  root.append(wrap);
}

/* ── Business Tour - the deed ─────────────────────────────────────────
   Monopoly with the serial numbers filed off, so the page is a property deed:
   the board's own laps and monopolies, printed on card. */

function renderBusinessTour(g, root) {
  const s = g.biztour;
  const wrap = h('div', { cls: 'biz' });

  wrap.append(h('article', { cls: 'biz-deed' },
    h('p', { cls: 'biz-kicker', text: t('g.biz_kicker') }),
    h('h1', { cls: 'biz-title', text: t('g.biz_title', { n: num(s.wins) }) }),
    h('p', { cls: 'biz-sub', text: t('g.biz_sub', { h: hrs(g.record_hours) }) })));
  wrap.append(statRows('biz-rows', s.rows));
  root.append(wrap);
}

/* ── Red Dead Redemption 2 - the journal ──────────────────────────────
   RDR2's stat block is forty-three counters named AchievementStat_1…43, and
   most of them freeze at the threshold that unlocked the achievement they were
   tracking. So the page is the journal: the achievements themselves, in the
   order they happened, and a line saying where a stats page would have gone. */

function renderRdr2(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'rdr' });

  wrap.append(h('header', { cls: 'rdr-head' },
    h('p', { cls: 'rdr-kicker', text: t('g.rdr_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'rdr-title', text: t('g.rdr_title', { done: num(ach.unlocked), total: num(ach.total) }) })));

  const journal = h('div', { cls: 'rdr-journal' });
  ach.list.forEach((a) => {
    journal.append(h('article', { cls: 'rdr-entry' },
      a.icon ? h('img', { attr: { src: a.icon, alt: '', loading: 'lazy' } }) : h('i'),
      h('div', {},
        h('b', { text: a.name }),
        a.description ? h('p', { text: a.description }) : null,
        h('span', { cls: 'rdr-meta',
          text: [shortDate(a.date), a.rarity != null ? rarity(a.rarity) : null]
            .filter(Boolean).join('  ·  ') }))));
  });
  wrap.append(journal);
  if (g.counters_note) wrap.append(h('p', { cls: 'rdr-note', text: ts(g.counters_note) }));
  root.append(wrap);
}

/* ── Dying Light - day and night ──────────────────────────────────────
   Same story as Red Dead: the stat block is ACH_10_PROGRESS…ACH_53_PROGRESS
   and says nothing on its own. The page is built on the achievements, split
   down the middle the way the game splits its clock. */

function renderDyingLight(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'dyl' });

  wrap.append(h('header', { cls: 'dyl-head' },
    h('p', { cls: 'dyl-kicker', text: t('g.dyl_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'dyl-title', text: t('g.dyl_title', { done: num(ach.unlocked), total: num(ach.total) }) }),
    cells('dyl-cells', [
      [`${num(ach.completion, 1)}%`, t('g.completion')],
      [ach.first ? shortDate(ach.first.date) : '-', t('g.first')],
      [ach.last ? shortDate(ach.last.date) : '-', t('g.last')],
    ])));

  wrap.append(h('h2', { cls: 'dyl-h', text: t('g.rarest') }), achRows('dyl-list', ach.rarest.slice(0, 10)));
  if (g.counters_note) wrap.append(h('p', { cls: 'dyl-note', text: ts(g.counters_note) }));
  root.append(wrap);
}

/* ── Eighteen built on their achievements ─────────────────────────────
   These publish no stat block at all, so the achievement list is the whole
   record. What differs between them is what that list is drawn as. */

/** Header, bar, and the counters every one of these wants. The shape is shared
 *  because the data is; the palette and the lettering are not. */
function achHead(cls, g, kicker, title) {
  const ach = g.achievements;
  return h('header', { cls: `${cls}-head` },
    h('p', { cls: `${cls}-kicker`, text: kicker }),
    h('h1', { cls: `${cls}-title`, text: title }),
    cells(`${cls}-cells`, [
      [`${num(ach.unlocked)}/${num(ach.total)}`, t('g.achievements')],
      [`${num(ach.completion, 1)}%`, t('g.completion')],
      [ach.first ? shortDate(ach.first.date) : '-', t('g.first')],
      [ach.last ? shortDate(ach.last.date) : '-', t('g.last')],
    ]));
}

/* ── Banana - the one that was clicked once ───────────────────────────
   Fifty hours, and exactly one of the seventy-six ever fired. The empty
   squares are not a gap in this page; they are what the page is about. */

function renderBanana(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'ban' });

  wrap.append(h('header', { cls: 'ban-head' },
    h('p', { cls: 'ban-kicker', text: t('g.ban_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'ban-title', text: t('g.ban_title', { done: num(ach.unlocked), total: num(ach.total) }) })));

  const peel = h('div', { cls: 'ban-peel' });
  for (let i = 0; i < ach.total; i++) {
    const on = i < ach.unlocked;
    peel.append(h('i', { cls: 'ban-slot', data: on ? { on: '1' } : {} }));
  }
  wrap.append(peel);
  wrap.append(h('p', { cls: 'ban-note', text: t('g.ban_note') }));
  if (ach.unlocked) wrap.append(achRows('ban-list', ach.list));
  root.append(wrap);
}

/* ── Sea of Thieves - the captain's log ───────────────────────────────
   The game's own record is a book of voyages, so this is a book: entries
   ruled off from one another, oldest first, the way a log is written. */

function renderSeaOfThieves(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'sot' });

  wrap.append(achHead('sot', g,
    t('g.sot_kicker', { h: hrs(g.record_hours) }),
    t('g.sot_title', { done: num(ach.unlocked), total: num(ach.total) })));

  const log = h('div', { cls: 'sot-log' });
  ach.list.forEach((a, i) => {
    log.append(h('article', { cls: 'sot-entry' },
      h('span', { cls: 'sot-no', text: String(i + 1).padStart(3, '0') }),
      h('div', {},
        h('b', { text: a.name }),
        a.description ? h('p', { text: a.description }) : null),
      h('em', { text: shortDate(a.date) || '-' })));
  });
  wrap.append(h('h2', { cls: 'sot-h', text: t('g.sot_log') }), log);
  root.append(wrap);
}

/* ── Phasmophobia - the ghost journal ─────────────────────────────────
   Read on a green screen in a dark house, which is most of the game. */

function renderPhasmophobia(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'phm' });

  wrap.append(achHead('phm', g,
    t('g.phm_kicker', { h: hrs(g.record_hours) }),
    t('g.phm_title', { done: num(ach.unlocked), total: num(ach.total) })));

  wrap.append(h('h2', { cls: 'phm-h', text: t('g.phm_evidence') }), achRows('phm-list', ach.list));
  wrap.append(h('p', { cls: 'phm-note', text: t('g.phm_note', { n: num(ach.total - ach.unlocked) }) }));
  root.append(wrap);
}

/* ── Sniper Elite V2 - the killcam ────────────────────────────────────
   One shot, held in the air. The page is built around the rarest unlock the
   way the game is built around the one bullet it slows down for. */

function renderSniperElite(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'se2' });
  const rare = ach.rarest.find((a) => a.rarity != null) || ach.rarest[0];

  wrap.append(h('header', { cls: 'se2-head' },
    h('p', { cls: 'se2-kicker', text: t('g.se2_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'se2-title', text: t('g.se2_title', { done: num(ach.unlocked), total: num(ach.total) }) })));

  if (rare) {
    wrap.append(h('section', { cls: 'se2-shot' },
      rare.icon ? h('img', { attr: { src: rare.icon, alt: '', loading: 'eager' } }) : null,
      h('div', {},
        h('span', { cls: 'se2-shot-tag', text: t('g.se2_rarest') }),
        h('b', { text: rare.name }),
        rare.description ? h('p', { text: rare.description }) : null,
        h('em', { text: rare.rarity != null ? t('g.of_accounts', { pct: rarity(rare.rarity) }) : '-' }))));
  }
  wrap.append(fillBar('se2-bar', ach.completion));
  wrap.append(h('h2', { cls: 'se2-h', text: t('g.achievements') }), achRows('se2-list', ach.list));
  root.append(wrap);
}

/* ── Egg Surprise - the only complete set on the profile ──────────────
   Eighteen of eighteen. Nothing else in this hundred is finished, so the page
   is allowed to be about exactly that and nothing else. */

function renderEggSurprise(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'egg' });
  const done = ach.total > 0 && ach.unlocked === ach.total;

  wrap.append(h('header', { cls: 'egg-head' },
    h('p', { cls: 'egg-kicker', text: t('g.egg_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'egg-title', text: done
      ? t('g.egg_title_done', { total: num(ach.total) })
      : t('g.egg_title', { done: num(ach.unlocked), total: num(ach.total) }) })));

  if (done) wrap.append(h('p', { cls: 'egg-stamp', text: t('g.egg_stamp') }));

  const grid = h('div', { cls: 'egg-grid' });
  for (const a of ach.list) {
    grid.append(h('div', { cls: 'egg-one' },
      a.icon ? h('img', { attr: { src: a.icon, alt: '', loading: 'lazy' } }) : h('i'),
      h('b', { text: a.name }),
      h('span', { text: shortDate(a.date) || '' })));
  }
  wrap.append(grid);
  root.append(wrap);
}

/* ── AdVenture Capitalist - the ledger ────────────────────────────────  */

function renderAdVenture(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'avc' });

  wrap.append(achHead('avc', g,
    t('g.avc_kicker', { h: hrs(g.record_hours) }),
    t('g.avc_title', { done: num(ach.unlocked), total: num(ach.total) })));

  const ledger = h('div', { cls: 'avc-ledger' });
  ach.list.forEach((a, i) => {
    ledger.append(h('div', { cls: 'avc-line' },
      h('span', { cls: 'avc-line-no', text: String(i + 1).padStart(2, '0') }),
      h('b', { text: a.name }),
      h('em', { text: shortDate(a.date) || '-' })));
  });
  wrap.append(h('h2', { cls: 'avc-h', text: t('g.avc_ledger') }), ledger);
  root.append(wrap);
}

/* ── Police Simulator: Patrol Officers - the shift report ─────────────  */

function renderPoliceSim(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'pol' });

  wrap.append(h('article', { cls: 'pol-form' },
    h('p', { cls: 'pol-kicker', text: t('g.pol_kicker') }),
    h('h1', { cls: 'pol-title', text: t('g.pol_title', { done: num(ach.unlocked), total: num(ach.total) }) }),
    h('dl', { cls: 'pol-fields' },
      h('dt', { text: t('g.pol_on_duty') }), h('dd', { text: `${hrs(g.record_hours)} h` }),
      h('dt', { text: t('g.completion') }), h('dd', { text: `${num(ach.completion, 1)}%` }),
      h('dt', { text: t('g.pol_first_shift') }), h('dd', { text: ach.first ? shortDate(ach.first.date) : '-' }),
      h('dt', { text: t('g.pol_last_shift') }), h('dd', { text: ach.last ? shortDate(ach.last.date) : '-' }))));

  wrap.append(h('h2', { cls: 'pol-h', text: t('g.pol_citations') }), achRows('pol-list', ach.list));
  root.append(wrap);
}

/* ── shapez - the blueprint ───────────────────────────────────────────
   A factory game drawn on graph paper: the achievements are laid out on a
   grid because the game is a grid, and the unbuilt cells stay visible. */

function renderShapez(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'shz' });

  wrap.append(h('header', { cls: 'shz-head' },
    h('p', { cls: 'shz-kicker', text: t('g.shz_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'shz-title', text: t('g.shz_title', { done: num(ach.unlocked), total: num(ach.total) }) })));

  const grid = h('div', { cls: 'shz-grid' });
  for (let i = 0; i < ach.total; i++) {
    const a = ach.list[i];
    const cell = h('div', { cls: 'shz-cell', data: a ? { on: '1' } : {} });
    if (a) {
      cell.append(a.icon ? h('img', { attr: { src: a.icon, alt: '', loading: 'lazy' } }) : h('i'));
      cell.title = a.name;
    }
    grid.append(cell);
  }
  wrap.append(grid);
  wrap.append(h('p', { cls: 'shz-note', text: t('g.shz_note', { n: num(ach.total - ach.unlocked) }) }));
  wrap.append(h('h2', { cls: 'shz-h', text: t('g.rarest') }), achRows('shz-list', ach.rarest.slice(0, 8)));
  root.append(wrap);
}

/* ── Vampire Survivors - the collection ───────────────────────────────
   243 entries and 84 held. The game's own screen is a wall of small squares
   that fill in, so this is that wall, and the year strip a set this size earns. */

function renderVampireSurvivors(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'vsv' });

  wrap.append(h('header', { cls: 'vsv-head' },
    h('p', { cls: 'vsv-kicker', text: t('g.vsv_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'vsv-title', text: t('g.vsv_title', { done: num(ach.unlocked), total: num(ach.total) }) }),
    fillBar('vsv-bar', ach.completion)));

  const wall = h('div', { cls: 'vsv-wall' });
  for (let i = 0; i < ach.total; i++) {
    const a = ach.list[i];
    const cell = h('i', { cls: 'vsv-cell', data: a ? { on: '1' } : {} });
    if (a) cell.title = a.name;
    wall.append(cell);
  }
  wrap.append(wall);

  const years = Object.entries(ach.by_year || {});
  if (years.length > 1) {
    const strip = h('div', { cls: 'vsv-years' });
    const max = Math.max(...years.map(([, n]) => n));
    years.forEach(([year, n], i) => {
      strip.append(h('div', { cls: 'vsv-year' },
        h('span', { text: year }), fillBar('vsv-year-bar', (n / max) * 100, i * 40), h('b', { text: num(n) })));
    });
    wrap.append(h('h2', { cls: 'vsv-h', text: t('g.when_unlocked') }), strip);
  }
  wrap.append(h('h2', { cls: 'vsv-h', text: t('g.rarest') }), achRows('vsv-list', ach.rarest.slice(0, 8)));
  root.append(wrap);
}

/* ── Paladins - the champion card ─────────────────────────────────────  */

function renderPaladins(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'pal' });

  wrap.append(achHead('pal', g,
    t('g.pal_kicker', { h: hrs(g.record_hours) }),
    t('g.pal_title', { done: num(ach.unlocked), total: num(ach.total) })));
  wrap.append(h('h2', { cls: 'pal-h', text: t('g.rarest') }), achRows('pal-list', ach.rarest.slice(0, 10)));
  root.append(wrap);
}

/* ── Brawlhalla - the roster board ────────────────────────────────────  */

function renderBrawlhalla(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'brw' });

  wrap.append(h('header', { cls: 'brw-head' },
    h('p', { cls: 'brw-kicker', text: t('g.brw_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'brw-title', text: t('g.brw_title', { done: num(ach.unlocked), total: num(ach.total) }) })));

  const board = h('div', { cls: 'brw-board' });
  for (const a of ach.list) {
    board.append(h('article', { cls: 'brw-slot' },
      a.icon ? h('img', { attr: { src: a.icon, alt: '', loading: 'lazy' } }) : h('i'),
      h('b', { text: a.name }),
      h('em', { text: a.rarity != null ? rarity(a.rarity) : '-' })));
  }
  wrap.append(board);
  root.append(wrap);
}

/* ── Yakuza Kiwami - the Tojo Clan chart ──────────────────────────────
   The most Yakuza object there is: the family tree. Kiwami's whole plot is a
   succession - who is owed the chair, who took the ten billion yen - and the
   series draws that as a chart of men in descending rank under a gold clan
   crest. So the page is the chart: the completion sits inside the crest the
   way a kamon carries the family, and each unlock is a name on the roster,
   numbered, in the order it was earned. Black lacquer and gold leaf. */

function renderYakuzaKiwami(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'ykw' });

  wrap.append(h('header', { cls: 'ykw-head' },
    h('div', { cls: 'ykw-crest' },
      h('i', { cls: 'ykw-crest-out' }),
      h('i', { cls: 'ykw-crest-in' }),
      h('b', { text: `${num(ach.completion, 1)}%` }),
      h('span', { text: t('g.ykw_completion') })),
    h('div', { cls: 'ykw-head-text' },
      h('p', { cls: 'ykw-kicker', text: t('g.ykw_kicker', { h: hrs(g.record_hours) }) }),
      h('h1', { cls: 'ykw-title', text: t('g.ykw_title') }),
      h('p', { cls: 'ykw-sub', text: t('g.ykw_sub', { done: num(ach.unlocked), total: num(ach.total) }) }))));

  const roster = h('ol', { cls: 'ykw-roster' });
  ach.list.forEach((a, i) => {
    roster.append(h('li', { cls: 'ykw-member' },
      h('span', { cls: 'ykw-rank', text: String(i + 1).padStart(2, '0') }),
      a.icon ? h('img', { attr: { src: a.icon, alt: '', loading: 'lazy' } })
             : h('i', { cls: 'ykw-seal' }),
      h('div', { cls: 'ykw-member-text' },
        h('b', { text: a.name }),
        a.description ? h('span', { text: a.description }) : null),
      h('em', { text: shortDate(a.date) || '-' })));
  });
  wrap.append(h('h2', { cls: 'ykw-h', text: t('g.ykw_roster') }), roster);
  root.append(wrap);
}

/* ── Warhammer: Vermintide 2 - the tome ───────────────────────────────  */

function renderVermintide(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'vt2' });

  wrap.append(achHead('vt2', g,
    t('g.vt2_kicker', { h: hrs(g.record_hours) }),
    t('g.vt2_title', { done: num(ach.unlocked), total: num(ach.total) })));
  wrap.append(h('h2', { cls: 'vt2-h', text: t('g.vt2_deeds') }), achRows('vt2-list', ach.list));
  root.append(wrap);
}

/* ── Fall Guys - the crown ────────────────────────────────────────────  */

function renderFallGuys(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'fg' });

  wrap.append(h('header', { cls: 'fg-head' },
    h('p', { cls: 'fg-kicker', text: t('g.fg_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'fg-title', text: t('g.fg_title', { done: num(ach.unlocked), total: num(ach.total) }) }),
    h('p', { cls: 'fg-sub', text: t('g.fg_sub', { pct: num(ach.completion, 1) }) })));

  const round = h('div', { cls: 'fg-round' });
  for (const a of ach.list) {
    round.append(h('div', { cls: 'fg-bean' },
      a.icon ? h('img', { attr: { src: a.icon, alt: '', loading: 'lazy' } }) : h('i'),
      h('b', { text: a.name })));
  }
  wrap.append(round);
  root.append(wrap);
}

/* ── Yakuza 0 - Kamurocho at night, and the heat gauge ────────────────
   Zero is the bubble-era one: 1988, money physically flying out of people,
   and a street wall of vertical neon signboards stacked up the side of every
   building. So the achievements are those signs, set vertically, glowing.

   Above them is the heat gauge - the red bar the series has filled before
   every heat action since the first game - holding the completion, because
   that is the one meter Yakuza actually puts on screen. */

function renderYakuza0(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'yk0' });

  wrap.append(h('header', { cls: 'yk0-head' },
    h('p', { cls: 'yk0-kicker', text: t('g.yk0_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'yk0-title', text: t('g.yk0_title', { done: num(ach.unlocked), total: num(ach.total) }) })));

  wrap.append(h('div', { cls: 'yk0-heat' },
    h('span', { cls: 'yk0-heat-label', text: t('g.yk0_heat') }),
    fillBar('yk0-heat-bar', ach.completion),
    h('b', { text: `${num(ach.completion, 1)}%` })));

  const street = h('div', { cls: 'yk0-street' });
  ach.list.forEach((a, i) => {
    const sign = h('article', { cls: 'yk0-sign', data: { lit: String(i % 3) } },
      h('b', { cls: 'yk0-sign-name', text: a.name }),
      h('span', { cls: 'yk0-sign-date', text: shortDate(a.date) || '' }));
    if (a.description) sign.title = a.description;
    street.append(sign);
  });
  wrap.append(h('h2', { cls: 'yk0-h', text: t('g.yk0_street') }), street);
  root.append(wrap);
}

/* ── Outlast - the camcorder ──────────────────────────────────────────
   The whole game is watched through a handheld with a battery running down,
   so the page is that viewfinder: night-vision green, and a battery bar that
   reads the completion because that is the only meter this game respects. */

function renderOutlast(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'otl' });

  wrap.append(h('header', { cls: 'otl-head' },
    h('div', { cls: 'otl-rec' }, h('i'), h('span', { text: 'REC' })),
    h('p', { cls: 'otl-kicker', text: t('g.otl_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'otl-title', text: t('g.otl_title', { done: num(ach.unlocked), total: num(ach.total) }) })));

  wrap.append(h('div', { cls: 'otl-batt' },
    h('span', { text: t('g.otl_battery') }), fillBar('otl-batt-bar', ach.completion),
    h('b', { text: `${num(ach.completion, 1)}%` })));

  wrap.append(h('h2', { cls: 'otl-h', text: t('g.otl_footage') }), achRows('otl-list', ach.list));
  root.append(wrap);
}

/* ── Yakuza 0 Director's Cut - the karaoke screen ─────────────────────
   The third Yakuza page on this profile needed to be Yakuza without being
   Kamurocho a second time, and the series hands you the answer: karaoke. It
   is the minigame everyone remembers, and its screen is already a list -
   lyrics coming up one line at a time over a timing bar, under a spotlight.

   So each unlock is a line of the song, the bar is the completion, and the
   note about this being the same game twice sits where the track title goes,
   because that is the honest thing to say about a re-release and this page
   has room to say it. */

function renderYakuza0Dc(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'y0d' });

  wrap.append(h('section', { cls: 'y0d-stage' },
    h('i', { cls: 'y0d-spot' }),
    h('div', { cls: 'y0d-plate' },
      h('p', { cls: 'y0d-kicker', text: t('g.y0d_kicker') }),
      h('h1', { cls: 'y0d-title', text: t('g.y0d_title', { done: num(ach.unlocked), total: num(ach.total) }) }),
      h('p', { cls: 'y0d-sub', text: t('g.y0d_sub', { h: hrs(g.record_hours) }) }))));

  wrap.append(h('div', { cls: 'y0d-timing' },
    h('span', { text: t('g.y0d_track') }),
    fillBar('y0d-timing-bar', ach.completion),
    h('b', { text: `${num(ach.completion, 1)}%` })));

  const lyrics = h('div', { cls: 'y0d-lyrics' });
  ach.list.forEach((a) => {
    lyrics.append(h('p', { cls: 'y0d-line' },
      h('i', { cls: 'y0d-note' }),
      h('b', { text: a.name }),
      a.description ? h('span', { text: a.description }) : null,
      h('em', { text: shortDate(a.date) || '' })));
  });
  wrap.append(h('h2', { cls: 'y0d-h', text: t('g.y0d_stage_h') }), lyrics);
  wrap.append(h('p', { cls: 'y0d-note-text', text: t('g.y0d_note') }));
  root.append(wrap);
}

/* ── Tap Ninja - the scroll ───────────────────────────────────────────  */

function renderTapNinja(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'tpn' });

  wrap.append(h('header', { cls: 'tpn-head' },
    h('p', { cls: 'tpn-kicker', text: t('g.tpn_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'tpn-title', text: t('g.tpn_title', { done: num(ach.unlocked), total: num(ach.total) }) }),
    fillBar('tpn-bar', ach.completion)));

  wrap.append(h('h2', { cls: 'tpn-h', text: t('g.rarest') }), achRows('tpn-list', ach.rarest.slice(0, 10)));
  root.append(wrap);
}

/* ══ The last thirty-nine ══════════════════════════════════════════════
   These publish nothing: no stat block, and either no achievement set at all
   or one that was never opened. There is exactly one number - the clock - and
   a page with one number on it can only honestly be so many things. So rather
   than thirty-nine layouts pretending to differ, there are four shapes, each
   picked because it is true of the game it is given to:

     the set      - the achievement set that exists and was never touched,
                    drawn as the empty grid it is. Fourteen games.
     the notice   - the servers are gone. The page is the disconnect. Three.
     the plate    - one carved object holding the hours, the way the Valheim
                    page is one rune stone. Thirteen.
     the readout  - an odometer for the ones you sit inside. Five.
     the screen   - a full-bleed statement, for the four with a line of their
                    own worth giving the whole page to.

   What is not shared is the palette, the lettering, the corner radius and
   what each page actually says, which is written per game. */

/** The facts every one of these has, because they come from the library
 *  listing rather than from the game: whole days, rank, share, last launch. */
function bareFacts(cls, g) {
  const days = g.record_hours ? g.record_hours / 24 : 0;
  const rows = [
    [t('g.whole_days'), days >= 1 ? num(days, 1) : '-'],
    // A game that was never launched has no rank - it is not in the ranking at
    // all. Printing "#null" is what that used to look like.
    [t('g.position_f'), g.rank ? `#${g.rank}` : '-'],
    [t('g.share_of_total'), g.share ? `${num(g.share, 1)}%` : '-'],
  ];
  if (g.last_played) rows.push([t('g.last_f'), shortDate(g.last_played)]);
  const dl = h('dl', { cls });
  for (const [k, v] of rows) dl.append(h('dt', { text: k }), h('dd', { text: v }));
  return dl;
}

/** The key art, which is the one thing on these pages that is not a number.
 *  It is not player data - which is exactly why it is allowed to be here. */
function bareArt(cls, g) {
  if (!g.art) return null;
  const art = h('img', { cls, attr: { src: g.art, alt: '', 'aria-hidden': 'true', loading: 'eager' } });
  // The server already tried the small header before giving up, so one failure
  // here means this app has no art at all.
  art.addEventListener('error', () => art.remove());
  return art;
}

/** The sentence written for this particular game. Falls back to the shared
 *  one rather than to nothing if a theme was added without its own line. */
const bareSays = (g) => {
  const own = `g.b_${g.theme.replace(/-/g, '_')}`;
  const s = t(own);
  return s === own ? t('g.b_nothing') : s;
};

/* ── The set ──────────────────────────────────────────────────────────
   Fourteen games publish an achievement set and none of it was ever opened.
   The size of that set is the only real number these pages have besides the
   clock, and an empty grid says it better than the sentence "none of 83". */

function renderBareSet(g, root) {
  const ach = g.achievements;
  const total = ach ? ach.total : 0;
  const wrap = h('div', { cls: 'bset' });

  wrap.append(h('header', { cls: 'bset-head' },
    h('p', { cls: 'bset-kicker', text: t('g.b_kicker', { name: g.name }) }),
    h('h1', { cls: 'bset-title' },
      h('b', { text: hrs(g.record_hours) }),
      h('em', { text: t(g.record_hours === 1 ? 'g.hour_logged' : 'g.hours_logged') }))));

  if (total) {
    const grid = h('div', { cls: 'bset-grid' });
    for (let i = 0; i < total; i++) grid.append(h('i', { cls: 'bset-slot' }));
    wrap.append(h('h2', { cls: 'bset-h', text: t('g.b_set', { n: num(total) }) }), grid,
      h('p', { cls: 'bset-note', text: t('g.b_set_note', { n: num(total) }) }));
  }
  wrap.append(bareFacts('bset-facts', g));
  wrap.append(h('p', { cls: 'bset-says', text: bareSays(g) }));
  root.append(wrap);
}

/* ── The notice ───────────────────────────────────────────────────────
   Three of these cannot be played at all any more: the publisher took the
   servers down and an online-only game without servers is not a game you can
   return to. The hours are the whole record and they are now final. */

function renderBareOffline(g, root) {
  const wrap = h('div', { cls: 'boff' });
  // Same guard as the R.E.P.O. page: append(null) prints "null". All three of
  // these games happen to have art today, which is the only reason it has
  // never shown up here.
  const art = bareArt('boff-art', g);
  if (art) wrap.append(art);

  wrap.append(h('section', { cls: 'boff-notice' },
    h('p', { cls: 'boff-tag', text: t('g.b_offline_tag') }),
    h('h1', { cls: 'boff-title', text: g.name }),
    h('p', { cls: 'boff-hours' },
      h('b', { text: hrs(g.record_hours) }),
      h('span', { text: t(g.record_hours === 1 ? 'g.hour_logged' : 'g.hours_logged') })),
    h('p', { cls: 'boff-says', text: bareSays(g) })));

  wrap.append(bareFacts('boff-facts', g));
  root.append(wrap);
}

/* ── The plate ────────────────────────────────────────────────────────
   One carved object with the hours on it, the way the Valheim page is one
   rune stone: when there is nothing to list, a list is the wrong shape. */

function renderBarePlate(g, root) {
  const wrap = h('div', { cls: 'bplt' });

  wrap.append(h('article', { cls: 'bplt-stone' },
    h('p', { cls: 'bplt-kicker', text: g.name }),
    h('b', { cls: 'bplt-hours', text: hrs(g.record_hours) }),
    h('span', { cls: 'bplt-unit', text: t(g.record_hours === 1 ? 'g.hour_logged' : 'g.hours_logged') })));

  wrap.append(h('p', { cls: 'bplt-says', text: bareSays(g) }));
  wrap.append(bareFacts('bplt-facts', g));
  root.append(wrap);
}

/* ── The readout ──────────────────────────────────────────────────────
   For the five you sit inside. An odometer is the only instrument that says
   the same thing this page has to say: it went up, and it does not reset. */

function renderBareReadout(g, root) {
  const wrap = h('div', { cls: 'brd' });
  const digits = String(Math.round(g.record_hours || 0)).padStart(6, '0').split('');

  wrap.append(h('header', { cls: 'brd-head' },
    h('p', { cls: 'brd-kicker', text: g.name }),
    h('h1', { cls: 'brd-title', text: t('g.b_readout_title') })));

  const odo = h('div', { cls: 'brd-odo' });
  digits.forEach((d, i) => {
    odo.append(h('i', { cls: 'brd-digit', data: i < digits.length - String(Math.round(g.record_hours || 0)).length ? { lead: '1' } : {}, text: d }));
  });
  wrap.append(odo, h('p', { cls: 'brd-unit', text: t('g.b_readout_unit') }));
  wrap.append(h('p', { cls: 'brd-says', text: bareSays(g) }));
  wrap.append(bareFacts('brd-facts', g));
  root.append(wrap);
}

/* ── The screen ───────────────────────────────────────────────────────
   Four games have one line of their own that is worth the whole page. */

function renderBareScreen(g, root) {
  const wrap = h('div', { cls: 'bscr' });
  put(wrap, bareArt('bscr-art', g));

  wrap.append(h('section', { cls: 'bscr-in' },
    h('h1', { cls: 'bscr-line', text: bareSays(g) }),
    h('p', { cls: 'bscr-hours', text: t('g.b_screen_hours', {
      name: g.name, h: hrs(g.record_hours), rank: num(g.rank) }) })));

  wrap.append(bareFacts('bscr-facts', g));
  root.append(wrap);
}

/* ── Battlefield: Bad Company 2 - the record that was switched off ────
   This is the one page on the site where "Steam publishes nothing" is not the
   end of the sentence. Bad Company 2 kept an enormous record - 2.350 stat
   attributes per player, and up to a thousand dog tags taken off people you
   knifed - and it kept all of it on EA's servers rather than Steam's. EA
   discontinued those services on 8 December 2023. So the page is not empty
   because nothing was ever counted. It is empty because the thing that
   counted was turned off, and Steam only ever held the clock.

   Built as the one thing Bad Company 2 is remembered for: a wall that does
   not stay up. The hours are punched through it, and the dog tag hangs
   underneath, because the tag is the object the game gave you for a kill and
   the only one of its records anybody got to keep. */

function renderBfbc2(g, root) {
  const wrap = h('div', { cls: 'bc2' });

  // The breach. The hours sit in the hole rather than on the wall.
  wrap.append(h('section', { cls: 'bc2-wall' },
    bareArt('bc2-wall-art', g),
    h('div', { cls: 'bc2-breach' },
      h('p', { cls: 'bc2-kicker', text: t('g.bc2_kicker') }),
      h('b', { cls: 'bc2-hours', text: hrs(g.record_hours) }),
      h('span', { cls: 'bc2-hours-unit',
        text: t(g.record_hours === 1 ? 'g.hour_logged' : 'g.hours_logged') }))));

  // The dog tag: stamped, and carrying only what the library listing knows.
  const tag = h('article', { cls: 'bc2-tag' },
    h('i', { cls: 'bc2-tag-hole' }),
    h('dl', { cls: 'bc2-tag-lines' },
      h('dt', { text: t('g.bc2_tag_rank') }), h('dd', { text: `#${g.rank}` }),
      h('dt', { text: t('g.share_of_total') }),
      h('dd', { text: g.share != null ? `${num(g.share, 1)}%` : '-' }),
      h('dt', { text: t('g.bc2_tag_last') }),
      h('dd', { text: g.last_played ? shortDate(g.last_played) : '-' })));
  wrap.append(tag);

  // The whole point of the page: what the game counted against what is left.
  wrap.append(h('h2', { cls: 'bc2-h', text: t('g.bc2_kept_h') }),
    h('section', { cls: 'bc2-ledger' },
      h('div', { cls: 'bc2-side', data: { side: 'game' } },
        h('b', { text: num(2350) }),
        h('span', { text: t('g.bc2_kept_game') })),
      h('div', { cls: 'bc2-side', data: { side: 'steam' } },
        h('b', { text: num(0) }),
        h('span', { text: t('g.bc2_kept_steam') }))),
    h('p', { cls: 'bc2-note', text: t('g.bc2_kept_note') }));

  // The date, stated as a date, because that is what makes it final.
  wrap.append(h('section', { cls: 'bc2-off' },
    h('p', { cls: 'bc2-off-tag', text: t('g.bc2_shutdown_tag') }),
    h('h3', { cls: 'bc2-off-date', text: t('g.bc2_shutdown_date') }),
    h('p', { cls: 'bc2-off-body', text: t('g.bc2_shutdown_body') })));

  wrap.append(h('p', { cls: 'bc2-archive', text: t('g.bc2_archive') }));
  root.append(wrap);
}

/* ══ The Zone ══════════════════════════════════════════════════════════
   Seven games, seven pages, and no two of them share a line of layout. That
   is the request, but it is also what the data forces: Steam knows three
   completely different things about this series.

   The three originals (2007–2009) publish *nothing at all* - no stat block,
   no achievement set, not even an empty one, because Steam had neither when
   they shipped. Three pages built on the clock, and each takes a different
   piece of the games' own furniture rather than the same plate three times:
   the PDA, the faction war board, the anomaly detector.

   The three Enhanced Editions publish an achievement set each, and a stat
   block that is only progress towards it. Built on the achievements: the
   artifact case, the swamp, the three regions.

   The sequel is the only one with counters, and only some of them are real. */

/* ── Shadow of Chernobyl - the PDA ─────────────────────────────────────
   The device every stalker carries and the only screen the first game ever
   really shows you. Green phosphor, and one reading on it, because one
   reading is all Steam was ever given. */

function renderStalkerPda(g, root) {
  const wrap = h('div', { cls: 'spda' });

  wrap.append(h('section', { cls: 'spda-device' },
    h('div', { cls: 'spda-bar' },
      h('span', { text: 'PDA' }),
      h('span', { cls: 'spda-sig', text: t('g.st_signal') })),
    h('div', { cls: 'spda-screen' },
      h('i', { cls: 'spda-scan', attr: { 'aria-hidden': 'true' } }),
      h('p', { cls: 'spda-label', text: t('g.st_time_in_zone') }),
      h('p', { cls: 'spda-read' },
        h('b', { text: hrs(g.record_hours) }),
        h('em', { text: t('g.h_short') })),
      bareFacts('spda-facts', g))));

  wrap.append(h('p', { cls: 'spda-says', text: bareSays(g) }));
  root.append(wrap);
}

/* ── Clear Sky - the faction war board ─────────────────────────────────
   Clear Sky's one idea nobody else in the series had: the factions fight over
   the Zone whether you are there or not. So the page is that board - and
   every line of it is blank, because the game was never wired to tell Steam a
   single thing. The empty board is the record. */

const CS_FACTIONS = ['Clear Sky', 'Loners', 'Bandits', 'Duty', 'Freedom',
  'Renegades', 'Military', 'Monolith'];

function renderStalkerWar(g, root) {
  const wrap = h('div', { cls: 'swar' });

  wrap.append(h('header', { cls: 'swar-head' },
    h('p', { cls: 'swar-kicker', text: t('g.st_war_kicker') }),
    h('h1', { cls: 'swar-title' },
      h('b', { text: hrs(g.record_hours) }),
      h('em', { text: t(g.record_hours === 1 ? 'g.hour_logged' : 'g.hours_logged') }))));

  const board = h('div', { cls: 'swar-board' });
  for (const name of CS_FACTIONS) {
    board.append(h('div', { cls: 'swar-row' },
      h('span', { cls: 'swar-name', text: name }),
      h('span', { cls: 'swar-track' }, h('i')),
      h('span', { cls: 'swar-none', text: t('g.st_no_record') })));
  }
  wrap.append(h('h2', { cls: 'swar-h', text: t('g.st_war_h') }), board,
    h('p', { cls: 'swar-note', text: t('g.st_war_note') }));

  wrap.append(bareFacts('swar-facts', g));
  wrap.append(h('p', { cls: 'swar-says', text: bareSays(g) }));
  root.append(wrap);
}

/* ── Call of Pripyat - the detector ────────────────────────────────────
   The Veles: rings, a sweep, and a reading that means something only to the
   person holding it. Pointed at this game it finds one number. */

function renderStalkerDetector(g, root) {
  const wrap = h('div', { cls: 'sdet' });

  wrap.append(h('section', { cls: 'sdet-dial' },
    h('i', { cls: 'sdet-ring sdet-ring--1', attr: { 'aria-hidden': 'true' } }),
    h('i', { cls: 'sdet-ring sdet-ring--2', attr: { 'aria-hidden': 'true' } }),
    h('i', { cls: 'sdet-ring sdet-ring--3', attr: { 'aria-hidden': 'true' } }),
    h('i', { cls: 'sdet-sweep', attr: { 'aria-hidden': 'true' } }),
    h('div', { cls: 'sdet-core' },
      h('b', { text: hrs(g.record_hours) }),
      h('em', { text: t('g.h_short') }))));

  wrap.append(h('p', { cls: 'sdet-kicker', text: t('g.st_det_kicker') }));
  wrap.append(bareFacts('sdet-facts', g));
  wrap.append(h('p', { cls: 'sdet-says', text: bareSays(g) }));
  root.append(wrap);
}

/* ── S.T.A.L.K.E.R. 2 - the dosimeter and the five counters ────────────
   The only game in the series that counts anything, and the page is mostly
   about the fact that it counts two different kinds of thing. Two are
   tallies. Three are progress towards a number stated in their own label,
   and they stop there - so they are drawn as bars against that number
   instead of as totals, and one that has arrived says so. */

function renderStalker2(g, root) {
  const s = g.stalker2;
  const ach = g.achievements;
  const wrap = h('div', { cls: 'st2' });

  wrap.append(h('header', { cls: 'st2-head' },
    h('p', { cls: 'st2-kicker', text: t('g.st2_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'st2-title', text: ach
      ? t('g.n_of_n', { done: num(ach.unlocked), total: num(ach.total) })
      : hrs(g.record_hours) }),
    ach ? h('div', { cls: 'st2-dose' }, fillBar('st2-dose-bar', ach.completion)) : null,
    ach ? h('p', { cls: 'st2-dose-cap', text: t('g.st2_dose') }) : null));

  if (s && s.counts.length) {
    const row = h('div', { cls: 'st2-counts' });
    for (const c of s.counts) {
      row.append(h('div', { cls: 'st2-count' },
        h('b', { text: num(c.value) }),
        h('span', { text: ts(c.label) })));
    }
    wrap.append(h('h2', { cls: 'st2-h', text: t('g.st2_tallies') }), row);
  }

  if (s && s.progress.length) {
    const list = h('div', { cls: 'st2-prog' });
    for (const p of s.progress) {
      list.append(h('div', { cls: 'st2-prog-row' },
        h('span', { cls: 'st2-prog-name', text: ts(p.label) }),
        fillBar('st2-prog-bar', p.pct),
        h('span', { cls: 'st2-prog-fig' },
          txt(`${num(p.value)} / ${num(p.goal)}`),
          p.stopped ? h('em', { text: t('g.st2_stopped') }) : null)));
    }
    wrap.append(h('h2', { cls: 'st2-h', text: t('g.st2_progress') }), list,
      h('p', { cls: 'st2-note', text: t('g.st2_progress_note') }));
  }

  if (ach && ach.rarest.length) {
    wrap.append(h('h2', { cls: 'st2-h', text: t('g.rarest') }),
      achRows('st2-list', ach.rarest.slice(0, 12)));
  }
  root.append(wrap);
}

/* ── Shadow of Chernobyl, Enhanced - the artifact case ─────────────────
   Lead-lined containers in a row, because an artifact is the one thing in
   this game you carry in a box. One container per achievement: lit where it
   was found, dark where it was not. The empty ones are the point. */

function renderStalkerCase(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'scase' });

  wrap.append(h('header', { cls: 'scase-head' },
    h('p', { cls: 'scase-kicker', text: t('g.st_ee_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'scase-title', text: t('g.n_of_n', { done: num(ach.unlocked), total: num(ach.total) }) })));

  const found = ach.list.slice();
  const grid = h('div', { cls: 'scase-grid' });
  for (let i = 0; i < ach.total; i++) {
    const got = found[i];
    const cell = h('div', { cls: 'scase-slot' });
    if (got) {
      cell.dataset.lit = '1';
      cell.title = got.name;
      if (got.icon) cell.append(h('img', { attr: { src: got.icon, alt: '', loading: 'lazy' } }));
    }
    grid.append(cell);
  }
  wrap.append(grid, h('p', { cls: 'scase-note', text: t('g.st_case_note', { n: num(ach.total - ach.unlocked) }) }));

  if (g.counters_note) wrap.append(h('p', { cls: 'scase-warn', text: ts(g.counters_note) }));
  if (ach.rarest.length) {
    wrap.append(h('h2', { cls: 'scase-h', text: t('g.rarest') }),
      achRows('scase-list', ach.rarest.slice(0, 8)));
  }
  root.append(wrap);
}

/* ── Clear Sky, Enhanced - the swamp ───────────────────────────────────
   Clear Sky opens in the Great Swamp and nothing else in the series looks
   like it: flat, wet, drawn in contour lines. Each unlock is a stash pinned
   on it, in the order they were found. */

function renderStalkerSwamp(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'sswp' });

  wrap.append(h('header', { cls: 'sswp-head' },
    h('p', { cls: 'sswp-kicker', text: t('g.st_ee_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'sswp-title', text: t('g.n_of_n', { done: num(ach.unlocked), total: num(ach.total) }) })));

  const map = h('div', { cls: 'sswp-map' });
  for (let i = 0; i < 7; i++) map.append(h('i', { cls: 'sswp-contour', attr: { 'aria-hidden': 'true' } }));
  const pins = h('div', { cls: 'sswp-pins' });
  ach.list.forEach((a, i) => {
    const pin = h('button', {
      cls: 'sswp-pin', attr: { type: 'button', title: `${a.name}${a.date ? ` - ${shortDate(a.date)}` : ''}` },
    }, h('span', { cls: 'sswp-pin-n', text: String(i + 1) }));
    pins.append(pin);
  });
  map.append(pins);
  wrap.append(map, h('p', { cls: 'sswp-note', text: t('g.st_swamp_note', { n: num(ach.unlocked) }) }));

  if (g.counters_note) wrap.append(h('p', { cls: 'sswp-warn', text: ts(g.counters_note) }));
  wrap.append(h('h2', { cls: 'sswp-h', text: t('g.in_order') }), achRows('sswp-list', ach.list.slice(0, 12)));
  root.append(wrap);
}

/* ── Call of Pripyat, Enhanced - the three regions ─────────────────────
   Call of Pripyat is three maps and the game never lets you forget which one
   you are on: Zaton, Yanov, Pripyat. So the unlocks are dealt into three
   columns in the order they came, which is the closest thing this game has
   to saying how far somebody got. */

const COP_REGIONS = ['Zaton', 'Yanov', 'Pripyat'];

function renderStalkerRegions(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'scop' });

  wrap.append(h('header', { cls: 'scop-head' },
    h('p', { cls: 'scop-kicker', text: t('g.st_ee_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'scop-title', text: t('g.n_of_n', { done: num(ach.unlocked), total: num(ach.total) }) })));

  const cols = h('div', { cls: 'scop-cols' });
  const per = Math.ceil(ach.list.length / COP_REGIONS.length) || 1;
  COP_REGIONS.forEach((region, ci) => {
    const col = h('section', { cls: 'scop-col' },
      h('h2', { cls: 'scop-region', text: region }));
    const slice = ach.list.slice(ci * per, (ci + 1) * per);
    for (const a of slice) {
      col.append(h('div', { cls: 'scop-item' },
        a.icon ? h('img', { attr: { src: a.icon, alt: '', loading: 'lazy' } }) : h('i'),
        h('div', {},
          h('b', { text: a.name }),
          h('span', { text: a.date ? shortDate(a.date) : t('g.no_date') }))));
    }
    if (!slice.length) col.append(h('p', { cls: 'scop-empty', text: t('g.st_cop_empty') }));
    cols.append(col);
  });

  wrap.append(cols, h('p', { cls: 'scop-note', text: t('g.st_cop_note') }));
  if (g.counters_note) wrap.append(h('p', { cls: 'scop-warn', text: ts(g.counters_note) }));
  root.append(wrap);
}

/* ── R.E.P.O. - the performance review ─────────────────────────────────
   Asked for by name, and Steam has nothing on it: no stat block, no
   achievement set, not even an empty one. In a game whose whole loop is
   carrying something fragile to a van while everybody screams.

   A page with one number on it can be a plaque or it can be a joke, and this
   game is a joke, so it gets one - but the joke is not invented data. It is
   the form: an employee review filed by the management, with every line on it
   left blank because not one of those lines was ever reported to anyone. The
   fields are real questions the game would never answer, the stamp is what
   the form deserves, and the only figure on it is the clock, which is the
   only figure there is. */

const REPO_FIELDS = ['g.repo_f_extracted', 'g.repo_f_dropped', 'g.repo_f_broken',
  'g.repo_f_left', 'g.repo_f_screamed'];

/** A pair of googly eyes that watch the pointer.
 *
 *  The one thing everybody can draw from memory about this game is the eyes,
 *  so they are the page. Decorative, hidden from the accessibility tree, and
 *  they simply do not track when the visitor asked for less motion - the eyes
 *  are still there, they just look straight ahead like everyone else. */
function repoEyes(cls) {
  const face = h('div', { cls, attr: { 'aria-hidden': 'true' } });
  const pupils = [h('i', { cls: 'repo-pupil' }), h('i', { cls: 'repo-pupil' })];
  for (const p of pupils) face.append(h('span', { cls: 'repo-eye' }, p));
  return { face, pupils };
}

function renderRepo(g, root) {
  const wrap = h('div', { cls: 'repo' });
  const pupils = [];

  // ── The crew, looking at you ────────────────────────────────────────
  const crew = h('div', { cls: 'repo-crew' });
  ['a', 'b', 'c', 'd'].forEach((tone, i) => {
    const bot = h('div', { cls: 'repo-bot', data: { tone } });
    const eyes = repoEyes('repo-face');
    bot.append(eyes.face);
    pupils.push(...eyes.pupils);
    // A different wobble offset each, so they are never in step.
    bot.style.setProperty('--delay', `${i * 230}ms`);
    crew.append(bot);
  });
  wrap.append(crew);

  // ── The one number ──────────────────────────────────────────────────
  wrap.append(h('div', { cls: 'repo-pill' },
    h('b', { text: hrs(g.record_hours) }),
    h('em', { text: t('g.h_short') })));
  // The caption finishes the sentence the pill started, so the number lives in
  // one place only - writing it into the string is how "twelve hours" ends up
  // printed on a profile with nine.
  wrap.append(h('p', { cls: 'repo-cap', text: t('g.repo_clock') }));

  // ── Everything else, which is nothing ───────────────────────────────
  const blobs = h('div', { cls: 'repo-blobs' });
  REPO_FIELDS.forEach((key, i) => {
    const blob = h('div', { cls: 'repo-blob', data: { tone: 'abcde'[i % 5] } });
    // Each one leans a different way. Nothing here is straight.
    blob.style.setProperty('--tilt', `${[-2.5, 1.8, -1.2, 2.6, -2][i % 5]}deg`);
    const eyes = repoEyes('repo-face repo-face--sm');
    blob.append(eyes.face);
    pupils.push(...eyes.pupils);
    blob.append(h('b', { cls: 'repo-huh', text: '???' }),
      h('span', { cls: 'repo-blob-label', text: t(key) }));
    blobs.append(blob);
  });
  wrap.append(blobs);
  wrap.append(h('p', { cls: 'repo-nobody', text: t('g.repo_notreported') }));

  wrap.append(bareFacts('repo-facts', g));
  wrap.append(h('p', { cls: 'repo-says', text: bareSays(g) }));
  root.append(wrap);

  // The CSP forbids inline style attributes, so the pupils move through the
  // CSSOM like every other bit of geometry on this site.
  if (still()) return;
  let queued = false;
  let mx = 0;
  let my = 0;
  const look = () => {
    queued = false;
    for (const p of pupils) {
      const box = p.parentElement.getBoundingClientRect();
      const dx = mx - (box.left + box.width / 2);
      const dy = my - (box.top + box.height / 2);
      const angle = Math.atan2(dy, dx);
      // Capped, so a pupil never climbs out of its own eye.
      const reach = Math.min(Math.hypot(dx, dy) / 14, box.width * 0.22);
      p.style.setProperty('--px', `${Math.cos(angle) * reach}px`);
      p.style.setProperty('--py', `${Math.sin(angle) * reach}px`);
    }
  };
  window.addEventListener('pointermove', (e) => {
    mx = e.clientX;
    my = e.clientY;
    if (queued) return;
    queued = true;
    requestAnimationFrame(look);
  }, { passive: true });
}

/* ══ Tamriel ═══════════════════════════════════════════════════════════
   Eleven games across thirty-one years, and Steam knows three completely
   different things about them.

   Seven publish nothing at all, for two different reasons that are worth
   keeping apart: the four from the nineties, Morrowind and the original
   Oblivion came out before Steam had an achievement to offer them, while ESO
   has thousands of achievements that live on ZeniMax's servers and never
   reach this API. Same empty payload, opposite stories, so they do not get
   the same page.

   Three publish a set. Two of those are the *same* seventy-five achievements
   as the third, because Skyrim has now shipped three times - so the three
   Skyrim pages had to be told apart by something other than their data, and
   what tells them apart is what each release actually was. */

/* ── Arena - the nine provinces ────────────────────────────────────────
   1994, and the only game in the series set across the whole continent.
   Every one since has picked a single province and stayed there. So the page
   is the map that no sequel ever needed: nine plates, and not one of them
   with anything written on it. */

const TES_PROVINCES = ['Skyrim', 'Morrowind', 'High Rock', 'Hammerfell', 'Cyrodiil',
  'Elsweyr', 'Valenwood', 'Summerset Isle', 'Black Marsh'];

function renderTesArena(g, root) {
  const wrap = h('div', { cls: 'arn' });

  wrap.append(h('header', { cls: 'arn-head' },
    h('p', { cls: 'arn-kicker', text: t('g.tes_arena_kicker') }),
    h('h1', { cls: 'arn-title' },
      h('b', { text: hrs(g.record_hours) }),
      h('em', { text: t(g.record_hours === 1 ? 'g.hour_logged' : 'g.hours_logged') }))));

  const map = h('div', { cls: 'arn-map' });
  for (const name of TES_PROVINCES) {
    map.append(h('div', { cls: 'arn-plate' },
      h('b', { text: name }),
      h('span', { text: t('g.st_no_record') })));
  }
  wrap.append(h('h2', { cls: 'arn-h', text: t('g.tes_arena_h') }), map,
    h('p', { cls: 'arn-note', text: t('g.tes_arena_note') }));

  wrap.append(bareFacts('arn-facts', g));
  wrap.append(h('p', { cls: 'arn-says', text: bareSays(g) }));
  root.append(wrap);
}

/* ── Daggerfall - the scale ────────────────────────────────────────────
   Daggerfall generated a world of about 161,600 km², which is roughly Great
   Britain, and is still the largest map anybody has shipped. Steam knows one
   number about it. Putting those two figures on the same page is the whole
   design, and the big one is labelled as a fact about the game rather than
   about the person, because that is what it is. */

function renderTesDaggerfall(g, root) {
  const wrap = h('div', { cls: 'dgf' });

  wrap.append(h('section', { cls: 'dgf-vast' },
    h('i', { cls: 'dgf-field', attr: { 'aria-hidden': 'true' } }),
    h('i', { cls: 'dgf-dot', attr: { 'aria-hidden': 'true' } }),
    h('div', { cls: 'dgf-scale' },
      h('b', { text: '161.600' }),
      h('span', { text: t('g.tes_dgf_km') }))));

  wrap.append(h('div', { cls: 'dgf-known' },
    h('p', { cls: 'dgf-known-k', text: t('g.tes_dgf_known') }),
    h('p', { cls: 'dgf-known-v' },
      h('b', { text: hrs(g.record_hours) }),
      h('em', { text: t('g.h_short') }))));

  wrap.append(bareFacts('dgf-facts', g));
  wrap.append(h('p', { cls: 'dgf-says', text: bareSays(g) }));
  root.append(wrap);
}

/* ── Battlespire - the shaft ───────────────────────────────────────────
   Not a province and not an open world: a tower between Mundus and Oblivion,
   descended one level at a time. Seven levels, drawn as the shaft they are,
   and all of them unlit. */

function renderTesBattlespire(g, root) {
  const wrap = h('div', { cls: 'bsp' });

  wrap.append(h('header', { cls: 'bsp-head' },
    h('p', { cls: 'bsp-kicker', text: t('g.tes_bsp_kicker') }),
    h('h1', { cls: 'bsp-title' },
      h('b', { text: hrs(g.record_hours) }),
      h('em', { text: t('g.h_short') }))));

  const shaft = h('div', { cls: 'bsp-shaft' });
  for (let i = 1; i <= 7; i++) {
    shaft.append(h('div', { cls: 'bsp-level' },
      h('span', { cls: 'bsp-n', text: `${i}` }),
      h('span', { cls: 'bsp-bar' }),
      h('span', { cls: 'bsp-none', text: t('g.st_no_record') })));
  }
  wrap.append(shaft, h('p', { cls: 'bsp-note', text: t('g.tes_bsp_note') }));

  wrap.append(bareFacts('bsp-facts', g));
  wrap.append(h('p', { cls: 'bsp-says', text: bareSays(g) }));
  root.append(wrap);
}

/* ── Redguard - the chart ──────────────────────────────────────────────
   The odd one out twice over: an action-adventure rather than an RPG, and
   the only one where you play a named person on one small island. So it gets
   a sea chart of Stros M'Kai rather than a map of anywhere else. */

function renderTesRedguard(g, root) {
  const wrap = h('div', { cls: 'rdg' });

  wrap.append(h('section', { cls: 'rdg-chart' },
    h('i', { cls: 'rdg-rose', attr: { 'aria-hidden': 'true' } }),
    h('i', { cls: 'rdg-isle', attr: { 'aria-hidden': 'true' } }),
    h('div', { cls: 'rdg-log' },
      h('p', { cls: 'rdg-log-k', text: t('g.tes_rdg_log') }),
      h('p', { cls: 'rdg-log-v' },
        h('b', { text: hrs(g.record_hours) }),
        h('em', { text: t('g.h_short') })))));

  wrap.append(bareFacts('rdg-facts', g));
  wrap.append(h('p', { cls: 'rdg-says', text: bareSays(g) }));
  root.append(wrap);
}

/* ── Morrowind - the prophecy ──────────────────────────────────────────
   Morrowind hands you a prophecy in seven verses and spends the game asking
   whether you are the one it means. The page is that scroll, and the verses
   are blank: this game is from 2002 and predates Steam achievements existing
   at all, so there is nothing to write on them. */

function renderMorrowind(g, root) {
  const wrap = h('div', { cls: 'mrw' });

  wrap.append(h('section', { cls: 'mrw-scroll' },
    h('p', { cls: 'mrw-kicker', text: t('g.tes_mrw_kicker') }),
    h('h1', { cls: 'mrw-title' },
      h('b', { text: hrs(g.record_hours) }),
      h('em', { text: t(g.record_hours === 1 ? 'g.hour_logged' : 'g.hours_logged') })),
    (() => {
      const verses = h('div', { cls: 'mrw-verses' });
      for (let i = 0; i < 7; i++) {
        verses.append(h('div', { cls: 'mrw-verse' },
          h('span', { cls: 'mrw-num', text: `${i + 1}` }),
          h('i', { cls: 'mrw-rule' })));
      }
      return verses;
    })(),
    h('p', { cls: 'mrw-note', text: t('g.tes_mrw_note') })));

  wrap.append(bareFacts('mrw-facts', g));
  wrap.append(h('p', { cls: 'mrw-says', text: bareSays(g) }));
  root.append(wrap);
}

/* ── Oblivion, 2006 - the gate ─────────────────────────────────────────
   One image from this game outlives everything else in it, and it is a
   burning hole in the sky. The hours sit inside it; nothing else came back
   through. */

function renderOblivion(g, root) {
  const wrap = h('div', { cls: 'obl' });

  wrap.append(h('section', { cls: 'obl-gate' },
    h('i', { cls: 'obl-fire', attr: { 'aria-hidden': 'true' } }),
    h('i', { cls: 'obl-ring', attr: { 'aria-hidden': 'true' } }),
    h('div', { cls: 'obl-core' },
      h('b', { text: hrs(g.record_hours) }),
      h('em', { text: t('g.h_short') }))));

  wrap.append(h('p', { cls: 'obl-kicker', text: t('g.tes_obl_kicker') }));
  wrap.append(bareFacts('obl-facts', g));
  wrap.append(h('p', { cls: 'obl-says', text: bareSays(g) }));
  root.append(wrap);
}

/* ── Oblivion Remastered - the journal ─────────────────────────────────
   Nineteen years later the same game came back with sixty achievements
   attached, and the schema still calls itself "Jaws". Oblivion's own record
   of what you did was the quest journal, so that is the page: a compass
   strip carrying the completion, and one entry per unlock in the order they
   happened. */

function renderOblivionRemastered(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'oblr' });

  wrap.append(h('header', { cls: 'oblr-head' },
    h('p', { cls: 'oblr-kicker', text: t('g.tes_oblr_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'oblr-title', text: t('g.n_of_n', { done: num(ach.unlocked), total: num(ach.total) }) })));

  // The compass Oblivion put across the top of the screen for the whole game.
  const compass = h('div', { cls: 'oblr-compass' });
  for (let i = 0; i < 40; i++) compass.append(h('i', { cls: 'oblr-tick' }));
  compass.append(h('span', { cls: 'oblr-needle' }));
  compass.style.setProperty('--at', `${Math.min(100, ach.completion || 0)}%`);
  wrap.append(compass, h('p', { cls: 'oblr-compass-cap',
    text: t('g.tes_oblr_compass', { pct: num(ach.completion, 1) }) }));

  const journal = h('div', { cls: 'oblr-journal' });
  for (const a of ach.list) {
    journal.append(h('article', { cls: 'oblr-entry' },
      h('div', { cls: 'oblr-entry-top' },
        h('b', { text: a.name }),
        h('span', { text: a.date ? shortDate(a.date) : t('g.no_date') })),
      a.description ? h('p', { text: a.description }) : null));
  }
  wrap.append(h('h2', { cls: 'oblr-h', text: t('g.tes_oblr_journal') }), journal);
  root.append(wrap);
}

/* ── Skyrim, 2011 - the word wall ──────────────────────────────────────
   The Special Edition already has the constellation, and these are the same
   seventy-five achievements, so this page cannot be that one recoloured. It
   takes the other thing Skyrim carves its progress into: a word wall. One
   glyph per achievement, lit where the word was learned. */

function renderSkyrim2011(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'swall' });

  wrap.append(h('header', { cls: 'swall-head' },
    h('p', { cls: 'swall-kicker', text: t('g.tes_sky11_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'swall-title', text: t('g.n_of_n', { done: num(ach.unlocked), total: num(ach.total) }) })));

  const wall = h('div', { cls: 'swall-wall' });
  const got = ach.list.slice();
  for (let i = 0; i < ach.total; i++) {
    const a = got[i];
    const glyph = h('span', { cls: `swall-glyph swall-glyph--${i % 6}` });
    if (a) {
      glyph.dataset.lit = '1';
      glyph.title = a.name;
    }
    wall.append(glyph);
  }
  wrap.append(wall, h('p', { cls: 'swall-note',
    text: t('g.tes_sky11_note', { n: num(ach.total - ach.unlocked) }) }));

  if (ach.rarest.length) {
    wrap.append(h('h2', { cls: 'swall-h', text: t('g.rarest') }),
      achRows('swall-list', ach.rarest.slice(0, 8)));
  }
  root.append(wrap);
}

/* ── Skyrim VR - the same game, standing up ────────────────────────────
   The third time Skyrim shipped, with the same seventy-five achievements as
   the other two. There is no new data to draw, and pretending otherwise
   would be the dishonest option - so the page is about the one thing that
   actually changed, which is that the spells are now in your hands. The
   unlocks are dealt left and right, and the note says outright that this is
   the same game a third time. */

function renderSkyrimVr(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'svr' });

  wrap.append(h('header', { cls: 'svr-head' },
    h('p', { cls: 'svr-kicker', text: t('g.tes_svr_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'svr-title', text: t('g.n_of_n', { done: num(ach.unlocked), total: num(ach.total) }) }),
    h('p', { cls: 'svr-sub', text: t('g.tes_svr_sub') })));

  const hands = h('div', { cls: 'svr-hands' });
  ['g.tes_svr_left', 'g.tes_svr_right'].forEach((label, side) => {
    const hand = h('section', { cls: 'svr-hand' },
      h('h2', { cls: 'svr-hand-h', text: t(label) }),
      h('i', { cls: 'svr-glow', attr: { 'aria-hidden': 'true' } }));
    for (const a of ach.list.filter((_, i) => i % 2 === side)) {
      hand.append(h('div', { cls: 'svr-cast' },
        a.icon ? h('img', { attr: { src: a.icon, alt: '', loading: 'lazy' } }) : h('i'),
        h('div', {},
          h('b', { text: a.name }),
          h('span', { text: a.date ? shortDate(a.date) : t('g.no_date') }))));
    }
    hands.append(hand);
  });
  wrap.append(hands);
  root.append(wrap);
}

/* ── ESO - the three banners ───────────────────────────────────────────
   ESO is not quiet because it counts nothing. It counts more than anything
   else in the series - thousands of achievements - and keeps every one of
   them on ZeniMax's servers, where this API cannot see them. That is a
   different silence from Morrowind's, and it gets a different page: the
   three alliance banners, hanging empty. */

const ESO_ALLIANCES = [
  { key: 'g.tes_eso_ad', tone: 'ad' },
  { key: 'g.tes_eso_dc', tone: 'dc' },
  { key: 'g.tes_eso_ep', tone: 'ep' },
];

function renderEso(g, root) {
  const wrap = h('div', { cls: 'eso' });

  wrap.append(h('header', { cls: 'eso-head' },
    h('p', { cls: 'eso-kicker', text: t('g.tes_eso_kicker') }),
    h('h1', { cls: 'eso-title' },
      h('b', { text: hrs(g.record_hours) }),
      h('em', { text: t(g.record_hours === 1 ? 'g.hour_logged' : 'g.hours_logged') }))));

  const row = h('div', { cls: 'eso-banners' });
  for (const a of ESO_ALLIANCES) {
    row.append(h('div', { cls: 'eso-banner', data: { tone: a.tone } },
      h('b', { text: t(a.key) }),
      h('span', { text: t('g.st_no_record') })));
  }
  wrap.append(row, h('p', { cls: 'eso-note', text: t('g.tes_eso_note') }));

  wrap.append(bareFacts('eso-facts', g));
  wrap.append(h('p', { cls: 'eso-says', text: bareSays(g) }));
  root.append(wrap);
}

/* ══ Left 4 Dead ═══════════════════════════════════════════════════════
   Two games, and the count they keep is not the same count - which is why
   the two pages look nothing alike. The first counts per campaign, per survivor
   and, uniquely, per *special infected*: how many times you spawned as the
   Hunter and how long you lasted. The second dropped all of that and counts
   the campaign scoreboard instead, friendly fire included. */

/* ── Left 4 Dead - the Versus board ────────────────────────────────────
   Survivors down one side, infected down the other, because this is the game
   where you play both and Valve counted both. */

function renderL4d1(g, root) {
  const d = g.l4d1;
  const wrap = h('div', { cls: 'l4a' });

  wrap.append(h('header', { cls: 'l4a-head' },
    h('p', { cls: 'l4a-kicker', text: t('g.l4a_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'l4a-title', text: t('g.l4a_title', {
      n: num(d.killed), games: num(d.games) }) })));

  const top = h('div', { cls: 'l4a-tally' });
  for (const [label, value] of [
    [t('g.l4a_games'), num(d.games)],
    [t('g.l4a_finales'), num(d.finales)],
    [t('g.l4a_versus'), `${num(d.versus_won)} / ${num(d.versus_games)}`],
    [t('g.l4a_best'), num(d.best_score)],
  ]) top.append(h('div', { cls: 'l4a-cell' }, h('b', { text: value }), h('span', { text: label })));
  wrap.append(top);

  const cols = h('div', { cls: 'l4a-cols' });

  const surv = h('section', { cls: 'l4a-side l4a-side--surv' },
    h('h2', { text: t('g.l4a_survivors') }));
  for (const p of d.survivors) {
    surv.append(h('div', { cls: 'l4a-row' },
      h('b', { text: p.name }),
      h('span', { text: t('g.l4a_games_n', { n: num(p.games) }) })));
  }
  if (d.campaigns.length) {
    surv.append(h('h3', { cls: 'l4a-sub', text: t('g.l4a_campaigns') }));
    for (const c of d.campaigns) {
      surv.append(h('div', { cls: 'l4a-row' },
        h('b', { text: c.name }),
        h('span', { text: `${hrs(c.hours)} h` })));
    }
  }
  cols.append(surv);

  const inf = h('section', { cls: 'l4a-side l4a-side--inf' },
    h('h2', { text: t('g.l4a_infected') }));
  for (const i of d.infected) {
    inf.append(h('div', { cls: 'l4a-inf' },
      h('b', { text: i.name }),
      h('div', { cls: 'l4a-inf-nums' },
        h('span', {}, txt(t('g.l4a_spawns')), h('em', { text: num(i.spawns) })),
        h('span', {}, txt(t('g.l4a_life')), h('em', { text: t('g.l4a_secs', { n: num(i.life) }) })),
        h('span', {}, txt(t('g.l4a_worst_hit')), h('em', { text: num(i.best) })))));
  }
  if (!d.infected.length) inf.append(h('p', { cls: 'l4a-none', text: t('g.l4a_no_infected') }));
  cols.append(inf);
  wrap.append(cols);

  if (d.guns.length) {
    const guns = h('div', { cls: 'l4a-guns' });
    const top1 = Math.max(...d.guns.map((w) => w.kills), 1);
    for (const w of d.guns) {
      guns.append(h('div', { cls: 'l4a-gun' },
        h('span', { cls: 'l4a-gun-n', text: ts(w.label) }),
        fillBar('l4a-gun-bar', (w.kills / top1) * 100),
        h('span', { cls: 'l4a-gun-k' },
          txt(num(w.kills)),
          w.accuracy != null ? h('em', { text: `${num(w.accuracy)}%` }) : null)));
    }
    wrap.append(h('h2', { cls: 'l4a-h', text: t('g.l4a_guns') }), guns);
    if (d.guns_broken) {
      wrap.append(h('p', { cls: 'l4a-note', text: t('g.l4a_broken', { n: num(d.guns_broken) }) }));
    }
  }

  // The number the whole series argues about, given its own box.
  wrap.append(h('section', { cls: 'l4a-ff' },
    h('p', { cls: 'l4a-ff-k', text: t('g.l4_ff') }),
    h('p', { cls: 'l4a-ff-v' }, h('b', { text: num(d.ff) })),
    h('p', { cls: 'l4a-ff-note', text: t('g.l4_ff_worst', { n: num(d.ff_worst) }) })));

  root.append(wrap);
}

/* ── Left 4 Dead 2 - the campaign scoreboard ───────────────────────────
   The screen at the end of a campaign, which is the one the second game
   actually keeps: what you did for the team, what the team did for you, and
   the amount of it you shot yourself. */

function renderL4d2(g, root) {
  const d = g.l4d2;
  const wrap = h('div', { cls: 'l4b' });

  wrap.append(h('header', { cls: 'l4b-head' },
    h('p', { cls: 'l4b-kicker', text: t('g.l4b_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'l4b-title', text: num(d.killed) }),
    h('p', { cls: 'l4b-sub', text: t('g.l4b_sub', {
      games: num(d.games), finales: num(d.finales) }) })));

  const rows = h('dl', { cls: 'l4b-rows' });
  for (const c of d.care) {
    rows.append(h('dt', { text: ts(c.label) }),
      h('dd', {}, txt(num(c.n)),
        c.avg ? h('em', { text: t('g.l4b_per_game', { n: num(c.avg, 2) }) }) : null));
  }
  wrap.append(rows);

  // Friendly fire is the whole reason this scoreboard is interesting.
  const worst = d.ff ? Math.round((d.ff_worst / d.ff) * 100) : 0;
  wrap.append(h('section', { cls: 'l4b-ff' },
    h('div', { cls: 'l4b-ff-top' },
      h('span', { text: t('g.l4_ff') }),
      h('b', { text: num(d.ff) })),
    fillBar('l4b-ff-bar', worst),
    h('p', { cls: 'l4b-ff-note', text: t('g.l4b_ff_note', {
      n: num(d.ff_worst), pct: num(worst), avg: num(d.ff_avg) }) })));

  wrap.append(h('p', { cls: 'l4b-score',
    text: t('g.l4b_best', { n: num(d.best_score) }) }));
  root.append(wrap);
}

/* ── Counter-Strike: Source - the round-end scoreboard ─────────────────
   CS2 has the buy menu on this site, so Source gets the other screen: the
   one everybody held Tab to read. The money is the hero number because it is
   the most Source thing in the payload - three hundred thousand dollars
   earned, and ninety kills to show for it. */

function renderCss(g, root) {
  const d = g.css;
  const wrap = h('div', { cls: 'cssrc' });

  wrap.append(h('header', { cls: 'cssrc-head' },
    h('p', { cls: 'cssrc-kicker', text: t('g.css_kicker', { h: hrs(g.record_hours) }) }),
    h('div', { cls: 'cssrc-board' },
      h('div', { cls: 'cssrc-cell' }, h('b', { text: num(d.kills) }), h('span', { text: t('g.css_kills') })),
      h('div', { cls: 'cssrc-cell' }, h('b', { text: num(d.deaths) }), h('span', { text: t('g.css_deaths') })),
      h('div', { cls: 'cssrc-cell' },
        h('b', { text: d.ratio != null ? num(d.ratio, 2) : '-' }), h('span', { text: t('g.css_ratio') })),
      h('div', { cls: 'cssrc-cell' }, h('b', { text: num(d.wins) }), h('span', { text: t('g.css_wins') })))));

  wrap.append(h('section', { cls: 'cssrc-money' },
    h('p', { cls: 'cssrc-money-v', text: `$${num(d.money)}` }),
    h('p', { cls: 'cssrc-money-k', text: t('g.css_money') })));

  const kv = h('dl', { cls: 'cssrc-kv' });
  for (const [label, value] of [
    [t('g.css_damage'), num(d.damage)],
    [t('g.css_time'), t('g.css_minutes', { n: num(Math.round(d.seconds / 60)) })],
    [t('g.css_planted'), num(d.planted)],
    [t('g.css_defused'), num(d.defused)],
    [t('g.css_hostages'), num(d.hostages)],
  ]) kv.append(h('dt', { text: label }), h('dd', { text: value }));
  wrap.append(kv);

  if (d.guns.length) {
    const rack = h('div', { cls: 'cssrc-rack' });
    const top1 = Math.max(...d.guns.map((w) => w.kills), 1);
    for (const w of d.guns) {
      rack.append(h('div', { cls: 'cssrc-gun' },
        h('span', { cls: 'cssrc-gun-n', text: ts(w.name) }),
        fillBar('cssrc-gun-bar', (w.kills / top1) * 100),
        h('span', { cls: 'cssrc-gun-k', text: num(w.kills) })));
    }
    wrap.append(h('h2', { cls: 'cssrc-h', text: t('g.css_rack') }), rack);
  }
  root.append(wrap);
}

/* ── Counter-Strike 1.6, Condition Zero, Deleted Scenes ────────────────
   The three that publish nothing, and each is silent in its own way.
   1.6 is the original and predates all of it. Condition Zero was a
   single-player tour of duty nobody finished. Deleted Scenes is called
   Deleted Scenes. */

function renderCs16(g, root) {
  const wrap = h('div', { cls: 'cs16' });
  // The console, which in 2000 was where everything about a server lived.
  const con = h('section', { cls: 'cs16-console' });
  con.append(h('p', { cls: 'cs16-line' }, h('em', { text: '] ' }), txt('status')));
  for (const [k, v] of [
    ['hostname', 'Counter-Strike 1.6'],
    ['players', t('g.cs16_players')],
    ['stats', t('g.cs16_none')],
    ['achievements', t('g.cs16_none')],
    ['hours', `${hrs(g.record_hours)}`],
  ]) {
    con.append(h('p', { cls: 'cs16-kv' }, h('b', { text: k }), h('span', { text: v })));
  }
  con.append(h('p', { cls: 'cs16-line cs16-cursor' }, h('em', { text: '] ' })));
  wrap.append(con);
  wrap.append(bareFacts('cs16-facts', g));
  wrap.append(h('p', { cls: 'cs16-says', text: bareSays(g) }));
  root.append(wrap);
}

function renderCsCz(g, root) {
  const wrap = h('div', { cls: 'csz' });
  wrap.append(h('header', { cls: 'csz-head' },
    h('p', { cls: 'csz-kicker', text: t('g.csz_kicker') }),
    h('h1', { cls: 'csz-title' },
      h('b', { text: hrs(g.record_hours) }),
      h('em', { text: t(g.record_hours === 1 ? 'g.hour_logged' : 'g.hours_logged') }))));
  // The tour of duty: a briefing sheet with every objective unchecked.
  const sheet = h('div', { cls: 'csz-sheet' });
  for (const key of ['g.csz_o1', 'g.csz_o2', 'g.csz_o3', 'g.csz_o4']) {
    sheet.append(h('div', { cls: 'csz-obj' },
      h('i', { cls: 'csz-box' }),
      h('span', { text: t(key) })));
  }
  wrap.append(h('h2', { cls: 'csz-h', text: t('g.csz_briefing') }), sheet,
    h('p', { cls: 'csz-note', text: t('g.csz_note') }));
  wrap.append(bareFacts('csz-facts', g));
  wrap.append(h('p', { cls: 'csz-says', text: bareSays(g) }));
  root.append(wrap);
}

function renderCsCzDs(g, root) {
  const wrap = h('div', { cls: 'csd' });
  // A film reel, most of it on the cutting-room floor. The name of the game
  // is the joke and the page just agrees with it.
  const reel = h('div', { cls: 'csd-reel' });
  for (let i = 0; i < 8; i++) {
    reel.append(h('div', { cls: 'csd-frame', data: i === 3 ? { kept: '1' } : {} },
      i === 3 ? h('b', { text: hrs(g.record_hours) }) : h('i', { cls: 'csd-cut' })));
  }
  wrap.append(reel);
  wrap.append(h('p', { cls: 'csd-cap', text: t('g.csd_cap') }));
  wrap.append(bareFacts('csd-facts', g));
  wrap.append(h('p', { cls: 'csd-says', text: bareSays(g) }));
  root.append(wrap);
}

/* ── Counter-Strike Nexon - the other one ──────────────────────────────
   A free-to-play Counter-Strike full of zombies that most people do not know
   exists. Its 151 counters are named `SA2003`, `SA2056` and so on and say
   nothing whatsoever, so the page is built on the 196 achievements instead. */

function renderCsNexon(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'csn' });

  wrap.append(h('header', { cls: 'csn-head' },
    h('p', { cls: 'csn-kicker', text: t('g.csn_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'csn-title', text: t('g.n_of_n', { done: num(ach.unlocked), total: num(ach.total) }) })));

  // The horde: one mark per achievement, and almost all of them still coming.
  const horde = h('div', { cls: 'csn-horde' });
  const got = ach.list.slice();
  for (let i = 0; i < ach.total; i++) {
    const a = got[i];
    const mark = h('i', { cls: 'csn-mark' });
    if (a) { mark.dataset.down = '1'; mark.title = a.name; }
    horde.append(mark);
  }
  wrap.append(horde, h('p', { cls: 'csn-note',
    text: t('g.csn_note', { n: num(ach.total - ach.unlocked), total: num(ach.total) }) }));

  if (g.counters_note) wrap.append(h('p', { cls: 'csn-warn', text: ts(g.counters_note) }));
  if (ach.rarest.length) {
    wrap.append(h('h2', { cls: 'csn-h', text: t('g.rarest') }),
      achRows('csn-list', ach.rarest.slice(0, 8)));
  }
  root.append(wrap);
}

/* ══ Black Mesa and after ══════════════════════════════════════════════
   Eleven games, and seven of them publish nothing - the original, both
   expansions, both Source ports and the two deathmatch modes. They are not
   silent for the same reason as each other, though, and the pages say which:
   1998 predates Steam by five years, a port re-releases a game that had
   nothing to report the first time, and a deathmatch mode never had anything
   to report at all.

   Then Half-Life 2 and the episodes have an achievement set each, and Alyx
   has four hundred and forty counters about how you *moved* - which nothing
   else on this site can say, because no other game here had to ask whether
   walking would make you sick. */

/* ── Half-Life - the HEV suit ──────────────────────────────────────────
   The only readout this game ever gave anybody: orange numbers along the
   bottom of the screen. Health, suit, ammo. Here there is one reading and
   the rest of the panel is dark, which is exactly the state of the record. */

function renderHalfLife(g, root) {
  const wrap = h('div', { cls: 'hev' });

  const panel = h('section', { cls: 'hev-panel' });
  panel.append(h('div', { cls: 'hev-slot hev-slot--on' },
    h('span', { cls: 'hev-k', text: t('g.hl_time') }),
    h('b', { cls: 'hev-v', text: hrs(g.record_hours) })));
  for (const key of ['g.hl_stats', 'g.hl_achievements', 'g.hl_anything']) {
    panel.append(h('div', { cls: 'hev-slot' },
      h('span', { cls: 'hev-k', text: t(key) }),
      h('b', { cls: 'hev-v hev-v--off', text: t('g.hl_dashes') })));
  }
  wrap.append(panel);

  wrap.append(bareFacts('hev-facts', g));
  wrap.append(h('p', { cls: 'hev-says', text: bareSays(g) }));
  root.append(wrap);
}

/* ── Opposing Force and Blue Shift - the other two badges ──────────────
   Both expansions retell the same afternoon from somebody else's shift, so
   both pages are that person's ID: the soldier's dog tag and the guard's
   security card. Different objects, same empty payload. */

function renderHlBadge(g, root, kind) {
  const wrap = h('div', { cls: `hlb hlb--${kind}` });

  wrap.append(h('section', { cls: 'hlb-card' },
    h('p', { cls: 'hlb-org', text: t(`g.hl_${kind}_org`) }),
    h('h1', { cls: 'hlb-who', text: t(`g.hl_${kind}_who`) }),
    h('div', { cls: 'hlb-rows' },
      h('div', {}, h('span', { text: t('g.hl_assignment') }), h('b', { text: t(`g.hl_${kind}_role`) })),
      h('div', {}, h('span', { text: t('g.hl_time') }), h('b', { text: `${hrs(g.record_hours)} h` })),
      h('div', {}, h('span', { text: t('g.hl_filed') }), h('b', { text: t('g.hl_dashes') })))));

  wrap.append(bareFacts('hlb-facts', g));
  wrap.append(h('p', { cls: 'hlb-says', text: bareSays(g) }));
  root.append(wrap);
}

const renderHlOpfor = (g, root) => renderHlBadge(g, root, 'opfor');
const renderHlBlueshift = (g, root) => renderHlBadge(g, root, 'blueshift');

/* ── Half-Life: Source - the port plate ────────────────────────────────
   The same 1998 game recompiled on the 2004 engine. It reported nothing
   then and it reports nothing now, so the page is the version plate and the
   two dates on it. */

function renderHlSource(g, root) {
  const wrap = h('div', { cls: 'hls' });

  wrap.append(h('section', { cls: 'hls-plate' },
    h('div', { cls: 'hls-side' },
      h('b', { text: '1998' }), h('span', { text: t('g.hl_engine_gold') })),
    h('i', { cls: 'hls-arrow', attr: { 'aria-hidden': 'true' } }),
    h('div', { cls: 'hls-side' },
      h('b', { text: '2004' }), h('span', { text: t('g.hl_engine_source') }))));

  wrap.append(h('p', { cls: 'hls-read' },
    h('b', { text: hrs(g.record_hours) }),
    h('em', { text: t('g.hl_time') })));
  wrap.append(h('p', { cls: 'hls-cap', text: t('g.hl_source_cap') }));

  wrap.append(bareFacts('hls-facts', g));
  wrap.append(h('p', { cls: 'hls-says', text: bareSays(g) }));
  root.append(wrap);
}

/* ── Lost Coast - the commentary node ──────────────────────────────────
   Not a game: a twenty-minute technology demo that shipped to show off HDR,
   with Valve's developer commentary floating in it as little speech balloons
   you walk into. So the page is one of those balloons. */

function renderHlLostCoast(g, root) {
  const wrap = h('div', { cls: 'hlc' });

  wrap.append(h('section', { cls: 'hlc-node' },
    h('i', { cls: 'hlc-balloon', attr: { 'aria-hidden': 'true' } }),
    h('div', { cls: 'hlc-body' },
      h('p', { cls: 'hlc-k', text: t('g.hl_commentary') }),
      h('p', { cls: 'hlc-v' },
        h('b', { text: hrs(g.record_hours) }),
        h('em', { text: t('g.h_short') })),
      h('p', { cls: 'hlc-text', text: bareSays(g) }))));

  wrap.append(bareFacts('hlc-facts', g));
  root.append(wrap);
}

/* ── The two deathmatches - an empty scoreboard, an empty server list ───
   Neither ever had anything to report, and the two pages say that in the two
   places you would have looked for it in 2004. */

function renderHl2Dm(g, root) {
  const wrap = h('div', { cls: 'hdm' });
  const board = h('div', { cls: 'hdm-board' });
  board.append(h('div', { cls: 'hdm-row hdm-row--head' },
    h('span', { text: '#' }), h('span', { text: t('g.hl_player') }),
    h('span', { text: t('g.hl_score') }), h('span', { text: t('g.hl_ping') })));
  board.append(h('div', { cls: 'hdm-row hdm-row--you' },
    h('span', { text: '1' }), h('span', { text: t('g.hl_you') }),
    h('span', { text: t('g.hl_dashes') }), h('span', { text: t('g.hl_dashes') })));
  for (let i = 0; i < 5; i++) {
    board.append(h('div', { cls: 'hdm-row' },
      h('span', { text: `${i + 2}` }), h('span', { cls: 'hdm-empty' }),
      h('span', { cls: 'hdm-empty' }), h('span', { cls: 'hdm-empty' })));
  }
  wrap.append(board);
  wrap.append(h('p', { cls: 'hdm-read' },
    h('b', { text: hrs(g.record_hours) }), h('em', { text: t('g.hl_time') })));
  wrap.append(bareFacts('hdm-facts', g));
  wrap.append(h('p', { cls: 'hdm-says', text: bareSays(g) }));
  root.append(wrap);
}

function renderHldmSource(g, root) {
  const wrap = h('div', { cls: 'hsb' });
  const list = h('div', { cls: 'hsb-list' });
  list.append(h('div', { cls: 'hsb-row hsb-row--head' },
    h('span', { text: t('g.hl_server') }), h('span', { text: t('g.hl_map') }),
    h('span', { text: t('g.hl_players') })));
  list.append(h('div', { cls: 'hsb-row hsb-row--only' },
    h('span', { text: t('g.hl_this_account') }),
    h('span', { text: `${hrs(g.record_hours)} h` }),
    h('span', { text: t('g.hl_dashes') })));
  wrap.append(list);
  wrap.append(h('p', { cls: 'hsb-cap', text: t('g.hl_browser_cap') }));
  wrap.append(bareFacts('hsb-facts', g));
  wrap.append(h('p', { cls: 'hsb-says', text: bareSays(g) }));
  root.append(wrap);
}

/* ── Half-Life 2 - the gravity gun ─────────────────────────────────────
   The thing this game gave the medium. The coil charges with the completion
   and each unlock is something it picked up. */

function renderHalfLife2(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'hl2' });

  wrap.append(h('header', { cls: 'hl2-head' },
    h('p', { cls: 'hl2-kicker', text: t('g.hl2_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'hl2-title', text: t('g.n_of_n', { done: num(ach.unlocked), total: num(ach.total) }) })));

  const gun = h('div', { cls: 'hl2-gun' },
    h('i', { cls: 'hl2-claw hl2-claw--a', attr: { 'aria-hidden': 'true' } }),
    h('i', { cls: 'hl2-claw hl2-claw--b', attr: { 'aria-hidden': 'true' } }),
    h('div', { cls: 'hl2-core' }, h('b', { text: `${num(ach.completion, 1)}%` })));
  gun.style.setProperty('--charge', `${Math.min(100, ach.completion || 0)}%`);
  wrap.append(gun, h('p', { cls: 'hl2-charge-cap', text: t('g.hl2_charge') }));

  const held = h('div', { cls: 'hl2-held' });
  for (const a of ach.list) {
    held.append(h('div', { cls: 'hl2-item' },
      a.icon ? h('img', { attr: { src: a.icon, alt: '', loading: 'lazy' } }) : h('i'),
      h('div', {},
        h('b', { text: a.name }),
        h('span', { text: a.date ? shortDate(a.date) : t('g.no_date') }))));
  }
  wrap.append(h('h2', { cls: 'hl2-h', text: t('g.hl2_held') }), held);
  root.append(wrap);
}

/* ── Episode One - the Citadel, going up ───────────────────────────────
   Episode One is one building and one direction. Thirteen achievements,
   thirteen rungs. */

function renderHl2Ep1(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'ep1' });

  wrap.append(h('header', { cls: 'ep1-head' },
    h('p', { cls: 'ep1-kicker', text: t('g.ep1_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'ep1-title', text: t('g.n_of_n', { done: num(ach.unlocked), total: num(ach.total) }) })));

  const shaft = h('div', { cls: 'ep1-shaft' });
  const got = ach.list.slice();
  // Top of the list is the top of the Citadel, so the climb reads upward.
  for (let i = ach.total - 1; i >= 0; i--) {
    const a = got[i];
    const rung = h('div', { cls: 'ep1-rung' },
      h('i', { cls: 'ep1-mark' }),
      h('span', { cls: 'ep1-name', text: a ? a.name : t('g.ep1_dark') }),
      h('span', { cls: 'ep1-when', text: a && a.date ? shortDate(a.date) : '' }));
    if (a) rung.dataset.lit = '1';
    shaft.append(rung);
  }
  wrap.append(shaft, h('p', { cls: 'ep1-note', text: t('g.ep1_note') }));
  root.append(wrap);
}

/* ── Episode Two - the launch checklist ────────────────────────────────
   Episode Two ends with a rocket going up out of White Forest, and the whole
   episode is the countdown to it. So the achievements are the checklist. */

function renderHl2Ep2(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'ep2' });

  wrap.append(h('header', { cls: 'ep2-head' },
    h('p', { cls: 'ep2-kicker', text: t('g.ep2_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'ep2-title', text: t('g.n_of_n', { done: num(ach.unlocked), total: num(ach.total) }) }),
    fillBar('ep2-bar', ach.completion),
    h('p', { cls: 'ep2-bar-cap', text: t('g.ep2_ready', { pct: num(ach.completion, 1) }) })));

  const list = h('div', { cls: 'ep2-list' });
  const got = ach.list.slice();
  for (let i = 0; i < ach.total; i++) {
    const a = got[i];
    const row = h('div', { cls: 'ep2-row' },
      h('span', { cls: 'ep2-n', text: String(i + 1).padStart(2, '0') }),
      h('span', { cls: 'ep2-name', text: a ? a.name : t('g.ep2_pending') }),
      h('span', { cls: 'ep2-state', text: a ? t('g.ep2_go') : t('g.ep2_hold') }));
    if (a) row.dataset.go = '1';
    list.append(row);
  }
  wrap.append(list);
  root.append(wrap);
}

/* ── Half-Life: Alyx - how you moved ───────────────────────────────────
   Four hundred and forty counters and the interesting ones are not kills.
   Valve instrumented locomotion: minutes blinking, shifting or walking,
   which hand held the gun, how many times each chapter was teleported
   through. The three bands overlap on purpose - a minute is counted in a
   move type *and* a difficulty *and* a hand mode - so they are drawn as
   three separate readings of one clock and never added together. */

function renderAlyx(g, root) {
  const d = g.alyx;
  const ach = g.achievements;
  const wrap = h('div', { cls: 'alx' });

  wrap.append(h('header', { cls: 'alx-head' },
    h('p', { cls: 'alx-kicker', text: t('g.alyx_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'alx-title', text: t('g.alyx_title') })));

  const band = (title, rows) => {
    if (!rows.length) return null;
    const box = h('section', { cls: 'alx-band' }, h('h2', { text: title }));
    for (const r of rows) {
      box.append(h('div', { cls: 'alx-row' },
        h('span', { cls: 'alx-row-n', text: ts(r.label) }),
        fillBar('alx-row-bar', r.share),
        h('span', { cls: 'alx-row-v', text: t('g.alyx_min', { n: num(r.minutes) }) })));
    }
    return box;
  };
  const bands = h('div', { cls: 'alx-bands' });
  for (const b of [band(t('g.alyx_move'), d.move),
                   band(t('g.alyx_difficulty'), d.difficulty),
                   band(t('g.alyx_hands'), d.hands)]) if (b) bands.append(b);
  wrap.append(bands);
  wrap.append(h('p', { cls: 'alx-note', text: t('g.alyx_note') }));

  const extras = h('div', { cls: 'alx-extras' });
  for (const [label, value] of [
    [t('g.alyx_teleports'), num(d.teleports)],
    [t('g.alyx_quick_on'), t('g.alyx_min', { n: num(d.quick_on) })],
    [t('g.alyx_quick_off'), t('g.alyx_min', { n: num(d.quick_off) })],
    [t('g.alyx_bottles'), num(d.bottles)],
  ]) extras.append(h('div', { cls: 'alx-extra' }, h('b', { text: value }), h('span', { text: label })));
  wrap.append(extras);

  if (ach && ach.rarest.length) {
    wrap.append(h('h2', { cls: 'alx-h', text: t('g.rarest') }),
      achRows('alx-list', ach.rarest.slice(0, 8)));
  }
  root.append(wrap);
}

/* ══ The rest of Liberty City, Vice City and Los Santos ════════════════
   Four of these publish nothing - the three PS2-era games and the episodes
   pack - and three publish an achievement set. The Definitive Editions are
   the awkward case: they are the same three games again, so they had to be
   told apart from their originals by what the remaster actually is, which is
   a re-release with achievements bolted on. */

/* ── GTA III (2001) - the radar ────────────────────────────────────────
   The first 3D one, and the only screen it ever kept was the corner of it:
   a round radar, two bars and a row of stars. Nothing else was recorded. */

function renderGta3(g, root) {
  const wrap = h('div', { cls: 'g3c' });

  wrap.append(h('section', { cls: 'g3c-hud' },
    h('div', { cls: 'g3c-radar' },
      h('i', { cls: 'g3c-blip', attr: { 'aria-hidden': 'true' } })),
    h('div', { cls: 'g3c-right' },
      h('div', { cls: 'g3c-stars' },
        ...Array.from({ length: 6 }, () => h('i', { cls: 'g3c-star' }))),
      h('p', { cls: 'g3c-read' },
        h('b', { text: hrs(g.record_hours) }),
        h('em', { text: t('g.h_short') })),
      h('div', { cls: 'g3c-bars' },
        h('i', { cls: 'g3c-bar g3c-bar--hp' }),
        h('i', { cls: 'g3c-bar g3c-bar--armour' })))));

  wrap.append(h('p', { cls: 'g3c-cap', text: t('g.gta3_cap') }));
  wrap.append(bareFacts('g3c-facts', g));
  wrap.append(h('p', { cls: 'g3c-says', text: bareSays(g) }));
  root.append(wrap);
}

/* ── Vice City (2002) - the sunset ─────────────────────────────────────
   No stats and no achievements, and one of the most recognisable colour
   schemes ever put on a box. That is the page. */

function renderGtaVc(g, root) {
  const wrap = h('div', { cls: 'gvc' });

  wrap.append(h('section', { cls: 'gvc-sky' },
    h('i', { cls: 'gvc-sun', attr: { 'aria-hidden': 'true' } }),
    h('i', { cls: 'gvc-palm gvc-palm--a', attr: { 'aria-hidden': 'true' } }),
    h('i', { cls: 'gvc-palm gvc-palm--b', attr: { 'aria-hidden': 'true' } }),
    h('div', { cls: 'gvc-plate' },
      h('b', { text: hrs(g.record_hours) }),
      h('span', { text: t('g.h_short') }))));

  wrap.append(bareFacts('gvc-facts', g));
  wrap.append(h('p', { cls: 'gvc-says', text: bareSays(g) }));
  root.append(wrap);
}

/* ── San Andreas (2004) - the tag ──────────────────────────────────────
   The Definitive Edition already has the stat screen on this site, so the
   original gets the other thing this game made you do a hundred times: find
   a wall and paint over somebody else's tag. */

function renderGtaSaClassic(g, root) {
  const wrap = h('div', { cls: 'gsc' });

  wrap.append(h('section', { cls: 'gsc-wall' },
    h('div', { cls: 'gsc-tag' },
      h('b', { text: hrs(g.record_hours) }),
      h('span', { text: t('g.gsa_tagged') }))));

  wrap.append(h('p', { cls: 'gsc-cap', text: t('g.gsa_cap') }));
  wrap.append(bareFacts('gsc-facts', g));
  wrap.append(h('p', { cls: 'gsc-says', text: bareSays(g) }));
  root.append(wrap);
}

/* ── Episodes from Liberty City - two of them, in one box ──────────────
   Two standalone episodes sold together, and neither publishes anything. So
   the page is the box: two halves, one clock, and no record from either. */

function renderGtaEflc(g, root) {
  const wrap = h('div', { cls: 'gef' });
  const pair = h('div', { cls: 'gef-pair' });
  for (const key of ['g.eflc_lost', 'g.eflc_tony']) {
    pair.append(h('section', { cls: 'gef-half', data: { ep: key.slice(-4) } },
      h('h2', { text: t(key) }),
      h('p', { cls: 'gef-none', text: t('g.st_no_record') })));
  }
  wrap.append(pair);
  wrap.append(h('p', { cls: 'gef-read' },
    h('b', { text: hrs(g.record_hours) }),
    h('em', { text: t('g.eflc_between') })));
  wrap.append(bareFacts('gef-facts', g));
  wrap.append(h('p', { cls: 'gef-says', text: bareSays(g) }));
  root.append(wrap);
}

/* ── The two Definitive Editions with a page of their own ──────────────
   III gets Liberty City as a marker map; Vice City gets its radio, because
   that is the thing people actually kept from it. Both are built on the
   achievement sets the originals never had. */

function renderGta3De(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'g3d' });

  wrap.append(h('header', { cls: 'g3d-head' },
    h('p', { cls: 'g3d-kicker', text: t('g.g3d_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'g3d-title', text: t('g.n_of_n', { done: num(ach.unlocked), total: num(ach.total) }) })));

  // Three islands, and the unlocks pinned across them in the order Liberty
  // City opens up.
  const map = h('div', { cls: 'g3d-map' });
  const per = Math.ceil(ach.total / 3) || 1;
  ['Portland', 'Staunton Island', 'Shoreside Vale'].forEach((island, i) => {
    const zone = h('section', { cls: 'g3d-isle' }, h('h2', { text: island }));
    const pins = h('div', { cls: 'g3d-pins' });
    for (let n = i * per; n < Math.min(ach.total, (i + 1) * per); n++) {
      const a = ach.list[n];
      const pin = h('i', { cls: 'g3d-pin' });
      if (a) { pin.dataset.on = '1'; pin.title = a.name; }
      pins.append(pin);
    }
    zone.append(pins);
    map.append(zone);
  });
  wrap.append(map, h('p', { cls: 'g3d-note', text: t('g.g3d_note') }));

  if (ach.rarest.length) {
    wrap.append(h('h2', { cls: 'g3d-h', text: t('g.rarest') }),
      achRows('g3d-list', ach.rarest.slice(0, 8)));
  }
  root.append(wrap);
}

const VC_STATIONS = ['Flash FM', 'V-Rock', 'Wave 103', 'Fever 105', 'Emotion 98.3',
  'Radio Espantoso', 'Wildstyle', 'VCPR'];

function renderGtaVcDe(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'gvd' });

  wrap.append(h('header', { cls: 'gvd-head' },
    h('p', { cls: 'gvd-kicker', text: t('g.gvd_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'gvd-title', text: t('g.n_of_n', { done: num(ach.unlocked), total: num(ach.total) }) })));

  // The dial, with the completion as the tuner.
  const dial = h('div', { cls: 'gvd-dial' });
  for (const name of VC_STATIONS) dial.append(h('span', { cls: 'gvd-station', text: name }));
  const needle = h('i', { cls: 'gvd-needle' });
  needle.style.left = `${Math.min(100, ach.completion || 0)}%`;
  dial.append(needle);
  wrap.append(dial, h('p', { cls: 'gvd-cap', text: t('g.gvd_cap', { pct: num(ach.completion, 1) }) }));

  const tape = h('div', { cls: 'gvd-tape' });
  for (const a of ach.list) {
    tape.append(h('div', { cls: 'gvd-track' },
      h('b', { text: a.name }),
      h('span', { text: a.date ? shortDate(a.date) : t('g.no_date') })));
  }
  wrap.append(h('h2', { cls: 'gvd-h', text: t('g.gvd_tracklist') }), tape);
  root.append(wrap);
}

/* ── GTA V Enhanced - the switch wheel ─────────────────────────────────
   The legacy release already has the pause menu on this site, so this one
   takes the other thing only GTA V has: the radial that swaps between three
   people mid-sentence. Its stat block is `Stat_ACH10`…`Stat_ACH50`, which is
   achievement progress, so the wheel is drawn from the achievements. */

function renderGtaVEnhanced(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'g5e' });

  wrap.append(h('header', { cls: 'g5e-head' },
    h('p', { cls: 'g5e-kicker', text: t('g.g5e_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'g5e-title', text: t('g.n_of_n', { done: num(ach.unlocked), total: num(ach.total) }) })));

  const wheel = h('div', { cls: 'g5e-wheel' });
  const per = Math.ceil(ach.total / 3) || 1;
  [['Michael', 'm'], ['Franklin', 'f'], ['Trevor', 't']].forEach(([who, tone], i) => {
    const slice = ach.list.slice(i * per, (i + 1) * per);
    const arm = h('section', { cls: 'g5e-arm', data: { who: tone } },
      h('h2', { text: who }),
      h('b', { text: `${num(slice.length)} / ${num(Math.min(per, ach.total - i * per))}` }));
    wheel.append(arm);
  });
  wrap.append(wheel, h('p', { cls: 'g5e-note', text: t('g.g5e_note') }));

  if (g.counters_note) wrap.append(h('p', { cls: 'g5e-warn', text: ts(g.counters_note) }));
  if (ach.rarest.length) {
    wrap.append(h('h2', { cls: 'g5e-h', text: t('g.rarest') }),
      achRows('g5e-list', ach.rarest.slice(0, 8)));
  }
  root.append(wrap);
}

/* ══ The two Armas that were missing, and the two that shared a plate ═══ */

/* ── Cold War Assault - the game that had to change its name ───────────
   This shipped in 2001 as Operation Flashpoint: Cold War Crisis. Codemasters
   kept the name in the split, so in 2011 Bohemia renamed their own game.
   That is the only story Steam can tell about it, and it is a good one. */

function renderArmaCwa(g, root) {
  const wrap = h('div', { cls: 'acw' });

  wrap.append(h('section', { cls: 'acw-plate' },
    h('p', { cls: 'acw-was' }, h('s', { text: 'Operation Flashpoint: Cold War Crisis' })),
    h('p', { cls: 'acw-now', text: 'ARMA: Cold War Assault' }),
    h('p', { cls: 'acw-year', text: t('g.acw_years') })));

  wrap.append(h('p', { cls: 'acw-read' },
    h('b', { text: hrs(g.record_hours) }),
    h('em', { text: t('g.hl_time') })));
  wrap.append(bareFacts('acw-facts', g));
  wrap.append(h('p', { cls: 'acw-says', text: bareSays(g) }));
  root.append(wrap);
}

/* ── ARMA: Gold Edition - two discs in one box ─────────────────────────
   Armed Assault plus Queen's Gambit, bundled. Neither half reports
   anything, so the page is the box and both discs are blank. */

function renderArmaGold(g, root) {
  const wrap = h('div', { cls: 'agd' });
  const discs = h('div', { cls: 'agd-discs' });
  for (const key of ['g.agd_base', 'g.agd_dlc']) {
    discs.append(h('div', { cls: 'agd-disc' },
      h('i', { cls: 'agd-hole', attr: { 'aria-hidden': 'true' } }),
      h('b', { text: t(key) }),
      h('span', { text: t('g.st_no_record') })));
  }
  wrap.append(discs);
  wrap.append(h('p', { cls: 'agd-read' },
    h('b', { text: hrs(g.record_hours) }),
    h('em', { text: t('g.agd_across') })));
  wrap.append(bareFacts('agd-facts', g));
  wrap.append(h('p', { cls: 'agd-says', text: bareSays(g) }));
  root.append(wrap);
}

/* ── Arma 2, the other appid - the duplicate entry ─────────────────────
   Steam carries Arma 2 twice, under two appids, and a library can hold
   either. Neither publishes anything, so the page is about the one fact
   that distinguishes this entry from the other: that there are two. */

function renderArma2Alt(g, root) {
  const wrap = h('div', { cls: 'a2a' });
  const rows = h('div', { cls: 'a2a-shelf' });
  for (const [id, here] of [['33900', true], ['33910', false]]) {
    const row = h('div', { cls: 'a2a-row' },
      h('b', { text: 'Arma 2' }),
      h('span', { cls: 'a2a-id', text: `appid ${id}` }),
      h('span', { cls: 'a2a-tag', text: here ? t('g.a2a_this') : t('g.a2a_other') }));
    if (here) row.dataset.here = '1';
    rows.append(row);
  }
  wrap.append(rows);
  wrap.append(h('p', { cls: 'a2a-read' },
    h('b', { text: hrs(g.record_hours) }),
    h('em', { text: t('g.a2a_on_this_one') })));
  wrap.append(bareFacts('a2a-facts', g));
  wrap.append(h('p', { cls: 'a2a-says', text: bareSays(g) }));
  root.append(wrap);
}

/* ── Arma Tactics - the turn grid ──────────────────────────────────────
   The only turn-based thing with Arma on it. Its counters are tiered steps
   of single achievements (`KILLER`, `MASTER_KILLER`, `UBER_MASTER_KILLER`),
   so the page is built on the achievements and drawn as the board. */

function renderArmaTactics(g, root) {
  const ach = g.achievements;
  const wrap = h('div', { cls: 'atc' });

  wrap.append(h('header', { cls: 'atc-head' },
    h('p', { cls: 'atc-kicker', text: t('g.atc_kicker', { h: hrs(g.record_hours) }) }),
    h('h1', { cls: 'atc-title', text: t('g.n_of_n', { done: num(ach.unlocked), total: num(ach.total) }) })));

  const board = h('div', { cls: 'atc-board' });
  const got = ach.list.slice();
  for (let i = 0; i < ach.total; i++) {
    const a = got[i];
    const cell = h('div', { cls: 'atc-cell' });
    if (a) { cell.dataset.held = '1'; cell.title = a.name; cell.append(h('i')); }
    board.append(cell);
  }
  wrap.append(board, h('p', { cls: 'atc-note', text: t('g.atc_note') }));

  if (g.counters_note) wrap.append(h('p', { cls: 'atc-warn', text: ts(g.counters_note) }));
  if (ach.rarest.length) {
    wrap.append(h('h2', { cls: 'atc-h', text: t('g.rarest') }),
      achRows('atc-list', ach.rarest.slice(0, 6)));
  }
  root.append(wrap);
}

const LAYOUTS = {
  'dota-2': renderDota,
  'counter-strike-2': renderCs2,
  'arma-3': renderArma3,
  'war-thunder': renderWarThunder,
  'call-of-duty': renderCod,
  'skyrim': renderSkyrim,
  'ets2': renderEts2,
  'msfs': renderMsfs,
  'gta-v': renderGta,
  'arma-2-oa': renderArma2Oa,
  'valheim': renderValheim,
  'gta-iv': renderGta4,
  'arma-2': renderArma2,
  'no-mans-sky': renderNms,
  'apex': renderApex,
  'ready-or-not': renderReadyOrNot,
  'cities-skylines': renderCities,
  'payday-2': renderPayday,
  'gta-sa': renderGtaSa,
  'realm-royale': renderRealmRoyale,
  'dayz': renderDayz,
  'garrys-mod': renderGmod,
  'ats': renderAts,
  'f1-2015': renderF1,
  'tf2': renderTf2,
  'rust': renderRust,
  'dbd': renderDbd,
  'stardew': renderStardew,
  'poe': renderPoe,
  'sts2': renderSts2,
  'vrchat': renderVrchat,
  'palworld': renderPalworld,
  'pubg': renderPubg,
  'isaac': renderIsaac,
  'marvel-rivals': renderMarvelRivals,
  'bf6': renderBf6,
  'warframe': renderWarframe,
  'bg3': renderBg3,
  'delta-force': renderDeltaForce,
  'r6': renderR6,
  'geometry-dash': renderGeometryDash,
  'cyberpunk': renderCyberpunk,
  'overwatch': renderOverwatch,
  // Ranks 25–100.
  'clicker-heroes': renderClicker,
  'infestation': renderInfestation,
  'unturned': renderUnturned,
  'insurgency': renderInsurgency,
  'mighty-quest': renderMightyQuest,
  'reforger': renderReforger,
  'sandstorm': renderSandstorm,
  'cats': renderCats,
  'spec-ops': renderSpecOps,
  'besiege': renderBesiege,
  'tribal-wars': renderTribalWars,
  'the-forest': renderForest,
  'geoguessr': renderGeoguessr,
  'strife': renderStrife,
  'business-tour': renderBusinessTour,
  'rdr2': renderRdr2,
  'dying-light': renderDyingLight,
  'banana': renderBanana,
  'sea-of-thieves': renderSeaOfThieves,
  'phasmophobia': renderPhasmophobia,
  'sniper-elite-v2': renderSniperElite,
  'egg-surprise': renderEggSurprise,
  'adventure-capitalist': renderAdVenture,
  'police-sim': renderPoliceSim,
  'shapez': renderShapez,
  'vampire-survivors': renderVampireSurvivors,
  'paladins': renderPaladins,
  'brawlhalla': renderBrawlhalla,
  'yakuza-kiwami': renderYakuzaKiwami,
  'vermintide-2': renderVermintide,
  'fall-guys': renderFallGuys,
  'yakuza-0': renderYakuza0,
  'outlast': renderOutlast,
  'yakuza-0-dc': renderYakuza0Dc,
  'tap-ninja': renderTapNinja,
  // The last thirty-nine. Four shapes, thirty-nine palettes, thirty-nine lines.
  // The set: an achievement list that exists and was never opened.
  'trove': renderBareSet,
  'beamng': renderBareSet,
  'shapez-2': renderBareSet,
  'planetary-annihilation': renderBareSet,
  'ace-of-words': renderBareSet,
  'alter-world': renderBareSet,
  'nyctophobia': renderBareSet,
  'lowglow': renderBareSet,
  'on-a-roll-3d': renderBareSet,
  'make-it-indie': renderBareSet,
  'rhinos-rage': renderBareSet,
  'woodle-tree': renderBareSet,
  'apb': renderBareSet,
  'dsx': renderBareSet,
  // The notice: online-only, and the servers are gone.
  'ghost-recon-phantoms': renderBareOffline,
  'ring-of-elysium': renderBareOffline,
  'deadbreed': renderBareOffline,
  // The plate: one carved object with the hours on it.
  'spore': renderBarePlate,
  'neverwinter': renderBarePlate,
  'stronghold-kingdoms': renderBarePlate,
  'eso': renderEso,
  'bfbc2': renderBfbc2,
  'deadlock': renderBarePlate,
  'x-blades': renderBarePlate,
  'endorlight': renderBarePlate,
  'dota-underlords': renderBarePlate,
  'two-worlds': renderBarePlate,
  'morrowind': renderMorrowind,
  // The readout: the five you sit inside.
  'ets1': renderBareReadout,
  'street-racing-syndicate': renderBareReadout,
  'vtol-vr': renderBareReadout,
  'contractors-vr': renderBareReadout,
  // The screen: one line, given the whole page.
  'project-zomboid': renderBareScreen,
  // The Zone. Seven games, seven layouts, nothing shared below the status bar
  // - see the block above for why each one is the shape it is.
  'stalker-soc': renderStalkerPda,
  'stalker-cs': renderStalkerWar,
  'stalker-cop': renderStalkerDetector,
  'stalker-2': renderStalker2,
  'stalker-soc-ee': renderStalkerCase,
  'stalker-cs-ee': renderStalkerSwamp,
  'stalker-cop-ee': renderStalkerRegions,
  'repo': renderRepo,
  // Left 4 Dead and the other Counter-Strikes.
  'l4d1': renderL4d1,
  'l4d2': renderL4d2,
  'cs-source': renderCss,
  'cs-16': renderCs16,
  'cs-cz': renderCsCz,
  'cs-cz-ds': renderCsCzDs,
  'cs-nexon': renderCsNexon,
  // Black Mesa and after.
  'half-life': renderHalfLife,
  'hl-opfor': renderHlOpfor,
  'hl-blueshift': renderHlBlueshift,
  'hl-source': renderHlSource,
  'hl-lostcoast': renderHlLostCoast,
  'hl2-dm': renderHl2Dm,
  'hldm-source': renderHldmSource,
  'half-life-2': renderHalfLife2,
  'hl2-ep1': renderHl2Ep1,
  'hl2-ep2': renderHl2Ep2,
  'alyx': renderAlyx,
  // The rest of Liberty City, and the last four Armas.
  'gta-iii': renderGta3,
  'gta-vc': renderGtaVc,
  'gta-sa-classic': renderGtaSaClassic,
  'gta-eflc': renderGtaEflc,
  'gta-iii-de': renderGta3De,
  'gta-vc-de': renderGtaVcDe,
  'gta-v-enhanced': renderGtaVEnhanced,
  'arma-cwa': renderArmaCwa,
  'arma-gold': renderArmaGold,
  'arma-2-alt': renderArma2Alt,
  'arma-tactics': renderArmaTactics,
  // Tamriel. Eleven games, eleven layouts - the three Skyrims included,
  // which share one achievement set and are told apart by what each
  // release actually was rather than by data none of them has.
  'tes-arena': renderTesArena,
  'tes-daggerfall': renderTesDaggerfall,
  'tes-battlespire': renderTesBattlespire,
  'tes-redguard': renderTesRedguard,
  'oblivion': renderOblivion,
  'oblivion-remastered': renderOblivionRemastered,
  'skyrim-2011': renderSkyrim2011,
  'skyrim-vr': renderSkyrimVr,
  'retention': renderBareScreen,
  'generic': renderGeneric,
};

/* ── The cover ────────────────────────────────────────────────────────
   Every page opens on the game's own key art. It comes from the payload's
   `art` - `library_hero.jpg`, falling back to the small `header.jpg` for the
   handful of old or delisted apps that never had a hero - and it is served
   straight from Steam's CDN, which the CSP already allows for images.

   It is not player data, which is exactly why it can be here: it is the one
   thing on a page about a game nobody played that is still about that game.

   Some layouts already put the art somewhere better than a band at the top -
   Dota hangs a hero portrait behind its scoreboard, the shut-down notices and
   the one-line screens run it full-bleed behind the text, Bad Company 2 uses
   it as the wall. Those keep what they have. */

const ART_OWN = new Set([
  'dota-2', 'sts2', 'bfbc2',
  'ghost-recon-phantoms', 'ring-of-elysium', 'deadbreed',
  'project-zomboid', 'stalker-soc', 'stalker-cs', 'retention',
]);

function artBand(g) {
  if (!g.art) return null;
  const band = h('div', { cls: 'art-band' });
  const img = h('img', {
    attr: { src: g.art, alt: '', 'aria-hidden': 'true', loading: 'eager' },
  });
  // Which variant came back is the server's decision now, so it is read off
  // the pixels: the small header is 460 wide and has to be handled as
  // atmosphere rather than as art.
  img.addEventListener('load', () => {
    if (img.naturalWidth && img.naturalWidth < 600) band.dataset.small = '1';
  });
  // No art for this app at all. Drop the band rather than leave a broken frame.
  img.addEventListener('error', () => band.remove());
  band.append(img);
  return band;
}

/* ── What it costs ────────────────────────────────────────────────────
   Every page ends with a price. The whole of it is split in two on purpose:

     the numbers and the state, decided once, here, and shared;
     the shape and the words, written per game, in PRICES.

   That split is what keeps a hundred and twenty-eight bespoke blocks from
   becoming one block copied a hundred and twenty-eight times. A bespoke
   block takes `(f)` and nothing else - it never sees `g`. It cannot reach
   the achievement data, so it cannot break on a page that had none; it
   cannot reach the themed payload, so it cannot grow into a second layout.
   All it can express is furniture and a sentence, which is precisely the
   part that is supposed to differ between games.

   The seven states come from the server (see meta._state), and so does the
   rule that a discount too old to trust is not repeated. Nothing here can
   opt out of that, which is the point of deciding it there. */

/** Everything a price block is allowed to know, already decided and already
 *  formatted. Built once per page and handed to whichever block draws it. */
function priceFacts(p, g) {
  const cur = p.currency;
  const per = (g.record_hours && p.price) ? Math.round(p.price / g.record_hours) : null;
  return {
    state: p.state,
    stale: !!p.stale,
    theme: g.theme,
    name: g.name,
    appid: g.appid,
    now: p.price != null ? cash(p.price, cur) : null,
    was: p.initial != null ? cash(p.initial, cur) : null,
    off: p.discount ? `-${p.discount}%` : null,
    saved: (p.initial != null && p.price != null) ? cash(p.initial - p.price, cur) : null,
    // The raw percentage as well, for a block that wants to draw it rather
    // than print it - a bar, a magnitude, a dial.
    cut: p.discount || 0,
    hours: g.record_hours || 0,
    hoursText: hrs(g.record_hours),
    // The one number that is about *this game* rather than about Steam, and
    // the reason a price belongs on a page that is otherwise a count of hours.
    perHour: per != null ? cash(per, cur) : null,
    year: p.year,
    cc: (p.country || 'br').toUpperCase(),
    checked: p.checked_at ? stamp(p.checked_at) : null,
    url: `https://store.steampowered.com/app/${g.appid}/`,
  };
}

/* The vocabulary. Each returns null when it does not apply, and h() skips null
   children, so a block never has to branch. Each also carries a shared class
   beside the theme's own - that is where the sale styling and the motion
   contract hang, written once and inherited by every block that uses them. */
const priceNow = (cls, f) => (f.now ? h('b', { cls: `pz-num ${cls}`, text: f.now }) : null);
const priceWas = (cls, f) => (f.was && f.off ? h('s', { cls: `pz-old ${cls}`, text: f.was }) : null);
const priceOff = (cls, f) => (f.off ? h('em', { cls: `pz-cut ${cls}`, text: f.off }) : null);
const priceRate = (cls, f) => (f.perHour
  ? h('p', { cls: `pz-rate ${cls}`, text: t('g.p_per_hour', f) }) : null);
const priceLink = (cls, f) => h('a', {
  cls: `pz-link ${cls}`, text: t('g.p_store'),
  attr: { href: f.url, rel: 'noopener noreferrer', target: '_blank' },
});
const priceFoot = (cls, f) => h('p', { cls: `pz-foot ${cls}`,
  text: t(f.checked ? (f.stale ? 'g.p_stale' : 'g.p_read') : 'g.p_unread', f) });

/** The sentence this game says about this state, if it has been written one.
 *  A theme opts in by adding the key and falls back to the shared line when it
 *  has not - so most of the hundred and twenty-eight need no Javascript at all:
 *  their voice is a string in dict.js, in three languages, and nothing more.
 *  Same trick as bareSays(), and for the same reason. */
function priceSays(f, state) {
  const which = state || f.state;
  const own = `g.p_${f.theme.replace(/-/g, '_')}_${which}`;
  const said = t(own, f);
  return said === own ? t(`g.p_${which}`, f) : said;
}

/* ── The blocks that belong to one game each ──────────────────────────
   Each of these takes `(f)` and returns an element. None of them takes `g`,
   and that is enforced by nothing but this comment and the reviewer - so:
   a block that reaches for `g` is a block that has stopped being a price and
   started being a second layout, and it should be sent back.

   Each one is also built out of furniture its own page already owns. A block
   made of five brand-new classes is a template wearing a new prefix; a block
   made of the buy menu, or the logbook, or the sky, is that page finishing a
   sentence it had already started. */

/* Dota 2 - the clock, because there is no price.
   Free to play, so the number this page can put on the game is not money at
   all. It is the same clock the rest of the page is about, set against what
   the game would have cost if Valve had ever charged for it: nothing. */
function priceDota(f) {
  return h('section', { cls: 'd-price' },
    h('p', { cls: 'd-kicker', text: t('g.p_head') }),
    h('div', { cls: 'd-price-clock' },
      priceNow('d-price-n', f) || h('b', { cls: 'pz-num d-price-n', text: t('g.p_d_nothing') }),
      h('span', { cls: 'd-price-sep', text: '/' }),
      h('b', { cls: 'd-price-hours', text: `${f.hoursText} h` })),
    h('p', { cls: 'd-even-note', text: priceSays(f) }),
    priceFoot('d-price-foot', f));
}

/* Counter-Strike 2 - the last line of the buy menu.
   Everything else on this page is priced in kills. This one thing is priced
   in money, so it goes where CS2 has always put money: the amber HUD cell
   that has held the round's cash since 1999, with the game itself sitting in
   the buy menu as the one entry that is not a gun. */
function priceCs2(f) {
  return h('section', { cls: 'cs-price' },
    h('h2', { cls: 'cs-h', text: t('g.p_head') }),
    h('div', { cls: 'cs-guns cs-price-rack' },
      h('article', { cls: 'cs-gun cs-price-item' },
        h('span', { cls: 'cs-gun-name', text: f.name }),
        priceNow('cs-price-now', f) || h('b', { cls: 'pz-num cs-price-now', text: t('g.p_cs_free') }),
        h('span', { cls: 'cs-price-cut' }, priceWas('cs-price-old', f), priceOff('cs-price-off', f)))),
    h('div', { cls: 'cs-hud cs-price-hud' },
      h('div', { cls: 'cs-hud-cell cs-hud-cell--money' },
        h('span', { text: t('g.p_cs_hour') }), h('b', { text: f.perHour || '$0' })),
      h('div', { cls: 'cs-hud-cell' },
        h('span', { text: t('g.p_cs_clock') }), h('b', { text: `${f.hoursText} h` }))),
    h('p', { cls: 'cs-price-note', text: priceSays(f) }),
    priceFoot('cs-price-foot', f));
}

/* Arma 3 - one more line in the briefing.
   The page is a mission brief with a map and a legend. A price is logistics,
   so it arrives the way logistics arrive in a brief: as a SUPPORT line under
   the objectives, in the same monospace, with the same square marker. */
function priceArma3(f) {
  const marker = h('i', { cls: 'a3-price-marker', attr: { 'aria-hidden': 'true' } });
  if (f.cut) marker.dataset.hot = '1';
  return h('section', { cls: 'a3-brief a3-price' },
    h('h2', { cls: 'a3-h', text: t('g.p_a3_head') }),
    h('div', { cls: 'a3-price-row' },
      marker,
      h('span', { cls: 'a3-price-label', text: t('g.p_a3_label') }),
      priceNow('a3-price-n', f), priceWas('a3-price-old', f), priceOff('a3-price-off', f)),
    // No priceRate here: this game's own sentence already carries the rate,
    // and the shared line would say it a second time in different words.
    h('p', { cls: 'a3-price-brief', text: priceSays(f) }),
    priceFoot('a3-price-foot', f));
}

/* War Thunder - a node in the tree, and the only one bought with money.
   Every other node on this page is unlocked by grinding. This one is not,
   and the gauge beside it fills with the discount rather than with progress
   - the one place on the page where the bar means "cheaper" instead of
   "closer". */
function priceWarThunder(f) {
  const node = h('div', { cls: 'wt-node wt-price-node' },
    h('div', { cls: 'wt-node-text' },
      h('b', { text: f.name }),
      h('span', { text: priceSays(f) })),
    h('div', { cls: 'wt-price-tag' },
      priceNow('wt-price-n', f), priceWas('wt-price-old', f), priceOff('wt-price-off', f)));
  if (f.cut) node.dataset.hot = '1';
  return h('section', { cls: 'wt-price' },
    h('h2', { cls: 'wt-h', text: t('g.p_head') }),
    node,
    // The gauge is the discount, drawn. It only appears when there is a price
    // for it to be a discount off: this game is free, so on its own page the
    // bar is absent rather than empty - an empty bar would read as "zero
    // progress" on a page made of progress bars, which is the one thing it
    // does not mean.
    f.now ? fillBar('wt-price-bar', f.cut) : null,
    f.now ? h('p', { cls: 'wt-note', text: t(f.cut ? 'g.p_wt_off' : 'g.p_wt_full', f) }) : null,
    priceFoot('wt-price-foot', f));
}

/* Call of Duty - stamped on the tag.
   The page's one object is a dog tag. A tag carries a name, a number and a
   date, stamped in a line - so the price is stamped into it as one more
   line, in the same face, at the same size. */
function priceCod(f) {
  return h('section', { cls: 'cod-price' },
    h('div', { cls: 'cod-tag cod-price-tag' },
      h('p', { cls: 'cod-tag-line', text: f.name }),
      h('p', { cls: 'cod-tag-line cod-price-n' }, priceNow('', f) || txt(t('g.p_cod_none'))),
      h('p', { cls: 'cod-tag-meta' },
        priceWas('cod-price-old', f), priceOff('cod-price-off', f),
        txt(f.off ? '' : `${f.hoursText} h`))),
    h('p', { cls: 'cod-lede', text: priceSays(f) }),
    priceFoot('cod-price-foot', f));
}

/* Skyrim - one more star, and it is not an achievement.
   The barter window is the obvious place for a price, and it is the wrong
   one: this page is a sky, not a menu, and a shopkeeper's grid at the foot
   of it would be a second design on one page. So the price hangs where
   everything else on this page hangs, and it burns brighter the deeper the
   cut - the only ranking a sky has ever been able to show. */
function priceSkyrim(f) {
  const star = h('b', { cls: 'pz-num sk-price-star', text: f.now || t('g.p_sk_none') });
  // CSP forbids a style attribute, so magnitude goes through the CSSOM.
  star.style.setProperty('--mag', String(0.42 + (f.cut / 100) * 0.58));
  return h('section', { cls: 'sk-price' },
    h('h2', { cls: 'sk-h', text: t('g.p_head') }),
    h('figure', { cls: 'sk-sky sk-price-sky' },
      h('i', { cls: 'sk-aurora', attr: { 'aria-hidden': 'true' } }),
      h('div', { cls: 'sk-price-hang' }, star,
        priceWas('sk-price-old', f), priceOff('sk-price-off', f)),
      h('figcaption', { cls: 'sk-cap sk-price-cap', text: priceSays(f) })),
    // Same as Arma: the caption already says what an hour of it cost.
    priceFoot('sk-price-foot', f));
}

/* Microsoft Flight Simulator - the last row of the logbook.
   A logbook is a list of what a thing cost you: hours, fuel, landings. This
   page already is one, so the price is the row at the bottom of it, in the
   same columns, dated like the rest. */
function priceMsfs(f) {
  return h('section', { cls: 'fs-panel fs-price' },
    h('h2', { cls: 'fs-h', text: t('g.p_fs_head') }),
    h('div', { cls: 'fs-log fs-price-log' },
      h('span', { cls: 'fs-log-date', text: f.year ? String(f.year) : '—' }),
      h('span', { cls: 'fs-price-name', text: f.name }),
      h('span', { cls: 'fs-price-fig' },
        priceNow('fs-price-n', f) || h('b', { cls: 'pz-num', text: t('g.p_fs_none') }),
        priceWas('fs-price-old', f), priceOff('fs-price-off', f))),
    h('p', { cls: 'fs-sub fs-price-sub', text: priceSays(f) }),
    priceRate('fs-price-rate', f),
    priceFoot('fs-price-foot', f));
}

/* GTA V - a line on the bank statement.
   The one screen this game taught everybody to read is the phone, and the
   one number on it that matters is the balance. So the price is a Maze Bank
   line: a label, a figure, and a debit that is only red when there is a
   discount to be red about. */
function priceGta(f) {
  const cells = h('div', { cls: 'gta-stats gta-price-stats' },
    h('div', { cls: 'gta-stat' },
      h('span', { cls: 'gta-stat-label', text: t('g.p_gta_now') }),
      priceNow('gta-stat-val gta-price-n', f)
        || h('b', { cls: 'pz-num gta-stat-val gta-price-n', text: t('g.p_gta_none') })));
  if (f.was) {
    cells.append(h('div', { cls: 'gta-stat' },
      h('span', { cls: 'gta-stat-label', text: t('g.p_gta_was') }),
      h('b', { cls: 'gta-stat-val gta-price-was', text: f.was })));
  }
  if (f.perHour) {
    cells.append(h('div', { cls: 'gta-stat' },
      h('span', { cls: 'gta-stat-label', text: t('g.p_gta_hour') }),
      h('b', { cls: 'gta-stat-val', text: f.perHour })));
  }
  return h('section', { cls: 'gta-shell gta-price' },
    h('h2', { cls: 'gta-h', text: t('g.p_gta_head') }),
    cells,
    priceOff('gta-price-off', f),
    h('p', { cls: 'gta-note', text: priceSays(f) }),
    priceFoot('gta-price-foot', f));
}

/* One entry per theme that draws its own block. Everything not in here, and
   every state that is a fact about Steam rather than about the game, gets
   pricePlain() - which is written against the tokens alone and so arrives in
   the right palette on all hundred and fifty-nine without a rule per game.
   The default is deliberately sober: a game that has not been given its own
   block should read as unfinished rather than as finished badly. */
const PRICES = {
  'dota-2': priceDota,
  'counter-strike-2': priceCs2,
  'arma-3': priceArma3,
  'war-thunder': priceWarThunder,
  'call-of-duty': priceCod,
  'skyrim': priceSkyrim,
  'msfs': priceMsfs,
  'gta-v': priceGta,
};

/** The block every page gets. Also the block every page gets for every state
 *  that is not a price: "no longer sold in Brazil" is a sentence about Steam
 *  rather than about the game, and dressing it in the game's own furniture
 *  would be dressing up a shrug. */
function pricePlain(f) {
  const wrap = h('section', { cls: 'pz' });
  wrap.append(h('h2', { cls: 'pz-h', text: t('g.p_head') }));
  if (f.now) {
    wrap.append(h('p', { cls: 'pz-figure' },
      priceNow('pz-figure-now', f), priceWas('pz-figure-old', f), priceOff('pz-figure-cut', f)));
    put(wrap, priceRate('pz-figure-rate', f));
  }
  wrap.append(h('p', { cls: 'pz-says', text: priceSays(f) }));
  if (f.state !== 'absent' && f.state !== 'down') wrap.append(priceLink('pz-go', f));
  wrap.append(priceFoot('pz-plain-foot', f));
  return wrap;
}

/** Draw the answer into the slot. Split out because the retry re-runs it. */
function priceDraw(slot, g, p) {
  const f = priceFacts(p, g);
  const own = PRICES[g.theme];
  // The states that are facts about the game - it costs this, it costs nothing,
  // it is being given away - get the game's own furniture. "The BR store has no
  // price for it" and "the storefront did not answer" are facts about Steam,
  // and dressing those in the game's furniture would be dressing up a shrug.
  const ownable = f.state === 'sale' || f.state === 'paid'
    || f.state === 'free_now' || f.state === 'free';

  slot.textContent = '';
  slot.dataset.state = f.state;
  if (f.stale) slot.dataset.stale = '1';
  else delete slot.dataset.stale;
  // The one place the motion contract is applied. No block sets this itself,
  // which is why no block can get it wrong.
  if (f.state === 'sale' && !still()) slot.dataset.animate = '1';
  else delete slot.dataset.animate;

  slot.append(ownable && own ? own(f) : pricePlain(f));
  return f;
}

/** Ask again, twice, eight seconds apart. "Still reading" is the gap between
 *  the batched price pass and the per-app detail pass behind it, and it closes
 *  itself - so the page waits it out rather than making the reader reload.
 *  Same shape and the same restraint as the money panel's poll. */
function priceRetry(slot, g, left) {
  if (left <= 0) return;
  setTimeout(async () => {
    let p;
    try {
      p = await api(`/price?appid=${g.appid}&cc=${store()}`);
    } catch {
      return;                       // it said what it could; leave it saying that
    }
    const f = priceDraw(slot, g, p);
    if (f.state === 'unknown' && !f.stale) priceRetry(slot, g, left - 1);
  }, 8000);
}

/** The price block, appended after the layout. Never awaited: the page is
 *  finished without it, and what a game costs is worth a second of somebody's
 *  time only because everything else already arrived. */
async function priceInto(g, root) {
  const slot = h('div', { cls: 'pz-slot', data: { state: 'pending' } });
  slot.append(h('p', { cls: 'pz-wait', text: t('g.p_pending') }));
  root.append(slot);

  let p;
  try {
    p = await api(`/price?appid=${g.appid}&cc=${store()}`);
  } catch {
    // A storefront that did not answer is not an error on this page. It is one
    // dim line, the same way missing art is a band that removes itself.
    p = { state: 'down' };
  }
  const f = priceDraw(slot, g, p);
  if (f.state === 'unknown' && !f.stale) priceRetry(slot, g, 2);
}

/** Pick a renderer. The theme is applied either way: a page with no data still
 *  looks like the game it is about, and says what is missing instead. */
function renderGame(g, root) {
  document.documentElement.dataset.game = g.theme;
  const needs = NEEDS[g.theme];
  if (needs && !needs(g)) {
    // renderEmpty draws the art itself, and larger, because it has less to say.
    renderEmpty(g, root);
  } else {
    if (!ART_OWN.has(g.theme)) put(root, artBand(g));
    (LAYOUTS[g.theme] || renderGeneric)(g, root);
  }
  // Last, and after both arms on purpose: what a game costs is true of the game
  // whether or not this profile had anything to say about it, and the page with
  // the least on it is the page where that is worth the most.
  priceInto(g, root);
  // The same game with nobody attached to it. Two reasons it is here and not
  // only in a sitemap: this address is shareable in a way the one above it is
  // not - it carries the game and not somebody's account - and it holds the one
  // thing this page cannot, which is how rare each of these achievements is
  // across everybody who owns the game rather than on this one profile.
  root.append(h('p', { cls: 'g-public' },
    h('a', {
      cls: 'g-public-go',
      text: t('gp.this_game'),
      attr: { href: `/g/${g.appid}` },
    })));
}

/* ── When the game has a layout but the profile has no data ───────────
   Every themed page can turn up empty on someone else's profile: Dota needs a
   setting most players never touch, a stat block needs the game to have been
   really played, an achievement list needs an unlock. The page keeps its own
   palette and lettering - the tokens do that by themselves - and spends its
   space saying which of those it is, because that is the useful thing here. */

const STAT_GAMES = new Set(['counter-strike-2', 'arma-3', 'payday-2',
                            'ready-or-not', 'garrys-mod', 'ats',
                            'tf2', 'rust', 'dbd', 'stardew', 'poe',
                            'clicker-heroes', 'infestation', 'unturned',
                            'insurgency', 'mighty-quest', 'reforger',
                            'sandstorm', 'cats', 'besiege', 'tribal-wars',
                            'the-forest', 'geoguessr', 'strife',
                            'business-tour']);

// Dota is not here: it never reaches renderEmpty any more. Its gap_dota_* lines
// are still the ones a reader sees, drawn by dotaGap() inside the scoreboard.
function reasonFor(g) {
  if (STAT_GAMES.has(g.theme)) {
    return {
      what: t('g.gap_stats_what'), why: t('g.gap_stats_why'), fix: t('g.gap_stats_fix'),
    };
  }
  return {
    what: t('g.gap_ach_what'), why: t('g.gap_ach_why'), fix: null,
  };
}

function renderEmpty(g, root) {
  const r = reasonFor(g);
  const wrap = h('div', { cls: 'gap' });
  const days = g.record_hours ? g.record_hours / 24 : 0;

  // The game's own key art. Not player data - which is the point: it is what
  // makes this read as the game's page rather than as an error.
  if (g.art) {
    const art = h('img', {
      cls: 'gap-art',
      attr: { src: g.art, alt: '', 'aria-hidden': 'true', loading: 'eager' },
    });
    // The server falls back to the small header on its own; a failure here
    // means the app has no art at all.
    art.addEventListener('error', () => art.remove(), { once: true });
    wrap.append(art);
  }

  wrap.append(h('header', { cls: 'gap-head' },
    h('p', { cls: 'gap-kicker',
      text: [g.name, t('g.rank_in_library', { n: num(g.rank) }),
             g.share != null ? t('g.of_total_time', { pct: num(g.share, 1) }) : null]
        .filter(Boolean).join('  ·  ') }),
    h('h1', { cls: 'gap-title' },
      h('b', { text: hrs(g.record_hours) }),
      txt(' ' + t(g.record_hours === 1 ? 'g.hour_logged' : 'g.hours_logged'))),
    h('p', { cls: 'gap-what', text: r.what })));

  const facts = h('dl', { cls: 'gap-facts' });
  // Some profiles come back with no last-played date on any game at all, so this
  // fact is dropped rather than shown as a dash.
  const rows = [
    [t('g.whole_days'), days >= 1 ? num(days, 1) : '-'],
    // A game that was never launched has no rank - it is not in the ranking at
    // all. Printing "#null" is what that used to look like.
    [t('g.position_f'), g.rank ? `#${g.rank}` : '-'],
    [t('g.share_of_total'), g.share ? `${num(g.share, 1)}%` : '-'],
  ];
  if (g.last_played) rows.push([t('g.last_f'), shortDate(g.last_played)]);
  if (g.hours_2weeks) rows.push([t('g.recent'), `${hrs(g.hours_2weeks)} h`]);
  for (const [k, v] of rows) facts.append(h('dt', { text: k }), h('dd', { text: v }));
  wrap.append(facts);

  // The per-OS split comes from the library listing, so it survives even when
  // nothing else about the game does.
  const os = g.os || {};
  const known = ['windows', 'linux', 'mac', 'deck'].map((k) => [k, os[k] || 0]);
  const total = known.reduce((sum, [, v]) => sum + v, 0);
  if (total > 0) {
    const LABEL = { windows: 'Windows', linux: 'Linux', mac: 'macOS', deck: 'Steam Deck' };
    const bar = h('div', { cls: 'gap-split' });
    const legend = h('div', { cls: 'gap-legend' });
    known.filter(([, v]) => v > 0).forEach(([k, v], i) => {
      const seg = h('i', { data: { os: k } });
      seg.style.width = `${(v / total) * 100}%`;
      if (!still()) seg.style.animationDelay = `${i * 90}ms`;
      bar.append(seg);
      legend.append(h('span', { cls: 'gap-key', data: { os: k } },
        h('i'), h('em', { text: `${LABEL[k]} - ${hrs(v / 60)} h` })));
    });
    if (!still()) bar.dataset.animate = '1';
    wrap.append(h('h2', { cls: 'gap-h', text: t('g.where_played') }), bar, legend,
      h('p', { cls: 'gap-note',
        text: total / 60 < g.record_hours - 1
          ? t('g.os_partial', { marked: hrs(total / 60), total: hrs(g.record_hours) })
          : t('g.os_all') }));
  }

  wrap.append(h('h2', { cls: 'gap-h', text: t('g.why_nothing') }),
    h('p', { cls: 'gap-why', text: r.why }));
  if (r.fix) wrap.append(h('p', { cls: 'gap-fix', text: r.fix }));
  root.append(wrap);
}

/* What each themed layout needs before it can draw anything. Checked in one
   place so the twenty-odd renderers stay about their own game. */
const NEEDS = {
  // Each of these is its own stat block and nothing else, so an account that
  // never touched the game gets renderEmpty in its palette instead of a
  // scoreboard of zeroes.
  'l4d1': (g) => g.l4d1,
  'l4d2': (g) => g.l4d2,
  'cs-source': (g) => g.css,
  'cs-nexon': (g) => g.achievements?.unlocked,
  'half-life-2': (g) => g.achievements?.unlocked,
  'hl2-ep1': (g) => g.achievements?.unlocked,
  'hl2-ep2': (g) => g.achievements?.unlocked,
  'alyx': (g) => g.alyx,
  'gta-iii-de': (g) => g.achievements?.unlocked,
  'gta-vc-de': (g) => g.achievements?.unlocked,
  'gta-v-enhanced': (g) => g.achievements?.unlocked,
  'arma-tactics': (g) => g.achievements?.unlocked,
  // The only three Elder Scrolls games that publish anything are their
  // achievement sets, so an account with none unlocked gets renderEmpty in
  // that game's own palette rather than a wall of dark glyphs.
  'oblivion-remastered': (g) => g.achievements?.unlocked,
  'skyrim-2011': (g) => g.achievements?.unlocked,
  'skyrim-vr': (g) => g.achievements?.unlocked,
  // The three Enhanced Editions are their achievement sets and nothing else,
  // so an account that never unlocked one gets renderEmpty in that game's own
  // palette rather than an artifact case with every container dark.
  'stalker-soc-ee': (g) => g.achievements?.unlocked,
  'stalker-cs-ee': (g) => g.achievements?.unlocked,
  'stalker-cop-ee': (g) => g.achievements?.unlocked,
  // The sequel keeps its page on the clock alone: the dosimeter is drawn from
  // the achievement set, and the counters are allowed to be missing.
  //
  // Dota is deliberately absent from this table. Its layout draws every panel
  // with or without a match history - see DOTA_BLANK - so a profile that never
  // opted in gets the scoreboard with the numbers still blank and one panel
  // saying how to fill them, rather than a differently shaped page.
  'counter-strike-2': (g) => g.cs2,
  'arma-3': (g) => g.arma3,
  'payday-2': (g) => g.payday2,
  'ready-or-not': (g) => g.ron,
  'garrys-mod': (g) => g.gmod,
  'ats': (g) => g.ats,
  'war-thunder': (g) => g.achievements?.unlocked,
  'call-of-duty': (g) => g.achievements?.unlocked,
  'skyrim': (g) => g.achievements?.unlocked,
  'msfs': (g) => g.achievements?.unlocked,
  'gta-v': (g) => g.achievements?.unlocked,
  'ets2': (g) => g.achievements?.unlocked,
  'gta-iv': (g) => g.achievements?.unlocked,
  'no-mans-sky': (g) => g.achievements?.unlocked,
  'apex': (g) => g.achievements?.unlocked,
  'cities-skylines': (g) => g.achievements?.unlocked,
  'gta-sa': (g) => g.achievements?.unlocked,
  'realm-royale': (g) => g.achievements?.unlocked,
  'f1-2015': (g) => g.achievements?.unlocked,
  'tf2': (g) => g.tf2,
  'rust': (g) => g.rust,
  'dbd': (g) => g.dbd,
  'stardew': (g) => g.stardew,
  'poe': (g) => g.poe,
  'palworld': (g) => g.achievements?.unlocked,
  'pubg': (g) => g.achievements?.unlocked,
  'isaac': (g) => g.achievements?.unlocked,
  'marvel-rivals': (g) => g.achievements?.unlocked,
  'bf6': (g) => g.achievements?.unlocked,
  'warframe': (g) => g.achievements?.unlocked,
  'bg3': (g) => g.achievements?.unlocked,
  'delta-force': (g) => g.achievements?.unlocked,
  'r6': (g) => g.achievements?.unlocked,
  'geometry-dash': (g) => g.achievements?.unlocked,
  'cyberpunk': (g) => g.achievements?.unlocked,
  'overwatch': (g) => g.achievements?.unlocked,
  // Ranks 25–100. Fifteen stat blocks, then the two whose stat block is only
  // achievement progress and which are therefore built on the achievements.
  'clicker-heroes': (g) => g.clicker,
  'infestation': (g) => g.infest,
  'unturned': (g) => g.unturned,
  'insurgency': (g) => g.insurgency,
  'mighty-quest': (g) => g.mquest,
  'reforger': (g) => g.reforger,
  'sandstorm': (g) => g.sandstorm,
  'cats': (g) => g.cats,
  'besiege': (g) => g.besiege,
  'tribal-wars': (g) => g.tribal,
  'the-forest': (g) => g.forest,
  'geoguessr': (g) => g.geoguessr,
  'strife': (g) => g.strife,
  'business-tour': (g) => g.biztour,
  // Spec Ops draws the campaign's achievements; the multiplayer stat block is
  // a footnote on that page, so an unlock is what it actually needs.
  'spec-ops': (g) => g.achievements?.unlocked || g.specops,
  'rdr2': (g) => g.achievements?.unlocked,
  'dying-light': (g) => g.achievements?.unlocked,
  'banana': (g) => g.achievements?.unlocked,
  'sea-of-thieves': (g) => g.achievements?.unlocked,
  'phasmophobia': (g) => g.achievements?.unlocked,
  'sniper-elite-v2': (g) => g.achievements?.unlocked,
  'egg-surprise': (g) => g.achievements?.unlocked,
  'adventure-capitalist': (g) => g.achievements?.unlocked,
  'police-sim': (g) => g.achievements?.unlocked,
  'shapez': (g) => g.achievements?.unlocked,
  'vampire-survivors': (g) => g.achievements?.unlocked,
  'paladins': (g) => g.achievements?.unlocked,
  'brawlhalla': (g) => g.achievements?.unlocked,
  'yakuza-kiwami': (g) => g.achievements?.unlocked,
  'vermintide-2': (g) => g.achievements?.unlocked,
  'fall-guys': (g) => g.achievements?.unlocked,
  'yakuza-0': (g) => g.achievements?.unlocked,
  'outlast': (g) => g.achievements?.unlocked,
  'yakuza-0-dc': (g) => g.achievements?.unlocked,
  'tap-ninja': (g) => g.achievements?.unlocked,
  // arma-2, arma-2-oa, valheim, dayz, sts2 and vrchat are written for having
  // nothing, and the generic page copes on its own.
};
