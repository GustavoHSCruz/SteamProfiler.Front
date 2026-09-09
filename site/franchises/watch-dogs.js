/* WATCH DOGS: an operating system stretched over three cities. */
(function () {
  'use strict';

  const make = (tag, cls, text) => {
    const item = document.createElement(tag);
    if (cls) item.className = cls;
    if (text != null) item.textContent = text;
    return item;
  };

  const LOCATIONS = ['WACKER DRIVE', 'THE LOOP', 'OAKLAND PORT', 'CAMDEN HIGH ST', 'BLUME CAMPUS'];

  window.FranchiseExclusives.register('watch-dogs', {
    mount({ hero }) {
      const title = hero.querySelector('.fx-hero-name');
      if (title) title.dataset.copy = title.textContent;

      const scene = make('div', 'fxwd-scene');
      scene.setAttribute('aria-hidden', 'true');
      scene.innerHTML =
        '<div class="fxwd-city"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>' +
        '<div class="fxwd-perspective"></div>' +
        '<svg class="fxwd-links" viewBox="0 0 1000 620" preserveAspectRatio="none">' +
          '<path d="M70 420 L230 300 L410 390 L590 225 L770 335 L940 195"/>' +
          '<path d="M230 300 L330 150 L590 225 L690 95 M410 390 L520 520 L770 335 L900 500"/>' +
        '</svg>' +
        '<div class="fxwd-target fxwd-target-a"><i></i><b>CAM_014</b><span>OPTICAL NODE</span></div>' +
        '<div class="fxwd-target fxwd-target-b"><i></i><b>GRID_31</b><span>TRAFFIC CONTROL</span></div>' +
        '<div class="fxwd-target fxwd-target-c"><i></i><b>BLM_404</b><span>PRIVATE NETWORK</span></div>' +
        '<div class="fxwd-target fxwd-target-d"><i></i><b>PWR_09</b><span>POWER RELAY</span></div>' +
        '<div class="fxwd-profile"><small>ctOS PROFILER // LIVE</small><b>AIDEN PEARCE</b><span>VIGILANTE</span><dl>' +
          '<div><dt>THREAT</dt><dd>CRITICAL</dd></div><div><dt>ACCESS</dt><dd>ROOT</dd></div>' +
          '<div><dt>TRACE</dt><dd class="fxwd-trace">00%</dd></div></dl></div>' +
        '<div class="fxwd-status"><i></i><span class="fxwd-place">WACKER DRIVE</span><b>41.8781° N / 87.6298° W</b></div>' +
        '<div class="fxwd-breach"><span>NETWORK BREACH</span><b class="fxwd-percent">00</b><i></i></div>' +
        '<div class="fxwd-sweep"></div><div class="fxwd-noise"></div>';
      hero.append(scene);

      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const targets = [...scene.querySelectorAll('.fxwd-target')];
      const place = scene.querySelector('.fxwd-place');
      const percent = scene.querySelector('.fxwd-percent');
      const trace = scene.querySelector('.fxwd-trace');
      let active = 0;
      let value = 0;
      let timer = 0;

      const tick = () => {
        targets.forEach((target, index) => { target.dataset.on = index === active ? '1' : '0'; });
        place.textContent = LOCATIONS[active % LOCATIONS.length];
        value = (value + 13) % 101;
        percent.textContent = String(value).padStart(2, '0');
        trace.textContent = `${String((value * 7) % 100).padStart(2, '0')}%`;
        active = (active + 1) % targets.length;
      };
      tick();
      if (!reduced) timer = window.setInterval(tick, 1450);

      const move = (event) => {
        const box = hero.getBoundingClientRect();
        const x = (event.clientX - box.left) / box.width - .5;
        const y = (event.clientY - box.top) / box.height - .5;
        hero.style.setProperty('--fxwd-x', `${x * 22}px`);
        hero.style.setProperty('--fxwd-y', `${y * 14}px`);
        hero.style.setProperty('--fxwd-rx', `${50 + x * 18}%`);
        hero.style.setProperty('--fxwd-ry', `${48 + y * 18}%`);
      };
      if (!reduced) hero.addEventListener('pointermove', move);

      return () => {
        window.clearInterval(timer);
        hero.removeEventListener('pointermove', move);
        for (const key of ['--fxwd-x', '--fxwd-y', '--fxwd-rx', '--fxwd-ry']) hero.style.removeProperty(key);
      };
    },

    ready({ root, fr, rows, ctx, stand }) {
      const host = root.querySelector('.fx-sig');
      if (!host) return;
      host.textContent = '';

      const owned = (app) => !stand || stand.mine.has(app.id) || stand.idle.has(app.id);
      const bar = make('div', 'panel-bar fxwd-panel-bar');
      bar.append(make('span', '', 'ctOS // CITY OPERATING SYSTEM'),
        make('b', '', `${stand ? fr.apps.filter(owned).length : fr.apps.length} / ${fr.apps.length} NODES`));

      const consoleBox = make('div', 'fx-sig-body fxwd-console');
      const head = make('div', 'fxwd-console-head');
      head.innerHTML = '<span><i></i>SYSTEM ONLINE</span><span>ENCRYPTION // AES-256</span><b>ADMIN ACCESS</b>';

      const graph = make('div', 'fxwd-graph');
      graph.innerHTML =
        '<svg viewBox="0 0 1000 430" preserveAspectRatio="none" aria-hidden="true">' +
          '<path class="fxwd-wire" d="M130 230 C260 70 350 70 500 190"/>' +
          '<path class="fxwd-wire" d="M500 190 C650 50 770 75 875 205"/>' +
          '<path class="fxwd-wire" d="M130 230 C320 410 690 400 875 205"/>' +
          '<path class="fxwd-packet fxwd-packet-a" d="M130 230 C260 70 350 70 500 190"/>' +
          '<path class="fxwd-packet fxwd-packet-b" d="M500 190 C650 50 770 75 875 205"/>' +
          '<path class="fxwd-packet fxwd-packet-c" d="M130 230 C320 410 690 400 875 205"/>' +
        '</svg>' +
        '<div class="fxwd-core"><i></i><b>ctOS</b><span>ROOT</span></div>';

      const cities = ['CHICAGO', 'SAN FRANCISCO', 'LONDON'];
      const nodeClasses = ['fxwd-game-a', 'fxwd-game-b', 'fxwd-game-c'];
      const readout = make('output', 'fxwd-readout');
      readout.setAttribute('aria-live', 'polite');
      const nodes = [];

      const describe = (app, index) => {
        const row = rows[String(app.id)] || {};
        const mine = stand && stand.mine.get(app.id);
        const signal = mine ? `${Number(mine.hours || 0).toLocaleString()} H CONNECTED`
          : typeof row.players === 'number' ? `${row.players.toLocaleString()} LIVE CONNECTIONS` : 'NODE READY';
        readout.textContent = `${cities[index]} // ${row.name || app.name} // ${signal}`;
      };

      fr.apps.forEach((app, index) => {
        const row = rows[String(app.id)] || {};
        const link = make('a', `fxwd-game-node ${nodeClasses[index]}`);
        link.href = ctx.query && ctx.owns.has(app.id) ? `/u/${ctx.query}/${app.id}` : `/g/${app.id}`;
        link.dataset.on = owned(app) ? '1' : '0';
        link.append(make('small', '', `NODE_0${index + 1} // ${cities[index]}`),
          make('b', '', row.name || app.name), make('span', '', String(app.year)), make('i'));
        link.addEventListener('pointerenter', () => describe(app, index));
        link.addEventListener('focus', () => describe(app, index));
        graph.append(link);
        nodes.push(link);
      });
      describe(fr.apps[0], 0);

      const breach = make('button', 'fxwd-breach-all', 'EXECUTE NETWORK BREACH');
      breach.type = 'button';
      breach.addEventListener('click', () => {
        consoleBox.dataset.breach = '1';
        nodes.forEach((node) => { node.dataset.hit = '1'; });
        readout.textContent = 'ROOT ACCESS // ALL CITY NODES COMPROMISED';
        window.setTimeout(() => {
          delete consoleBox.dataset.breach;
          nodes.forEach((node) => { delete node.dataset.hit; });
        }, 1800);
      });

      const foot = make('div', 'fxwd-console-foot');
      foot.append(readout, breach);
      consoleBox.append(head, graph, foot);
      host.append(bar, consoleBox);
    },
  });
}());
