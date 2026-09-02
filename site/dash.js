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

/* The squarified treemap layout lives in lib.js: this page draws one and so
   does the landing page, and one of them having its own copy is how the two
   maps end up disagreeing about what "to scale" means. */

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
        'repeating-linear-gradient(-45deg, rgba(255,180,84,.14) 0 6px, rgba(255,180,84,.22) 6px 12px)';
    } else {
      // The floor used to be 0.05, which is a cell that is very nearly not
      // there. That was fine over a flat page and stopped being fine the day
      // the page could have somebody's profile background behind it: the
      // faintest cells are the smallest ones, and a wallpaper showing through
      // them turned the tail of the map into whatever that picture happened to
      // be. The ramp still runs to the same top, so the map reads the same
      // way - only its bottom end is opaque enough to be a cell.
      const alpha = 0.18 + 0.79 * Math.pow(g.hours / top, 0.42);
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

/* ── Explore this profile ──────────────────────────────────────────────
   The rail under the treemap.

   This page has always been able to open one year on its own, list the games
   that were never launched, put two libraries side by side, price an hour and
   scan for the rarest unlock in the library. What it never did was say so. Each
   of those lived behind a chart bar, a conditional link, a text field at the
   foot of a panel, or eleven panels of scrolling.

   So: no new data, no new call, nothing fetched. Every chip here points at
   something already on the payload or already on the page, and a chip that has
   nothing behind it is not drawn rather than drawn dead. */
function buildDiscover(d, query) {
  const rail = el('explore-row');
  const wrap = el('explore');
  if (!rail || !wrap) return;

  const chips = [];
  const chip = (href, label, hint) => chips.push(h('a', {
    cls: 'chip',
    text: label,
    attr: hint ? { href, title: hint } : { href },
  }));

  // The years this library actually has something in, newest first. Three of
  // them: the rail is a way in, not a table of contents, and the years panel
  // further down is still the place that holds all of them.
  const years = [...new Set((d.library || [])
    .map((g) => (g.last_played || '').slice(0, 4)).filter(Boolean))]
    .sort().reverse().slice(0, 3);
  for (const y of years) chip(`/u/${query}/year/${y}`, y, t('go.year_hint', { year: y }));

  const never = (d.unplayed || []).length;
  if (never) {
    chip(`/u/${query}/backlog`, t('go.pile', { n: num(never) }), t('go.pile_hint'));
  }
  // The compare field lives at the foot of the library panel, which is where
  // this points; #biblioteca is that panel and it has carried the id all along.
  chip('#biblioteca', t('go.vs'), t('go.vs_hint'));
  if (d.money?.per_hour != null) chip('#panel-money', t('go.money'), t('go.money_hint'));
  // The scan panels: the chip carries somebody to the button, and does not
  // press it. Pressing costs three calls per game against the owner's quota,
  // and a visitor who did not ask for that should not have it spent for them.
  chip('#raridades', t('go.rare'), t('go.rare_hint'));
  // Always drawn, unlike the pile: whether this library has a badge in it is
  // not on this payload, and the page it points at is a real answer either
  // way - a profile with no badges at all is a list of sets nobody has made.
  chip(`/u/${query}/cards`, t('go.cards'), t('go.cards_hint'));

  rail.textContent = '';
  for (const c of chips) rail.append(c);
  wrap.hidden = !chips.length;
}

/** Where the hours were spent, across all four things Steam records.
 *
 *  The payload has carried mac and deck since the platform block was written
 *  and this panel showed neither: it read `linux_share` and printed linux
 *  against windows, so a Steam Deck's hours arrived, were counted into the
 *  total, and then had no line to appear on. This draws every device that has
 *  anything on it, and stays quiet about the ones that have nothing rather
 *  than printing a row of zeroes - an account that never saw a Mac does not
 *  need to be told it has 0 h of Mac.
 *
 *  `library` is here for the same reason: with per-game `os` minutes already
 *  on every row, "which game owns this device" is a reduce, not a request. */
function buildPlatform(p, library = []) {
  // Three operating systems, and the Deck is not one of them: Steam reports a
  // Deck's hours inside `playtime_linux_forever` as well as on their own, so
  // adding the four together counts every Deck hour twice. That is what the
  // backend was doing until this round, and it is why the split here is
  // Windows/Mac/Linux and the Deck arrives below as a share of Linux rather
  // than as a fourth slice. Confirmed against payloads where a game reported
  // playtime_forever=5, linux=5 and deck=5 - the same five minutes, three times.
  const DEVICES = [
    { key: 'windows', hours: p.windows_hours, label: t('dash.windows') },
    { key: 'linux', hours: p.linux_hours, label: t('dash.linux') },
    { key: 'mac', hours: p.mac_hours, label: t('dash.mac') },
  ].filter((d) => (d.hours || 0) > 0).sort((a, b) => b.hours - a.hours);

  const top = DEVICES[0];
  const attributed = p.attributed_hours || 0;
  const share = (h) => (attributed ? (h / attributed) * 100 : 0);

  // The headline is whichever device actually holds the most, instead of always
  // being linux. On a Windows account that used to read "13.6%" under the word
  // "linux", which is a true number answering a question nobody asked.
  el('plat-share').textContent = top ? `${num(share(top.hours), 1)}%` : '-';
  el('plat-meter').firstElementChild.style.width = `${top ? share(top.hours) : 0}%`;
  el('plat-head').textContent = top ? top.label : t('dash.no_os');

  const rows = DEVICES.map((d) => [d.label, `${num(d.hours)} h`]);
  // Indented under Linux, worded as a share of it, because that is what it is.
  if ((p.deck_hours || 0) > 0) {
    rows.push([t('dash.deck'), t('dash.deck_of_linux', {
      h: num(p.deck_hours),
      pct: num(p.linux_hours ? (p.deck_hours / p.linux_hours) * 100 : 0),
    })]);
  }
  rows.push([t('dash.no_os'), `${num(p.unattributed_hours)} h`]);
  kvInto(el('plat-kv'), rows);

  // One line per device naming the game that dominated it. Free: every library
  // row already carries its own per-OS minutes.
  const holder = el('plat-top');
  holder.textContent = '';
  const named = (p.deck_hours || 0) > 0
    ? DEVICES.concat([{ key: 'deck', label: t('dash.deck') }])
    : DEVICES;
  for (const d of named) {
    let best = null;
    for (const g of library) {
      const min = (g.os || {})[d.key] || 0;
      if (min > 0 && (!best || min > best.min)) best = { name: g.name, min };
    }
    if (!best) continue;
    holder.append(h('li', { cls: 'plat-top-row' },
      h('span', { cls: 'plat-top-dev', text: d.label }),
      h('b', { cls: 'plat-top-game', text: best.name }),
      h('span', { cls: 'plat-top-h', text: `${hrs(best.min / 60)} h` })));
  }

  el('plat-note').textContent = t('dash.system_note', {
    un: num(p.unattributed_hours), at: num(p.attributed_hours),
  });
}

/** What this profile is wearing, where the profile itself wears it.
 *
 *  The frame is a picture with a transparent hole in it, drawn over the avatar
 *  rather than around it, which is why it cannot be a CSS border. The animated
 *  avatar is a gif and simply takes the still one's place; if it never loads,
 *  what is underneath is the still, already there. Both are Steam's own files,
 *  on the CDN the site's policy already allows for avatars. */
function dressAvatar(pf) {
  const items = pf.items || {};
  const face = el('face');
  const img = el('avatar');
  if (items.avatar?.image_small) {
    // Only after it has arrived: swapping the src first would blank the face
    // for as long as the gif takes, which is longer than the still took.
    const moving = new Image();
    moving.addEventListener('load', () => { img.src = items.avatar.image_small; }, { once: true });
    moving.src = items.avatar.image_small;
  }
  // The hover card's background, behind the panel that is this site's version
  // of that card. It is a strip and the panel is a strip, which is why it goes
  // here and not where the profile background went: stretched over a whole
  // page it would be the wrong picture in the wrong shape.
  const mini = items.mini;
  const panel = el('panel-acct');
  if (mini?.image_large && panel) {
    const stage = h('div', { cls: 'acct-bg' });
    stage.style.backgroundImage = `url("${mini.image_large}")`;
    if (!still() && mini.movie_webm) {
      const movie = h('video', {
        attr: { autoplay: '', muted: '', loop: '', playsinline: '', 'aria-hidden': 'true',
                preload: 'metadata', poster: mini.image_large },
      }, h('source', { attr: { src: mini.movie_webm, type: 'video/webm' } }),
         mini.movie_mp4 ? h('source', { attr: { src: mini.movie_mp4, type: 'video/mp4' } }) : null);
      movie.muted = true;
      movie.addEventListener('error', () => movie.remove(), { once: true });
      stage.append(movie);
    }
    panel.prepend(stage);
    panel.dataset.dressed = '1';
  }

  const frame = items.frame;
  if (frame?.image_small || frame?.image_large) {
    face.dataset.framed = '1';
    // The still first, because the animated one is an APNG of ninety frames
    // and most of a megabyte: the frame is around the face immediately and
    // starts moving when it has arrived, rather than the face sitting bare
    // for as long as that takes. A reader who asked for less motion keeps the
    // still, which is exactly what Steam ships it for.
    const still_url = frame.image_large || frame.image_small;
    const shown = h('img', {
      cls: 'face-frame',
      attr: { src: still_url, alt: '', 'aria-hidden': 'true',
              decoding: 'async', title: frame.name || '' },
    });
    face.append(shown);
    if (!still() && frame.image_small && frame.image_small !== still_url) {
      const moving = new Image();
      moving.addEventListener('load', () => { shown.src = frame.image_small; }, { once: true });
      moving.src = frame.image_small;
    }
  }
}

/** The profile's own background, behind the whole page.
 *
 *  It is what Steam draws behind that person's profile, so it goes where a
 *  background goes rather than into a panel. The still lands first and stays
 *  as the floor under the video: a browser that will not play the video, a
 *  connection that has not finished it, and a reader who asked for less motion
 *  all end on the same picture rather than on nothing.
 *
 *  Held well back - the page is a page of numbers and they have to stay
 *  readable over it, which is also why the video is muted, loops, and is never
 *  a control anybody has to dismiss. */
function dressPage(pf) {
  const bg = (pf.items || {}).background;
  const stage = el('bg');
  if (!bg || !stage) return;
  if (bg.image_large) {
    stage.style.backgroundImage = `url("${bg.image_large}")`;
    stage.dataset.on = '1';
  }
  // still() is the site's own reading of prefers-reduced-motion, used by every
  // other animation here. A background that moves is exactly what it is about.
  if (still() || !bg.movie_webm) return;
  const movie = h('video', {
    cls: 'bg-movie',
    attr: { autoplay: '', muted: '', loop: '', playsinline: '', 'aria-hidden': 'true',
            preload: 'metadata', poster: bg.image_large || '' },
  }, h('source', { attr: { src: bg.movie_webm, type: 'video/webm' } }),
     bg.movie_mp4
       ? h('source', { attr: { src: bg.movie_mp4, type: 'video/mp4' } })
       : null);
  // Muted has to be set as a property as well: the attribute alone is ignored
  // by some browsers deciding whether autoplay is allowed.
  movie.muted = true;
  movie.addEventListener('error', () => movie.remove(), { once: true });
  stage.append(movie);
}

function buildAccount(pf) {
  if (pf.avatar) {
    const img = el('avatar');
    img.src = pf.avatar;
    img.alt = `Avatar de ${pf.persona}`;
  }
  dressAvatar(pf);
  dressPage(pf);
  // Where this page's subject actually lives. The whole site reads Steam and
  // never writes to it, so the last step of anything anybody wants to do with
  // a profile happens over there.
  if (pf.url) {
    const go = el('steam-link');
    go.href = pf.url;
    go.hidden = false;
  }
  el('persona').textContent = pf.persona || '-';
  el('acct-level').textContent = pf.level != null ? t('dash.level', { n: num(pf.level) }) : '-';
  if (pf.member_since) el('member-since').textContent = t('dash.opened', { date: longDate(pf.member_since) });
  kvInto(el('acct-kv'), [
    // Where the level sits against everybody else's. A level on its own is a
    // number nobody has a scale for; this is the scale, and it costs nothing
    // because Steam answers it per level rather than per person.
    [t('dash.percentile'), pf.level_percentile != null
      ? t('dash.above', { n: num(pf.level_percentile, 2) }) : null],
    [t('dash.location'), pf.location || null],
    [t('dash.achievements'), pf.achievements_total != null ? num(pf.achievements_total) : null],
    [t('dash.perfect'), pf.perfect_games != null ? num(pf.perfect_games) : null],
    [t('dash.avg_completion'), pf.avg_completion != null ? `${num(pf.avg_completion, 1)}%` : null],
    [t('dash.badges'), pf.badge_count != null ? num(pf.badge_count) : null],
    [t('dash.xp'), pf.xp != null ? num(pf.xp) : null],
    [t('dash.friends'), pf.friends != null ? num(pf.friends) : null],
    // Steam publishes the group ids and not the names, anywhere it can be
    // asked without a request per group. So this is a count and says so.
    [t('dash.groups'), pf.groups != null ? num(pf.groups) : null],
    [t('dash.workshop'), pf.workshop ? num(pf.workshop) : null],
    [t('dash.screenshots'), pf.screenshots != null ? num(pf.screenshots) : null],
    [t('dash.reviews'), pf.reviews != null ? num(pf.reviews) : null],
    // Only while they are away. Somebody who is online right now has the
    // .p-now panel saying so, and "last seen today" under it says nothing.
    [t('dash.last_seen'), pf.online === 'offline' && pf.last_seen
      ? shortDate(pf.last_seen) : null],
  ]);
  buildLimited(pf);
  buildBans(pf.bans);
}

/** A limited account is one that has never spent the five dollars Steam asks
 *  for before it will let an account do most things. Drawn only when it is
 *  true, for the same reason buildBans draws nothing on a clean record: every
 *  established account is unlimited, and saying so under all of them would
 *  make the ones where it matters harder to notice rather than easier.
 *
 *  It says what the state is and not what it means about the person. A limited
 *  account is usually somebody new. */
function buildLimited(pf) {
  const line = el('acct-limited');
  if (!line || pf.limited !== true) return;
  line.textContent = t('dash.limited');
  line.hidden = false;
}

/** Steam's own record on this account. Drawn only when there is one: an
 *  account with nothing against it is the ordinary case, and a line saying
 *  "no bans" under every profile on the site would be read by nobody and
 *  would make the profiles that do carry one harder to spot, not easier.
 *
 *  What it never says is why. Steam publishes that a ban happened, how many,
 *  and how long ago, and nothing at all about what for - so this prints those
 *  three and stops there. The date is the one thing worth having: a VAC ban
 *  from eleven years ago and one from last month are the same figure in the
 *  same field and are not the same fact. */
function buildBans(b) {
  const line = el('acct-ban');
  if (!line || !b) return;

  const bits = [];
  if (b.vac) bits.push(t('ban.vac', { n: num(b.vac), raw: b.vac }));
  if (b.game) bits.push(t('ban.game', { n: num(b.game), raw: b.game }));
  if (b.community) bits.push(t('ban.community'));
  if (b.economy) {
    // Steam's own word for the state, and it has more of them than this site
    // has strings. An unknown one falls back to saying that trading is
    // restricted, which is the part that is true of all of them.
    const key = `ban.trade_${b.economy}`;
    const said = t(key);
    bits.push(said === key ? t('ban.trade') : said);
  }
  if (!bits.length) return;

  const when = b.days_since != null && b.last
    ? ` ${t('ban.when', { days: num(b.days_since), raw: b.days_since, date: shortDate(b.last) })}`
    : '';
  line.textContent = bits.join(' · ') + when;
  line.hidden = false;
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

/** The showcase and the badges share a row, and either can be absent: a
 *  profile with nothing written on it, a profile that keeps its badges to
 *  itself. Whichever one is left then takes the whole width, because a panel
 *  sitting alone beside eight empty columns is the shape this row was
 *  rearranged to stop making. Called after both have had their say. */
function pairRow() {
  const rig = el('panel-showcase');
  const badges = el('panel-badges');
  if (rig && !badges) rig.dataset.wide = '1';
  else if (badges && !rig) badges.dataset.wide = '1';
}

/** What one level costs at this level.
 *
 *  Steam publishes how much XP is still owed for the next level and never the
 *  size of the step, so a bar needs the step from somewhere. It is a published
 *  rule rather than a guess: a hundred XP per level for the first ten, two
 *  hundred for the next ten, and a hundred more for every ten after that. */
const levelBand = (level) => 100 * (Math.floor(level / 10) + 1);

/** The badges, as the pictures they are.
 *
 *  The account panel already carries the count, and a count is the least
 *  interesting thing about a badge: two accounts on twenty-two each have a
 *  different twenty-two, and the artwork is the whole of the difference.
 *
 *  What Steam serves is the newest first, so this is a recency shelf rather
 *  than a hall of fame - which is the honest ordering, because Steam does not
 *  rank badges and inventing a rank for them would be inventing the fact.
 *
 *  Card badges link through to the game's page on this site, and only when the
 *  library actually has that game: the sale and event badges carry an appid
 *  too, and it belongs to a storefront event nobody owns. */
function buildBadges(pf, query, owned) {
  const list = pf.badges || [];
  const wrap = el('panel-badges');
  if (!list.length) {
    wrap.remove();
    return;
  }

  el('badges-head').textContent = pf.badge_count != null
    ? t('dash.badges_count', { n: num(pf.badge_count), raw: pf.badge_count })
    : t('dash.badges_count', { n: num(list.length), raw: list.length });

  // Level and the distance to the next one. Steam reports what is still owed
  // rather than what has been earned toward it, so the bar is worked out from
  // the two together, and the whole block goes missing when there is no level.
  if (pf.level != null) {
    el('badges-xp').hidden = false;
    el('badges-xp-line').innerHTML = pf.xp_to_next
      ? t('dash.badges_climb', {
        n: num(pf.level), xp: num(pf.xp), need: num(pf.xp_to_next),
        next: num(pf.level + 1), raw: pf.xp_to_next,
      })
      : t('dash.badges_level', { n: num(pf.level), xp: num(pf.xp) });
    if (pf.xp_to_next) {
      const band = levelBand(pf.level);
      el('badges-xp').append(fillBar('meter', ((band - pf.xp_to_next) / band) * 100));
    }
  }

  const ul = el('badges-list');
  ul.textContent = '';
  for (const b of list) {
    const linkable = b.appid && owned.has(b.appid);
    const tile = h(linkable ? 'a' : 'div', {
      cls: 'badge',
      attr: linkable ? { href: `/u/${query}/${b.appid}` } : {},
    });

    if (b.icon) {
      tile.append(h('img', {
        cls: 'bg-art',
        attr: {
          src: b.icon, alt: '', width: 44, height: 44,
          loading: 'lazy', decoding: 'async',
        },
      }));
    }

    // Level first because it is the badge's own rank, then the day it was
    // earned. A Steam-issued badge has no level, so that half is simply absent
    // rather than printed as a zero.
    const bits = [];
    if (b.level != null) bits.push(`<span class="lvl">${t('dash.badges_lvl', { n: num(b.level) })}</span>`);
    const when = monthYear(b.when);
    if (when) bits.push(when);
    else if (b.xp != null) bits.push(t('dash.badges_worth', { xp: num(b.xp) }));

    tile.append(h('span', { cls: 'bg-text' },
      h('span', { cls: 'bg-name', text: b.name, attr: { title: b.tier || b.name } }),
      bits.length ? h('span', { cls: 'bg-line', html: bits.join(' · ') }) : null));

    ul.append(h('li', {}, tile));
  }

  const rest = (pf.badge_count || list.length) - list.length;
  el('badges-note').textContent = rest > 0
    ? t('dash.badges_note', { n: num(list.length), rest: num(rest), raw: rest })
    : t('dash.badges_note_all', { n: num(list.length), raw: list.length });
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

function buildTimeline(library, query) {
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
    out.textContent = '';
    if (!b) { out.textContent = t('time.empty_year', { year: y }); return; }
    const biggest = b.games.slice().sort((x, z) => z.hours - x.hours)[0];
    out.append(
      txt(t('time.readout', {
        year: y, n: num(b.games.length), h: hrs(b.hours), game: biggest.name,
      })),
      txt(' '),
      // The bars are links too, but a bar does not look like one. This says the
      // page exists in words, next to the year it is about.
      h('a', {
        cls: 'time-go',
        text: t('time.open', { year: y }),
        attr: { href: `/u/${query}/year/${y}` },
      }));
  };

  chart.textContent = '';
  for (const y of span) {
    const b = years.get(y);
    // A year with something in it is a link to that year's page; a year with
    // nothing in it stays a button, because the page it would open has nothing
    // to put on it. This is also the only way into /u/<perfil>/year/<ano>:
    // the chart is where somebody is already looking at a year when they want
    // to see more of it.
    const col = b
      ? h('a', {
        cls: 'time-col',
        attr: { href: `/u/${query}/year/${y}`, title: t('time.open', { year: y }) },
      })
      : h('button', { cls: 'time-col', attr: { type: 'button' } });
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
    // Same as the landing field: a pasted profile URL goes in as the name it
    // holds, never as the URL itself.
    const other = steamHandle(input.value);
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

/* ── The scan ──────────────────────────────────────────────────────────
   Behind a button because it is the most expensive thing the site can be
   asked for: three calls to Steam per game, against the owner's key.

   One scan, three panels. The same three calls that say which unlocks are
   rare also say which games are nearest to a hundred percent and when every
   unlock happened, so the answer is fetched once and every panel that needs
   part of it reads that one answer. Whichever button gets pressed fills all
   of them, because there is nothing left for the second press to buy. */

/** The scan, in flight or in hand. A rejection clears it: the panel puts its
 *  button back, and a button that cannot be pressed again is a page that has
 *  to be reloaded to retry something that failed once. */
let SCAN = null;
function scanOnce(steamid) {
  if (!SCAN) {
    SCAN = api(`/unlocks?id=${steamid}`).catch((e) => { SCAN = null; throw e; });
  }
  return SCAN;
}

/** Everything a panel fed by the scan has to be able to do: say it is working,
 *  draw the answer, and hand the button back when it did not arrive. */
const SCAN_PANELS = [];

async function pressScan(steamid, howMany) {
  for (const p of SCAN_PANELS) p.waiting(howMany);
  let got;
  try {
    got = await scanOnce(steamid);
  } catch (e) {
    // Every panel, not only the one that was pressed: they are all waiting on
    // the one request, so they all have to stop waiting on it.
    for (const p of SCAN_PANELS) p.failed(e.message, howMany);
    return;
  }
  for (const p of SCAN_PANELS) p.fill(got);
}

function buildRarities(steamid, howMany) {
  const go = el('rar-go');
  if (!go) return;
  if (!steamid) {
    el('raridades')?.remove();
    return;
  }
  go.textContent = t('rar.go', { n: num(howMany) });
  el('rar-note').textContent = t('rar.hint');
  go.addEventListener('click', () => pressScan(steamid, howMany));

  SCAN_PANELS.push({
    waiting: (n) => {
      go.disabled = true;
      go.textContent = t('rar.loading', { n: num(n) });
    },
    failed: (message, n) => {
      go.disabled = false;
      go.textContent = t('rar.go', { n: num(n) });
      el('rar-note').textContent = message;
    },
    fill: (got) => {
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
    },
  });
}

/* ── Closest to a hundred percent ──────────────────────────────────────
   The other half of the same three calls, and until this panel existed it was
   fetched and thrown away: which achievements are still locked, and how much
   of the world holds them.

   Ordered by how many are left rather than by percentage. Two missing out of a
   hundred and two out of five are the same evening's work and a very different
   pair of percentages, and the number somebody can act on is the count. The
   percentage is still printed, because it is the one that says how far this
   profile already got. */

function buildClose(steamid, howMany) {
  const go = el('close-go');
  if (!go) return;
  if (!steamid) {
    el('completar')?.remove();
    return;
  }
  go.textContent = t('close.go', { n: num(howMany) });
  el('close-note').textContent = t('close.hint');
  go.addEventListener('click', () => pressScan(steamid, howMany));

  SCAN_PANELS.push({
    waiting: (n) => {
      go.disabled = true;
      go.textContent = t('rar.loading', { n: num(n) });
    },
    failed: (message, n) => {
      go.disabled = false;
      go.textContent = t('close.go', { n: num(n) });
      el('close-note').textContent = message;
    },
    fill: (got) => {
      go.remove();
      const rows = got.close || [];
      const done = (got.perfect || []).length;
      const list = el('close-list');
      list.textContent = '';

      for (const g of rows) {
        const row = h('a', {
          cls: 'close',
          attr: { href: `/u/${MONEY_Q}/${g.appid}` },
        });
        row.append(
          h('span', { cls: 'close-top' },
            h('b', { cls: 'close-name', text: g.name }),
            h('span', { cls: 'close-pct', text: `${num(g.completion, 1)}%` })),
          fillBar('meter', g.completion),
          h('span', { cls: 'close-sub', text: t('close.left', {
            n: num(g.missing), raw: g.missing,
            have: num(g.unlocked), total: num(g.total),
          }) }));
        // The wall, when Steam publishes a rarity for it: a hundred percent
        // here costs whatever the rarest locked one costs, and that number is
        // the difference between an evening and never.
        if (g.hardest) {
          row.append(h('span', { cls: 'close-wall', text: t('close.wall', {
            name: g.hardest.name, pct: rarity(g.hardest.rarity),
          }) }));
        }
        if (g.easiest && g.easiest.key !== g.hardest?.key) {
          row.append(h('span', { cls: 'close-next', text: t('close.next', {
            name: g.easiest.name, pct: rarity(g.easiest.rarity),
          }) }));
        }
        list.append(h('li', {}, row));
      }

      el('close-head').textContent = rows.length
        ? t('close.head', { n: num(rows.length) })
        : '-';
      el('close-note').textContent = rows.length
        ? t('close.note', { n: num(got.scanned), done: num(done), doneRaw: done })
        : t('close.none', { n: num(got.scanned), done: num(done), doneRaw: done });
    },
  });
}

/* ── The friend list, ranked ───────────────────────────────────────────
   The strip above says who is on the list. This says the thing a list of
   faces cannot: who has the bigger clock, and which games on this profile
   nobody else on the list has ever bought.

   One call per friend, so it waits for a button like the scan does. A friend
   whose game details are private answers with nothing at all, which is the
   common case and is reported as private rather than as a zero - a zero would
   put them at the bottom of a ranking they are not in. */

function buildBoard(steamid, query, friends, me) {
  const wrap = el('placar');
  if (!wrap) return;
  const go = el('board-go');
  // Nothing to rank against: the friend list is private, or empty. The strip
  // is not drawn in that case either, and neither is this.
  if (!steamid || !friends?.people?.length) {
    wrap.remove();
    return;
  }
  go.textContent = t('board.go');
  el('board-note').textContent = t('board.hint');

  go.addEventListener('click', async () => {
    go.disabled = true;
    go.textContent = t('board.loading');
    let got;
    try {
      got = await api(`/mates?id=${steamid}`);
    } catch (e) {
      go.disabled = false;
      go.textContent = t('board.go');
      el('board-note').textContent = e.message;
      return;
    }
    go.remove();

    // The subject sits inside its own ranking rather than above it. A
    // leaderboard that leaves out the person it was built for is a list of
    // other people.
    const rows = (got.ranked || []).map((m) => ({ ...m }));
    rows.splice(got.me.rank - 1, 0, {
      steamid: null, persona: me.persona, avatar: me.avatar,
      hours: got.me.hours, games: got.compared, common: null, self: true,
    });

    const list = el('board-list');
    list.textContent = '';
    rows.forEach((m, i) => {
      const inner = h(m.self ? 'span' : 'a', {
        cls: 'seat',
        attr: m.self ? {} : { href: `/u/${query}/vs/${m.steamid}` },
        data: m.self ? { self: '1' } : {},
      });
      inner.append(h('span', { cls: 'seat-rank', text: `${i + 1}` }));
      if (m.avatar) {
        inner.append(h('img', {
          attr: { src: m.avatar, alt: '', width: '32', height: '32', loading: 'lazy' },
        }));
      } else {
        inner.append(h('span'));
      }
      inner.append(
        h('span', { cls: 'seat-txt' },
          h('b', { cls: 'seat-name', text: m.persona }),
          h('span', {
            cls: 'seat-sub',
            text: m.common == null
              ? t('board.owns', { n: num(m.games) })
              : t('board.shares', { n: num(m.games), common: num(m.common) }),
          })),
        h('span', { cls: 'seat-h', text: `${num(m.hours)} h` }));
      list.append(h('li', {}, inner));
    });

    // The games nobody else on the list owns. Only worth printing when
    // somebody answered: with nothing to compare against, every game is
    // unowned by everybody, which says nothing about this library.
    const alone = got.alone || [];
    if (got.answered && alone.length) {
      el('board-alone').hidden = false;
      el('alone-head').textContent = t('board.alone_head', {
        n: num(got.alone_total), raw: got.alone_total,
        mates: num(got.answered), total: num(got.compared),
      });
      const ul = el('alone-list');
      ul.textContent = '';
      for (const g of alone) {
        ul.append(h('li', {}, h('a', {
          cls: 'alone-row',
          attr: { href: `/u/${query}/${g.appid}` },
        },
        h('span', { cls: 'alone-name', text: g.name }),
        h('span', { cls: 'alone-h', text: g.hours == null ? '' : `${hrs(g.hours)} h` }))));
      }
    }

    el('board-head').textContent = t('board.head', { n: num(got.answered) });
    el('board-note').textContent = t('board.note', {
      scanned: num(got.scanned), answered: num(got.answered),
      priv: num(got.private), limit: num(got.limit),
    });
  });
}

/* ── The pile ──────────────────────────────────────────────────────────
   /u/<perfil>/backlog - every game owned and never once launched.

   The art is Steam's small header, straight from the CDN and lazily: the
   local hero cache exists for pages somebody opened, and filling it with
   three hundred games nobody did would be a hundred megabytes of nothing. */

const PILE_PAGE = 60;

/* ── The card sets ─────────────────────────────────────────────────────
   /u/<perfil>/cards - the badges this profile has made, the sets it owns and
   has not, and what one of each card costs today.

   The page is drawn in two passes on purpose. The badges are exact and arrive
   with the answer; the prices come out of a cache the api fills a few games a
   minute, so a set with no price yet is drawn without one rather than held
   back, and the page asks once more a few seconds later for whatever landed in
   the meantime. Nothing here ever blocks on the market. */
const CARD_PAGE = 40;
const CARD_REFILL = 15000;

function cardRow(row, query, done, rates) {
  const art = h('img', {
    cls: 'pile-art',
    attr: {
      src: `${HEADER_ART}/${row.appid}/header.jpg`, alt: '',
      width: '460', height: '215', loading: 'lazy', decoding: 'async',
    },
  });
  art.addEventListener('error', () => { art.removeAttribute('src'); });

  const bits = [];
  if (done) {
    if (row.level != null) bits.push(t('cd.level', { n: num(row.level) }));
    if (row.foil) bits.push(t('cd.foil'));
    if (row.when) bits.push(t('cd.crafted', { when: shortDate(row.when) }));
    if (!row.owned) bits.push(t('cd.gone'));
  } else {
    if (row.count) bits.push(t('cd.cards', { n: num(row.count), raw: row.count }));
    if (row.hours) bits.push(hoursText(row.hours));
  }

  // The price is the set's, not the game's, and it is the one number on the
  // row that may not be there yet. "no price yet" and "not sold" are two
  // different answers: the first is this site still reading, the second is a
  // set nobody is selling a complete run of.
  const price = h('b', {
    cls: 'cd-price',
    text: row.cost != null ? cash(row.cost, 'USD')
      : row.count ? t('cd.no_cards') : t('cd.no_price'),
  });
  // The reader's own money, after the dollar and never instead of it. Small
  // because it is the approximate half of the pair - see approx() in lib.js
  // for why it can only ever be approximate.
  const near = approx(row.cost, rates);
  if (near) price.append(h('small', { cls: 'cd-approx', text: ` ≈ ${near}` }));
  if (row.cost == null) price.dataset.pending = '1';
  if (row.stale) price.dataset.stale = '1';

  return h('li', {},
    h('a', { cls: 'cd-row', attr: { href: `/u/${query}/${row.appid}` } },
      art,
      h('span', { cls: 'pile-txt' },
        h('b', { cls: 'pile-name', text: row.name }),
        h('span', { cls: 'pile-meta', text: bits.join(' · ') })),
      price));
}

// How much of a wishlist the panel shows. It is a panel on a dashboard, beside
// a friends strip, and not a page of its own: ninety-three rows made a wall
// that the two panels next to it disappeared behind. The total above the list
// is over the whole wishlist either way, and the note says how much is shown.
const WISH_SHOWN = 12;

/** What this profile wants, and what it would cost in the reader's own shop.
 *
 *  Its own request rather than another block on the profile payload: the
 *  wishlist names its own games, so nothing here needs the library, and a
 *  panel nobody scrolls to should not have made the dashboard slower to
 *  arrive. The panel starts hidden and is shown only once there is something
 *  in it - a wishlist can be private or empty, and both are ordinary.
 *
 *  Priced from the same store cache the money panel uses, in the same
 *  storefront, so "what my wishlist costs" and "what my library cost" are two
 *  numbers a reader can honestly put side by side. */
async function buildWishlist(steamid) {
  const wrap = el('panel-wish');
  if (!wrap) return;

  let w;
  try {
    w = await api(`/wishlist?id=${steamid}&cc=${store()}`);
  } catch {
    wrap.remove();
    return;
  }
  const items = w.wishlist?.items || [];
  if (!items.length) {
    wrap.remove();
    return;
  }

  el('wish-head').textContent = t('wish.head', {
    n: num(w.wishlist.total), raw: w.wishlist.total,
  });
  // The money at the top, where it is the point of the panel, and split the way
  // the money panel beside it splits: the figure alone in display type, and
  // what it is a figure of in small text under it. A whole sentence set in the
  // headline face is three lines of shouting.
  el('wish-money').textContent = w.money.total
    ? cash(w.money.total, w.money.currency) : '-';
  el('wish-cover').textContent = t('wish.total', {
    quoted: num(w.money.quoted), items: num(w.money.items),
  });
  // The bar is the price, so the dearest game is the full bar. A game with no
  // price yet gets no bar rather than a zero-length one, which would read as
  // "free" instead of "not read yet".
  rowsInto(el('wish-list'), items.slice(0, WISH_SHOWN).map((g) => ({
    name: g.name,
    value: g.price || 0,
    figure: g.price != null ? cash(g.price, w.money.currency)
      : g.free ? t('wish.free') : t('wish.unread'),
  })));

  const said = [];
  if (w.wishlist.on_sale) said.push(t('wish.on_sale', { n: num(w.wishlist.on_sale) }));
  if (w.wishlist.total > WISH_SHOWN) {
    said.push(t('wish.shown', {
      shown: num(Math.min(WISH_SHOWN, items.length)), total: num(w.wishlist.total),
    }));
  }
  if (w.followed?.total) said.push(t('wish.followed', { n: num(w.followed.total) }));
  el('wish-note').textContent = said.join(' ');
  wrap.hidden = false;
}

/** One game's row in the in-hand panel. Deliberately the same shape as
 *  cardRow above - same art, same text block, same price strip - because it is
 *  the same kind of row about the same kind of thing, and giving it a look of
 *  its own would say the two lists were about different things.
 *
 *  What differs is only the figure: this one is what is left to buy, and it
 *  has one more state than a set price has. "Craft it now" is not zero money
 *  dressed up, it is the answer. */
function holdRow(g, query, rates) {
  const art = h('img', {
    cls: 'pile-art',
    attr: {
      src: `${HEADER_ART}/${g.appid}/header.jpg`, alt: '',
      width: '460', height: '215', loading: 'lazy', decoding: 'async',
    },
  });
  art.addEventListener('error', () => { art.removeAttribute('src'); });

  const bits = [];
  if (g.count) bits.push(t('hold.have', { have: num(g.have), of: num(g.count) }));
  if (g.dupes) bits.push(t('hold.dupes', { n: num(g.dupes), raw: g.dupes }));
  if (g.sets_held) bits.push(t('hold.sets', { n: num(g.sets_held), raw: g.sets_held }));

  // Four states, and they are four different sentences. None of them may read
  // as "free": a set nobody has read yet, a set with a card nobody is selling
  // and a set that is already complete are three separate answers, and only
  // the last of them means no money is needed.
  let figure;
  if (g.set === 'unknown') figure = t('hold.unread');
  else if (g.need === 0) figure = t('hold.ready');
  else if (g.cost_to_complete == null) figure = t('hold.unpriced', { n: num(g.unpriced) });
  else figure = cash(g.cost_to_complete, 'USD');

  const price = h('b', { cls: 'cd-price', text: figure });
  const near = g.cost_to_complete ? approx(g.cost_to_complete, rates) : null;
  if (near) price.append(h('small', { cls: 'cd-approx', text: ` ≈ ${near}` }));
  if (g.set === 'unknown' || (g.need && g.cost_to_complete == null)) {
    price.dataset.pending = '1';
  }
  if (g.stale) price.dataset.stale = '1';
  if (g.need === 0) price.dataset.done = '1';

  return h('li', {},
    h('a', { cls: 'cd-row', attr: { href: `/u/${query}/${g.appid}` } },
      art,
      h('span', { cls: 'pile-txt' },
        h('b', { cls: 'pile-name', text: g.name }),
        h('span', { cls: 'pile-meta', text: bits.join(' · ') })),
      price));
}

/** What this profile is already holding, and what finishing each badge would
 *  therefore cost - which is a different and much smaller number than what a
 *  set costs from nothing, and the only one anybody can act on.
 *
 *  Its own request, made after the two panels above are drawn. The inventory
 *  comes off the Community host, which the server reads slowly on purpose, so
 *  making the whole page wait on it would be trading a page that is up for a
 *  panel that is complete.
 *
 *  Three ways this panel is simply not there, and all three are ordinary: the
 *  inventory is private, the server has not read it yet, or there are no cards
 *  in it. None of them is an error and none of them gets an empty panel. */
async function buildCollection(steamid, query) {
  const wrap = el('panel-hold');
  if (!wrap) return;

  let col;
  try {
    col = await api(`/inventory?id=${steamid}`);
  } catch {
    // The rest of the page is already up and correct. A card panel that could
    // not be drawn is not worth an error line over the two that were.
    wrap.remove();
    return;
  }
  if (col.state === 'private' || col.state === 'unknown' || !col.games?.length) {
    wrap.remove();
    return;
  }

  const rates = col.rates;
  el('hold-head').textContent = t('hold.head', { n: num(col.cards.held), raw: col.cards.held });

  // The headline: everything still missing, over the sets there is a full
  // price for. Never the whole library dressed up as a total - the coverage
  // travels with it, the way the money panel's does.
  if (col.totals.complete_all != null) {
    el('hold-lede').textContent = t('hold.lede', {
      money: cashApprox(col.totals.complete_all, rates),
      sets: num(col.totals.quoted), setsRaw: col.totals.quoted,
      games: num(col.totals.games),
    });
  }

  const list = el('hold-list');
  list.replaceChildren();
  for (const g of col.games) list.append(holdRow(g, query, rates));

  // Which of the three kinds of incomplete this panel is looking at. They are
  // separate counts because they are separate answers, and a reader who sees a
  // total that is missing something deserves to know which kind of missing.
  const f = col.filling || {};
  const said = [];
  if (f.unknown_sets) said.push(t('hold.f_unknown', { n: num(f.unknown_sets) }));
  if (f.unpriceable) said.push(t('hold.f_unpriced', { n: num(f.unpriceable) }));
  if (f.stale_sets) said.push(t('hold.f_stale', { n: num(f.stale_sets) }));
  if (col.state === 'truncated') said.push(t('hold.f_truncated', { n: num(col.read) }));
  const note = el('hold-filling');
  note.textContent = said.join(' ');
  const rate = rateNote(rates, col.rates_at);
  if (rate) note.textContent = `${note.textContent} ${rate}`.trim();
}


async function renderCards(d, steamid, query) {
  document.title = `${d.profile.persona} - ${t('cd.title')} - steamprofiler.org`;
  const madeList = el('cd-made');
  const openList = el('cd-open');
  const more = el('cd-more');
  const find = el('cd-find');

  let c;
  try {
    c = await api(`/cards?id=${steamid}`);
  } catch (e) {
    el('cd-lede').textContent = e.message;
    return;
  }

  let shown = CARD_PAGE;

  function draw() {
    const made = c.crafted || [];
    const open = c.open || [];
    el('cd-count').textContent = num(made.length);
    el('cd-made-n').textContent = num(made.length);
    el('cd-open-n').textContent = num(open.length);

    el('cd-lede').textContent = made.length
      ? t('cd.lede', {
        level: num(c.level), xp: num(c.xp),
        done: num(made.length), doneRaw: made.length,
        sets: num(made.length + open.length),
      })
      : t('cd.lede_bare', { level: num(c.level), xp: num(c.xp) });

    const quoted = c.cost?.quoted || 0;
    el('cd-cost').textContent = quoted
      ? [t('cd.cost', {
        n: num(quoted), raw: quoted, v: cashApprox(c.cost.open, c.rates),
      }), rateNote(c.rates, c.rates_at)].filter(Boolean).join(' ')
      : open.length ? t('cd.cost_none') : '';

    el('cd-badges-other').textContent = c.badges?.other
      ? t('cd.badges_other', { n: num(c.badges.other), raw: c.badges.other }) : '';
    // The Community Badge, which is a checklist rather than a card set. Steam
    // answers with quest ids and no names for them, so a count is honestly all
    // this can be, and it sits as a line rather than a panel because of it.
    el('cd-community').textContent = c.community_badge
      ? t('cd.community', { done: num(c.community_badge.done),
        total: num(c.community_badge.total) }) : '';
    el('cd-filling').textContent = c.filling?.unclassified
      ? t('cd.filling', { n: num(c.filling.unclassified) }) : '';

    madeList.textContent = '';
    for (const row of made) madeList.append(cardRow(row, query, true, c.rates));

    const q = find.value.trim().toLowerCase();
    const rows = q ? open.filter((g) => g.name.toLowerCase().includes(q)) : open;
    openList.textContent = '';
    for (const row of rows.slice(0, shown)) {
      openList.append(cardRow(row, query, false, c.rates));
    }

    const left = rows.length - shown;
    more.hidden = left <= 0;
    more.textContent = left > 0 ? t('cd.more', { n: num(Math.min(left, CARD_PAGE)) }) : '';
    el('cd-shown').textContent = open.length
      ? t('cd.shown', { shown: num(Math.min(shown, rows.length)), total: num(rows.length) })
      : t('cd.empty');
  }

  more.addEventListener('click', () => { shown += CARD_PAGE; draw(); });
  find.addEventListener('input', () => { shown = CARD_PAGE; draw(); });
  draw();

  // Not awaited. The two panels above are complete and readable now; the third
  // one arrives when the Community host gets round to it, and until then its
  // absence is the honest state of the page rather than a spinner over it.
  buildCollection(steamid, query);

  // One more ask, for the sets the market had not answered about when the page
  // opened. Once and not on a timer: this is a page somebody reads, not a
  // dashboard that ticks, and the rest is one reload away.
  if (c.filling?.unpriced) {
    setTimeout(async () => {
      try {
        c = await api(`/cards?id=${steamid}`);
        draw();
      } catch { /* it said what it could */ }
    }, CARD_REFILL);
  }
}

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

  buildPick(games, query, { priceOf, yearOf, freeOf, currency });

  more.addEventListener('click', () => { shown += PILE_PAGE; draw(); });
  find.addEventListener('input', () => { shown = PILE_PAGE; draw(); });
  draw();
}

/** One game out of the pile, and the reason it was the one.
 *
 *  Standing in front of three hundred unopened games is the problem this page
 *  describes and does not solve. What solves it is a smaller number, and the
 *  honest way to get to one is to say out loud which rule produced it.
 *
 *  So: a handful of rules, each of which can name itself in one line, and the
 *  rule is picked at random rather than the game. "The most expensive thing you
 *  have never opened" is a fact about the library. "You might like this" would
 *  be an invention - the site knows what somebody owns and nothing whatever
 *  about what they enjoy, and a pile of unplayed games is the proof. */
function buildPick(games, query, { priceOf, yearOf, freeOf, currency }) {
  const wrap = el('bl-pick');
  const go = el('bl-pick-go');
  const out = el('bl-pick-out');
  if (!wrap || !go || !out || games.length < 2) return;
  wrap.hidden = false;

  const withPrice = games.filter((g) => priceOf(g.appid) != null);
  const withYear = games.filter((g) => yearOf(g.appid) != null);
  const pickOne = (rows) => rows[Math.floor(Math.random() * rows.length)];

  // Every rule returns the game and the key that explains it, or null when the
  // library cannot answer that particular question - a pile with no prices in
  // the store cache yet simply has fewer rules available, rather than a rule
  // that fires with a blank in it.
  const RULES = [
    () => {
      if (!withPrice.length) return null;
      const g = withPrice.reduce((a, b) => (priceOf(b.appid) > priceOf(a.appid) ? b : a));
      return { g, why: t('bl.why_dear', { v: cash(priceOf(g.appid), currency) }) };
    },
    () => {
      if (!withYear.length) return null;
      const g = withYear.reduce((a, b) => (yearOf(b.appid) < yearOf(a.appid) ? b : a));
      return { g, why: t('bl.why_old', { year: yearOf(g.appid) }) };
    },
    () => {
      if (!withYear.length) return null;
      const g = withYear.reduce((a, b) => (yearOf(b.appid) > yearOf(a.appid) ? b : a));
      return { g, why: t('bl.why_new', { year: yearOf(g.appid) }) };
    },
    () => {
      const free = games.filter((g) => freeOf(g.appid));
      if (!free.length) return null;
      const g = pickOne(free);
      return { g, why: t('bl.why_free') };
    },
    () => {
      const cheap = withPrice.filter((g) => priceOf(g.appid) > 0);
      if (!cheap.length) return null;
      const g = cheap.reduce((a, b) => (priceOf(b.appid) < priceOf(a.appid) ? b : a));
      return { g, why: t('bl.why_cheap', { v: cash(priceOf(g.appid), currency) }) };
    },
    () => ({ g: pickOne(games), why: t('bl.why_random', { n: num(games.length) }) }),
  ];

  let last = null;
  function press() {
    // Shuffle the rules and take the first that can answer. Two presses in a
    // row landing on the same game reads as a broken button, so a repeat is
    // retried once - once, and not until it differs, because a pile of two
    // games has no third answer to find.
    const order = RULES.slice().sort(() => Math.random() - 0.5);
    let got = null;
    for (const rule of order) {
      got = rule();
      if (got && (!last || got.g.appid !== last)) break;
      if (got && last && got.g.appid === last) got = null;
    }
    if (!got) for (const rule of order) { got = rule(); if (got) break; }
    if (!got) return;

    last = got.g.appid;
    out.textContent = '';
    out.append(h('a', { cls: 'pick-card', attr: { href: `/u/${query}/${got.g.appid}` } },
      h('b', { cls: 'pick-name', text: got.g.name }),
      h('span', { cls: 'pick-why', text: got.why })));
    go.textContent = t('bl.pick_again');
  }

  go.addEventListener('click', press);
}

/* ── One year ──────────────────────────────────────────────────────────
   /u/<perfil>/year/<ano>.

   The years panel on the dashboard has always known this much; what it did not
   have was an address. A year with a link of its own is a year somebody can
   send to the person they spent it with, and it is the only page on this site
   that is about a date rather than about a game or a library.

   The same warning the years panel carries applies here and is printed here:
   Steam publishes one date per game, the last time it was launched. So this is
   the year a game was put down in, not the year it was played. The unlocks
   below it are the opposite - those carry the date the unlock happened, which
   is the only thing on a Steam profile that is genuinely per-year - and they
   only reach as far down the library as the scan does. */

function renderYear(d, year, query) {
  const pf = d.profile;
  const games = (d.library || [])
    .filter((g) => (g.last_played || '').slice(0, 4) === year)
    .sort((a, b) => (b.hours ?? -1) - (a.hours ?? -1));
  const hours = games.reduce((s, g) => s + (g.hours || 0), 0);

  document.title = `${pf.persona} - ${year} - steamprofiler.org`;
  el('yr-title').textContent = year;
  el('yr-count').textContent = num(games.length);
  el('yr-lede').textContent = games.length
    ? t('yr.lede', {
      year, n: num(games.length), raw: games.length,
      h: hrs(hours), game: games[0].name,
    })
    : t('yr.empty', { year });

  // The account's own beginning, when it happens to be this year. Free - it is
  // already on the payload - and it is the one thing on this page that is a
  // date rather than a count.
  if ((pf.member_since || '').slice(0, 4) === year) {
    el('yr-lede').textContent += ` ${t('yr.opened', { date: longDate(pf.member_since) })}`;
  }

  // The year as a picture, for the one thing a page like this is for: showing
  // somebody else. Built by the API off the payload already fetched, so the
  // link costs nothing until it is clicked, and it is only offered for a year
  // that has something in it - a card of an empty year is an empty card.
  const card = el('yr-card');
  if (card) {
    if (games.length) {
      card.href = `/api/card.png?q=${encodeURIComponent(query)}&year=${year}`;
      card.textContent = t('yr.card');
      card.parentElement.hidden = false;
    } else {
      card.parentElement.hidden = true;
    }
  }

  // Every year this library has anything in, so the arrows only ever point at
  // a page with something on it.
  const present = [...new Set((d.library || [])
    .map((g) => (g.last_played || '').slice(0, 4)).filter(Boolean))].sort();
  const nav = el('yr-nav');
  nav.textContent = '';
  const at = present.indexOf(year);
  const step = (i, key) => {
    if (i < 0 || i >= present.length) return;
    nav.append(h('a', {
      cls: 'yr-step',
      text: t(key, { year: present[i] }),
      attr: { href: `/u/${query}/year/${present[i]}` },
    }));
  };
  // A year with nothing in it is not in `present`, so there is no position to
  // step from and the arrows come out entirely rather than pointing at the two
  // ends of the list.
  if (at >= 0) {
    step(at - 1, 'yr.prev');
    step(at + 1, 'yr.next');
  }

  // The footer's "fetched at" line belongs to every view that was fetched, and
  // this one is drawn from the same payload the dashboard is.
  if (d.generated_at) {
    const when = el('g-generated');
    when.dateTime = d.generated_at;
    when.textContent = stamp(d.generated_at);
  }

  const list = el('yr-list');
  list.textContent = '';
  for (const g of games) {
    list.append(h('li', {}, h('a', {
      cls: 'all-row',
      attr: { href: `/u/${query}/${g.appid}` },
      data: g.themed ? { themed: '1' } : {},
    },
    h('span', { cls: 'all-rank', text: g.rank ? `${g.rank}` : '-' }),
    h('span', { cls: 'all-name', text: g.name }),
    h('span', { cls: 'all-h', text: `${hrs(g.hours)} h` }),
    h('span', { cls: 'all-share', text: g.share == null ? '' : `${num(g.share, 1)}%` }),
    // The day, without the year: this whole page is that year.
    h('span', { cls: 'all-date', text: dayMonth(g.last_played) || '' }))));
  }

  // The unlocks, behind the same button the dashboard puts them behind and
  // answered out of the same cache: a visitor who ran the scan over there gets
  // this one back in a few milliseconds and spends nothing for it.
  const go = el('yr-go');
  const howMany = d.rarity_games || 12;
  go.textContent = t('close.go', { n: num(howMany) });
  el('yr-unlock-note').textContent = t('yr.unlocks_hint');
  go.addEventListener('click', async () => {
    go.disabled = true;
    go.textContent = t('rar.loading', { n: num(howMany) });
    let got;
    try {
      got = await scanOnce(d.steamid);
    } catch (e) {
      go.disabled = false;
      go.textContent = t('close.go', { n: num(howMany) });
      el('yr-unlock-note').textContent = e.message;
      return;
    }
    go.remove();

    const slot = (got.years || {})[year];
    const ul = el('yr-unlocks');
    ul.textContent = '';
    el('yr-unlocked').textContent = slot ? num(slot.unlocks) : '0';
    if (!slot) {
      el('yr-unlock-note').textContent = t('yr.unlocks_none', {
        year, n: num(got.scanned),
      });
      return;
    }
    for (const g of slot.games) {
      ul.append(h('li', {}, h('a', {
        cls: 'close',
        attr: { href: `/u/${query}/${g.appid}` },
      },
      h('span', { cls: 'close-top' },
        h('b', { cls: 'close-name', text: g.name }),
        h('span', { cls: 'close-pct', text: num(g.n) })),
      h('span', { cls: 'close-sub', text: t('yr.in_game', { n: num(g.n), raw: g.n, year }) }))));
    }
    el('yr-unlock-note').textContent = t('yr.unlocks_note', {
      n: num(got.scanned), year,
    });
  });
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

  buildDiscover(d, query);
  buildNow(d.now);
  buildPlatform(d.platform, d.library);
  buildAccount(pf);
  buildShowcase(pf);
  // A badge names a game by appid, including the sale and event badges whose
  // appid belongs to a storefront page nobody owns. Only the ones this library
  // actually holds get to be links, so the whole library is what decides.
  buildBadges(pf, query, new Set(
    [...d.library, ...d.unplayed].map((g) => g.appid)));
  pairRow();
  buildPages(d.top_games, query);
  buildTable(d.top_games, query);
  buildTimeline(d.library, query);
  buildLibrary(d.library, d.unplayed, query);
  buildCompare(query);

  MONEY_Q = query;
  buildMoney(d.money, d.store_coverage);
  buildGenres(d.genres, d.store_coverage);
  buildFriends(d.friend_list, query);
  // Not awaited, like the collection panel on the cards page: the dashboard is
  // complete without it and this one costs a call of its own.
  buildWishlist(d.steamid);
  buildRarities(d.steamid, d.rarity_games || 12);
  buildClose(d.steamid, d.rarity_games || 12);
  buildBoard(d.steamid, query, d.friend_list, pf);
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
