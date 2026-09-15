/* The current revision date and Git link come from the same archive index. */
applyStatic();
langSwitchInto(el('langs'));
creditInto(el('credit-slot'));
(() => {
  const latest = TERMS_LOG.reduce((a, b) => b.version > a.version ? b : a);
  const when = el('tos-date');
  when.dateTime = latest.date;
  when.textContent = longDate(latest.date) || latest.date;
  el('tos-version').textContent = `v${latest.version}`;
  el('tos-draft').hidden = Boolean(latest.commit);
  if (latest.commit) {
    const link = el('tos-commit');
    link.href = `https://github.com/GustavoHSCruz/SteamProfiler.Front/commit/${latest.commit}`;
    link.textContent = latest.commit.slice(0, 7);
    link.hidden = false;
  }
})();
