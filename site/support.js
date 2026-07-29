/* steamprofiler.org - the support page. Renders only the channels the server says are
   configured and valid, so a half-filled .env never shows a broken address. */

function linkChannel(c) {
  return h('article', { cls: 'channel' },
    h('div', { cls: 'channel-head' }, h('h2', { cls: 'channel-name', text: c.label })),
    h('p', { cls: 'channel-blurb', text: ts(c.blurb) }),
    h('a', {
      cls: 'btn channel-link',
      attr: { href: c.value, rel: 'noopener noreferrer', target: '_blank' },
      text: t('sup.open', { label: c.label }),
    }));
}

function addressChannel(c) {
  const code = h('code', { text: c.value });
  const button = h('button', { cls: 'btn btn--quiet', attr: { type: 'button' }, text: t('sup.copy') });

  button.addEventListener('click', async () => {
    button.textContent = await copy(c.value, code);
    setTimeout(() => { button.textContent = t('sup.copy'); }, 2500);
  });

  return h('article', { cls: 'channel' },
    h('div', { cls: 'channel-head' },
      h('h2', { cls: 'channel-name', text: c.label }),
      h('span', { cls: 'tag', text: t('sup.address') })),
    h('p', { cls: 'channel-blurb', text: ts(c.blurb) }),
    h('div', { cls: 'addr' }, code, button),
    c.verified ? h('span', { cls: 'channel-verified', text: ts(c.verified) }) : null);
}

(async () => {
  applyStatic();
  langSwitchInto(el('langs'));
  creditInto(el('credit-slot'));

  let state;
  try {
    state = await api('/support');
  } catch {
    el('none').hidden = false;
    el('none').textContent = t('sup.failed');
    return;
  }

  const box = el('channels');
  for (const c of state.channels) {
    box.append(c.kind === 'link' ? linkChannel(c) : addressChannel(c));
  }

  if (!state.channels.length) {
    const none = el('none');
    none.hidden = false;
    // The owner is the likeliest reader of this state, so it says what to fill in.
    none.textContent = t('sup.none', { vars: state.expected.join(', ') });
    el('honest').hidden = true;
  }
})();
