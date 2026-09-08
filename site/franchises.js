/* steamprofiler.org - the franchise screens.

   Ten series, each with a screen built out of that series' own interface, the
   same way game.js builds one page per game. The difference is what a
   franchise is: not one record but a line of them, drawn across the years
   they were made in.

   Four addresses reach the same code:

     /franchises              the ten, with the world's numbers
     /franchises/<slug>       one of them, likewise
     /u/<who>/franchises      the ten, with that profile's hours on top
     /u/<who>/franchises/<slug>

   Which ten there are is not here: franchise-list.js holds the table, because
   the landing page wants that list without wanting any of this. Adding a
   series is an entry there, a palette block in franchises.css and its strings
   in dict.js.

   Shared helpers come from lib.js. The router decides when this runs. */

/* ── Two tables that belong to one screen each ─────────────────────────
   The signature panels below are the only readers of these, and they are up
   here with the rest of the editorial data rather than buried beside the
   drawing code, because they are the same kind of thing as the shelf above:
   facts about the games, written down once, checkable by anybody.

   Where a game went. Arena crossed the whole continent, every sequel picked
   one province, and Daggerfall is on two plates because the Iliac Bay is on
   two provinces - which is the map being right rather than the list being
   sloppy. The four provinces with nothing in them are on the map for the same
   reason: thirty years in, the series has still never gone there. */
const FX_TAMRIEL = [
  ['fx.tam_skyrim', [72850, 489830, 611670]],
  ['fx.tam_cyrodiil', [22330, 2623190]],
  ['fx.tam_morrowind', [22320]],
  ['fx.tam_highrock', [1812390]],
  ['fx.tam_hammerfell', [1812390, 1812410]],
  ['fx.tam_summerset', []],
  ['fx.tam_valenwood', []],
  ['fx.tam_elsweyr', []],
  ['fx.tam_blackmarsh', []],
  ['fx.tam_all', [1812290, 306130]],
  ['fx.tam_oblivion', [1812420]],
];

/* Where each S.T.A.L.K.E.R. starts. The three Enhanced Editions are the same
   three games and so are the same three places, which is the point of them. */
const FX_ZONE = {
  4500: 'fx.zone_cordon',
  20510: 'fx.zone_swamp',
  41700: 'fx.zone_zaton',
  1643320: 'fx.zone_whole',
  2427410: 'fx.zone_cordon',
  2427420: 'fx.zone_swamp',
  2427430: 'fx.zone_zaton',
};

/* ── The opening ───────────────────────────────────────────────────────
   Every franchise screen opens on a few seconds of that franchise, and then
   gets out of the way. It is drawn rather than played: shapes, type and
   keyframes, no video file, nothing fetched. That is not a limitation being
   made the best of - it is the only kind of intro that can be on this site,
   because it has to start on the first frame, weigh nothing, work with the
   network down, and be over before anybody resents it.

   Three rules hold it together:

     it is always skippable, by clicking, by pressing anything, and by a
     button that is on screen from the first frame rather than after three
     seconds of being trapped;

     it plays once per franchise per visit, kept in sessionStorage, because
     an intro on the fourth visit to the same screen is not an intro, it is a
     door that sticks;

     it does not play at all for a reader who asked for less motion. Not a
     shortened one, not a still: the screen simply opens.

   The real trailer, when the store cache has one, is behind a button on the
   screen underneath. That is where megabytes belong: after somebody asks. */

const FX_SEEN_KEY = 'sp-fx-seen';

/** Which intros this visit has already played. sessionStorage rather than
 *  localStorage: coming back tomorrow should feel like arriving, and coming
 *  back in the same half hour should not. */
function fxSeen() {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(FX_SEEN_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function fxMarkSeen(slug) {
  try {
    const seen = fxSeen();
    seen.add(slug);
    sessionStorage.setItem(FX_SEEN_KEY, JSON.stringify([...seen]));
  } catch {
    /* A browser that refuses storage gets the intro every time, which is the
       harmless half of this failure rather than the one that hides content. */
  }
}

/** The moving parts of each opening. Each returns the inside of the overlay;
 *  the timing lives in franchises.css, keyed off the same slug, because an
 *  animation written half in a stylesheet and half in a script is an
 *  animation nobody can retime. */
const INTRO = {
  /* Use the actual lowercase Greek lambda rather than approximating its glyph
     with a path. The Half-Life mark is λ, not the uppercase Λ. */
  'half-life': () => [
    h('div', { cls: 'fxi-hl-ring' }),
    h('span', { cls: 'fxi-hl-mark', text: 'λ' }),
    h('p', { cls: 'fxi-hl-org', text: 'BLACK MESA RESEARCH FACILITY' }),
    h('p', { cls: 'fxi-hl-sub', text: 'ANOMALOUS MATERIALS' }),
    h('div', { cls: 'fxi-hl-scan' }),
  ],
  /* The half second before a round: the buy timer, and two sides closing. */
  'counter-strike': () => [
    h('div', { cls: 'fxi-cs-side fxi-cs-ct' }),
    h('div', { cls: 'fxi-cs-side fxi-cs-t' }),
    h('div', { cls: 'fxi-cs-mid' },
      h('span', { cls: 'fxi-cs-timer', text: '0:45' }),
      h('span', { cls: 'fxi-cs-word', text: 'COUNTER-STRIKE' })),
    h('div', { cls: 'fxi-cs-flash' }),
  ],
  /* Two portals, and something going in one and out the other. */
  portal: () => [
    h('div', { cls: 'fxi-pt-hole fxi-pt-orange' }),
    h('div', { cls: 'fxi-pt-hole fxi-pt-blue' }),
    h('div', { cls: 'fxi-pt-cube' }),
    h('p', { cls: 'fxi-pt-word', text: 'PORTAL' }),
  ],
  /* The loading screen: flat colour, one era at a time, then the title. */
  'grand-theft-auto': () => [
    h('div', { cls: 'fxi-gta-band', data: { era: '1' } }),
    h('div', { cls: 'fxi-gta-band', data: { era: '2' } }),
    h('div', { cls: 'fxi-gta-band', data: { era: '3' } }),
    h('div', { cls: 'fxi-gta-band', data: { era: '4' } }),
    h('p', { cls: 'fxi-gta-word' },
      h('span', { text: 'GRAND' }), h('span', { text: 'THEFT' }), h('span', { text: 'AUTO' })),
  ],
  /* The ring of script, lit from inside. */
  'the-elder-scrolls': () => [
    h('div', { cls: 'fxi-tes-glow' }),
    fxSvg('0 0 200 200', 'fxi-tes-ring',
      '<circle cx="100" cy="100" r="76" fill="none" stroke="currentColor" ' +
      'stroke-width="1.5" pathLength="100" class="fxi-tes-circle" />' +
      '<circle cx="100" cy="100" r="64" fill="none" stroke="currentColor" ' +
      'stroke-width="0.8" stroke-dasharray="2 5" opacity=".55" />' +
      '<g class="fxi-tes-glyphs" fill="currentColor">' +
      fxTicks(24, 100, 100, 70, 6) + '</g>'),
    h('p', { cls: 'fxi-tes-word' },
      h('b', { text: 'THE ELDER SCROLLS' }),
      h('span', { text: 'TAMRIEL' })),
  ],
  /* The Pip-Boy coming up: a tube warming, a ROM check, then the screen. */
  fallout: () => [
    h('div', { cls: 'fxi-fo-tube' }),
    h('pre', { cls: 'fxi-fo-rom' },
      h('span', { text: '*************** PIP-OS(R) V7.1.0.8 ***************' }),
      h('span', { text: 'COPYRIGHT 2075-2077 ROBCO INDUSTRIES' }),
      h('span', { text: '-SERVER 1-' }),
      h('span', { text: 'LOADER V1.1' }),
      h('span', { text: 'EXEC VERSION 41.10' }),
      h('span', { text: '64K RAM SYSTEM' }),
      h('span', { text: '38911 BYTES FREE' })),
    h('p', { cls: 'fxi-fo-word', text: 'FALLOUT' }),
    h('div', { cls: 'fxi-fo-lines' }),
  ],
  /* Static, a geiger count that will not settle, and then the Zone. */
  stalker: () => [
    h('div', { cls: 'fxi-st-noise' }),
    h('div', { cls: 'fxi-st-geiger' }, ...Array.from({ length: 26 }, () => h('i'))),
    h('p', { cls: 'fxi-st-word' },
      h('b', { text: 'S.T.A.L.K.E.R.' }),
      h('span', { text: '51°23′22″N  30°05′59″E' })),
    h('div', { cls: 'fxi-st-anomaly' }),
  ],
  /* A map, a grid reference, and the stamp that comes down on a briefing. */
  arma: () => [
    h('div', { cls: 'fxi-ar-map' }),
    h('div', { cls: 'fxi-ar-cross' }, h('i'), h('i')),
    h('p', { cls: 'fxi-ar-grid', text: '035 118' }),
    h('p', { cls: 'fxi-ar-word', text: 'ARMA' }),
    h('p', { cls: 'fxi-ar-stamp', text: 'BRIEFING' }),
  ],
  /* One ember, then the bonfire, then the words nobody needs translated. */
  'dark-souls': () => [
    h('div', { cls: 'fxi-ds-dark' }),
    h('div', { cls: 'fxi-ds-fire' }, ...Array.from({ length: 5 }, () => h('i'))),
    h('div', { cls: 'fxi-ds-sword' }),
    h('p', { cls: 'fxi-ds-word', text: 'DARK SOULS' }),
  ],
  /* The typewriter in the save room, and the ribbon it is typing on. */
  'resident-evil': () => [
    h('div', { cls: 'fxi-re-paper' },
      h('p', { cls: 'fxi-re-type', text: 'RESIDENT EVIL' }),
      h('p', { cls: 'fxi-re-sub', text: 'do you want to save?' })),
    h('div', { cls: 'fxi-re-key' }),
    h('div', { cls: 'fxi-re-door' }),
  ],
};

/** An inline SVG. `html` rather than built node by node because these are
 *  fixed drawings, not data - and the CSP forbids inline style, not innerHTML
 *  of a string written in this file. */
function fxSvg(viewBox, cls, inner) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', cls);
  svg.innerHTML = inner;
  return svg;
}

/** `n` marks evenly around a circle, as an SVG fragment. The Elder Scrolls
 *  ring is a ring of script and this is the honest version of that: shapes at
 *  the right angles, rather than a made-up alphabet pretending to be Daedric. */
function fxTicks(n, cx, cy, r, len) {
  let out = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    const w = i % 3 === 0 ? 2.6 : 1.4;
    out += `<rect x="${(x - w / 2).toFixed(2)}" y="${(y - len / 2).toFixed(2)}" ` +
      `width="${w}" height="${len}" transform="rotate(${((i / n) * 360).toFixed(1)} ` +
      `${x.toFixed(2)} ${y.toFixed(2)})" />`;
  }
  return out;
}

/** How long each opening runs before it takes itself off. Written here rather
 *  than read off the animation, because what ends the intro is a decision
 *  about pacing and not the last keyframe that happens to finish. */
const INTRO_MS = {
  'half-life': 3400, 'counter-strike': 2900, portal: 3000,
  'grand-theft-auto': 3200, 'the-elder-scrolls': 3600, fallout: 3600,
  stalker: 3200, arma: 3000, 'dark-souls': 3800, 'resident-evil': 3400,
};

/** Play the opening for `fr` over the page, and resolve when it is done or
 *  skipped. Resolves immediately, having drawn nothing, when the reader asked
 *  for less motion or when this visit has already seen this one and `force`
 *  was not passed. */
function playIntro(fr, { force = false } = {}) {
  // Not every franchise has one, and a franchise without one opens on its
  // screen rather than on three seconds of black. INTRO is the whole test:
  // writing an opening is what gives a series one.
  if (!INTRO[fr.slug]) return Promise.resolve(false);
  // Not a shorter opening for a reader who asked for less motion, and not a
  // still frame either. The replay button is not drawn for them at all, so
  // `force` cannot get past this line - which is the point of putting it
  // first rather than treating stillness as one preference among several.
  if (still()) return Promise.resolve(false);
  if (!force && fxSeen().has(fr.slug)) return Promise.resolve(false);

  const shot = h('div', {
    cls: 'fx-intro',
    data: { intro: fr.slug },
    attr: { role: 'presentation' },
  });
  put(shot, ...INTRO[fr.slug]());

  const skip = h('button', {
    cls: 'fx-skip',
    text: t('fx.skip'),
    attr: { type: 'button' },
  });
  shot.append(skip);
  document.body.append(shot);
  // After the node is in the document, so the keyframes start from their own
  // first frame rather than from wherever the layout happened to be.
  requestAnimationFrame(() => { shot.dataset.play = '1'; });
  fxMarkSeen(fr.slug);

  return new Promise((done) => {
    let closed = false;
    const timer = setTimeout(() => end(), INTRO_MS[fr.slug] || 3200);

    function end() {
      if (closed) return;
      closed = true;
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey, true);
      shot.dataset.play = '2';
      // Let the fade run, then take it out. The page underneath was drawn
      // before this ever appeared, so nothing is waiting on the removal.
      setTimeout(() => { shot.remove(); done(true); }, 420);
    }

    function onKey(e) {
      // Tab is how somebody reaches the skip button. Everything else ends it,
      // including the modifier-free keys people press at a black screen.
      if (e.key === 'Tab') return;
      e.preventDefault();
      end();
    }

    skip.addEventListener('click', (e) => { e.stopPropagation(); end(); });
    shot.addEventListener('click', () => end());
    window.addEventListener('keydown', onKey, true);
    skip.focus({ preventScroll: true });
  });
}

/* ── What the api is asked for ─────────────────────────────────────────
   One call, whatever the screen. `/apps` is a read of the store cache the
   whole site fills anyway: names, storefront dates, prices in the reader's
   own shop, review totals, and - for a short list - how many people are in
   each game right now. Nothing on it is about a person.

   A cold appid comes back `known: false` rather than missing, and the row is
   drawn without the numbers it does not have yet. That is the same bargain
   the card page makes: a screen somebody is reading is worth more than a
   screen that is complete, and the api fills the cache behind both. */

async function fxApps(ids, live) {
  const list = [...new Set(ids)];
  const q = `/apps?ids=${list.join(',')}&cc=${store()}` +
    (live ? `&live=${live.slice(0, 12).join(',')}` : '');
  try {
    return (await api(q)).apps || {};
  } catch {
    // The screen is built from the table in this file, so it stands without
    // this call. Losing it costs the prices and the live counts, not the page.
    return {};
  }
}

/** What one profile has of one franchise. `library` is what was played and
 *  `unplayed` is what is owned and never launched, which are different facts
 *  and are counted separately everywhere else on this site too. */
function fxStanding(fr, library, unplayed) {
  const mine = new Map((library || []).map((g) => [g.appid, g]));
  const idle = new Set((unplayed || []).map((g) => g.appid));
  const apps = [...fr.apps, ...(fr.after || [])];
  let hours = 0;
  let played = 0;
  let owned = 0;
  let top = null;
  for (const a of apps) {
    const g = mine.get(a.id);
    if (g) {
      hours += g.hours || 0;
      played += 1;
      owned += 1;
      if (!top || (g.hours || 0) > (top.hours || 0)) top = g;
    } else if (idle.has(a.id)) {
      owned += 1;
    }
  }
  return { hours, played, owned, top, total: apps.length, mine, idle };
}

/** The years a franchise covers, from its first game to its most recent one.
 *  `born` and not the earliest appid on the shelf: Grand Theft Auto started in
 *  1997 and its oldest page here is 2001, and the difference is the point. */
function fxSpan(fr) {
  const last = Math.max(...[...fr.apps, ...(fr.after || [])].map((a) => a.year));
  return { from: fr.born, to: last };
}

/** The year Steam says, or null. The api sends both halves of that date: the
 *  string the storefront wrote - "4 Jan, 2008", "26 Apr, 2022" - which is in
 *  the shop's own language and is only ever printed, and the year out of it,
 *  which is the part anything compares against. The string is the fallback for
 *  a row learned before the api sent the number. */
function fxSteamYear(row) {
  if (row && typeof row.year === 'number') return row.year;
  const m = /(19|20)\d\d/.exec((row && row.released) || '');
  return m ? Number(m[0]) : null;
}

/** Where a game's own page is. A profile that owns it gets the page with its
 *  hours on it; everybody else gets the public one, which exists for every
 *  app on Steam whether this site has a layout for it or not. */
function fxGameHref(appid, ctx) {
  return ctx.query && ctx.owns.has(appid) ? `/u/${ctx.query}/${appid}` : `/g/${appid}`;
}

/** What to call a game. The storefront's name wins, because that is the one on
 *  the shop today and the one somebody would search for. The table's own name
 *  is the fallback, and it is why these screens read properly before any
 *  answer arrives and with the api down entirely: eighty-one rows saying
 *  `app 70` is a page that technically rendered.
 *
 *  Both come from Steam. The names in the table were taken off the storefront
 *  rather than written from memory, so the two agree today, and the day they
 *  stop agreeing is the day the shop renamed something - which is exactly when
 *  the live one should win. */
const fxName = (row, app) => (row && row.name) || app.name || `app ${app.id}`;


/** Where a tile leads. Inside a profile the franchise screens stay inside it,
 *  so the reader's own hours do not fall off the moment they open one. */
const fxIndexHref = (fr, ctx) =>
  (ctx.query ? `/u/${ctx.query}/franchises/${fr.slug}` : `/franchises/${fr.slug}`);

/* ── The ten ───────────────────────────────────────────────────────────
   The index. Ten tiles, each in its own franchise's colour and lettering,
   ordered as the table is: by how much of Steam they are, which is a judgement
   and is written down in one place rather than computed out of numbers that
   would not support it. */

/* Every tile is drawn from the table and from the profile's own library, so
   this page makes no request at all: no wait, nothing to fail, and none of the
   catalogue read for a page that is a list of names. The live counts used to
   be here, for the flagships only, and stopped being worth it the moment the
   list stopped being ten - the api caps a live request at a dozen, so it would
   have been twelve arbitrary tiles carrying a number and the rest not.
   Those counts are on each franchise's own screen, where they cover every
   game in it. */
async function renderFranchiseIndex(root, ctx) {
  document.title = `${t('fx.title')} - steamprofiler.org`;
  root.textContent = '';

  const head = h('header', { cls: 'fx-ix-head' },
    h('p', { cls: 'fx-ix-kicker', text: t('fx.kicker') }),
    h('h1', { cls: 'display fx-ix-title', text: t('fx.title') }));
  root.append(head);

  const grid = h('div', { cls: 'fx-ix-grid', attr: { role: 'list' } });
  root.append(grid);

  for (const fr of FRANCHISES) {
    const span = fxSpan(fr);
    const stand = ctx.library ? fxStanding(fr, ctx.library, ctx.unplayed) : null;
    const card = h('a', {
      cls: 'fx-tile',
      data: { fx: fr.slug },
      attr: { role: 'listitem', href: fxIndexHref(fr, ctx) },
      style: { '--tint': fr.tint },
    });

    const tileArt = h('img', {
      cls: 'fx-tile-art',
      attr: { src: `/art/${fr.flagship}.jpg`, alt: '', loading: 'lazy', decoding: 'async' },
    });
    tileArt.addEventListener('error', () => tileArt.remove(), { once: true });
    card.append(tileArt, h('div', { cls: 'fx-tile-veil' }));

    const body = h('div', { cls: 'fx-tile-in' },
      h('p', { cls: 'fx-tile-house', text: fr.house }),
      h('h2', { cls: 'fx-tile-name', text: fr.name }),
      h('p', { cls: 'fx-tile-span', text: t('fx.span', {
        from: span.from, to: span.to,
        n: num(fr.apps.length + (fr.after?.length || 0)),
        raw: fr.apps.length + (fr.after?.length || 0),
      }) }));

    // The profile's own line, when there is a profile. A franchise it has
    // never touched still says so: an empty shelf is an answer.
    if (stand) {
      body.append(stand.played
        ? h('p', { cls: 'fx-tile-you' },
          h('b', { text: t('fx.hours_n', { h: hrs(stand.hours) }) }),
          h('span', { text: t('fx.of_n_played', {
            n: num(stand.played), total: num(stand.total), raw: stand.played,
          }) }))
        : h('p', { cls: 'fx-tile-you', data: { none: '1' } },
          h('span', { text: stand.owned
            ? t('fx.owned_never', { n: num(stand.owned), raw: stand.owned })
            : t('fx.none_here') })));
    }

    card.append(body);
    grid.append(card);
  }

}


/* ── The real trailer ──────────────────────────────────────────────────
   Steam stopped putting a file in the store payload: `movies` now carries
   DASH and HLS manifests, which no browser plays without a player library,
   and this site has no libraries. What it still carries is the movie's id,
   and the flat file that id has always had is still served, from the one host
   the site's media policy already allows. So the id is what the api sends and
   this builds the address, exactly as lib.js builds a header picture. */
const TRAILER_CDN = 'https://cdn.cloudflare.steamstatic.com/steam/apps';

/* Which file to ask for, in order. Steam keeps no single flat name for these:
   of ten trailers measured, five had only `movie480_vp9.webm`, two had only
   `movie480.webm`, two had both, and one had none of the three. `movie480.mp4`
   was there for nine of the ten, so it goes first - and it is h264, which
   plays in more browsers than a VP9 webm does anyway.

   The order matters for more than taste. A name that is not there answers 404
   with an HTML error page, and Chrome refuses a cross-origin HTML body handed
   to a <video> - that is the ERR_BLOCKED_BY_ORB in the console, and it is the
   404 talking, not the policy. Asking for the one that usually exists first
   means most trailers never make the failing request at all. */
const TRAILER_FILES = ['movie480.mp4', 'movie480_vp9.webm', 'movie480.webm'];

function trailerInto(host, row, name, appid) {
  if (!row || !row.trailer || !row.trailer.id) return null;
  const id = row.trailer.id;

  const dialog = h('dialog', { cls: 'fx-tr' });
  const video = h('video', {
    cls: 'fx-tr-video',
    attr: {
      controls: '', preload: 'none', playsinline: '',
      // Only when there is one. `poster=""` is not "no poster": it resolves
      // against the page's own address, so the browser fetches this HTML and
      // draws the failure to decode it as a broken frame.
      ...(row.trailer.thumb ? { poster: row.trailer.thumb } : {}),
    },
  });
  // Sources rather than one src: the element walks the list itself and stops
  // at the first that answers, which is the whole reason <source> exists.
  let missed = 0;
  for (const file of TRAILER_FILES) {
    const source = h('source', { attr: { src: `${TRAILER_CDN}/${id}/${file}` } });
    // The media element fires `error` at each <source> it cannot use and says
    // nothing on the element itself, so the count is what tells us the list
    // ran out rather than any one name failing.
    source.addEventListener('error', () => {
      if ((missed += 1) < TRAILER_FILES.length) return;
      video.remove();
      gone.hidden = false;
    }, { once: true });
    video.append(source);
  }
  // A trailer whose files Steam simply does not keep. One in ten, measured,
  // and there is no way to know which from here: the store payload gives the
  // movie's id and never says which files that id has. So the button is
  // offered either way and this is what it opens onto - a sentence and the
  // store page, rather than a dead player.
  const gone = h('p', { cls: 'fx-tr-gone' },
    txt(t('fx.trailer_gone')),
    h('a', {
      text: t('fx.trailer_store'),
      attr: { href: `https://store.steampowered.com/app/${appid}`,
              target: '_blank', rel: 'noopener' },
    }));
  gone.hidden = true;

  const close = h('button', { cls: 'fx-tr-close', text: t('fx.trailer_close'), attr: { type: 'button' } });
  put(dialog,
    h('p', { cls: 'fx-tr-head' },
      h('b', { text: row.trailer.name || name })),
    video, gone, close);

  const open = h('button', {
    cls: 'fx-act fx-act-tr',
    text: t('fx.trailer'),
    attr: { type: 'button' },
  });
  open.addEventListener('click', () => {
    dialog.showModal();
    if (video.isConnected) video.play().catch(() => { /* the controls are right there */ });
  });
  // Stopping the video on the way out, so closing the box is also closing the
  // sound - a dialog that keeps playing behind itself is a bug people blame
  // on their own tabs.
  const shut = () => { if (video.isConnected) video.pause(); dialog.close(); };
  close.addEventListener('click', shut);
  dialog.addEventListener('close', () => { if (video.isConnected) video.pause(); });
  dialog.addEventListener('click', (e) => { if (e.target === dialog) shut(); });

  host.append(open, dialog);
  return open;
}

/* ── One franchise ─────────────────────────────────────────────────────
   The screen. Its spine is the same on all ten - an opening, the years, one
   panel that belongs to this series and to no other, and the shelf of what is
   on Steam - and everything inside that spine is this franchise's own: its
   colours, its lettering, its opening, and a panel built out of something only
   this series has. Which is the same bargain game.js makes, one level up. */

async function renderFranchise(fr, root, ctx) {
  if (window.__fxExclusiveCleanup) {
    window.__fxExclusiveCleanup();
    window.__fxExclusiveCleanup = null;
  }
  // The slug picks the palette block in franchises.css where one exists. The
  // tint goes on regardless: it is what the generic block resolves against,
  // so a series with no block of its own still arrives in its own colour
  // rather than in the site's amber.
  document.documentElement.dataset.franchise = fr.slug;
  document.documentElement.style.setProperty('--tint', fr.tint);
  document.title = `${fr.name} - steamprofiler.org`;
  root.textContent = '';

  // Each of the ten full-page identities lives in its own CSS and JS pair.
  // Loading is done before the first franchise node is drawn, which prevents
  // a flash of the shared skeleton on the way into the exclusive screen.
  const exclusive = window.FranchiseExclusives
    ? await window.FranchiseExclusives.load(fr.slug)
    : null;

  const span = fxSpan(fr);
  const apps = [...fr.apps, ...(fr.after || [])];
  const stand = ctx.library ? fxStanding(fr, ctx.library, ctx.unplayed) : null;
  if (stand) ctx.owns = new Set([...stand.mine.keys(), ...stand.idle]);
  else ctx.owns = new Set();

  // Drawn first and filled second. The table in this file is enough for the
  // whole layout, so the screen is complete before the api answers and the
  // prices, the counts and the storefront dates land on top of it.
  const hero = h('header', { cls: 'fx-hero' });
  const art = h('img', {
    cls: 'fx-hero-art',
    attr: { src: `/art/${fr.flagship}.jpg`, alt: '', decoding: 'async' },
  });
  // An app with no key art at all leaves a broken-image glyph in the corner of
  // a full-bleed header, which looks like the page failed rather than like the
  // game is old. Same handling every other art on this site gets.
  art.addEventListener('error', () => art.remove(), { once: true });
  // A div and not a p: the trailer's <dialog> is appended in here, and a
  // paragraph may only hold phrasing content.
  const acts = h('div', { cls: 'fx-acts' });
  put(hero, art, h('div', { cls: 'fx-hero-veil' }),
    h('div', { cls: 'fx-hero-in' },
      h('p', { cls: 'fx-hero-kicker' },
        h('span', { text: fr.house }),
        h('i', { text: '·' }),
        h('span', { text: t('fx.span_years', { from: span.from, to: span.to }) })),
      h('h1', { cls: 'display fx-hero-name', text: fr.name }),
      standingInto(fr, stand),
      acts));
  root.append(hero);
  if (exclusive && exclusive.mount) {
    window.__fxExclusiveCleanup = exclusive.mount({ hero, root, fr, span, ctx, stand }) || null;
  }

  // Replaying it is only offered where it can happen at all: where there is
  // an opening to replay, and to a reader who did not ask for less motion. A
  // button that does nothing is worse than no button, because it reads as
  // something broken rather than as a choice this page already made.
  if (INTRO[fr.slug] && !still()) {
    const again = h('button', { cls: 'fx-act', text: t('fx.replay'), attr: { type: 'button' } });
    again.addEventListener('click', () => playIntro(fr, { force: true }));
    acts.append(again);
  }
  acts.append(h('a', {
    cls: 'fx-act',
    text: t('fx.all_ten'),
    attr: { href: ctx.query ? `/u/${ctx.query}/franchises` : '/franchises' },
  }));

  const line = h('section', { cls: 'fx-line' });
  root.append(line);

  const sig = h('section', { cls: 'fx-sig', data: { fx: fr.slug } });
  root.append(sig);

  const shelf = h('section', { cls: 'fx-shelf' },
    h('div', { cls: 'panel-bar' },
      h('span', { text: t('fx.on_steam') }),
      h('b', { text: num(fr.apps.length) })));
  const list = h('ol', { cls: 'fx-rows' });
  shelf.append(list);
  root.append(shelf);

  let afterList = null;
  if (fr.after) {
    const band = h('section', { cls: 'fx-shelf fx-after' },
      h('div', { cls: 'panel-bar' },
        h('span', { text: t('fx.after_head') }),
        h('b', { text: num(fr.after.length) })));
    afterList = h('ol', { cls: 'fx-rows' });
    band.append(afterList);
    root.append(band);
  }

  // The opening runs over a page that is already built, so skipping it lands
  // on the screen rather than on a wait for one.
  playIntro(fr);

  // The api answers a live count for a dozen apps at most, and a long series
  // has more than that. The dozen are the newest, because a count of nought in
  // a game from 2004 says less than a count in the one that came out last
  // year - and a row without one simply does not carry the line.
  const newest = [...fr.apps].sort((a, b) => b.year - a.year).map((a) => a.id);
  const rows = await fxApps(apps.map((a) => a.id), newest);

  drawLine(line, fr, rows, ctx);
  put(list, ...fr.apps.map((a) => gameRow(a, rows[String(a.id)], ctx, stand)));
  if (afterList) {
    put(afterList, ...fr.after.map((a) => gameRow(a, rows[String(a.id)], ctx, stand)));
  }
  (SIGNATURE[fr.slug] || (() => {}))(sig, fr, rows, ctx, stand);
  if (exclusive && exclusive.ready) exclusive.ready({ hero, root, fr, rows, ctx, stand });
  trailerInto(acts, rows[String(fr.flagship)], fr.name, fr.flagship);
}

/** The reader's own standing in this series, or nothing at all when there is
 *  no profile in the address. */
function standingInto(fr, stand) {
  if (!stand) return null;
  if (!stand.played && !stand.owned) {
    return h('p', { cls: 'fx-stand', data: { none: '1' } },
      h('span', { text: t('fx.none_here_long', { name: fr.name }) }));
  }
  const box = h('p', { cls: 'fx-stand' });
  put(box,
    h('b', { text: t('fx.hours_n', { h: hrs(stand.hours) }) }),
    h('span', { text: t('fx.played_owned', {
      played: num(stand.played), owned: num(stand.owned), total: num(stand.total),
    }) }));
  if (stand.top) box.append(h('em', { text: t('fx.mostly', { game: stand.top.name }) }));
  return box;
}

/* ── The years ─────────────────────────────────────────────────────────
   A franchise is a line, so it is drawn as one: the first game at the left
   edge, the newest at the right, and everything in between where its year
   actually puts it. Spacing to scale is the whole point - a series with four
   games in one year and then nothing for seven is a shape, and a list of
   titles in even rows destroys it.

   Two dates per game, because Steam has one and history has the other. Arena
   was made in 1994 and arrived in this shop in 2022; the dot is at 1994, the
   mark under the spine is at 2022, and the hairline between them is the
   twenty-eight years. Where the two agree there is no hairline, which is the
   right amount of ink for "nothing happened here". */

/** The gap worth naming. Under this many years a franchise is just taking its
 *  time; over it, the silence is the thing the reader came to see. */
const FX_GAP = 4;

function drawLine(host, fr, rows, ctx) {
  const span = fxSpan(fr);
  const apps = [...fr.apps].sort((a, b) => a.year - b.year);
  const width = Math.max(1, span.to - span.from);
  const at = (year) => ((year - span.from) / width) * 100;

  host.textContent = '';
  host.append(h('div', { cls: 'panel-bar' },
    h('span', { text: t('fx.the_line') }),
    h('b', { text: t('fx.years_n', { n: num(width), raw: width }) })));

  const track = h('div', { cls: 'fx-track' });
  const read = h('output', { cls: 'fx-track-read', attr: { 'aria-live': 'polite' } });

  // The silences, drawn under the spine before the dots go on top of them.
  for (let i = 1; i < apps.length; i++) {
    const gap = apps[i].year - apps[i - 1].year;
    if (gap < FX_GAP) continue;
    const bar = h('span', { cls: 'fx-gap' },
      h('b', { text: t('fx.gap_years', { n: num(gap), raw: gap }) }));
    bar.style.left = `${at(apps[i - 1].year)}%`;
    bar.style.width = `${at(apps[i].year) - at(apps[i - 1].year)}%`;
    track.append(bar);
  }

  // Decade marks, so the spacing is readable as time rather than as layout.
  const firstTick = Math.ceil(span.from / 5) * 5;
  for (let y = firstTick; y <= span.to; y += 5) {
    const tick = h('span', { cls: 'fx-tick', text: String(y) });
    tick.style.left = `${at(y)}%`;
    track.append(tick);
  }

  // How many games share each year, so the ones that do stack instead of
  // landing on top of each other. Half-Life put out three things in 2004.
  const perYear = new Map();
  for (const a of apps) perYear.set(a.year, (perYear.get(a.year) || 0) + 1);
  const placed = new Map();

  for (const a of apps) {
    const row = rows[String(a.id)];
    const name = fxName(row, a);
    const seen = placed.get(a.year) || 0;
    placed.set(a.year, seen + 1);

    const dot = h('a', {
      cls: 'fx-dot',
      attr: { href: fxGameHref(a.id, ctx), title: `${name} · ${a.year}` },
    });
    dot.style.left = `${at(a.year)}%`;
    dot.style.setProperty('--stack', String(seen));
    if (perYear.get(a.year) > 1) dot.dataset.stacked = '1';
    // A game this profile has played is a filled dot and one it has not is an
    // outline. On a screen with no profile every dot is filled, because then
    // the distinction is not about anybody.
    if (!ctx.library || ctx.owns.has(a.id)) dot.dataset.on = '1';
    dot.append(h('i'), h('b', { text: String(a.year) }));

    const say = () => {
      read.textContent = `${name} · ${a.year}`;
      const steam = fxSteamYear(row);
      if (steam && steam !== a.year) {
        read.textContent += ` · ${t('fx.reached_steam', { year: steam })}`;
      }
    };
    dot.addEventListener('pointerenter', say);
    dot.addEventListener('focus', say);
    track.append(dot);

    // The storefront's own date, under the spine, where it disagrees.
    const steam = fxSteamYear(row);
    if (steam && Math.abs(steam - a.year) >= 2 && steam <= span.to) {
      const mark = h('span', { cls: 'fx-arrived', attr: { 'aria-hidden': 'true' } });
      mark.style.left = `${Math.min(at(steam), 100)}%`;
      const link = h('span', { cls: 'fx-arrived-line' });
      link.style.left = `${Math.min(at(a.year), at(steam))}%`;
      link.style.width = `${Math.abs(at(steam) - at(a.year))}%`;
      track.append(link, mark);
    }
  }

  host.append(track, read);
}

/* ── One game on the shelf ─────────────────────────────────────────────
   Every app in the series, in the order it was made. What the row says about
   the reader depends on which of three states it is in, and they are three
   different sentences rather than one sentence with a zero in it: played,
   owned and never opened, and not owned. */

function gameRow(app, row, ctx, stand) {
  const name = fxName(row, app);
  const mine = stand && stand.mine.get(app.id);
  const idle = stand && stand.idle.has(app.id);

  const li = h('li', {});
  const a = h('a', {
    cls: 'fx-row',
    data: mine ? { on: '1' } : idle ? { idle: '1' } : {},
    attr: { href: fxGameHref(app.id, ctx) },
  });

  const head = h('span', { cls: 'fx-row-head' },
    h('b', { cls: 'fx-row-name', text: name }),
    app.tag ? h('em', { cls: 'fx-row-tag', text: t(app.tag) }) : null);
  put(a, h('span', { cls: 'fx-row-year', text: String(app.year) }), head);

  // The reader's column. Absent entirely when nobody is being talked about.
  if (stand) {
    a.append(h('span', { cls: 'fx-row-you',
      text: mine ? t('fx.hours_n', { h: hrs(mine.hours) })
        : idle ? t('fx.owned_idle')
          : t('fx.not_owned') }));
  }

  const facts = h('span', { cls: 'fx-row-facts' });
  if (row && row.players != null) {
    facts.append(h('span', {
      cls: 'fx-row-live', text: t('fx.n_playing', { n: num(row.players), raw: row.players }),
    }));
  }
  if (row && row.reviews && row.reviews.total) {
    facts.append(h('span', {
      text: t('fx.rev_pct', { pct: num(row.reviews.positive_pct ?? 0), n: num(row.reviews.total) }),
    }));
  }
  if (row && row.free) facts.append(h('span', { cls: 'fx-row-price', text: t('fx.free') }));
  else if (row && row.price != null) {
    facts.append(h('span', { cls: 'fx-row-price', text: cash(row.price, row.currency) }));
  } else if (row && !row.known) {
    facts.append(h('span', { cls: 'fx-row-price', data: { wait: '1' }, text: t('fx.reading') }));
  }
  a.append(facts);

  // The storefront's date, only where it is a different fact from the year in
  // the table beside it.
  const older = [];
  if (app.made) older.push(t('fx.made_in', { year: app.made }));
  const steam = fxSteamYear(row);
  if (steam && Math.abs(steam - app.year) >= 2) older.push(t('fx.arrived_in', { year: steam }));
  if (older.length) {
    a.append(h('span', { cls: 'fx-row-arrived', text: older.join(' · ') }));
  }

  li.append(a);
  return li;
}

/* ── The signature ─────────────────────────────────────────────────────
   One panel per franchise, built out of something only that series has: the
   suit readout, the buy menu, a test chamber, the radio dial, the provinces
   of Tamriel, the Pip-Boy's quest list, the Zone, a briefing board, the
   bonfires, the attaché case.

   This is the part that cannot be shared, and it is where a franchise screen
   stops being a template with a palette on it. Each one draws from the same
   two sources as everything else here: the table at the top of this file, and
   whatever the api managed to say. With no profile in the address they show
   the series; with one, they show the reader inside it.

   Keyed by slug, like LAYOUTS in game.js is keyed by theme. A franchise with
   no entry here gets a screen without this section, which is a screen that
   still works - so a new franchise can be added before its panel is drawn. */

/** The head every signature panel wears, so ten different insides still sit
 *  in one page. */
function sigHead(host, title, meta) {
  host.append(h('div', { cls: 'panel-bar' },
    h('span', { text: title }), meta ? h('b', { text: meta }) : null));
  const body = h('div', { cls: 'fx-sig-body' });
  host.append(body);
  return body;
}

/** How much of a series a reader has played, as a percentage of its games.
 *  Not of its hours: nobody has a target number of hours, and everybody can
 *  see the shape of eleven games with four of them opened. */
const sigPct = (stand, total) => (stand ? (stand.played / total) * 100 : 0);

/** Whether to draw a thing as lit. `on` is what the reader has; with no reader
 *  in the address everything is lit, because the dim half of these panels
 *  means "not this person's" and there is no person.
 *
 *  It is the rule the line already follows, pulled out and named after the
 *  first screens shipped without it: nine unlit bonfires and eight briefings
 *  stamped NO GO, on pages about a series rather than about anybody, which
 *  reads as somebody having failed at all of it. */
const sigLit = (stand, on) => (!stand || on ? { on: '1' } : {});

const SIGNATURE = {
  /* The HEV suit's readout. Two segmented meters and a power figure, which is
     what that visor showed and very nearly all it showed. */
  'half-life': (host, fr, rows, ctx, stand) => {
    const body = sigHead(host, t('fx.hl_suit'), t('fx.hl_suit_meta'));
    const pct = sigPct(stand, fr.apps.length);
    const bars = h('div', { cls: 'fx-hev' });
    for (const [label, value, kind] of [
      [t('fx.hl_health'), stand ? pct : 100, 'health'],
      [t('fx.hl_armour'), stand ? Math.min(100, (stand.hours / 100) * 100) : 100, 'armour'],
    ]) {
      const meter = h('div', { cls: 'fx-hev-bar', data: { kind } });
      const on = Math.round((Math.max(0, Math.min(100, value)) / 100) * 25);
      for (let i = 0; i < 25; i++) meter.append(h('i', { data: i < on ? { on: '1' } : {} }));
      bars.append(h('div', { cls: 'fx-hev-row' },
        h('span', { cls: 'fx-hev-label', text: label }),
        meter,
        h('b', { cls: 'fx-hev-num', text: `${num(value, 0)}` })));
    }
    body.append(bars);
  },

  /* The buy menu: the series as a shelf with prices on it, which is the one
     screen every one of these games opens on. */
  'counter-strike': (host, fr, rows, ctx, stand) => {
    let total = 0;
    let priced = 0;
    let currency = null;
    for (const a of fr.apps) {
      const row = rows[String(a.id)];
      if (!row) continue;
      if (row.free) { priced += 1; continue; }
      if (row.price == null) continue;
      total += row.price;
      priced += 1;
      currency = row.currency || currency;
    }
    const body = sigHead(host, t('fx.cs_buy'),
      priced === fr.apps.length && currency ? cash(total, currency) : null);
    const grid = h('div', { cls: 'fx-buy' });
    for (const a of fr.apps) {
      const row = rows[String(a.id)];
      const owned = stand && (stand.mine.has(a.id) || stand.idle.has(a.id));
      grid.append(h('a', {
        cls: 'fx-buy-slot',
        data: owned ? { owned: '1' } : {},
        attr: { href: fxGameHref(a.id, ctx) },
      },
      h('span', { cls: 'fx-buy-key', text: String(fr.apps.indexOf(a) + 1) }),
      h('b', { cls: 'fx-buy-name' },
        txt(fxName(row, a)),
        // Steam sells Condition Zero and its Deleted Scenes under one name,
        // so without this the menu has two identical slots at one price.
        a.tag ? h('i', { cls: 'fx-buy-tag', text: t(a.tag) }) : null),
      h('span', { cls: 'fx-buy-cost', text: !row ? '·'
        : row.free ? t('fx.free')
          : row.price != null ? cash(row.price, row.currency) : t('fx.reading') }),
      owned ? h('em', { cls: 'fx-buy-have', text: t('fx.cs_owned') }) : null));
    }
    body.append(grid);
  },

  /* Two chambers, because there are two games. A series of exactly two is a
     fact about this one and the panel is allowed to be shaped like it. */
  portal: (host, fr, rows, ctx, stand) => {
    const body = sigHead(host, t('fx.pt_chambers'), t('fx.pt_two'));
    const room = h('div', { cls: 'fx-rooms' });
    for (const a of fr.apps) {
      const row = rows[String(a.id)];
      const mine = stand && stand.mine.get(a.id);
      room.append(h('a', {
        cls: 'fx-room',
        data: sigLit(stand, mine),
        attr: { href: fxGameHref(a.id, ctx) },
      },
      h('span', { cls: 'fx-hole fx-hole-in' }),
      h('span', { cls: 'fx-hole fx-hole-out' }),
      h('span', { cls: 'fx-cube' }),
      h('b', { cls: 'fx-room-name', text: fxName(row, a) }),
      h('span', { cls: 'fx-room-meta', text: mine ? t('fx.hours_n', { h: hrs(mine.hours) })
        : String(a.year) })));
    }
    body.append(room);
  },

  /* The dial. Every one of these games is remembered partly for its radio, so
     the eras are stations and the needle sits on the one with the hours. */
  'grand-theft-auto': (host, fr, rows, ctx, stand) => {
    const body = sigHead(host, t('fx.gta_dial'), null);
    const span = fxSpan(fr);
    const width = Math.max(1, span.to - span.from);
    const dial = h('div', { cls: 'fx-dial' });

    // Where the needle stops, and it is two different questions. On a profile
    // it is the one with the most hours on it. With nobody in the address it
    // is the one with the most people in it right now - which is a real fact
    // the api sends, and the honest thing for a dial to point at when there
    // is no reader to point at.
    let pick = fr.apps[0];
    let best = -1;
    for (const a of fr.apps) {
      const mine = stand && stand.mine.get(a.id);
      const weight = stand ? (mine ? mine.hours || 0 : -1)
        : (rows[String(a.id)] || {}).players ?? -1;
      if (weight > best) { best = weight; pick = a; }
      const station = h('a', {
        cls: 'fx-dial-st',
        data: sigLit(stand, mine),
        attr: { href: fxGameHref(a.id, ctx), title: fxName(rows[String(a.id)], a) },
      }, h('i'), h('span', { text: String(a.year) }));
      station.style.left = `${((a.year - span.from) / width) * 100}%`;
      dial.append(station);
    }
    const needle = h('div', { cls: 'fx-dial-needle' });
    needle.style.left = `${((pick.year - span.from) / width) * 100}%`;
    dial.append(needle);
    body.append(dial, h('p', { cls: 'fx-dial-tuned' },
      h('b', { text: fxName(rows[String(pick.id)], pick) }),
      h('span', { text: best <= 0 ? (stand ? t('fx.gta_untuned') : String(pick.year))
        : stand ? t('fx.hours_n', { h: hrs(best) })
          : t('fx.n_playing', { n: num(best), raw: best }) })));
  },

  /* The nine provinces, and which game went to which. Arena crossed all of
     them and every sequel picked one and stayed there, so the map is also the
     series: nine plates, lit where this reader has been. */
  'the-elder-scrolls': (host, fr, rows, ctx, stand) => {
    const body = sigHead(host, t('fx.tes_map'), t('fx.tes_nine'));
    const map = h('div', { cls: 'fx-tamriel' });
    for (const [key, apps] of FX_TAMRIEL) {
      const here = apps.filter((id) => stand && stand.mine.has(id));
      const hours = here.reduce((s, id) => s + (stand.mine.get(id).hours || 0), 0);
      const plate = h('div', {
        cls: 'fx-tam-plate',
        data: apps.length ? sigLit(stand, here.length) : {},
      },
      h('b', { cls: 'fx-tam-name', text: t(key) }),
      h('span', { cls: 'fx-tam-meta', text: here.length
        ? t('fx.hours_n', { h: hrs(hours) })
        : t('fx.games_n', { n: num(apps.length), raw: apps.length }) }));
      map.append(plate);
    }
    body.append(map);
  },

  /* The Pip-Boy's list. Not a stat sheet: this series never told anybody how
     many hours they had, it told them what was still open, and that is the
     one screen every Fallout since 1997 has had some version of. */
  fallout: (host, fr, rows, ctx, stand) => {
    const body = sigHead(host, t('fx.fo_data'), t('fx.fo_quests'));
    const box = h('div', { cls: 'fx-pip' });
    box.append(h('p', { cls: 'fx-pip-tabs' },
      h('span', { text: 'STAT' }), h('span', { text: 'INV' }),
      h('span', { data: { on: '1' }, text: 'DATA' }), h('span', { text: 'MAP' }),
      h('span', { text: 'RADIO' })));
    const list = h('ol', { cls: 'fx-pip-list' });
    for (const a of fr.apps) {
      const mine = stand && stand.mine.get(a.id);
      const idle = stand && stand.idle.has(a.id);
      list.append(h('li', { data: mine || !stand ? { on: '1' } : idle ? { idle: '1' } : {} },
        h('i', { cls: 'fx-pip-mark', attr: { 'aria-hidden': 'true' } }),
        h('a', { cls: 'fx-pip-name', attr: { href: fxGameHref(a.id, ctx) },
          text: fxName(rows[String(a.id)], a) }),
        h('span', { cls: 'fx-pip-meta', text: mine ? t('fx.hours_n', { h: hrs(mine.hours) })
          : idle ? t('fx.fo_pending') : String(a.year) })));
    }
    box.append(list);
    body.append(box);
  },

  /* The PDA. Each game named the place it happened in, and the Zone is the
     one thing all of them share - so the panel is the map screen, with a
     count that will not sit still. */
  stalker: (host, fr, rows, ctx, stand) => {
    const body = sigHead(host, t('fx.st_pda'), t('fx.st_zone'));
    const pda = h('div', { cls: 'fx-pda' });
    for (const a of fr.apps) {
      const place = FX_ZONE[a.id];
      const mine = stand && stand.mine.get(a.id);
      pda.append(h('a', {
        cls: 'fx-pda-mark',
        data: sigLit(stand, mine),
        attr: { href: fxGameHref(a.id, ctx) },
      },
      h('i', { attr: { 'aria-hidden': 'true' } }),
      h('b', { text: place ? t(place) : fxName(rows[String(a.id)], a) }),
      h('span', { text: mine ? t('fx.hours_n', { h: hrs(mine.hours) }) : String(a.year) })));
    }
    body.append(pda);
  },

  /* The briefing. Bohemia has opened every one of these on the same screen for
     twenty-odd years: a map, a date-time group, and a list of what is expected
     of you. The stamp is whether this reader ever went. */
  arma: (host, fr, rows, ctx, stand) => {
    const body = sigHead(host, t('fx.ar_brief'), t('fx.ar_ops'));
    const board = h('div', { cls: 'fx-brief' });
    for (const a of fr.apps) {
      const mine = stand && stand.mine.get(a.id);
      const idle = stand && stand.idle.has(a.id);
      board.append(h('a', {
        cls: 'fx-brief-card',
        data: mine || !stand ? { on: '1' } : idle ? { idle: '1' } : {},
        attr: { href: fxGameHref(a.id, ctx) },
      },
      h('span', { cls: 'fx-brief-dtg', text: `01 JAN ${a.year}` }),
      h('b', { cls: 'fx-brief-name', text: fxName(rows[String(a.id)], a) }),
      // The stamp says whether this reader went, so with no reader in the
      // address there is nothing for it to say. "No go" on a screen about
      // nobody reads as somebody having failed.
      stand ? h('span', { cls: 'fx-brief-stamp', text: mine ? t('fx.ar_done')
        : idle ? t('fx.ar_standby') : t('fx.ar_nogo') }) : null,
      mine ? h('em', { cls: 'fx-brief-h', text: t('fx.hours_n', { h: hrs(mine.hours) }) }) : null));
    }
    body.append(board);
  },

  /* The bonfires. One per game, alight where this reader sat at it - and the
     flame moves only on those, because a lit bonfire and a dead one looking
     the same would take the only thing this panel is about. */
  'dark-souls': (host, fr, rows, ctx, stand) => {
    const all = fr.apps.length + (fr.after?.length || 0);
    const body = sigHead(host, t('fx.ds_fires'), stand
      ? t('fx.ds_lit', { n: num(stand.played), total: num(all) })
      : t('fx.games_n', { n: num(all), raw: all }));
    const row = h('div', { cls: 'fx-fires' });
    for (const a of [...fr.apps, ...(fr.after || [])]) {
      const mine = stand && stand.mine.get(a.id);
      row.append(h('a', {
        cls: 'fx-fire',
        data: sigLit(stand, mine),
        attr: { href: fxGameHref(a.id, ctx) },
      },
      h('span', { cls: 'fx-fire-flame', attr: { 'aria-hidden': 'true' } },
        ...Array.from({ length: 4 }, () => h('i'))),
      h('span', { cls: 'fx-fire-sword', attr: { 'aria-hidden': 'true' } }),
      h('b', { cls: 'fx-fire-name', text: fxName(rows[String(a.id)], a) }),
      h('span', { cls: 'fx-fire-meta', text: mine ? t('fx.hours_n', { h: hrs(mine.hours) })
        : stand ? t('fx.ds_unlit') : String(a.year) })));
    }
    body.append(row);
  },

  /* The attaché case. Everything in this series has been about what fits in
     it, so each game takes a slot and the ones this reader has put the hours
     into take more room, exactly as the case has always worked. */
  'resident-evil': (host, fr, rows, ctx, stand) => {
    const body = sigHead(host, t('fx.re_case'),
      t('fx.re_slots', { n: num(fr.apps.length), raw: fr.apps.length }));
    const grid = h('div', { cls: 'fx-case' });
    const most = Math.max(1, ...fr.apps.map(
      (a) => (stand && stand.mine.get(a.id) ? stand.mine.get(a.id).hours || 0 : 0)));
    for (const a of fr.apps) {
      const mine = stand && stand.mine.get(a.id);
      const wide = mine && (mine.hours || 0) >= most * 0.5;
      grid.append(h('a', {
        cls: 'fx-case-item',
        data: { ...sigLit(stand, mine), ...(wide ? { wide: '1' } : {}) },
        attr: { href: fxGameHref(a.id, ctx) },
      },
      h('b', { cls: 'fx-case-name', text: fxName(rows[String(a.id)], a) }),
      h('span', { cls: 'fx-case-meta', text: mine ? t('fx.hours_n', { h: hrs(mine.hours) })
        : String(a.year) })));
    }
    body.append(grid);
  },
};
