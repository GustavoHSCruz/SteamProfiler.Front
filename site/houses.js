/* steamprofiler.org - the house screens: who published a library, and who made it.

   Two screens off one renderer, because they are the same screen twice:

     /publishers              the houses that put games on the shelf
     /publishers/<slug>       one of them, everything it published
     /developers              the houses that made them
     /developers/<slug>       one of them, everything it made
     /u/<who>/publishers      the same four, with that profile's hours on top
     /u/<who>/publishers/<slug>
     /u/<who>/developers
     /u/<who>/developers/<slug>

   Publisher and developer are not two views of one list. Valve published
   Garry's Mod and Facepunch made it, so it is on the first shelf and not on
   the second. Keeping the two axes apart is the only way that difference can
   be seen at all, and it is why there are two addresses rather than a toggle.

   Which houses there are is not here and is not a decision: house-catalogue.js
   holds every company the site has read, both axes, one entry each.

   No api call anywhere on these screens. The catalogue is the whole layout,
   and the only thing that ever lands on top of it is the profile's own
   library - which the router already had in hand before it got here.

   Shared helpers come from lib.js. The router decides when this runs. */

/* Above this many entries a list gets a filter field. Below it a filter is a
   control that costs a line and saves nobody a scroll. */
const HS_FILTER_AT = 24;

/* How many tiles go into the index at a time. There are over two thousand
   developers, and building two thousand anchors with a picture in each before
   showing anybody anything is a page that arrives late to say something it
   could have said at once. The rest follow as the reader gets near them. */
const HS_PAGE = 48;

/** The two axes: an address, four strings, and the name of the table each one
 *  reads. Every function below takes one of these rather than a boolean, so
 *  nothing has to remember which way round `true` meant.
 *
 *  Deliberately no table here. This object has to exist before the catalogue
 *  does, because the router reads the address on the first line it runs and
 *  the catalogue is half a megabyte that most pages never need. */
const HS_AXES = {
  publishers: {
    axis: 'publishers',
    title: 'hs.pub_title',
    kicker: 'hs.pub_kicker',
    shelf: 'hs.pub_shelf',
    empty: 'hs.pub_none',
  },
  developers: {
    axis: 'developers',
    title: 'hs.dev_title',
    kicker: 'hs.dev_kicker',
    shelf: 'hs.dev_shelf',
    empty: 'hs.dev_none',
  },
};

/** The axis a path is on, or null. Both page shells and the router read the
 *  address the same way, so this is the one place that knows the words. */
function houseAxisOf(word) {
  return Object.prototype.hasOwnProperty.call(HS_AXES, word) ? HS_AXES[word] : null;
}

/* ── Getting the catalogue ─────────────────────────────────────────────
   house-catalogue.js is every company this site has read and every game under
   them: about half a megabyte, and the dashboard, the game pages and the
   backlog have no use for a byte of it. The two house shells load it with a
   tag of their own because they are nothing without it. /u/<who>/publishers
   lives on profile.html, which serves five other views, so there it is
   fetched when somebody actually asks for one.

   Once, and awaited by everyone who asks while it is still in the air. */
let HS_LOADING = null;

function loadHouseCatalogue() {
  if (typeof PUBLISHERS !== 'undefined') return Promise.resolve();
  if (HS_LOADING) return HS_LOADING;
  HS_LOADING = new Promise((resolve, reject) => {
    const tag = document.createElement('script');
    tag.src = '/house-catalogue.js';
    tag.addEventListener('load', () => resolve(), { once: true });
    tag.addEventListener('error', () => reject(new Error(t('err.load'))), { once: true });
    document.head.append(tag);
  });
  return HS_LOADING;
}

/* The table itself. Read through the identifier and not off `window`, because
   house-catalogue.js declares both with `const` - a top-level `const` is a
   lexical binding in the global scope and never a property of the window
   object, so `window.PUBLISHERS` is forever undefined while `PUBLISHERS` is
   sitting right there. */
const houseTable = (axis) => {
  if (axis.axis === 'publishers') {
    return typeof PUBLISHERS === 'undefined' ? [] : PUBLISHERS;
  }
  return typeof DEVELOPERS === 'undefined' ? [] : DEVELOPERS;
};

/* Built on first use rather than on load, for the same reason the catalogue
   is: a Map over two thousand entries is work, and the page that wants it is
   the only page that should pay for it. */
const HS_INDEX = {};

function houseBySlug(axis, slug) {
  if (!HS_INDEX[axis.axis]) {
    HS_INDEX[axis.axis] = new Map(houseTable(axis).map((x) => [x.slug, x]));
  }
  return HS_INDEX[axis.axis].get(slug) || null;
}

/** One game off the shared table as `[name, year]`. The two axes name the same
 *  games and there is no reason to spell them twice, so the shelves hold
 *  appids and this is where they turn back into something readable. */
const houseGame = (id) =>
  (typeof HOUSE_GAMES === 'undefined' ? null : HOUSE_GAMES[id]) || null;

/* A house's colour, out of its own slug.
 *
 *  Two thousand two hundred and sixty-nine developers is two thousand two
 *  hundred and sixty-nine palette decisions nobody is going to make, and a
 *  table of hand-picked colours would quietly become the list of houses that
 *  count. So the hue is a hash of the slug: stable for a house across
 *  reloads, spread across the wheel, and the same arithmetic for the biggest
 *  publisher on Steam and for somebody's one game.
 *
 *  Saturation and lightness are fixed rather than hashed, because those are
 *  what keep a colour legible on this background - a hashed lightness would
 *  hand some houses a tint nobody can see. */
function houseTint(slug) {
  let n = 0;
  for (let i = 0; i < slug.length; i++) n = (n * 31 + slug.charCodeAt(i)) >>> 0;
  return `hsl(${n % 360} 58% 52%)`;
}

const houseIndexHref = (axis, ctx) =>
  (ctx.query ? `/u/${ctx.query}/${axis.axis}` : `/${axis.axis}`);

const houseHref = (axis, house, ctx) =>
  (ctx.query ? `/u/${ctx.query}/${axis.axis}/${house.slug}` : `/${axis.axis}/${house.slug}`);

/* A game links into the profile that is reading, and to the public page when
   nobody is. Same rule the franchise rows follow. */
const houseGameHref = (id, ctx) => (ctx.query ? `/u/${ctx.query}/${id}` : `/g/${id}`);

/** The years a house's shelf covers: its oldest release here to its newest.
 *
 *  Deliberately not the year the company was founded. Atari is from 1972 and
 *  the oldest thing on its shelf is from 2003, and printing 1972 would be this
 *  page saying something the storefront never told it. */
function houseSpan(house) {
  let from = null;
  let to = null;
  for (const id of house.apps) {
    const g = houseGame(id);
    const year = g && g[1];
    if (!year) continue;
    if (from === null || year < from) from = year;
    if (to === null || year > to) to = year;
  }
  return from === null ? null : { from, to };
}

/** What one profile has of one house. `library` is what was played and
 *  `unplayed` is what is owned and never launched - two different facts, kept
 *  apart here the way they are kept apart everywhere else on this site. */
function houseStanding(house, mine, idle) {
  let hours = 0;
  let played = 0;
  let owned = 0;
  let top = null;
  for (const id of house.apps) {
    const g = mine.get(id);
    if (g) {
      hours += g.hours || 0;
      played += 1;
      owned += 1;
      if (!top || (g.hours || 0) > (top.hours || 0)) top = g;
    } else if (idle.has(id)) {
      owned += 1;
    }
  }
  return { hours, played, owned, top, total: house.apps.length, mine, idle };
}

/** The profile's library as the two lookups every screen here wants. Built
 *  once per render rather than once per house: a thousand houses against a
 *  five thousand game library is a million comparisons done the naive way. */
function houseLibrary(ctx) {
  return {
    mine: new Map((ctx.library || []).map((g) => [g.appid, g])),
    idle: new Set((ctx.unplayed || []).map((g) => g.appid)),
  };
}

/* ── The filter ────────────────────────────────────────────────────────
   One control for both screens. It owns the field, the checkbox and the
   count, and hands what was typed to whoever built it - because the two
   screens do different things with the answer. A shelf is at most a few
   hundred rows and they are all on the page already, so it hides them. An
   index is two thousand houses that are deliberately not all on the page, so
   it rebuilds.

   `hidden` and not `style.display`, because that is the one the shell's reset
   marks `!important` and the only one a stylesheet cannot quietly lose. */
function houseFilter(opts) {
  const { label, mine, onChange } = opts;
  const box = h('div', { cls: 'hs-filter' });
  const id = `hs-filter-${Math.random().toString(36).slice(2, 8)}`;

  const field = h('input', {
    cls: 'hs-filter-field',
    attr: { id, type: 'search', autocomplete: 'off', spellcheck: 'false',
            placeholder: t(label) },
  });
  box.append(h('label', { cls: 'hs-filter-label', attr: { for: id }, text: t(label) }), field);

  // The reader's own filter, and only where there is a reader. On a list of
  // two thousand this is the one somebody actually wants.
  let onlyMine = null;
  if (mine) {
    const mineId = `${id}-mine`;
    onlyMine = h('input', { cls: 'hs-filter-check', attr: { id: mineId, type: 'checkbox' } });
    box.append(h('span', { cls: 'hs-filter-only' }, onlyMine,
      h('label', { attr: { for: mineId }, text: t('hs.only_mine') })));
  }

  // Counted out loud, because a filter that hides forty rows without saying
  // so reads as a list that lost them.
  const count = h('p', {
    cls: 'hs-filter-count',
    attr: { role: 'status', 'aria-live': 'polite' },
  });
  box.append(count);

  const say = (shown, total) => {
    count.textContent = shown
      ? t('hs.showing', { shown: num(shown), total: num(total) })
      : t('hs.none_match');
  };

  const run = () => onChange(field.value.trim().toLowerCase(),
    !!(onlyMine && onlyMine.checked), say);

  // Typing into a two thousand entry index rebuilds a grid on every
  // keystroke, and a rebuild is cheap but not free. One frame of settling
  // makes a held-down key one rebuild instead of eight.
  let pending = null;
  field.addEventListener('input', () => {
    clearTimeout(pending);
    pending = setTimeout(run, 90);
  });
  if (onlyMine) onlyMine.addEventListener('change', run);
  run();
  return box;
}

/* ── The index ─────────────────────────────────────────────────────────
   Every house on the axis, biggest shelf first, as a tile with its flagship's
   art behind it. With a profile, each tile also carries that library's
   standing, and a house it has nothing from still gets a tile: an empty shelf
   is an answer to "have I got anything by these people".

   Drawn a page at a time. The whole list is held in memory and only the part
   somebody has scrolled to is in the document. */
async function renderHouseIndex(axis, root, ctx) {
  document.title = `${t(axis.title)} - steamprofiler.org`;
  root.textContent = '';

  root.append(h('header', { cls: 'hs-ix-head' },
    h('p', { cls: 'hs-ix-kicker', text: t(axis.kicker) }),
    h('h1', { cls: 'display hs-ix-title', text: t(axis.title) })));

  const { mine, idle } = houseLibrary(ctx);
  const all = houseTable(axis).map((house) => ({
    house,
    search: house.name.toLowerCase(),
    stand: ctx.library ? houseStanding(house, mine, idle) : null,
  }));

  const grid = h('div', { cls: 'hs-ix-grid', attr: { role: 'list' } });
  const more = h('div', { cls: 'hs-more' });

  let shown = [];
  let drawn = 0;

  const draw = () => {
    const slice = shown.slice(drawn, drawn + HS_PAGE);
    for (const item of slice) grid.append(houseTile(axis, item, ctx));
    drawn += slice.length;
    more.hidden = drawn >= shown.length;
  };

  // The sentinel under the grid: when it comes into view there is more to
  // draw, so draw it. A reader who never scrolls never pays for the rest.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && drawn < shown.length) draw();
    }, { rootMargin: '600px' }).observe(more);
  }

  const filter = houseFilter({
    label: 'hs.filter_house',
    mine: !!ctx.library,
    onChange: (needle, owned, say) => {
      shown = all.filter((it) => (!needle || it.search.includes(needle))
        && (!owned || (it.stand && it.stand.owned)));
      grid.textContent = '';
      drawn = 0;
      draw();
      say(shown.length, all.length);
    },
  });

  // The filter is built before the grid is in the document and draws into it
  // straight away, so the order here is only where the control sits.
  root.append(filter, grid, more);

  // A browser with no IntersectionObserver gets a button instead of a scroll
  // trigger, which is the same promise kept by hand.
  const button = h('button', {
    cls: 'hs-act', attr: { type: 'button' }, text: t('hs.show_more'),
  });
  button.addEventListener('click', draw);
  more.append(button);
}

/** One house on the index. */
function houseTile(axis, item, ctx) {
  const { house, stand } = item;
  const span = houseSpan(house);

  const card = h('a', {
    cls: 'hs-tile',
    data: { hs: house.slug },
    attr: { role: 'listitem', href: houseHref(axis, house, ctx) },
    style: { '--tint': houseTint(house.slug) },
  });

  const art = h('img', {
    cls: 'hs-tile-art',
    attr: { src: `/art/${house.flagship}.jpg`, alt: '', loading: 'lazy', decoding: 'async' },
  });
  // An app with no key art leaves a broken-image glyph across the tile, which
  // reads as a page that failed rather than as a game that is old.
  art.addEventListener('error', () => art.remove(), { once: true });
  card.append(art, h('div', { cls: 'hs-tile-veil' }));

  const body = h('div', { cls: 'hs-tile-in' },
    h('h2', { cls: 'hs-tile-name', text: house.name }),
    h('p', { cls: 'hs-tile-span', text: span
      ? t('hs.tile_span', {
        n: num(house.apps.length), raw: house.apps.length, from: span.from, to: span.to,
      })
      : t('hs.n_games', { n: num(house.apps.length), raw: house.apps.length }) }));

  if (stand) {
    body.append(stand.owned
      ? h('p', { cls: 'hs-tile-you' },
        h('b', { text: t('hs.yours_n', { n: num(stand.owned), total: num(stand.total) }) }),
        stand.hours ? h('span', { text: t('hs.hours_n', { h: hrs(stand.hours) }) }) : null)
      : h('p', { cls: 'hs-tile-you', data: { none: '1' }, text: t('hs.tile_none') }));
  }

  card.append(body);
  return card;
}

/* ── One house ─────────────────────────────────────────────────────────
   The shelf, banded by decade. A house is not a series: a shelf here runs
   from one game to a couple of hundred, and a decade is the coarsest band
   that still says something about when this house was busy.

   Ascending, oldest band first, because read that way the bands are the
   house's own history and not a store listing. */
async function renderHouse(axis, house, root, ctx) {
  document.title = `${house.name} - steamprofiler.org`;
  root.textContent = '';

  const tint = houseTint(house.slug);
  const span = houseSpan(house);
  const { mine, idle } = houseLibrary(ctx);
  const stand = ctx.library ? houseStanding(house, mine, idle) : null;

  const hero = h('header', { cls: 'hs-hero', style: { '--tint': tint } });
  const art = h('img', {
    cls: 'hs-hero-art',
    attr: { src: `/art/${house.flagship}.jpg`, alt: '', decoding: 'async' },
  });
  art.addEventListener('error', () => art.remove(), { once: true });

  const standing = stand
    ? (stand.owned
      ? h('p', { cls: 'hs-hero-you' },
        h('b', { text: t('hs.yours_n', { n: num(stand.owned), total: num(stand.total) }) }),
        stand.played
          ? h('span', { text: t('hs.played_hours', {
            n: num(stand.played), h: hrs(stand.hours), raw: stand.played,
          }) })
          : h('span', { text: t('hs.owned_none_played') }),
        stand.top
          ? h('span', { cls: 'hs-hero-top', text: t('hs.most_in', {
            game: stand.top.name, h: hrs(stand.top.hours),
          }) })
          : null)
      : h('p', { cls: 'hs-hero-you', data: { none: '1' }, text: t(axis.empty) }))
    : null;

  put(hero, art, h('div', { cls: 'hs-hero-veil' }),
    h('div', { cls: 'hs-hero-in' },
      h('p', { cls: 'hs-hero-kicker' },
        h('span', { text: t(axis.shelf) }),
        span ? h('i', { text: '·' }) : null,
        span ? h('span', { text: t('hs.span_years', { from: span.from, to: span.to }) }) : null),
      h('h1', { cls: 'display hs-hero-name', text: house.name }),
      h('p', { cls: 'hs-hero-count', text: t('hs.n_games', {
        n: num(house.apps.length), raw: house.apps.length,
      }) }),
      standing,
      h('div', { cls: 'hs-acts' }, h('a', {
        cls: 'hs-act', text: t('hs.all_houses'), attr: { href: houseIndexHref(axis, ctx) },
      }))));
  root.append(hero);

  const byDecade = new Map();
  const undated = [];
  for (const id of house.apps) {
    const g = houseGame(id);
    if (!g) continue;
    if (!g[1]) {
      undated.push([id, g]);
      continue;
    }
    const decade = Math.floor(g[1] / 10) * 10;
    if (!byDecade.has(decade)) byDecade.set(decade, []);
    byDecade.get(decade).push([id, g]);
  }

  const items = [];
  const groups = [];
  const shelf = h('div', { cls: 'hs-shelf' });

  const band = (heading, rows) => {
    const count = h('b', { text: num(rows.length) });
    const section = h('section', { cls: 'hs-band' },
      h('div', { cls: 'panel-bar' }, h('span', { text: heading }), count));
    const list = h('ol', { cls: 'hs-rows' });
    const own = [];
    for (const [id, g] of rows) {
      const row = houseRow(id, g, ctx, stand);
      list.append(row.node);
      items.push(row);
      own.push(row);
    }
    section.append(list);
    shelf.append(section);
    groups.push({ node: section, items: own, count });
  };

  for (const decade of [...byDecade.keys()].sort((a, b) => a - b)) {
    const rows = byDecade.get(decade).sort((a, b) => a[1][1] - b[1][1]
      || a[1][0].localeCompare(b[1][0]));
    band(t('hs.decade', { d: decade }), rows);
  }
  if (undated.length) band(t('hs.undated'), undated);

  if (items.length > HS_FILTER_AT || stand) {
    root.append(houseFilter({
      label: 'hs.filter_game',
      mine: !!stand,
      onChange: (needle, owned, say) => {
        let left = 0;
        for (const it of items) {
          const hit = (!needle || it.search.includes(needle)) && (!owned || it.owned);
          it.node.hidden = !hit;
          if (hit) left += 1;
        }
        // A band with nothing left in it is a heading over a gap - and one
        // that still reads "15" over a single row is worse than that, because
        // it is a number that is wrong rather than a heading that is empty.
        for (const g of groups) {
          const n = g.items.filter((it) => !it.node.hidden).length;
          g.node.hidden = !n;
          g.count.textContent = num(n);
        }
        say(left, items.length);
      },
    }));
  }
  root.append(shelf);
}

/** One game on a house's shelf. The reader's column is absent entirely when
 *  nobody is being talked about, rather than present and empty. */
function houseRow(id, game, ctx, stand) {
  const [name, year] = game;
  const owned = stand && stand.mine.get(id);
  const idle = stand && stand.idle.has(id);

  const li = h('li', {});
  const a = h('a', {
    cls: 'hs-row',
    data: owned ? { on: '1' } : idle ? { idle: '1' } : {},
    attr: { href: houseGameHref(id, ctx) },
  });

  put(a,
    h('span', { cls: 'hs-row-year', text: year ? String(year) : '-' }),
    h('b', { cls: 'hs-row-name', text: name }));

  if (stand) {
    a.append(h('span', {
      cls: 'hs-row-you',
      text: owned ? t('hs.hours_n', { h: hrs(owned.hours) })
        : idle ? t('hs.owned_idle')
          : t('hs.not_owned'),
    }));
  }

  li.append(a);
  return { node: li, search: name.toLowerCase(), owned: !!(owned || idle) };
}
