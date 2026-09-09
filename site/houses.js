/* steamprofiler.org - the house screens: who published a library, and who made it.

   Two screens off one renderer, because they are the same screen twice:

     /publishers              every company that publishes on Steam
     /publishers/<slug>       one of them, everything it published
     /developers              every company that makes games on Steam
     /developers/<slug>       one of them, everything it made
     /u/<who>/publishers      the same four, narrowed to that library
     /u/<who>/publishers/<slug>
     /u/<who>/developers
     /u/<who>/developers/<slug>

   Publisher and developer are not two views of one list. Valve published
   Garry's Mod and Facepunch made it, so it is on the first shelf and not on
   the second. Keeping the two axes apart is the only way that difference can
   be seen at all, and it is why there are two addresses rather than a toggle.

   Unlike the franchise screens, none of this is a table that shipped with the
   page. There are ninety thousand companies on Steam and a browser has no
   business holding all of them to show sixty: the list, the filtering and the
   paging belong to the api, and what arrives is the answer rather than the
   material to work it out from.

   With a profile in the address the api does one more join and answers a
   different question - which companies this library is on, most of it first -
   because "only what I own" over fifty thousand shelves cannot be done in a
   browser that holds none of them.

   Shared helpers come from lib.js. The router decides when this runs. */

/* How many houses come back in one go, and how many rows a shelf shows before
   the filter earns its place. */
const HS_PAGE = 60;
const HS_FILTER_AT = 24;

/** The two axes: an address and four strings. Every function below takes one
 *  of these rather than a boolean, so nothing has to remember which way round
 *  `true` meant. */
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

const houseIndexHref = (axis, ctx) =>
  (ctx.query ? `/u/${ctx.query}/${axis.axis}` : `/${axis.axis}`);

const houseHref = (axis, slug, ctx) =>
  (ctx.query ? `/u/${ctx.query}/${axis.axis}/${slug}` : `/${axis.axis}/${slug}`);

/* A game links into the profile that is reading, and to the public page when
   nobody is. Same rule the franchise rows follow. */
const houseGameHref = (id, ctx) => (ctx.query ? `/u/${ctx.query}/${id}` : `/g/${id}`);

/* A house's colour, out of its own slug.
 *
 *  Ninety thousand companies is ninety thousand palette decisions nobody is
 *  going to make, and a table of hand-picked colours would quietly become the
 *  list of houses that count. So the hue is a hash of the slug: stable for a
 *  house across reloads, spread across the wheel, and the same arithmetic for
 *  the biggest publisher on Steam and for somebody's one game.
 *
 *  Saturation and lightness are fixed rather than hashed, because those are
 *  what keep a colour legible on this background - a hashed lightness would
 *  hand some houses a tint nobody can see. */
function houseTint(slug) {
  let n = 0;
  for (let i = 0; i < slug.length; i++) n = (n * 31 + slug.charCodeAt(i)) >>> 0;
  return `hsl(${n % 360} 58% 52%)`;
}

/** The years a shelf covers, over the games this site has a year for. */
function houseSpan(apps) {
  let from = null;
  let to = null;
  for (const app of apps) {
    if (!app.year) continue;
    if (from === null || app.year < from) from = app.year;
    if (to === null || app.year > to) to = app.year;
  }
  return from === null ? null : { from, to };
}

/** What one profile has of one shelf. `library` is what was played and
 *  `unplayed` is what is owned and never launched - two different facts, kept
 *  apart here the way they are kept apart everywhere else on this site. */
function houseStanding(apps, mine, idle) {
  let hours = 0;
  let played = 0;
  let owned = 0;
  let top = null;
  for (const app of apps) {
    const g = mine.get(app.appid);
    if (g) {
      hours += g.hours || 0;
      played += 1;
      owned += 1;
      if (!top || (g.hours || 0) > (top.hours || 0)) top = g;
    } else if (idle.has(app.appid)) {
      owned += 1;
    }
  }
  return { hours, played, owned, top, total: apps.length, mine, idle };
}

/** The profile's library as the two lookups a shelf wants. */
function houseLibrary(ctx) {
  return {
    mine: new Map((ctx.library || []).map((g) => [g.appid, g])),
    idle: new Set((ctx.unplayed || []).map((g) => g.appid)),
  };
}

/* ── The filter ────────────────────────────────────────────────────────
   One control for both screens. It owns the field and the count and hands
   what was typed to whoever built it, because the two screens do different
   things with the answer: an index asks the api again, a shelf hides rows it
   already has.

   No "only what I own" checkbox. On a shelf it would be a real control, but
   on the index it would be a second way of saying what the address already
   says - with a profile in the path the api is answering about that library
   and about nothing else. Two controls for one state is how a screen starts
   lying, so the shelf does without it too rather than have the same word mean
   two things one click apart.

   `hidden` and not `style.display`, because that is the one the shell's reset
   marks `!important` and the only one a stylesheet cannot quietly lose. */
function houseFilter(opts) {
  const { label, onChange } = opts;
  const box = h('div', { cls: 'hs-filter' });
  const id = `hs-filter-${Math.random().toString(36).slice(2, 8)}`;

  const field = h('input', {
    cls: 'hs-filter-field',
    attr: { id, type: 'search', autocomplete: 'off', spellcheck: 'false',
            placeholder: t(label) },
  });
  box.append(h('label', { cls: 'hs-filter-label', attr: { for: id }, text: t(label) }), field);

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
  const waiting = () => { count.textContent = t('hs.reading'); };

  // A quarter second of settling. On the index every keystroke is a request,
  // and a held-down key should be one of them rather than eight.
  let pending = null;
  field.addEventListener('input', () => {
    clearTimeout(pending);
    pending = setTimeout(() => onChange(field.value.trim(), say, waiting), 240);
  });
  onChange('', say, waiting);
  return box;
}

/* ── The index ─────────────────────────────────────────────────────────
   Every company on the axis, a page at a time: biggest shelf first with
   nobody attached, and most of this library first with somebody.

   No key art on these tiles, and that is a decision rather than an omission.
   The picture would be one cold fetch of a game nobody has opened, per tile,
   for a list ninety thousand long - so opening this screen would have this
   server pulling sixty pictures out of Steam's CDN to decorate a list of
   names. The colour does that work instead. A house's own screen still has
   its picture, because that is one game on one page somebody asked for. */
async function renderHouseIndex(axis, root, ctx) {
  document.title = `${t(axis.title)} - steamprofiler.org`;
  root.textContent = '';

  root.append(h('header', { cls: 'hs-ix-head' },
    h('p', { cls: 'hs-ix-kicker', text: t(axis.kicker) }),
    h('h1', { cls: 'display hs-ix-title', text: t(axis.title) })));

  const grid = h('div', { cls: 'hs-ix-grid', attr: { role: 'list' } });
  const more = h('div', { cls: 'hs-more' });
  const button = h('button', {
    cls: 'hs-act', attr: { type: 'button' }, text: t('hs.show_more'),
  });

  // Which question the newest keystroke asked. A page that lands after the
  // reader has typed again belongs to a question nobody is asking any more,
  // and drawing it would interleave two answers in one grid.
  let token = 0;
  let query = '';
  let start = 0;
  let total = 0;
  let busy = false;

  const url = () => `/houses?kind=${axis.axis}`
    + (ctx.steamid ? `&id=${ctx.steamid}` : '')
    + `&q=${encodeURIComponent(query)}&start=${start}&count=${HS_PAGE}`;

  const page = async (mine, say) => {
    if (busy || (start && start >= total)) return;
    busy = true;
    button.disabled = true;
    try {
      const answer = await api(url());
      if (mine !== token) return;
      total = answer.total || 0;
      start += (answer.houses || []).length;
      for (const house of answer.houses || []) grid.append(houseTile(axis, house, ctx));
      // Nothing at all and nothing asked for is not an empty search: it is a
      // server that has not finished walking the catalogue yet. The first walk
      // takes about an hour and a half, and a screen that says "no results" to
      // an empty filter would be reporting a fault that is not one.
      if (!total && !query) {
        grid.append(h('p', { cls: 'hs-fail', text: t('hs.filling') }));
      }
      if (say) say(Math.min(start, total), total);
      more.hidden = start >= total;
    } finally {
      busy = false;
      button.disabled = false;
    }
  };

  const load = async (needle, say, waiting) => {
    token += 1;
    const mine = token;
    query = needle;
    start = 0;
    total = 0;
    grid.textContent = '';
    more.hidden = true;
    waiting();
    try {
      await page(mine, say);
    } catch (e) {
      if (mine !== token) return;
      grid.textContent = '';
      grid.append(h('p', { cls: 'hs-fail', text: e.message }));
      say(0, 0);
    }
  };

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) page(token, null).catch(() => {});
    }, { rootMargin: '600px' }).observe(more);
  }
  // A browser with no IntersectionObserver gets a button instead of a scroll
  // trigger, which is the same promise kept by hand.
  button.addEventListener('click', () => page(token, null).catch(() => {}));
  more.append(button);

  root.append(houseFilter({ label: 'hs.filter_house', onChange: load }), grid, more);
}

/** One house on the index. `owned` only comes back when the api was asked
 *  about a library, and it is the whole reason that view is worth opening. */
function houseTile(axis, house, ctx) {
  const card = h('a', {
    cls: 'hs-tile hs-tile--flat',
    data: { hs: house.slug },
    attr: { role: 'listitem', href: houseHref(axis, house.slug, ctx) },
    style: { '--tint': houseTint(house.slug) },
  });
  const body = h('div', { cls: 'hs-tile-in' },
    h('h2', { cls: 'hs-tile-name', text: house.name }),
    h('p', { cls: 'hs-tile-span', text: t('hs.n_games', {
      n: num(house.games), raw: house.games,
    }) }));
  if (house.owned != null) {
    body.append(h('p', { cls: 'hs-tile-you' },
      h('b', { text: t('hs.yours_n', { n: num(house.owned), total: num(house.games) }) })));
  }
  card.append(h('div', { cls: 'hs-tile-veil' }), body);
  return card;
}

/* ── One house ─────────────────────────────────────────────────────────
   The shelf, banded by decade. A house is not a series: a shelf here runs
   from one game to a couple of thousand, and a decade is the coarsest band
   that still says something about when this house was busy.

   Ascending, oldest band first, because read that way the bands are the
   house's own history and not a store listing. */
async function renderHouse(axis, slug, root, ctx) {
  root.textContent = '';
  root.append(h('p', { cls: 'hs-fail', text: t('hs.reading') }));

  let house;
  try {
    house = await api(`/house?kind=${axis.axis}&slug=${encodeURIComponent(slug)}`);
  } catch (e) {
    root.textContent = '';
    root.append(h('p', { cls: 'hs-fail', text: e.message }));
    return;
  }

  root.textContent = '';
  document.title = `${house.name} - steamprofiler.org`;

  const apps = house.apps || [];
  const span = houseSpan(apps);
  const { mine, idle } = houseLibrary(ctx);
  const stand = ctx.library ? houseStanding(apps, mine, idle) : null;

  const hero = h('header', { cls: 'hs-hero', style: { '--tint': houseTint(slug) } });
  // One picture, for the first game on the shelf. A house page is a page
  // somebody asked for by name, so a single cold fetch is fair; the index
  // deliberately has none, at a thousand times the scale.
  if (apps.length) {
    const art = h('img', {
      cls: 'hs-hero-art',
      attr: { src: `/art/${apps[0].appid}.jpg`, alt: '', decoding: 'async' },
    });
    art.addEventListener('error', () => art.remove(), { once: true });
    hero.append(art);
  }

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

  put(hero, h('div', { cls: 'hs-hero-veil' }),
    h('div', { cls: 'hs-hero-in' },
      h('p', { cls: 'hs-hero-kicker' },
        h('span', { text: t(axis.shelf) }),
        span ? h('i', { text: '·' }) : null,
        span ? h('span', { text: t('hs.span_years', { from: span.from, to: span.to }) }) : null),
      h('h1', { cls: 'display hs-hero-name', text: house.name }),
      h('p', { cls: 'hs-hero-count', text: t('hs.n_games', {
        n: num(house.games), raw: house.games,
      }) }),
      standing,
      h('div', { cls: 'hs-acts' }, h('a', {
        cls: 'hs-act', text: t('hs.all_houses'), attr: { href: houseIndexHref(axis, ctx) },
      }))));
  root.append(hero);

  const byDecade = new Map();
  const undated = [];
  for (const app of apps) {
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

  // Bands only where there is something to band by. This site has read the
  // store about a few thousand of the ninety thousand apps in the index, so
  // most shelves have no years at all - and a decade heading over a list where
  // every row says "-" is a structure describing nothing. Those get one plain
  // list, alphabetical, and no year column either.
  const dated = byDecade.size > 0;
  if (!dated) shelf.dataset.undated = '1';

  const band = (heading, rows) => {
    const count = h('b', { text: num(rows.length) });
    const section = h('section', { cls: 'hs-band' });
    if (heading) {
      section.append(h('div', { cls: 'panel-bar' },
        h('span', { text: heading }), count));
    }
    const list = h('ol', { cls: 'hs-rows' });
    const own = [];
    for (const app of rows) {
      const row = houseRow(app, ctx, stand, dated);
      list.append(row.node);
      items.push(row);
      own.push(row);
    }
    section.append(list);
    shelf.append(section);
    groups.push({ node: section, items: own, count: heading ? count : null });
  };

  const byName = (x, y) => x.name.localeCompare(y.name);
  if (!dated) {
    band(null, apps.slice().sort(byName));
  } else {
    for (const decade of [...byDecade.keys()].sort((a, b) => a - b)) {
      band(t('hs.decade', { d: decade }),
        byDecade.get(decade).sort((a, b) => a.year - b.year || byName(a, b)));
    }
    if (undated.length) band(t('hs.no_year'), undated.sort(byName));
  }

  if (items.length > HS_FILTER_AT) {
    root.append(houseFilter({
      label: 'hs.filter_game',
      onChange: (needle, say) => {
        const lower = needle.toLowerCase();
        let left = 0;
        for (const it of items) {
          const hit = !lower || it.search.includes(lower);
          it.node.hidden = !hit;
          if (hit) left += 1;
        }
        // A band with nothing left in it is a heading over a gap - and one
        // that still reads "15" over a single row is worse than that, because
        // it is a number that is wrong rather than a heading that is empty.
        for (const g of groups) {
          const n = g.items.filter((it) => !it.node.hidden).length;
          g.node.hidden = !n;
          if (g.count) g.count.textContent = num(n);
        }
        say(left, items.length);
      },
    }));
  }
  root.append(shelf);

  // What the shelf could not say. Both are real: a year is missing because
  // this server has not been to the store about that game yet, and a shelf is
  // cut because some catalogue publishers have thousands of apps.
  const foot = [];
  if (house.read != null && house.read < apps.length) {
    foot.push(t('hs.years_read', { n: num(house.read), total: num(apps.length) }));
  }
  if (house.shown != null && house.games > house.shown) {
    foot.push(t('hs.cut_at', { n: num(house.shown), total: num(house.games) }));
  }
  if (foot.length) root.append(h('p', { cls: 'hs-foot', text: foot.join(' · ') }));
}

/** One game on a house's shelf. The reader's column is absent entirely when
 *  nobody is being talked about, rather than present and empty. */
function houseRow(app, ctx, stand, dated) {
  const owned = stand && stand.mine.get(app.appid);
  const idle = stand && stand.idle.has(app.appid);

  const li = h('li', {});
  const a = h('a', {
    cls: 'hs-row',
    data: owned ? { on: '1' } : idle ? { idle: '1' } : {},
    attr: { href: houseGameHref(app.appid, ctx) },
  });

  // The game's own capsule, straight off Steam's CDN and lazily. Not through
  // /art/: that route caches library_hero.jpg at 400 KB a game and exists for
  // a page opened to look at one of them, and a shelf is hundreds of rows. The
  // small capsule is a few kilobytes and never touches this server, which is
  // the same trade lib.js already documents for thumbnails.
  const icon = h('img', {
    cls: 'hs-row-icon',
    attr: {
      src: `${HEADER_ART}/${app.appid}/capsule_sm_120.jpg`,
      alt: '', loading: 'lazy', decoding: 'async', width: '60', height: '28',
    },
  });
  // A game with no capsule leaves a broken-image glyph in every row it is in.
  // Removed rather than hidden, so the row closes up instead of keeping a gap
  // where a picture was going to be.
  icon.addEventListener('error', () => icon.remove(), { once: true });

  put(a, icon,
    // The year column only exists where the shelf has years. A column of
    // dashes is a column saying nothing in a space that could be the name.
    dated ? h('span', { cls: 'hs-row-year', text: app.year ? String(app.year) : '-' }) : null,
    h('b', { cls: 'hs-row-name', text: app.name }));

  if (stand) {
    a.append(h('span', {
      cls: 'hs-row-you',
      text: owned ? t('hs.hours_n', { h: hrs(owned.hours) })
        : idle ? t('hs.owned_idle')
          : t('hs.not_owned'),
    }));
  }

  li.append(a);
  return { node: li, search: app.name.toLowerCase(), owned: !!(owned || idle) };
}
