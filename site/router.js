/* steamprofiler.org - routing for /u/*.
   nginx serves profile.html for every path under /u/, so the path is the state:

     /u/<perfil>            the dashboard
     /u/<perfil>/<appid>    one game
     /u/<perfil>/backlog    everything owned and never launched

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

/** The address this view should have been reached at. A link built by hand or
 *  held from before this page understood URLs still works, and gets tidied in
 *  place so the one the visitor copies from here is the short one. It also puts
 *  the name back in the first path segment, which is where nginx looks to build
 *  the link preview. */
function canonical() {
  const tail = rival ? `/vs/${encodeURIComponent(rival)}`
    : pile ? '/backlog'
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
  bootStart(rival ? 'versus' : pile ? 'backlog' : appid ? 'game' : 'dash', query);

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
