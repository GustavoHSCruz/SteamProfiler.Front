/* steamprofiler.org - the generator, at /u/<perfil>/embed.

   Every other screen on this site is a page about a library. This one makes
   something that leaves it: a chart, a strip, a badge, two profiles against
   each other, a whole piece of artwork for a Steam profile, or the same chart
   as plain text for the places that take no picture at all. The api draws all
   of them (embed.py), so this file is the controls, the preview, and the four
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
   trip. That also means the PNG is exactly the picture on the screen.

   One output has a third answer, and it is the reason emOwn() exists at the
   bottom of this file. The artwork can carry a picture the reader chose off
   their own disk, and that picture never leaves the tab: it is decoded here,
   drawn onto a canvas at the size of the artwork, and written into a slot the
   api left empty. Nothing is uploaded, so there is no address that could serve
   it back - which is why that one case has no dynamic answer at all, only the
   download. */

const EM_PATHS = {
  bars: 'bars.svg', banner: 'banner.svg', badge: 'badge.svg', text: 'bars.txt',
  versus: 'versus.svg', artwork: 'artwork.svg',
};

/* Every figure a profile can be asked for, which is the same menu in three
   places now: the boxes of a banner, the rows of a versus card and the figures
   on an artwork. One list, because they are one question. */
const EM_METRICS = ['none', 'hours', 'games', 'played', 'never', 'level', 'top',
  'linux', 'deck', 'achievements', 'badges', 'since', 'per_day', 'now'];

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
    { name: 'facts', slots: ['hours', 'games', 'played', 'none'], pick: EM_METRICS },
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
  /* Two profiles. The only output on this page that needs a second person, so
     the only one whose first control is a name and not a shape - and until it
     has one there is nothing to draw, which is what `needs` below is for. */
  versus: [
    { name: 'vs', free: true, value: '', ph: 'em.ph_rival', size: 64 },
    // Six rows against the banner's four boxes: this is a card and not a
    // strip, and the height it needs is however many rows were asked for.
    {
      name: 'rows',
      slots: ['hours', 'games', 'played', 'none', 'none', 'none'],
      pick: EM_METRICS,
    },
    { name: 'games', range: [0, 10], value: 5 },
    { name: 'w', range: [360, 900], step: 20, value: 640 },
    { name: 'theme', pick: ['dark', 'light', 'steam'] },
  ],
  /* The artwork. Everything here is a choice about one large picture, and the
     three controls that only make sense with a backdrop behind it appear only
     when there is one - see `when` in emSection(). */
  artwork: [
    // `words` is the corner of the dictionary these values are read from.
    // Three of them - wide, square, flat - are already the name of something
    // on another panel, and one shared key would have quietly renamed a
    // banner size or a badge style from over here.
    { name: 'preset', pick: ['wide', 'back', 'square', 'tall'], words: 'a_' },
    { name: 'bg', pick: ['back', 'face', 'flat', 'own'], words: 'b_' },
    // The reader's own picture. Never sent anywhere: see emOwn().
    { name: 'own', file: true, when: (s) => s.bg === 'own' },
    { name: 'fade', range: [0, 100], step: 5, value: 55, when: (s) => s.bg !== 'flat' },
    { name: 'blur', range: [0, 40], value: 0, when: (s) => s.bg !== 'flat' },
    { name: 'theme', pick: ['dark', 'light', 'steam'] },
    {
      name: 'facts',
      slots: ['hours', 'games', 'played', 'level', 'none', 'none'],
      pick: EM_METRICS,
    },
    { name: 'games', range: [0, 12], value: 4 },
    // Twenty-five characters, which is what embed.py will keep of it anyway.
    // The browser stopping at the same number is what keeps the field from
    // promising something the picture will not draw.
    //
    // Empty no longer means unsigned: the card is signed with the name on the
    // profile unless this says otherwise, and `none` is how somebody asks for
    // a blank corner. So the placeholder has to say what leaving it alone does.
    { name: 'sign', free: true, value: '', ph: 'em.ph_sign', size: 25 },
    { name: 'face', flag: true, value: true },
    { name: 'round', flag: true, value: false },
  ],
};

/* The control an output cannot be drawn without. Only the versus card has one:
   a card about two people with one name on it is not a card yet. */
const EM_NEEDS = { versus: 'vs' };

/* An avatar is 184 pixels across and an artwork is up to 1920 of them, so the
   avatar backdrop arrives blurred and every other backdrop does not. Changing
   the backdrop moves the slider to what that backdrop wants; dragging it after
   that is the reader's business and nothing moves it again. */
const EM_BLUR = { face: 22 };

/* The href embed.py writes where a backdrop of the reader's own would go. The
   api draws the artwork with this in it and nothing behind it; the browser is
   the only place that ever has a picture to put there. Kept in step with
   OWN_SLOT in embed.py by hand, which is safe because a mismatch is a picture
   that does not appear rather than a picture that leaks. */
const EM_OWN_SLOT = '#own';

/** The address of one output, with everything the controls say on it. */
function emUrl(kind, state, query) {
  const q = new URLSearchParams({ q: query, lang: LANG });
  for (const [k, v] of Object.entries(state)) {
    // An empty field is not a value of nothing, it is the absence of one, and
    // the api decides what stands in its place - which is not the same answer
    // for every field. An empty `label` falls back to the metric's own word; an
    // empty `sign` falls back to the name on the profile. Either way what
    // travels is silence, not an empty string.
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

/** One file, as a picture the reader chose, at the size of the artwork.

 *  This is the whole of what "processed in the browser" means, and it is worth
 *  being exact about: the file is decoded here, drawn once onto a canvas the
 *  size of the artwork, and handed back as a data URI. It is never read into a
 *  request, never named in a URL, and never reaches the api - which is also
 *  why the artwork it goes into can only be downloaded and never linked. There
 *  is no address that could serve a picture nobody was given.
 *
 *  createImageBitmap() and not an <img>: the file has no address of its own,
 *  and the site's Content-Security-Policy allows `data:` under img-src but not
 *  `blob:`, so the two ways of giving an <img> a local file are one that costs
 *  a megabyte of base64 and one the browser refuses. This decodes the bytes
 *  without either. */
async function emOwn(file, box) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = box.w;
  canvas.height = box.h;
  const pen = canvas.getContext('2d');
  // Cover, not fit: an artwork with two grey bars down the side of it is not
  // an artwork. Whatever does not fit the shape is cropped evenly off both
  // ends, which is what every other picture on this page does with a capsule.
  const scale = Math.max(box.w / bitmap.width, box.h / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  pen.drawImage(bitmap, (box.w - w) / 2, (box.h - h) / 2, w, h);
  bitmap.close?.();
  // JPEG and not PNG: a photograph as a PNG inside an SVG is fifteen megabytes
  // of base64, and the artwork has to survive being turned into one more
  // canvas on the way to the download.
  return canvas.toDataURL('image/jpeg', 0.86);
}

/* What a browser will decode, and how big a file is allowed to be before this
   stops being a good idea. Twelve megabytes is a photograph off a phone; past
   that the decode is what stalls the tab, not the drawing. */
const EM_OWN_TYPES = /^image\/(png|jpeg|webp|gif|avif|bmp)$/;
const EM_OWN_MAX = 12 * 1024 * 1024;

/** One output: its controls, its preview, and the block somebody copies. */
function emSection(kind, ctx) {
  const state = {};
  const fields = {};
  const shells = {};
  for (const c of EM_CONTROLS[kind]) {
    // Sliced, never shared: the table above is read once per page and a state
    // that held its array would write the next visitor's choices into it.
    if (c.slots) state[c.name] = c.slots.slice();
    else if (c.file) state[c.name] = '';
    else state[c.name] = c.value !== undefined ? c.value : (c.pick ? c.pick[0] : '');
  }
  let mode = 'live';
  let held = null;      // the bytes, once they have been fetched
  let size = null;
  let tab = 'md';
  let own = null;       // the reader's own picture. Only ever in this tab.
  // The same picture, decoded and drawn at the size of the artwork. Kept
  // because every control on the panel redraws the artwork, and decoding a
  // twelve megabyte photograph again to move a slider by five is what turns a
  // slider into a stall. Thrown away when either half of it changes.
  let ownAt = '';
  let ownUri = null;

  const preview = h('div', { cls: 'em-preview' });
  const shown = h('img', { cls: 'em-shot', attr: { alt: '' } });
  const text = h('pre', { cls: 'em-pre' });
  const weight = h('span', { cls: 'em-weight' });
  const out = h('pre', { cls: 'em-out' });
  const tabs = h('div', { cls: 'em-tabs' });
  const acts = h('div', { cls: 'em-acts' });
  const said = h('span', { cls: 'em-said' });
  const asked = h('p', { cls: 'em-asked' });

  /* The picture this one can only ever be downloaded as. True for the artwork
     the moment its backdrop is the reader's own, whether or not they have
     chosen a file yet: there is no address that could carry one. */
  const localOnly = () => kind === 'artwork' && state.bg === 'own';

  const link = () => (kind === 'versus' && state.vs
    ? `${location.origin}/u/${ctx.query}/vs/${encodeURIComponent(state.vs)}`
    : `${location.origin}/u/${ctx.query}`);
  const alt = t('em.alt', { who: ctx.persona });

  function fileName(ext) {
    const which = state.show || state.metric || state.preset
      || (kind === 'versus' ? 'vs' : '');
    return `steamprofiler-${kind}-${which}`.replace(/-$/, '') + `.${ext}`;
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
      out.textContent = emSnippets(src, alt, link(), size)[tab];
    }
    for (const b of tabs.children) b.dataset.on = b.dataset.tab === tab ? '1' : '';
    // A live text chart has one useful form and it is the address itself, so
    // the four ways of wrapping it only appear once there is a file to wrap.
    tabs.hidden = kind === 'text' && live;
    acts.hidden = live;
    // The block somebody copies is an address, and there is no address for a
    // picture that only exists here. So it goes, rather than printing one that
    // would draw a stranger's artwork with an empty hole in it.
    const nowhere = localOnly();
    out.hidden = nowhere;
    tabs.hidden = tabs.hidden || nowhere;
    copyRow.hidden = nowhere;
    said.textContent = nowhere ? t('em.own_note')
      : live ? t('em.live_note')
        : t('em.static_note', { date: shortDate(new Date().toISOString()) || '' });
  }

  /** Which controls are on the screen at all, for the outputs where that
   *  depends on another control. A blur slider next to a backdrop that is a
   *  flat colour is a slider that does nothing. */
  function shuffle() {
    for (const c of EM_CONTROLS[kind]) {
      if (c.when) shells[c.name].hidden = !c.when(state);
    }
    for (const b of modes.children) {
      b.disabled = localOnly() && b.dataset.which === 'live';
    }
  }

  async function refresh() {
    shuffle();
    // Nothing to draw until the one control this output cannot do without has
    // something in it. Said in the panel rather than left as an empty frame.
    const needs = EM_NEEDS[kind];
    if (needs && !state[needs]) {
      preview.hidden = true;
      asked.hidden = false;
      asked.textContent = t(`em.needs_${needs}`);
      out.hidden = true;
      return;
    }
    preview.hidden = false;
    asked.hidden = true;
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
      out.hidden = false;
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
      // The reader's own picture goes in here, after the file has arrived and
      // before anything is drawn from it - so the preview, the SVG download
      // and the PNG are all the same picture, and the api's copy of the file
      // never had it in the first place.
      if (own && size && held.includes(`href="${EM_OWN_SLOT}"`)) {
        const at = `${own.name}:${own.size}:${size.w}x${size.h}`;
        try {
          if (at !== ownAt) {
            ownUri = await emOwn(own, size);
            ownAt = at;
          }
          held = held.replace(`href="${EM_OWN_SLOT}"`, `href="${ownUri}"`);
        } catch {
          ownAt = '';
          ownUri = null;
          done.textContent = t('em.own_failed');
        }
      }
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
        field.append(h('option', {
          attr: { value }, text: t(`em.v_${c.words || ''}${value}`),
        }));
      }
      field.value = state[c.name];
      field.addEventListener('change', () => {
        state[c.name] = field.value;
        // Changing the backdrop moves the blur to what that backdrop wants.
        // See EM_BLUR: an avatar stretched across an artwork needs one and a
        // real background does not, and a reader should not have to know that.
        if (c.name === 'bg' && fields.blur) {
          state.blur = EM_BLUR[field.value] || 0;
          fields.blur.value = String(state.blur);
          fields.blur.dispatchEvent(new Event('input'));
        }
        // The dynamic answer stops existing the moment the backdrop is the
        // reader's own, so the panel is put back on the one that does.
        if (localOnly()) modes.querySelector('[data-which="still"]')?.click();
        refresh();
      });
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
    } else if (c.file) {
      // Its own binding, and not the shared `field`, because this one carries
      // a second element beside it and is appended here rather than below -
      // and a listener that closed over `field` would be reading whatever the
      // end of this branch left in it.
      const box = h('input', { attr: { type: 'file', accept: 'image/*' } });
      const chosen = h('span', { cls: 'em-file-said' });
      box.addEventListener('change', () => {
        const file = box.files && box.files[0];
        ownAt = '';
        ownUri = null;
        if (!file) {
          own = null;
          chosen.textContent = '';
          refresh();
          return;
        }
        // Refused here rather than after a decode that would fail anyway, so
        // what comes back is a sentence and not a broken preview.
        if (!EM_OWN_TYPES.test(file.type) || file.size > EM_OWN_MAX) {
          own = null;
          box.value = '';
          chosen.textContent = t('em.own_refused');
          refresh();
          return;
        }
        own = file;
        chosen.textContent = t('em.own_chosen', { name: file.name });
        refresh();
      });
      label.dataset.wide = '1';
      label.append(box, chosen);
      fields[c.name] = box;
    } else {
      field = h('input', {
        attr: {
          type: 'text', maxlength: String(c.size || 24),
          placeholder: t(c.ph || 'em.ph_label'),
        },
      });
      field.addEventListener('change', () => { state[c.name] = field.value; refresh(); });
    }
    if (field) {
      label.append(field);
      fields[c.name] = field;
    }
    shells[c.name] = label;
    rack.append(label);
  }

  /* ── Live or frozen ───────────────────────────────────────────── */
  const modes = h('div', { cls: 'em-modes' });
  for (const which of ['live', 'still']) {
    const b = h('button', {
      cls: 'em-mode', text: t(`em.mode_${which}`), attr: { type: 'button' },
      data: { on: which === mode ? '1' : '', which },
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
  const copyRow = h('div', { cls: 'em-row' }, copyBtn, done);

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
        // The artwork is already 1920 pixels across. Doubling that is a canvas
        // of eight megapixels for no gain: it is drawn at the size it will be
        // uploaded at, and only the small ones are drawn twice over.
        emDownload(await emPng(held, size, size.w >= 900 ? 1 : 2), fileName('png'));
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
      asked,
      preview,
      modes,
      said,
      tabs,
      out,
      copyRow,
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
  // The artwork first, because it is the answer to the panel directly above
  // it: that note says a Steam profile only takes an upload, and this is the
  // thing made to be uploaded. After it, the four half-width ones in pairs and
  // the text chart last, which is the order the grid packs without a hole.
  for (const kind of ['artwork', 'bars', 'badge', 'banner', 'versus', 'text']) {
    grid.append(emSection(kind, ctx));
  }
  root.append(grid);
}
