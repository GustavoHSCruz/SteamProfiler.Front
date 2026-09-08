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
   thirty-two games and made thirty: Garry's Mod is on the first shelf and not
   on the second, because Facepunch made it. Keeping the two axes apart is the
   only way that difference can be seen at all, and it is the reason there are
   two addresses rather than a toggle.

   Which houses there are is not here: house-catalogue.js holds both tables,
   for the same reason franchise-list.js holds the ten - a table is not code,
   and the landing page wants the names without wanting any of this.

   No api call anywhere on these screens. The table is the whole layout, so
   the page is drawn on the first frame out of the file the browser already
   has, and the only thing that ever lands on top of it is the profile's own
   library - which the router already had in hand before it got here.

   Shared helpers come from lib.js. The router decides when this runs. */

/* Above this many entries a list gets a filter field. Below it, a filter is a
   control that costs a line and saves nobody a scroll: Rockstar has sixteen
   games and they are all on one screen. Ubisoft has a hundred and fifty-four
   and they are not. */
const HS_FILTER_AT = 24;

/** The two axes, each with its table, its address and its own strings. Every
 *  function below takes one of these rather than a boolean, so nothing has to
 *  remember which way round `true` meant. */
const HS_AXES = {
  publishers: {
    axis: 'publishers',
    table: typeof PUBLISHERS === 'undefined' ? [] : PUBLISHERS,
    title: 'hs.pub_title',
    kicker: 'hs.pub_kicker',
    shelf: 'hs.pub_shelf',
    empty: 'hs.pub_none',
  },
  developers: {
    axis: 'developers',
    table: typeof DEVELOPERS === 'undefined' ? [] : DEVELOPERS,
    title: 'hs.dev_title',
    kicker: 'hs.dev_kicker',
    shelf: 'hs.dev_shelf',
    empty: 'hs.dev_none',
  },
};

const HS_BY_SLUG = {
  publishers: new Map(HS_AXES.publishers.table.map((x) => [x.slug, x])),
  developers: new Map(HS_AXES.developers.table.map((x) => [x.slug, x])),
};

/** The axis a path is on, or null. Both page shells and the router read the
 *  address the same way, so this is the one place that knows the words. */
function houseAxisOf(word) {
  return Object.prototype.hasOwnProperty.call(HS_AXES, word) ? HS_AXES[word] : null;
}

function houseBySlug(axis, slug) {
  return HS_BY_SLUG[axis.axis].get(slug) || null;
}

const houseIndexHref = (axis, ctx) =>
  (ctx.query ? `/u/${ctx.query}/${axis.axis}` : `/${axis.axis}`);

const houseHref = (axis, house, ctx) =>
  (ctx.query ? `/u/${ctx.query}/${axis.axis}/${house.slug}` : `/${axis.axis}/${house.slug}`);

/* A game links into the profile that is reading, and to the public page when
   nobody is. Same rule the franchise rows follow. */
const houseGameHref = (id, ctx) => (ctx.query ? `/u/${ctx.query}/${id}` : `/g/${id}`);

/** The years a house covers on Steam: its oldest release here to its newest.
 *
 *  Deliberately not the year the company was founded. Atari is from 1972 and
 *  its oldest thing on this shelf is from 2003, and printing 1972 would be
 *  this page saying something the storefront never told it. */
function houseSpan(house) {
  const years = house.apps.map((a) => a.year).filter(Boolean);
  if (!years.length) return null;
  return { from: Math.min(...years), to: Math.max(...years) };
}

/** What one profile has of one house. `library` is what was played and
 *  `unplayed` is what is owned and never launched - two different facts, kept
 *  apart here the way they are kept apart everywhere else on this site. */
function houseStanding(house, library, unplayed) {
  const mine = new Map((library || []).map((g) => [g.appid, g]));
  const idle = new Set((unplayed || []).map((g) => g.appid));
  let hours = 0;
  let played = 0;
  let owned = 0;
  let top = null;
  for (const a of house.apps) {
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
  return { hours, played, owned, top, total: house.apps.length, mine, idle };
}

/* ── The filter ────────────────────────────────────────────────────────
   One control, used by both screens, over whatever rows it is handed.

   It filters what is already on the page rather than rebuilding it: a
   hundred and fifty rows are cheap to hide and expensive to make twice, and
   hiding keeps the scroll position honest while somebody is typing.

   `hidden` and not `style.display`, because that is the one the shell's reset
   marks `!important` and the only one a stylesheet cannot quietly lose. */
function houseFilter(items, opts) {
  const { label, mine, groups } = opts;
  const box = h('div', { cls: 'hs-filter' });
  const id = `hs-filter-${Math.random().toString(36).slice(2, 8)}`;

  const field = h('input', {
    cls: 'hs-filter-field',
    attr: { id, type: 'search', autocomplete: 'off', spellcheck: 'false',
            placeholder: t(label) },
  });
  box.append(h('label', { cls: 'hs-filter-label', attr: { for: id }, text: t(label) }), field);

  // The reader's own filter, and only where there is a reader. On a shelf of
  // a hundred and fifty this is the one somebody actually wants.
  let onlyMine = null;
  if (mine) {
    const mineId = `${id}-mine`;
    onlyMine = h('input', { cls: 'hs-filter-check', attr: { id: mineId, type: 'checkbox' } });
    box.append(h('span', { cls: 'hs-filter-only' }, onlyMine,
      h('label', { attr: { for: mineId }, text: t('hs.only_mine') })));
  }

  // Counted out loud, because a filter that hides forty rows without saying so
  // reads as a list that lost them.
  const count = h('p', {
    cls: 'hs-filter-count',
    attr: { role: 'status', 'aria-live': 'polite' },
  });
  box.append(count);

  const apply = () => {
    const needle = field.value.trim().toLowerCase();
    const owned = onlyMine && onlyMine.checked;
    let shown = 0;
    for (const it of items) {
      const hit = (!needle || it.search.includes(needle)) && (!owned || it.owned);
      it.node.hidden = !hit;
      if (hit) shown += 1;
    }
    // A band with nothing left in it is a heading over a gap - and one that
    // still reads "15" over a single row is worse than that, because it is a
    // number that is wrong rather than a heading that is empty.
    for (const g of groups || []) {
      const left = g.items.filter((it) => !it.node.hidden).length;
      g.node.hidden = !left;
      g.count.textContent = num(left);
    }
    count.textContent = shown
      ? t('hs.showing', { shown: num(shown), total: num(items.length) })
      : t('hs.none_match');
  };

  field.addEventListener('input', apply);
  if (onlyMine) onlyMine.addEventListener('change', apply);
  apply();
  return box;
}

/* ── The index ─────────────────────────────────────────────────────────
   Every house on the axis, as a tile with its flagship's art behind it. With
   a profile, each tile also carries that library's standing in that house,
   and a house it has nothing from still gets a tile: an empty shelf is an
   answer to "have I got anything by these people". */
async function renderHouseIndex(axis, root, ctx) {
  document.title = `${t(axis.title)} - steamprofiler.org`;
  root.textContent = '';

  root.append(h('header', { cls: 'hs-ix-head' },
    h('p', { cls: 'hs-ix-kicker', text: t(axis.kicker) }),
    h('h1', { cls: 'display hs-ix-title', text: t(axis.title) })));

  const grid = h('div', { cls: 'hs-ix-grid', attr: { role: 'list' } });
  const items = [];

  for (const house of axis.table) {
    const span = houseSpan(house);
    const stand = ctx.library ? houseStanding(house, ctx.library, ctx.unplayed) : null;

    const card = h('a', {
      cls: 'hs-tile',
      data: { hs: house.slug },
      attr: { role: 'listitem', href: houseHref(axis, house, ctx) },
      style: { '--tint': house.tint },
    });

    const art = h('img', {
      cls: 'hs-tile-art',
      attr: { src: `/art/${house.flagship}.jpg`, alt: '', loading: 'lazy', decoding: 'async' },
    });
    // An app with no key art leaves a broken-image glyph across the tile,
    // which reads as a page that failed rather than as a game that is old.
    art.addEventListener('error', () => art.remove(), { once: true });
    card.append(art, h('div', { cls: 'hs-tile-veil' }));

    const body = h('div', { cls: 'hs-tile-in' },
      h('h2', { cls: 'hs-tile-name', text: house.name }),
      h('p', { cls: 'hs-tile-span', text: span
        ? t('hs.tile_span', {
          n: num(house.apps.length), raw: house.apps.length,
          from: span.from, to: span.to,
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
    grid.append(card);
    items.push({
      node: card,
      search: house.name.toLowerCase(),
      owned: !!(stand && stand.owned),
    });
  }

  if (items.length > HS_FILTER_AT || ctx.library) {
    root.append(houseFilter(items, { label: 'hs.filter_house', mine: !!ctx.library }));
  }
  root.append(grid);
}

/* ── One house ─────────────────────────────────────────────────────────
   The shelf, banded by decade. A publisher is not a series: Ubisoft's line is
   not eight games across twenty years, it is a hundred and fifty across
   twenty-six, and a decade is the coarsest band that still says something
   about when this house was busy.

   Ascending, oldest band first, because read that way the bands are the
   house's own history and not a store listing. */
async function renderHouse(axis, house, root, ctx) {
  document.title = `${house.name} - steamprofiler.org`;
  root.textContent = '';

  const span = houseSpan(house);
  const stand = ctx.library ? houseStanding(house, ctx.library, ctx.unplayed) : null;

  const hero = h('header', { cls: 'hs-hero', style: { '--tint': house.tint } });
  const art = h('img', {
    cls: 'hs-hero-art',
    attr: { src: `/art/${house.flagship}.jpg`, alt: '', decoding: 'async' },
  });
  art.addEventListener('error', () => art.remove(), { once: true });

  const kicker = h('p', { cls: 'hs-hero-kicker' },
    h('span', { text: t(axis.shelf) }),
    span ? h('i', { text: '·' }) : null,
    span ? h('span', { text: t('hs.span_years', { from: span.from, to: span.to }) }) : null);

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
      kicker,
      h('h1', { cls: 'display hs-hero-name', text: house.name }),
      h('p', { cls: 'hs-hero-count', text: t('hs.n_games', {
        n: num(house.apps.length), raw: house.apps.length,
      }) }),
      standing,
      h('div', { cls: 'hs-acts' }, h('a', {
        cls: 'hs-act', text: t('hs.all_houses'), attr: { href: houseIndexHref(axis, ctx) },
      }))));
  root.append(hero);

  // The bands, built before the filter so the filter has something to hold.
  const byDecade = new Map();
  const undated = [];
  for (const app of house.apps) {
    if (!app.year) {
      undated.push(app);
      continue;
    }
    const decade = Math.floor(app.year / 10) * 10;
    if (!byDecade.has(decade)) byDecade.set(decade, []);
    byDecade.get(decade).push(app);
  }

  const items = [];
  const groups = [];
  const shelf = h('div', { cls: 'hs-shelf' });

  const band = (heading, apps) => {
    const count = h('b', { text: num(apps.length) });
    const section = h('section', { cls: 'hs-band' },
      h('div', { cls: 'panel-bar' }, h('span', { text: heading }), count));
    const list = h('ol', { cls: 'hs-rows' });
    const own = [];
    for (const app of apps) {
      const row = houseRow(app, ctx, stand);
      list.append(row.node);
      items.push(row);
      own.push(row);
    }
    section.append(list);
    shelf.append(section);
    groups.push({ node: section, items: own, count });
  };

  for (const decade of [...byDecade.keys()].sort((a, b) => a - b)) {
    const apps = byDecade.get(decade).sort((a, b) => a.year - b.year
      || a.name.localeCompare(b.name));
    band(t('hs.decade', { d: decade }), apps);
  }
  if (undated.length) band(t('hs.undated'), undated);

  if (items.length > HS_FILTER_AT || stand) {
    root.append(houseFilter(items, { label: 'hs.filter_game', mine: !!stand, groups }));
  }
  root.append(shelf);
}

/** One game on a house's shelf. The reader's column is absent entirely when
 *  nobody is being talked about, rather than present and empty. */
function houseRow(app, ctx, stand) {
  const mine = stand && stand.mine.get(app.id);
  const idle = stand && stand.idle.has(app.id);

  const li = h('li', {});
  const a = h('a', {
    cls: 'hs-row',
    data: mine ? { on: '1' } : idle ? { idle: '1' } : {},
    attr: { href: houseGameHref(app.id, ctx) },
  });

  put(a,
    h('span', { cls: 'hs-row-year', text: app.year ? String(app.year) : '-' }),
    h('b', { cls: 'hs-row-name', text: app.name }));

  if (stand) {
    a.append(h('span', {
      cls: 'hs-row-you',
      text: mine ? t('hs.hours_n', { h: hrs(mine.hours) })
        : idle ? t('hs.owned_idle')
          : t('hs.not_owned'),
    }));
  }

  li.append(a);
  return {
    node: li,
    search: app.name.toLowerCase(),
    owned: !!(mine || idle),
  };
}
