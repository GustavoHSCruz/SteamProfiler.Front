/* steamprofiler.org - the privacy page. Static text in three languages, so
   most of this is filling it in and hanging the usual chrome off the page.

   The one live thing is the date. It is read out of POLICY_LOG rather than
   written into the HTML, because a policy whose date can drift from the policy
   is a policy nobody should trust the date on. */

applyStatic();
langSwitchInto(el('langs'));
creditInto(el('credit-slot'));

(() => {
  const when = el('priv-date');
  const log = typeof POLICY_LOG === 'undefined' ? [] : POLICY_LOG;
  if (!when || !log.length) return;
  const latest = log.reduce((a, b) => (b.version > a.version ? b : a));
  when.dateTime = latest.date;
  when.textContent = longDate(latest.date) || latest.date;
})();
