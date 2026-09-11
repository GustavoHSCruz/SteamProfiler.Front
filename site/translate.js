/* steamprofiler.org - the translation page.

   Two ranked lists drawn out of COVERAGE, which is a file and not a request:
   SteamProfiler.i18n's build.py writes it here beside the dictionaries, so
   this page costs the reader one more script and the server nothing at all.

   The bars are the argument the page is making. A language at 100% says the
   work is done and the next language is where the work is; one at 60% says
   the site is already readable in it and two fifths of it is still sitting in
   English, which is the sentence that gets somebody to open the repository.
   Neither of those is legible as a pair of numbers in a row.

   Both lists are `.rows` from style.css - name, meter, figure - because that
   is what they are, and a third bar of this site's own invention would only
   have been the same thing drawn slightly differently. */

/** One language: how much of English it has, and what is left. */
function langRow(lang) {
  const total = COVERAGE.keys;
  const left = total - lang.done;
  const pct = total ? Math.round((lang.done / total) * 100) : 0;

  const figure = h('span', { cls: 'row-fig', text: `${pct}%` });
  figure.append(h('em', {
    text: lang.code === 'en' ? t('tr.source')
      : left ? t('tr.left', { n: num(left) })
        : t('tr.whole'),
  }));

  return h('div', {
    cls: 'row',
    // The source language leads the list and is the one everything else is
    // measured against, so it is the row that reads at full strength.
    data: lang.code === 'en' ? { lead: '1' } : {},
  },
  h('span', {
    cls: 'row-name',
    text: `${LANG_NAMES[lang.code] || lang.code.toUpperCase()} · ${t(`lang.${lang.code}`)}`,
    attr: { title: t('tr.count', { done: num(lang.done), total: num(total) }) },
  }),
  fillBar('meter', pct),
  figure);
}

/** One group of keys, as a share of the whole site rather than of the largest
 *  group. Against the largest, every bar but one is a fraction of something
 *  the reader cannot see, and the top bar is always full no matter how much of
 *  the site it actually is - which is the one number this list exists to
 *  give. The groups arrive heaviest first, with the residual pinned last. */
function weightRow(group, total) {
  const share = total ? (group.keys / total) * 100 : 0;
  const figure = h('span', { cls: 'row-fig', text: num(group.keys) });
  figure.append(h('em', { text: `${Math.round(share)}%` }));
  return h('div', { cls: 'row' },
    h('span', { cls: 'row-name', text: t(`tr.grp_${group.id}`) }),
    fillBar('meter', share),
    figure);
}

applyStatic();
langSwitchInto(el('langs'));

put(el('langs-list'), ...COVERAGE.languages.map(langRow));

put(el('weights'), ...COVERAGE.groups.map((g) => weightRow(g, COVERAGE.keys)));

el('embed-note').textContent = t('tr.embed_note', { n: num(COVERAGE.embed.words) });
