/* steamprofiler.org - /franchises and /franchises/<slug>, with nobody attached.

   The public half of the franchise screens, and the smaller half: the table
   in franchises.js is the whole page, so there is no profile to resolve, no
   wait screen to run, and nothing here but reading the address and handing it
   over. `/u/<who>/franchises` is the same code with a library on top of it,
   dispatched from router.js instead.

   nginx serves this shell for both paths, so the path is the state. */

const fxParts = location.pathname.split('/').filter(Boolean).map(unesc);
const fxSlug = fxParts[1] || null;

(async () => {
  applyStatic();
  langSwitchInto(el('langs'));
  creditInto(el('credit-slot'));

  const root = el('fx-root');
  // No profile, so nothing on these screens is about anybody: the standing
  // blocks come out and the shelves show the series' own numbers instead.
  const ctx = { query: null, persona: null, library: null, unplayed: null, owns: new Set() };

  if (!fxSlug) {
    await renderFranchiseIndex(root, ctx);
    return;
  }

  const fr = BY_SLUG.get(fxSlug);
  if (!fr) {
    // A slug nobody wrote a franchise for is not an error worth a page of its
    // own: the ten are right there, and that is the answer to "which ones".
    location.replace('/franchises');
    return;
  }
  await renderFranchise(fr, root, ctx);
})();
