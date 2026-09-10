/* steamprofiler.org - the generator, at /u/<perfil>/embed.

   Every other screen on this site is a page about a library. This one makes
   something that leaves it: a chart, a strip, a badge, or the same chart as
   plain text for the places that take no picture at all. The api draws all of
   them (embed.py), so this file is the controls, the preview, and the four
   ways somebody pastes the result somewhere else.

   Two answers per output, and the difference between them is worth stating
   plainly rather than hiding behind a switch:

     dynamic   an address. Whoever opens the page it sits on gets the numbers
               as they are then, at most a quarter of an hour old. This is what
               a README, a forum post or a blog wants.
     static    the same bytes, downloaded. Nothing updates, and the file says
               which day it is a picture of. This is what Steam needs, because
               a Steam profile will not load an image from here at all: its
               About Me only accepts pictures already on Steam's own hosts, so
               the file has to be uploaded there as artwork first.

   The static download is made in the browser and not by the api: the SVG is
   already self-contained, so turning it into a PNG is one canvas and no round
   trip. That also means the PNG is exactly the picture on the screen. */

const EM_PATHS = { bars: 'bars.svg', banner: 'banner.svg', badge: 'badge.svg', text: 'bars.txt' };

/* The controls, per output. A table rather than four blocks of markup: they
   are the same three widget types throughout, and what differs is only which
   parameter each one writes into the query string. */
const EM_CONTROLS = {
  bars: [
    { name: 'style', pick: ['plain', 'color', 'icon', 'art'] },
    { name: 'show', pick: ['top', 'recent', 'platform', 'genres', 'years'] },
    { name: 'n', range: [3, 10], value: 5 },
    { name: 'w', range: [280, 760], step: 20, value: 420 },
    { name: 'theme', pick: ['dark', 'light', 'steam'] },
  ],
  text: [
    { name: 'show', pick: ['top', 'recent', 'platform', 'genres', 'years'] },
    { name: 'n', range: [3, 10], value: 5 },
    { name: 'cells', range: [8, 32], value: 18 },
  ],
  banner: [
    { name: 'preset', pick: ['blog', 'forum', 'wide', 'card', 'tower', 'side'] },
    { name: 'theme', pick: ['dark', 'light', 'steam'] },
    // One choice per box, which makes "which figures" and "how many" the same
    // question: a box set to nothing is a box that is not drawn. Four is the
    // ceiling the api draws, and a narrow banner drops the last ones itself
    // rather than squeezing the name out to fit them.
    {
      name: 'facts',
      slots: ['hours', 'games', 'played', 'none'],
      pick: ['none', 'hours', 'games', 'played', 'never', 'level', 'top',
        'linux', 'deck', 'achievements', 'badges', 'since', 'per_day', 'now'],
    },
  ],
  badge: [
    {
      name: 'metric',
      pick: ['hours', 'games', 'played', 'never', 'level', 'top', 'linux',
        'deck', 'achievements', 'badges', 'since', 'per_day', 'now'],
    },
    { name: 'style', pick: ['flat', 'square', 'plastic', 'big'] },
    { name: 'color', pick: ['amber', 'steam', 'blue', 'green', 'violet', 'red', 'grey'] },
    { name: 'theme', pick: ['dark', 'light', 'steam'] },
    { name: 'logo', flag: true, value: true },
    { name: 'label', free: true, value: '' },
  ],
};

/** The address of one output, with everything the controls say on it. */
function emUrl(kind, state, query) {
  const q = new URLSearchParams({ q: query, lang: LANG });
  for (const [k, v] of Object.entries(state)) {
    // An empty custom label is not a label of nothing: it is the absence of
    // one, and the api falls back to the metric's own word.
    if (v === '') continue;
    if (Array.isArray(v)) {
      // `none` is written out rather than left off, because a parameter that
      // is not there and one that is empty look the same in a query string,
      // and one of them has to be able to mean "no boxes at all".
      const chosen = v.filter((one) => one !== 'none');
      q.set(k, chosen.length ? chosen.join(',') : 'none');
      continue;
    }
    q.set(k, v === true ? '1' : v === false ? '0' : String(v));
  }
  // The commas between the boxes are left as commas. URLSearchParams escapes
  // them to %2C, which is correct and which nobody wants to read in the middle
  // of a link pasted into a README. A comma is legal in a query string and the
  // api decodes both spellings the same way.
  return `/api/${EM_PATHS[kind]}?${q.toString().replace(/%2C/g, ',')}`;
}

/** The four ways this gets pasted somewhere. `src` is either the live address
 *  or the name of the file that was just downloaded, and that is the only
 *  difference between the dynamic and the static answer. */
function emSnippets(src, alt, link, size) {
  const dims = size ? ` width="${size.w}" height="${size.h}"` : '';
  return {
    md: `[![${alt}](${src})](${link})`,
    html: `<a href="${link}"><img src="${src}" alt="${alt}"${dims}></a>`,
    bb: `[url=${link}][img]${src}[/img][/url]`,
    url: src,
  };
}

/** One file, as something an <img> or an <a download> can take.
 *
 *  A data URI and not a blob one, which is not a matter of taste: the site's
 *  Content-Security-Policy allows `data:` under img-src and does not allow
 *  `blob:`, so a preview built with URL.createObjectURL() is blocked by the
 *  browser and the panel shows nothing at all. Everything here is a handful of
 *  kilobytes, which is what makes the choice free. */
function emData(text, type) {
  return `data:${type};charset=utf-8,${encodeURIComponent(text)}`;
}

/** The bytes of an SVG, as a PNG, at twice the size so it survives a retina
 *  screen and a forum that scales it. Everything the file needs is inside it -
 *  no webfont, no remote picture - which is the only reason a canvas is
 *  allowed to hand the pixels back. */
async function emPng(svg, size, scale = 2) {
  const img = new Image();
  await new Promise((ok, no) => {
    img.onload = ok;
    img.onerror = () => no(new Error('svg'));
    img.src = emData(svg, 'image/svg+xml');
  });
  const canvas = document.createElement('canvas');
  canvas.width = size.w * scale;
  canvas.height = size.h * scale;
  const pen = canvas.getContext('2d');
  pen.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

/** What an <img> would reserve for it. Read off the file rather than guessed,
 *  because a bar chart's height depends on how many rows were asked for and a
 *  badge's width depends on the text inside it. */
function emSize(svg) {
  const w = svg.match(/width="(\d+)"/);
  const h = svg.match(/height="(\d+)"/);
  return w && h ? { w: Number(w[1]), h: Number(h[1]) } : null;
}

function emDownload(href, name) {
  const a = h('a', { attr: { href, download: name } });
  document.body.append(a);
  a.click();
  a.remove();
}

/** One output: its controls, its preview, and the block somebody copies. */
function emSection(kind, ctx) {
  const state = {};
  for (const c of EM_CONTROLS[kind]) {
    // Sliced, never shared: the table above is read once per page and a state
    // that held its array would write the next visitor's choices into it.
    if (c.slots) state[c.name] = c.slots.slice();
    else state[c.name] = c.value !== undefined ? c.value : (c.pick ? c.pick[0] : '');
  }
  let mode = 'live';
  let held = null;      // the bytes, once they have been fetched
  let size = null;
  let tab = 'md';

  const preview = h('div', { cls: 'em-preview' });
  const shown = h('img', { cls: 'em-shot', attr: { alt: '' } });
  const text = h('pre', { cls: 'em-pre' });
  const weight = h('span', { cls: 'em-weight' });
  const out = h('pre', { cls: 'em-out' });
  const tabs = h('div', { cls: 'em-tabs' });
  const acts = h('div', { cls: 'em-acts' });
  const said = h('span', { cls: 'em-said' });

  const link = `${location.origin}/u/${ctx.query}`;
  const alt = t('em.alt', { who: ctx.persona });

  function fileName(ext) {
    return `steamprofiler-${kind}-${state.show || state.metric || state.preset || ''}`
      .replace(/-$/, '') + `.${ext}`;
  }

  /** The block under the preview, for whichever of the two answers is on. */
  function paint() {
    const live = mode === 'live';
    const src = live ? `${location.origin}${emUrl(kind, state, ctx.query)}`
      : fileName(kind === 'text' ? 'txt' : 'svg');
    if (kind === 'text') {
      // A text chart has nothing to link and nothing to embed: it is the
      // characters themselves, wrapped in whatever the destination fences code
      // with. The live address is still worth printing - it is what a script
      // that rewrites a README every morning would read.
      out.textContent = live ? src
        : (tab === 'bb' ? `[code]\n${held || ''}[/code]`
          : tab === 'md' ? `\`\`\`\n${held || ''}\`\`\`` : (held || ''));
    } else {
      out.textContent = emSnippets(src, alt, link, size)[tab];
    }
    for (const b of tabs.children) b.dataset.on = b.dataset.tab === tab ? '1' : '';
    // A live text chart has one useful form and it is the address itself, so
    // the four ways of wrapping it only appear once there is a file to wrap.
    tabs.hidden = kind === 'text' && live;
    acts.hidden = live;
    said.textContent = live ? t('em.live_note')
      : t('em.static_note', { date: shortDate(new Date().toISOString()) || '' });
  }

  async function refresh() {
    const url = emUrl(kind, state, ctx.query);
    shown.hidden = kind === 'text';
    text.hidden = kind !== 'text';
    preview.dataset.busy = '1';
    try {
      const answer = await fetch(url);
      if (!answer.ok) throw new Error(String(answer.status));
      held = await answer.text();
    } catch {
      preview.dataset.busy = '';
      out.textContent = t('em.failed');
      return;
    }
    preview.dataset.busy = '';
    if (kind === 'text') {
      text.textContent = held;
      size = null;
      weight.textContent = '';
    } else {
      size = emSize(held);
      // Drawn from the bytes in hand rather than from the address, so the
      // preview is the file: the same pixels the download will contain, and
      // one request instead of two.
      shown.src = emData(held, 'image/svg+xml');
      shown.alt = alt;
      weight.textContent = size
        ? `${size.w}×${size.h} · ${Math.max(1, Math.round(held.length / 1024))} kB`
        : '';
    }
    paint();
  }

  /* ── The controls ─────────────────────────────────────────────── */
  const rack = h('div', { cls: 'em-rack' });
  for (const c of EM_CONTROLS[kind]) {
    const name = h('span', { cls: 'em-ctl-name', text: t(`em.o_${c.name}`) });
    const label = h('label', { cls: 'em-ctl' }, name);
    let field;
    if (c.slots) {
      field = h('span', { cls: 'em-slots' });
      c.slots.forEach((_, slot) => {
        const box = h('select');
        for (const value of c.pick) {
          box.append(h('option', { attr: { value }, text: t(`em.v_${value}`) }));
        }
        box.value = state[c.name][slot];
        box.addEventListener('change', () => {
          state[c.name][slot] = box.value;
          refresh();
        });
        field.append(box);
      });
      label.dataset.wide = '1';
    } else if (c.pick) {
      field = h('select');
      for (const value of c.pick) {
        field.append(h('option', { attr: { value }, text: t(`em.v_${value}`) }));
      }
      field.value = state[c.name];
      field.addEventListener('change', () => { state[c.name] = field.value; refresh(); });
    } else if (c.range) {
      const readout = h('b', { cls: 'em-ctl-value', text: String(state[c.name]) });
      field = h('input', {
        attr: {
          type: 'range', min: String(c.range[0]), max: String(c.range[1]),
          step: String(c.step || 1), value: String(state[c.name]),
        },
      });
      field.addEventListener('input', () => { readout.textContent = field.value; });
      // Written on change and not on input: a slider dragged across its whole
      // travel would otherwise be forty requests, and the answer to thirty-nine
      // of them is thrown away before it is drawn.
      field.addEventListener('change', () => {
        state[c.name] = Number(field.value);
        refresh();
      });
      name.append(readout);
    } else if (c.flag) {
      field = h('input', { attr: { type: 'checkbox' } });
      field.checked = !!state[c.name];
      field.addEventListener('change', () => {
        state[c.name] = field.checked;
        refresh();
      });
      label.dataset.flag = '1';
    } else {
      field = h('input', {
        attr: { type: 'text', maxlength: '24', placeholder: t('em.ph_label') },
      });
      field.addEventListener('change', () => { state[c.name] = field.value; refresh(); });
    }
    label.append(field);
    rack.append(label);
  }

  /* ── Live or frozen ───────────────────────────────────────────── */
  const modes = h('div', { cls: 'em-modes' });
  for (const which of ['live', 'still']) {
    const b = h('button', {
      cls: 'em-mode', text: t(`em.mode_${which}`), attr: { type: 'button' },
      data: { on: which === mode ? '1' : '' },
    });
    b.addEventListener('click', () => {
      mode = which;
      for (const other of modes.children) other.dataset.on = '';
      b.dataset.on = '1';
      paint();
    });
    modes.append(b);
  }

  for (const which of (kind === 'text' ? ['md', 'bb', 'url'] : ['md', 'html', 'bb', 'url'])) {
    const b = h('button', {
      cls: 'em-tab', text: t(`em.tab_${which}`),
      attr: { type: 'button' }, data: { tab: which },
    });
    b.addEventListener('click', () => { tab = which; paint(); });
    tabs.append(b);
  }

  const copyBtn = h('button', { cls: 'em-go', text: t('em.copy'), attr: { type: 'button' } });
  const done = h('span', { cls: 'em-done' });
  copyBtn.addEventListener('click', async () => {
    done.textContent = await copy(out.textContent, out);
  });

  if (kind === 'text') {
    const txtBtn = h('button', {
      cls: 'em-go', text: t('em.save_txt'), attr: { type: 'button' },
    });
    txtBtn.addEventListener('click', () => {
      emDownload(emData(held || '', 'text/plain'), fileName('txt'));
    });
    acts.append(txtBtn);
  } else {
    const svgBtn = h('button', { cls: 'em-go', text: t('em.save_svg'), attr: { type: 'button' } });
    svgBtn.addEventListener('click', () => {
      emDownload(emData(held || '', 'image/svg+xml'), fileName('svg'));
    });
    const pngBtn = h('button', { cls: 'em-go', text: t('em.save_png'), attr: { type: 'button' } });
    pngBtn.addEventListener('click', async () => {
      if (!held || !size) return;
      try {
        emDownload(await emPng(held, size), fileName('png'));
      } catch {
        done.textContent = t('em.no_png');
      }
    });
    acts.append(svgBtn, pngBtn);
  }

  preview.append(shown, text);
  const panel = h('article', { cls: `panel p-em em-${kind}` },
    h('div', { cls: 'panel-bar' },
      h('span', { text: t(`em.k_${kind}`) }), weight),
    h('div', { cls: 'panel-body' },
      h('p', { cls: 'note', text: t(`em.k_${kind}_body`) }),
      rack,
      preview,
      modes,
      said,
      tabs,
      out,
      h('div', { cls: 'em-row' }, copyBtn, done),
      acts));

  refresh();
  return panel;
}

/** The whole screen. */
function renderEmbed(root, ctx) {
  root.textContent = '';
  put(root,
    h('header', { cls: 'bl-head' },
      h('h1', { cls: 'display', text: t('em.title') }),
      h('p', { cls: 'lede', text: t('em.lede', { who: ctx.persona }) })));

  // The one thing about this that nobody guesses right, said before the
  // controls rather than in a footnote under them.
  const steam = h('article', { cls: 'panel p-em-steam' },
    h('div', { cls: 'panel-bar' }, h('span', { text: t('em.steam_bar') })),
    h('div', { cls: 'panel-body' },
      h('p', { cls: 'note', html: t('em.steam_body') }),
      h('ol', { cls: 'em-steps' },
        h('li', { text: t('em.step_1') }),
        h('li', { text: t('em.step_2') }),
        h('li', { text: t('em.step_3') }))));

  const grid = h('section', { cls: 'grid em-grid' });
  put(grid, steam);
  for (const kind of ['bars', 'badge', 'banner', 'text']) {
    grid.append(emSection(kind, ctx));
  }
  root.append(grid);
}
