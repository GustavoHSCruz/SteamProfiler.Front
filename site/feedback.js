/* steamprofiler.org - the messages page: one form, one board. */

const form = el('form');
const send = el('send');
const result = el('result');
const messageBox = el('message');
const opened = Date.now();



function say(text, tone) {
  result.hidden = false;
  result.dataset.tone = tone;
  result.textContent = text;
}

messageBox.addEventListener('input', () => {
  el('count').textContent = t('msg.count', { n: messageBox.value.length });
});

/* ── The board ─────────────────────────────────────────────────────── */

function cardFor(item) {
  const votes = h('button', {
    cls: 'vote',
    attr: { type: 'button', title: t(item.voted ? 'msg.unvote' : 'msg.agree') },
    data: item.voted ? { on: '1' } : {},
  }, h('i', { text: '▲' }), h('b', { text: String(item.votes) }));

  votes.addEventListener('click', async () => {
    votes.disabled = true;
    try {
      const got = await post('/vote', { id: item.id });
      votes.lastElementChild.textContent = String(got.votes);
      if (got.voted) votes.dataset.on = '1';
      else delete votes.dataset.on;
      votes.title = t(got.voted ? 'msg.unvote' : 'msg.agree');
    } catch (e) {
      say(e.message, 'bad');
    }
    votes.disabled = false;
  });

  const body = h('div', {},
    h('div', { cls: 'card-head' },
      h('h3', { cls: 'card-title', text: item.title }),
      h('span', { cls: 'tag', data: { kind: item.kind }, text: t(`kind.${item.kind}`) }),
      h('span', { cls: 'tag', data: { status: item.status },
                  text: t(`state.${item.status}`) })),
    h('p', { cls: 'card-body', text: item.message }),
    item.reply
      ? h('div', { cls: 'reply' }, h('span', { text: t('msg.reply') }), h('p', { text: item.reply }))
      : null,
    h('p', { cls: 'card-meta', text: shortDate(item.created_at.slice(0, 10)) || '' }));

  return h('article', { cls: 'card' }, votes, body);
}

async function loadBoard() {
  let items = [];
  try {
    ({ items } = await api('/board'));
  } catch {
    el('board-count').textContent = t('msg.board_unavailable');
    return;
  }
  const box = el('board');
  box.textContent = '';
  el('board-count').textContent = items.length
    ? (items.length === 1 ? t('msg.board_item') : t('msg.board_items', { n: items.length }))
    : t('msg.board_empty_label');
  el('board-empty').hidden = items.length > 0;
  for (const item of items) box.append(cardFor(item));
}

/* ── Sending ───────────────────────────────────────────────────────── */

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  result.hidden = true;
  send.disabled = true;
  send.textContent = t('msg.sending');

  try {
    await post('/feedback', {
      kind: form.elements.kind.value,
      title: el('title').value,
      message: messageBox.value,
      contact: el('contact').value,
      // Where they came from, which is the most useful thing in a bug report.
      context: document.referrer && new URL(document.referrer).origin === location.origin
        ? new URL(document.referrer).pathname
        : null,
      website: el('website').value,
      elapsed: (Date.now() - opened) / 1000,
    });
    form.reset();
    el('count').textContent = t('msg.count', { n: 0 });
    say(t('msg.sent'), 'good');
  } catch (err) {
    say(err.message, 'bad');
  }
  send.disabled = false;
  send.textContent = t('msg.send');
});

applyStatic();
langSwitchInto(el('langs'));
loadBoard();
creditInto(el('credit-slot'));
