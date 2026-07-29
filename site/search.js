/* steamprofiler.org - the landing page. One job: turn what someone typed into a URL.

   The profile is resolved here rather than after navigating, so a typo answers
   in place instead of loading a page that only then says it failed. */

applyStatic();
langSwitchInto(el('langs'));

const form = el('find');
const input = el('q');
const button = el('find-go');
const error = el('find-error');

function complain(message) {
  error.hidden = false;
  error.textContent = message;
  input.focus();
  input.select();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = input.value.trim();
  error.hidden = true;

  if (!q) {
    complain(t('land.empty'));
    return;
  }

  button.disabled = true;
  button.textContent = t('land.searching');
  try {
    // Only to check it exists; the URL keeps whatever was typed, so it stays readable.
    await api(`/resolve?q=${encodeURIComponent(q)}`);
    location.assign(`/u/${encodeURIComponent(q)}`);
  } catch (err) {
    complain(err.message);
    button.disabled = false;
    button.textContent = t('land.go');
  }
});

creditInto(el('credit-slot'));
