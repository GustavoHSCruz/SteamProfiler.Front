/* steamprofiler.org - reputation, at /u/<perfil>/rep, and the gauge the
   dashboard draws for it.

   The api does the arithmetic (rep.py) and sends the total, and for every
   signal a score of its own from 0 to 100. The weights ride along in the
   payload but are not drawn: they are how the total is put together, and a
   reader asking "why is this 91" is answered by the signals, each on the same
   scale, not by a column of numbers that only add up in someone's head.

   Experimental, and every surface that shows it says so. */

const SVG_NS = 'http://www.w3.org/2000/svg';

function svg(tag, attrs = {}) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

/** A speedometer: a half circle from 0 to 100, filled to the score, with a
 *  needle on it. The two band edges (40 and 70) are marked on the dial so the
 *  word under the number has somewhere to point. Geometry only - colour is
 *  the stylesheet's, so it follows the theme. */
function repGauge(score, cls = '') {
  const box = h('div', { cls: `gauge ${cls}`.trim() });
  const s = svg('svg', { viewBox: '0 0 200 112', 'aria-hidden': 'true' });
  const arc = 'M 20 100 A 80 80 0 0 1 180 100';
  s.append(svg('path', { d: arc, class: 'gauge-track', pathLength: '100' }));
  const fill = svg('path', { d: arc, class: 'gauge-fill', pathLength: '100' });
  fill.style.strokeDasharray = `${score} 100`;
  s.append(fill);
  for (let v = 0; v <= 100; v += 10) {
    const a = Math.PI * (1 - v / 100);
    const edge = v === 40 || v === 70;
    const r1 = edge ? 58 : 64;
    s.append(svg('line', {
      class: edge ? 'gauge-tick is-edge' : 'gauge-tick',
      x1: 100 + r1 * Math.cos(a), y1: 100 - r1 * Math.sin(a),
      x2: 100 + 69 * Math.cos(a), y2: 100 - 69 * Math.sin(a),
    }));
  }
  const needle = svg('g', { class: 'gauge-needle' });
  needle.append(svg('line', { x1: 100, y1: 100, x2: 100, y2: 34 }),
    svg('circle', { cx: 100, cy: 100, r: 6 }));
  // The sweep from zero is a keyframe in rep.css, the same trick the site's
  // meters use: the final value is set here and the animation starts from 0,
  // so nothing depends on timing and reduced motion simply skips it.
  needle.style.transform = `rotate(${-90 + (180 * score) / 100}deg)`;
  s.append(needle);
  box.append(s, h('span', { cls: 'gauge-end is-lo', text: '0' }),
    h('span', { cls: 'gauge-end is-hi', text: '100' }));
  return box;
}

const repBand = (score) => (score >= 70 ? 'high' : score >= 40 ? 'mid' : 'low');

/** What a signal measured, in words. */
function repValue(s) {
  const v = s.value;
  if (s.score == null) return t('rep.unknown');
  switch (s.key) {
    case 'age': return t('rep.v_days', { n: num(v) });
    case 'bans': return v ? num(v) : t('rep.v_none');
    case 'sustained': {
      // A bare number is a payload from rules version 2, cached before the
      // idle days came along; per_year arrived with version 4.
      const { per_day: perDay, per_year: perYear, idle_days: idle } =
        typeof v === 'number' ? { per_day: v } : v || {};
      return [perYear != null ? t('rep.v_per_year', { n: num(perYear) })
                : perDay != null && t('rep.v_per_day', { n: num(perDay, 2) }),
              idle != null && t('rep.v_idle', { n: num(idle) })].filter(Boolean).join(' · ');
    }
    case 'limited': return t(v ? 'rep.v_limited' : 'rep.v_unlocked');
    case 'friend_bans': return t('rep.v_of', { k: num(v.flagged), n: num(v.sampled) });
    case 'hours': return `${num(v)} h`;
    case 'variety': return t('rep.v_variety', { g: num(v.games), s: num(v.top_share) });
    case 'profile': case 'items': case 'community':
      return t('rep.v_of', { k: num(v.length), n: num(4) });
    default: return v != null ? num(v) : '';
  }
}

/** The line a ceiling adds, or null. */
function repCapLine(r) {
  if (!r.cap) return null;
  return h('p', {
    cls: 'record',
    text: t('rep.capped', { max: num(r.cap.max), raw: num(r.raw), why: t(`rep.cap_${r.cap.reason}`) }),
  });
}

/** The dashboard panel: the gauge, the number, and the way to the rest. */
function buildRep(r, query) {
  const wrap = el('panel-rep');
  if (!wrap) return;
  if (!r) {
    wrap.remove();
    return;
  }
  const body = el('rep-body');
  body.textContent = '';
  put(body,
    repGauge(r.score),
    h('p', { cls: 'gauge-num' }, h('b', { text: num(r.score) }),
      h('small', { text: ` ${t('rep.of')}` })),
    h('p', { cls: 'gauge-band', text: t(`rep.band_${repBand(r.score)}`) }),
    repCapLine(r),
    h('a', { cls: 'gauge-more', text: t('rep.details'), attr: { href: `/u/${query}/rep` } }));
}

/** The screen at /u/<perfil>/rep. */
function renderRep(root, d, query) {
  const r = d.reputation;
  root.textContent = '';
  const head = h('header', { cls: 'rpt-head' },
    h('p', { cls: 'rpt-kicker', text: t('rep.kicker') }),
    h('h1', { cls: 'rpt-title display', text: t('rep.h1', { who: d.profile.persona || query }) }),
    h('p', { cls: 'rpt-lede', text: t('rep.lede') }));
  root.append(head);
  if (!r) {
    root.append(h('p', { cls: 'note', text: t('err.not_found') }));
    return;
  }

  root.append(h('section', { cls: 'panel rpt-top' },
    h('div', { cls: 'panel-bar' }, h('span', { text: t('rep.title') }), h('b', { text: t('rep.tag') })),
    h('div', { cls: 'panel-body rpt-top-body' },
      repGauge(r.score, 'is-big'),
      h('div', { cls: 'rpt-sum' },
        h('p', { cls: 'gauge-num' }, h('b', { text: num(r.score) }),
          h('small', { text: ` ${t('rep.of')}` })),
        h('p', { cls: 'gauge-band', text: t(`rep.band_${repBand(r.score)}`) }),
        h('p', { cls: 'note', text: t('rep.known', { n: num(r.known) }) }),
        repCapLine(r)))));

  const cards = h('div', { cls: 'rpt-cards' });
  const animate = !still();
  r.signals.forEach((s, i) => {
    const known = s.score != null;
    const bar = h('span', { cls: 'meter' });
    if (animate) bar.dataset.animate = '1';
    const fill = h('i');
    fill.style.width = `${known ? s.score : 0}%`;
    if (animate) fill.style.animationDelay = `${i * 35}ms`;
    bar.append(fill);
    const card = h('article', { cls: 'rpt-card' },
      h('div', { cls: 'rpt-card-top' },
        h('span', { cls: 'rpt-name', text: t(`rep.s_${s.key}`) }),
        h('b', { cls: 'rpt-score', text: known ? num(s.score) : '-' })),
      bar,
      h('p', { cls: 'rpt-val', text: repValue(s) }),
      h('p', { cls: 'rpt-desc', text: t(`rep.d_${s.key}`) }));
    if (!known) card.dataset.unknown = '1';
    cards.append(card);
  });
  root.append(h('section', { cls: 'panel' },
    h('div', { cls: 'panel-bar' }, h('span', { text: t('rep.signals') }), h('b', { text: t('rep.signals_tag') })),
    h('div', { cls: 'panel-body' }, cards,
      h('p', { cls: 'note', text: t('rep.note', { v: r.version }) }))));
}
