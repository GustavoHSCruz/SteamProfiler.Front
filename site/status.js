/* steamprofiler.org - the status page.

   One call to /status, which is the api's own public payload and not this
   page filtering /healthz: /healthz prints the gate's counters and the ban
   table, and a filter applied in the browser is not a boundary, because the
   bytes have already left the server by the time it runs.

   Three lights, then two lists of figures. The lights are first because they
   are the only part somebody arrives here to read - a lookup just failed, and
   the question is whose fault it was. Everything under them is for the reader
   who stayed. */

/** Bytes, in the largest unit that leaves a number worth reading. */
function size(bytes) {
  if (bytes == null) return '-';
  const units = ['B', 'kB', 'MB', 'GB', 'TB'];
  let n = bytes;
  let at = 0;
  while (n >= 1024 && at < units.length - 1) { n /= 1024; at += 1; }
  return `${num(n, at > 1 ? 1 : 0)} ${units[at]}`;
}

/** One light: what it is, what it says, and how worried to be about it.
 *  `tone` is the only thing here a colour is keyed on, so a state that has to
 *  change how it reads changes one word rather than a stylesheet. */
function light(name, state, tone, detail) {
  return h('li', { cls: 'light', data: { tone } },
    h('span', { cls: 'light-dot' }),
    h('span', { cls: 'light-name', text: name }),
    h('b', { cls: 'light-state', text: state }),
    detail ? h('span', { cls: 'light-detail', text: detail }) : null);
}

/** dt/dd into a .kv list, skipping a figure the server did not send rather
 *  than printing a dash where a number belongs. */
function figure(list, label, value) {
  if (value == null) return;
  put(list, h('dt', { text: label }), h('dd', { text: value }));
}

/** One closed week, as a bar against the busiest of them. Twelve weeks of
 *  bars say "this is growing" or "this is flat", which is the one thing a
 *  single week's number cannot say on its own. */
function weekRow(week, busiest) {
  const when = new Date(week.began_at * 1000);
  // Two figures in one column, which needs saying: the bar and the bold
  // number are requests, the faint one beside it is addresses. The title is
  // where that goes, because a legend over three rows costs more room than
  // the rows do.
  const figure = h('span', {
    cls: 'row-fig',
    text: num(week.requests),
    attr: { title: `${t('st.w_requests')} · ${t('st.w_addresses')}` },
  });
  figure.append(h('em', { text: num(week.addresses) }));

  return h('div', { cls: 'row' },
    h('span', { cls: 'row-name', text: shortDate(when.toISOString().slice(0, 10)) }),
    fillBar('meter', busiest ? (week.requests / busiest) * 100 : 0),
    figure);
}

const BUDGET_TONE = { normal: 'good', tight: 'warn', spent: 'bad' };

(async () => {
  applyStatic();
  langSwitchInto(el('langs'));

  let state;
  try {
    state = await api('/status');
  } catch (e) {
    el('stamp').hidden = true;
    const box = el('failed');
    box.hidden = false;
    // The message the api sent if it managed to send one, and the page's own
    // sentence if it did not answer at all - which is the more likely half.
    box.textContent = e.message || t('st.failed');
    return;
  }

  el('stamp').textContent = t('st.since', {
    d: stamp(new Date(state.started_at * 1000).toISOString()),
  });

  const steam = state.steam;
  put(el('lights'),
    light(t('st.l_site'), t('st.up'), 'good'),
    light(t('st.l_budget'), t(`st.budget_${steam.budget}`),
          BUDGET_TONE[steam.budget] || 'warn',
          t('st.budget_used', { n: num(steam.budget_used) })),
    light(t('st.l_community'),
          steam.community === 'ok' ? t('st.community_ok') : t('st.community_cooling'),
          steam.community === 'ok' ? 'good' : 'warn',
          // "Cooling down" with no duration is half an answer: the question
          // behind it is whether to wait or to come back tomorrow.
          steam.community === 'ok' ? null
            : t('st.cooling_for', { n: num(Math.ceil(steam.cooling_for)) })));

  const known = state.known;
  const list = el('known');
  figure(list, t('st.k_games'), num(known.games));
  figure(list, t('st.k_detailed'), num(known.detailed));
  figure(list, t('st.k_reviewed'), num(known.reviewed));
  figure(list, t('st.k_catalogue'), num(known.catalogue));
  figure(list, t('st.k_houses'), num(known.houses));
  figure(list, t('st.k_deck'), num(known.deck.rated));
  figure(list, t('st.k_art'), `${num(known.art.count)} · ${size(known.art.bytes)}`);
  figure(list, t('st.k_warm'), num(known.warm));

  const traffic = state.traffic;
  if (!traffic) {
    el('week').append(h('dt', { cls: 'kv-wide', text: t('st.no_traffic') }));
    return;
  }

  const week = el('week');
  figure(week, t('st.w_addresses'), num(traffic.addresses));
  figure(week, t('st.w_requests'), num(traffic.requests));
  figure(week, t('st.w_lookups'), num(traffic.lookups));

  const past = traffic.weeks || [];
  if (past.length) {
    const busiest = Math.max(...past.map((w) => w.requests));
    el('weeks-head').hidden = false;
    put(el('weeks'), ...past.map((w) => weekRow(w, busiest)));
  }
})();
