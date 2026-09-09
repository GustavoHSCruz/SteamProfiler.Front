/* steamprofiler.org - /publishers and /developers, with nobody attached.

   The public half of the house screens. There is no profile to resolve and no
   wait screen to run: the api answers the list and the shelves, and houses.js
   draws whichever of the two the address asks for.

   One shell serves both axes and both depths, so the path is the state: the
   first segment says which axis, the second says which house. An unknown
   house is not checked here - the api is the only thing that knows which
   slugs exist, and it says so in its own answer. */

const hsParts = location.pathname.split('/').filter(Boolean).map(unesc);
const hsAxis = houseAxisOf(hsParts[0] || '');
const hsSlug = hsParts[1] || null;

(async () => {
  applyStatic();
  langSwitchInto(el('langs'));
  creditInto(el('credit-slot'));

  const root = el('hs-root');
  // No profile, so nothing on these screens is about anybody: the standing
  // blocks come out and the shelves show the house's own numbers instead.
  const ctx = { query: null, steamid: null, persona: null, library: null, unplayed: null };

  // nginx only serves this shell for the two words, so this cannot normally
  // happen. It can happen to somebody editing the address bar, and landing on
  // the publishers is a better answer than a blank page.
  if (!hsAxis) {
    location.replace('/publishers');
    return;
  }

  if (hsSlug) await renderHouse(hsAxis, hsSlug, root, ctx);
  else await renderHouseIndex(hsAxis, root, ctx);
})();
