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

   The one thing it deliberately keeps from the profile pages is the palette:
   `data-game` on <html> swaps the entire token set in games.css, so a game with
   a theme wears it here too. The layout is not shared, and could not be - the
   themed renderers in game.js are built on hours, rank and unlock dates, and
   the <h1> of the fallback among them is literally the hours played. With none
   of that present they draw a page of dashes. This has its own shape instead. */

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
  const art = el('gp-wait-art');
  if (art && APPID) {
    art.src = `/art/${APPID}.jpg`;
    art.addEventListener('error', () => art.closest('.gpw-art')?.remove(), { once: true });
  }
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

/** FC's public page keeps the club-card language of the profile page, but every
 *  number is global. The large number is the median Steam unlock rate, clearly
 *  labelled; it is not a made-up player rating and there is no implied owner. */
function eaFcOverview(g) {
  const set = g.achievements || {};
  const known = (set.list || []).filter((a) => a.rarity != null)
    .slice().sort((a, b) => a.rarity - b.rarity);
  const rare = known[0];
  const median = known.length ? known[Math.floor(known.length / 2)].rarity : null;
  const common = known.filter((a) => a.rarity >= 50).length;
  const storeFacts = g.store || {};
  const kicker = [storeFacts.year, ...(storeFacts.genres || [])
    .map((x) => typeof x === 'string' ? x : x?.name).filter(Boolean).slice(0, 2)]
    .filter(Boolean).join(' · ');

  const art = h('div', { cls: 'gpf-art' },
    h('img', { attr: { src: g.art, alt: '', 'aria-hidden': 'true', loading: 'eager' } }));
  const card = h('section', { cls: 'gpf-card' },
    h('div', { cls: 'gpf-face' },
      h('b', { cls: 'gpf-rate', text: rarity(median) }),
      h('span', { cls: 'gpf-rate-label', text: t('gp.fc_median') }),
      h('p', { cls: 'gpf-name', text: g.name })),
    h('div', { cls: 'gpf-body' },
      kicker ? h('p', { cls: 'gpf-kicker', text: kicker }) : null,
      h('h1', { cls: 'gpf-title', text: t('gp.fc_card') }),
      h('div', { cls: 'gpf-stats' },
        h('div', { cls: 'gpf-stat' }, h('b', { text: num(set.total || known.length) }),
          h('span', { text: t('gp.fc_achievements') })),
        h('div', { cls: 'gpf-stat' }, h('b', { text: rarity(rare?.rarity) }),
          h('span', { text: t('gp.fc_rarest') })),
        h('div', { cls: 'gpf-stat' }, h('b', { text: num(common) }),
          h('span', { text: t('gp.fc_common') }))),
      rare ? h('div', { cls: 'gpf-rare' },
        rare.icon ? h('img', { attr: { src: rare.icon, alt: '', loading: 'eager' } }) : null,
        h('div', {}, h('span', { cls: 'gpf-rare-label', text: t('gp.rarest') }),
          h('strong', { text: rare.name })),
        h('b', { cls: 'gpf-rare-pct', text: rarity(rare.rarity) })) : null,
      h('div', { cls: 'gpf-actions' },
        h('a', { cls: 'btn-steam', text: t('gp.on_steam'), attr: {
          href: `https://store.steampowered.com/app/${g.appid}/`, target: '_blank', rel: 'noopener',
        }})),
      h('p', { cls: 'gpf-note', text: t('gp.fc_note') })));
  return h('div', { cls: 'gpf' }, art, card);
}

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
    g = await api(`/game/public?appid=${APPID}&cc=${store()}`);
  } catch (e) {
    fail(e.message);
    return;
  }

  // The palette, if this game has one of its own. Set here as well as by the
  // SSI include in the head, because a dev server without SSI never answered
  // that include and the page should still wear the right colours.
  if (g.theme) document.documentElement.dataset.game = g.theme;
  document.title = `${g.name} - steamprofiler.org`;

  // A cached response can return before the browser paints once. A very short
  // floor lets a themed opening exist without turning a fast page into a wait.
  const waitFloor = g.theme ? 520 : 0;
  const remaining = waitFloor - (performance.now() - waitAt);
  if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));

  el('gp-wait').hidden = true;
  el('gp').hidden = false;

  const out = root();
  if (g.theme === 'ea-fc') {
    put(out, eaFcOverview(g), ladder(g), priceBlock(g), lookup(g));
  } else {
    put(out, artBand(g), heading(g), ladder(g), priceBlock(g), lookup(g));
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
