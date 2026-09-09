/* steamprofiler.org - what this library would run on Linux.

     /u/<who>/deck

   Steam has told this site all along how many minutes went to Windows, to
   Linux, to macOS and to the Deck, per game. It never says the other half:
   of everything owned and never opened on the Deck, how much of it would
   simply work. That half comes from ProtonDB, where the people who ran the
   game said how it went.

   So the screen is built around one division and not around a score. The
   first band is the answer to the question somebody actually has - the games
   already owned, already paid for, that have never been opened on the Deck
   and would run. The second band is what is already running there, which is
   the control group: it is how you know the first band means anything.

   A tier is a fact about a game, so none of this is about the reader except
   the hours beside it. Shared helpers come from lib.js. */

/* Worst to best, and in that order because the screen counts down from the
   thing worth knowing. */
const DK_TIERS = ['platinum', 'gold', 'silver', 'bronze', 'borked'];

/** How the strip and the bands both label a tier. */
const dkTier = (tier) => t(`dk.t_${tier}`);

/* ── The screen ───────────────────────────────────────────────────────── */

async function renderDeck(root, ctx) {
  document.title = `${t('dk.title')} - steamprofiler.org`;
  root.textContent = '';

  let deck;
  try {
    deck = await api(`/deck?id=${ctx.steamid}`);
  } catch (e) {
    root.append(h('p', { cls: 'dk-fail', text: e.message }));
    return;
  }
  dkDraw(root, ctx, deck);
  dkPoll(root, ctx, deck);
}

/** Ask again for as long as it is still worth asking.
 *
 *  A library nobody has opened before answers with nothing at all: the
 *  verdicts are queued at that moment and fetched one every couple of
 *  seconds, so a library of four hundred is complete a quarter of an hour
 *  after the page opened rather than before it drew. Without this the first
 *  visit is a blank screen that stays blank while the answer arrives behind
 *  it, which reads as broken and is the opposite of what is happening.
 *
 *  Same shape as the store poll on the dashboard, and for the same reason. */
function dkPoll(root, ctx, first) {
  const done = (d) => (d.coverage || {}).asked >= (d.coverage || {}).owned;
  if (done(first)) return;
  let left = 40;
  const tick = async () => {
    let got;
    try {
      got = await api(`/deck?id=${ctx.steamid}`);
    } catch {
      return; // A refusal here is not worth an error on a page that is fine.
    }
    dkDraw(root, ctx, got);
    if (--left > 0 && !done(got)) setTimeout(tick, 6000);
  };
  setTimeout(tick, 5000);
}

function dkDraw(root, ctx, deck) {
  root.textContent = '';

  const games = deck.games || [];
  const cov = deck.coverage || {};

  root.append(h('header', { cls: 'dk-head' },
    h('p', { cls: 'dk-kicker', text: t('dk.kicker') }),
    h('h1', { cls: 'display dk-title', text: t('dk.title') }),
    h('div', { cls: 'dk-clocks' },
      dkClock(t('dk.on_deck'), hrs(deck.deck_hours), deck.deck_hours),
      dkClock(t('dk.on_linux'), hrs(deck.linux_hours), deck.linux_hours))));

  // Nothing to divide. Said plainly rather than drawn as an empty screen: a
  // library with no verdicts yet is a library the queue has not reached.
  if (!games.length) {
    root.append(h('p', { cls: 'dk-fail', text: t('dk.filling') }));
    root.append(dkCoverage(cov));
    return;
  }

  const rank = (g) => DK_TIERS.indexOf(g.tier);
  const untouched = games.filter((g) => !g.deck);
  const running = games.filter((g) => g.deck);
  const order = (a, b) => rank(a) - rank(b) || (b.hours || 0) - (a.hours || 0);
  untouched.sort(order);
  running.sort((a, b) => (b.deck || 0) - (a.deck || 0));

  // The strip: how the whole rated part of this library falls out by tier.
  // Counted over everything rather than over the first band, because the
  // proportion is the fact and the band is one slice of it.
  const byTier = new Map(DK_TIERS.map((tier) => [tier, 0]));
  for (const g of games) byTier.set(g.tier, (byTier.get(g.tier) || 0) + 1);
  const strip = h('div', { cls: 'dk-strip' });
  for (const tier of DK_TIERS) {
    const n = byTier.get(tier) || 0;
    if (!n) continue;
    strip.append(h('div', { cls: 'dk-chip', data: { tier } },
      h('b', { text: num(n) }),
      h('span', { text: dkTier(tier) })));
  }
  root.append(strip);

  // The one line worth reading twice: what is sitting in the library, paid
  // for, that would run untouched.
  const ready = untouched.filter((g) => g.tier === 'platinum' || g.tier === 'gold');
  if (ready.length) {
    root.append(h('p', { cls: 'dk-verdict' },
      h('b', { text: num(ready.length) }),
      h('span', { text: t('dk.ready', { n: num(ready.length), raw: ready.length }) })));
  }

  root.append(dkBand('dk.untouched', untouched, ctx, false));
  root.append(dkBand('dk.running', running, ctx, true));
  root.append(dkCoverage(cov));
}

function dkClock(label, value, raw) {
  return h('div', { cls: 'dk-clock', data: raw ? {} : { zero: '1' } },
    h('b', { text: value }),
    h('span', { text: label }));
}

function dkBand(key, games, ctx, onDeck) {
  const section = h('section', { cls: 'dk-band' },
    h('div', { cls: 'panel-bar' },
      h('span', { text: t(key) }),
      h('b', { text: num(games.length) })));
  if (!games.length) {
    section.append(h('p', { cls: 'dk-empty', text: t('dk.none_here') }));
    return section;
  }
  const list = h('ol', { cls: 'dk-rows' });
  for (const g of games) list.append(dkRow(g, ctx, onDeck));
  section.append(list);
  return section;
}

function dkRow(game, ctx, onDeck) {
  const a = h('a', {
    cls: 'dk-row',
    data: { tier: game.tier },
    attr: { href: `/u/${ctx.query}/${game.appid}` },
  });

  const icon = h('img', {
    cls: 'dk-row-icon',
    attr: {
      src: `${HEADER_ART}/${game.appid}/capsule_sm_120.jpg`,
      alt: '', loading: 'lazy', decoding: 'async', width: '60', height: '28',
    },
  });
  icon.addEventListener('error', () => icon.remove(), { once: true });

  put(a, icon,
    h('b', { cls: 'dk-row-name', text: game.name }),
    h('span', { cls: 'dk-row-tier', text: dkTier(game.tier) }),
    h('span', {
      cls: 'dk-row-hours',
      text: onDeck ? t('dk.deck_h', { h: hrs((game.deck || 0) / 60) })
        : game.hours ? t('dk.hours_n', { h: hrs(game.hours) })
          : t('dk.never'),
    }));

  return h('li', {}, a);
}

/** How much of the library this screen was able to speak for. The three
 *  numbers are different questions and the panel keeps them apart: owned is
 *  the library, asked is what this site has been to ProtonDB about, and rated
 *  is what came back with a verdict rather than with silence. */
function dkCoverage(cov) {
  return h('p', { cls: 'dk-coverage', text: t('dk.coverage', {
    rated: num(cov.rated || 0), asked: num(cov.asked || 0), owned: num(cov.owned || 0),
  }) });
}
