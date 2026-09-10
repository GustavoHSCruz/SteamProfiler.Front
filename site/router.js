/* steamprofiler.org - routing for /u/*.
   nginx serves profile.html for every path under /u/, so the path is the state:

     /u/<perfil>              the dashboard
     /u/<perfil>/<appid>      one game
     /u/<perfil>/backlog      everything owned and never launched
     /u/<perfil>/cards        the badges made, and the sets still open
     /u/<perfil>/year/<ano>   one year of it
     /u/<perfil>/franchises   the ten series, with this profile's hours in them
     /u/<perfil>/franchises/<slug>   one of them
     /u/<perfil>/publishers   the houses that published this library
     /u/<perfil>/publishers/<slug>   one of them
     /u/<perfil>/developers   the houses that made it
     /u/<perfil>/developers/<slug>   one of them
     /u/<perfil>/deck         what this library would run on linux
     /u/<perfil>/embed        the generator: charts, banners and badges

   <perfil> is whatever the visitor typed - a vanity name or a steamID64 - and it
   stays in the URL untouched so the link is shareable and readable. */

// Cut the path first, decode second. The other way round, a profile URL that
// somebody pasted arrives as one encoded segment and its own slashes come back
// before the split, so /u/https%3A%2F%2Fsteamcommunity.com%2Fid%2Fgordziilla
// would read as the profile "https:" with an appid of "steamcommunity.com".
const parts = location.pathname.split('/').filter(Boolean).map(unesc);
const query = steamHandle(parts[1] || '');
const appid = parts[2] && /^\d+$/.test(parts[2]) ? Number(parts[2]) : null;
// /u/<a>/vs/<b> - two libraries against each other. `vs` cannot collide with an
// appid, which is always digits, so the same path space carries both. `backlog`
// is in that same space for the same reason.
const rival = parts[2] === 'vs' && parts[3] ? steamHandle(parts[3]) : null;
const pile = parts[2] === 'backlog';
// Same path space, same reason: an appid is always digits, so a word can never
// be mistaken for one.
const cardset = parts[2] === 'cards';
// `year/2019` and not `2019`, for the same reason `vs` exists: an appid is
// digits too, and Steam has apps numbered in the two thousands, so /u/x/2015
// would be two addresses wearing one path. The word is what tells them apart.
const year = parts[2] === 'year' && /^(19|20)\d\d$/.test(parts[3] || '') ? parts[3] : null;
// Same path space again, and the same reason. `franchises` optionally carries
// a slug after it, which is a word too - so this pair can never be read as an
// appid and a year, and no third rule is needed to keep them apart.
const franchises = parts[2] === 'franchises';
const series = franchises && parts[3] && BY_SLUG.has(parts[3]) ? parts[3] : null;
// Same path space once more. `publishers` and `developers` are words, an appid
// is digits, so nothing here can be read as one - and the two are separate
// paths rather than one with a flag because they are separate shelves: Valve
// published Garry's Mod and Facepunch made it.
const axis = houseAxisOf(parts[2] || '');
// O slug e so o que veio no endereco. Quais existem e uma pergunta que so a
// api responde - sao noventa mil - entao ela vai como veio e a resposta dela
// e que diz se a casa existe.
const houseSlug = axis && parts[3] ? parts[3] : null;
// Same path space, same reason as the rest: a word can never be read as an
// appid. The screen is about the Deck and the Linux clock behind it, which is
// one question and so one address without a tail.
const deck = parts[2] === 'deck';
// Same path space once more, same reason. This one is not a view of the
// library: it is where somebody builds something to take away from it.
const gen = parts[2] === 'embed';

// And once more. This one is not a view of the library either: it is the
// account's own number, in every format Steam has ever handed out.
const codes = parts[2] === 'ids';

/** The address this view should have been reached at. A link built by hand or
 *  held from before this page understood URLs still works, and gets tidied in
 *  place so the one the visitor copies from here is the short one. It also puts
 *  the name back in the first path segment, which is where nginx looks to build
 *  the link preview. */
function canonical() {
  const tail = rival ? `/vs/${encodeURIComponent(rival)}`
    : pile ? '/backlog'
      : cardset ? '/cards'
        : year ? `/year/${year}`
          : series ? `/franchises/${series}`
            : franchises ? '/franchises'
              : houseSlug ? `/${axis.axis}/${houseSlug}`
                : axis ? `/${axis.axis}`
                  : deck ? '/deck'
                  : gen ? '/embed'
                  : codes ? '/ids'
                    : appid ? `/${appid}` : '';
  return `/u/${encodeURIComponent(query)}${tail}`;
}

const failure = el('failure');

function fail(message, retry) {
  bootStop();
  // A half-drawn view behind an error message reads as two answers at once.
  el('dash').hidden = true;
  el('game').hidden = true;
  el('backlog').hidden = true;
  el('cards').hidden = true;
  el('year').hidden = true;
  el('franchises').hidden = true;
  el('houses').hidden = true;
  el('deck').hidden = true;
  el('embed').hidden = true;
  el('ids').hidden = true;
  failure.hidden = false;
  el('failure-text').textContent = message;
  const again = el('failure-retry');
  if (retry) {
    again.hidden = false;
    again.href = retry;
    again.textContent = t('err.see_profile');
  }
}

function showChrome(profileQuery, persona) {
  const back = el('back-link');
  back.href = `/u/${encodeURIComponent(profileQuery)}`;
  back.textContent = persona ? `↩ ${persona}` : t('nav.profile');
  back.hidden = false;
}

(async () => {
  applyStatic();
  langSwitchInto(el('langs'));
  // The credit belongs on the page whether the lookup worked or not.
  creditInto(el('credit-slot'));

  if (!query) {
    location.replace('/');
    return;
  }

  if (canonical() !== location.pathname) {
    history.replaceState(null, '', canonical() + location.search + location.hash);
  }

  // The wait screen knows which of the four views is coming, because each one
  // waits on different calls and the skeleton it draws is that view's layout.
  bootStart(rival ? 'versus' : pile ? 'backlog' : cardset ? 'cards'
    : year ? 'year' : franchises ? 'franchises' : axis ? 'houses' : deck ? 'deck'
      : gen ? 'embed' : codes ? 'ids' : appid ? 'game' : 'dash', query, appid);

  let steamid;
  try {
    ({ steamid } = await api(`/resolve?q=${encodeURIComponent(query)}`));
  } catch (e) {
    fail(e.message);
    return;
  }
  // Held back in the versus case: that view is looking up two handles and the
  // step says so, so it is not done until the second one answers.
  if (!rival) bootMark('resolved');

  try {
    if (rival) {
      let other;
      try {
        ({ steamid: other } = await api(`/resolve?q=${encodeURIComponent(rival)}`));
      } catch (e) {
        fail(t('vs.no_rival', { who: rival }));
        return;
      }
      bootMark('resolved');
      // Both in flight at once: they are two independent lookups, and the
      // second one should not wait on the first one's round trips to Steam.
      const [a, b] = await Promise.all([
        api(`/profile?id=${steamid}`), api(`/profile?id=${other}`),
      ]);
      document.title = `${a.profile.persona} vs ${b.profile.persona} - steamprofiler.org`;
      // Fetched, then drawn, then the screen comes down: the last step on the
      // checklist is the drawing, and it is done here rather than claimed.
      bootMark('fetched');
      el('versus').hidden = false;
      renderVersus(a, b, encodeURIComponent(query), encodeURIComponent(rival), el('v-root'));
      showChrome(query, a.profile.persona);
      bootDone();
    } else if (pile) {
      const d = await api(`/profile?id=${steamid}`);
      bootMark('fetched');
      el('backlog').hidden = false;
      showChrome(query, d.profile.persona);
      bootDone();
      // Its own await: the page is drawn from the profile and then asks the
      // store cache for prices, which it can do without.
      await renderBacklog(d, encodeURIComponent(query));
    } else if (cardset) {
      const d = await api(`/profile?id=${steamid}`);
      bootMark('fetched');
      el('cards').hidden = false;
      showChrome(query, d.profile.persona);
      bootDone();
      // Its own await, like the pile: the page belongs to the profile, and the
      // badges and the market prices land on top of a page that is already up.
      await renderCards(d, steamid, encodeURIComponent(query));
    } else if (franchises) {
      // The screens are drawn from the table in franchises.js, so the profile
      // is the only thing this waits on: the library it carries is what turns
      // the ten into this reader's ten. The api's own numbers land afterwards,
      // on a page that is already up, exactly as they do with no profile.
      const d = await api(`/profile?id=${steamid}`);
      bootMark('fetched');
      el('franchises').hidden = false;
      showChrome(query, d.profile.persona);
      bootDone();
      const ctx = {
        query: encodeURIComponent(query),
        persona: d.profile.persona,
        library: d.library || [],
        unplayed: d.unplayed || [],
        owns: new Set(),
      };
      const root = el('fx-root');
      if (series) await renderFranchise(BY_SLUG.get(series), root, ctx);
      else await renderFranchiseIndex(root, ctx);
    } else if (axis) {
      // Same bargain as the franchises: the tables shipped with the page, and
      // the profile is the only thing this waits on. What the library adds is
      // the one column these screens cannot hold on their own - how much of
      // each shelf is already in it.
      // O perfil e a unica espera: as casas em si a propria tela busca, e o
      // que o perfil traz e a biblioteca que essas telas poem por cima.
      const d = await api(`/profile?id=${steamid}`);
      bootMark('fetched');
      el('houses').hidden = false;
      showChrome(query, d.profile.persona);
      bootDone();
      const ctx = {
        query: encodeURIComponent(query),
        // O indice pede a api para cruzar com esta biblioteca, e para isso
        // precisa do steamid resolvido e nao do que a pessoa digitou.
        steamid,
        persona: d.profile.persona,
        library: d.library || [],
        unplayed: d.unplayed || [],
      };
      const root = el('hs-root');
      if (houseSlug) await renderHouse(axis, houseSlug, root, ctx);
      else await renderHouseIndex(axis, root, ctx);
    } else if (deck) {
      // The profile is the only thing this waits on. The verdicts come from a
      // local cache and whatever is missing is queued for a worker, so the
      // screen is drawn now and is fuller the next time somebody opens it.
      const d = await api(`/profile?id=${steamid}`);
      bootMark('fetched');
      el('deck').hidden = false;
      showChrome(query, d.profile.persona);
      bootDone();
      await renderDeck(el('dk-root'), {
        query: encodeURIComponent(query),
        steamid,
        persona: d.profile.persona,
      });
    } else if (gen) {
      // The profile is the only thing this waits on, and it is needed for one
      // thing only: the name at the top and the link the snippets point at.
      // Every picture on the screen is fetched from the api afterwards, one
      // request per control the visitor touches.
      const d = await api(`/profile?id=${steamid}`);
      bootMark('fetched');
      el('embed').hidden = false;
      showChrome(query, d.profile.persona);
      bootDone();
      renderEmbed(el('em-root'), {
        query: encodeURIComponent(query),
        steamid,
        persona: d.profile.persona,
      });
    } else if (codes) {
      // The codes themselves need only the number the resolve already gave
      // back. The profile is waited on for the four lines that are not
      // arithmetic - the name, the custom URL, the day it was opened and the
      // avatar - and for the name on the back link, the same as every other
      // screen here.
      const d = await api(`/profile?id=${steamid}`);
      bootMark('fetched');
      el('ids').hidden = false;
      showChrome(query, d.profile.persona);
      bootDone();
      renderIds(el('sid-root'), d, steamid, encodeURIComponent(query));
    } else if (year) {
      // Every figure on this page except the unlocks is already in the profile
      // payload, so the page is complete the moment that lands. The unlocks
      // cost a scan and wait for a button, exactly as they do on the dashboard.
      const d = await api(`/profile?id=${steamid}`);
      bootMark('fetched');
      el('year').hidden = false;
      renderYear(d, year, encodeURIComponent(query));
      showChrome(query, d.profile.persona);
      bootDone();
    } else if (appid) {
      // The game view needs the profile anyway (for the name and the rank), and
      // the API has it cached by the time this returns.
      const g = await api(`/game?id=${steamid}&appid=${appid}`);
      document.title = `${g.name} - steamprofiler.org`;
      bootMark('fetched');
      el('game').hidden = false;
      renderGame(g, el('g-root'));
      const when = el('g-generated');
      if (g.generated_at) {
        when.dateTime = g.generated_at;
        when.textContent = stamp(g.generated_at);
      }
      showChrome(query, null);
      bootDone();
      api(`/profile?id=${steamid}`)
        .then((p) => showChrome(query, p.profile.persona))
        .catch(() => {});
    } else {
      const d = await api(`/profile?id=${steamid}`);
      bootMark('fetched');
      el('dash').hidden = false;
      renderDashboard(d, encodeURIComponent(query));
      bootDone();
    }
  } catch (e) {
    fail(e.message, appid ? `/u/${encodeURIComponent(query)}` : null);
  }
})();
