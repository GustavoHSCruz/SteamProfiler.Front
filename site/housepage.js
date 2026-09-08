/* steamprofiler.org - /publishers and /developers, with nobody attached.

   The public half of the house screens, and the smaller half: the tables in
   house-catalogue.js are the whole page, so there is no profile to resolve,
   no wait screen to run, and nothing here but reading the address and handing
   it over. `/u/<who>/publishers` is the same code with a library on top of
   it, dispatched from router.js instead.

   One shell serves both axes and both depths, so the path is the state:
   the first segment says which axis, the second says which house. */

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
  const ctx = { query: null, persona: null, library: null, unplayed: null };

  // nginx only serves this shell for the two words, so this cannot normally
  // happen. It can happen to somebody editing the address bar, and landing on
  // the publishers is a better answer than a blank page.
  if (!hsAxis) {
    location.replace('/publishers');
    return;
  }

  if (!hsSlug) {
    await renderHouseIndex(hsAxis, root, ctx);
    return;
  }

  const house = houseBySlug(hsAxis, hsSlug);
  if (!house) {
    // A slug nobody wrote a house for is not an error worth a page of its own:
    // the index is right there, and that is the answer to "which ones".
    location.replace(`/${hsAxis.axis}`);
    return;
  }
  await renderHouse(hsAxis, house, root, ctx);
})();
