/* WATCH DOGS: the city seen through ctOS.
 *
 * The series' one idea is that everybody around you is already a record, and
 * that a phone turns the street into a list of them. So the hero is not key
 * art with a name over it: it is a surveillance grid with people standing in
 * it, and the profiler walking from one to the next, resolving a stranger
 * into a name, a job, an income and one line nobody should know.
 *
 * The profiles below are invented on purpose and read as invented - the joke
 * the games make is that the trivial detail is the invasive part, and a real
 * person's would not be funny. */
(function () {
  'use strict';

  /* Deterministic, so the same citizen is standing in the same place on every
     visit. The coordinates sit in the lower half on purpose: that is where the
     street plane is, and a pedestrian above the horizon is a pedestrian in the
     sky. A crowd that reshuffles on reload is a screensaver; this one is a
     city block that happens to be under a scanner. */
  const CITIZENS = [
    { x: 14, y: 74, name: 'M. ALVAREZ', job: 'DOCK DISPATCHER', note: 'SELLS THE SAME BIKE TWICE A YEAR', money: '$41,200' },
    { x: 31, y: 62, name: 'J. OKONKWO', job: 'PAEDIATRIC NURSE', note: 'HAS NOT DELETED AN EMAIL SINCE 2011', money: '$67,900' },
    { x: 49, y: 80, name: 'R. LINDQVIST', job: 'CLAIMS ADJUSTER', note: 'FOUR HUNDRED HOURS IN ONE FARMING GAME', money: '$58,400' },
    { x: 66, y: 58, name: 'D. PARK', job: 'NIGHT SECURITY', note: 'NAMED THE ROUTER AFTER AN EX', money: '$33,750' },
    { x: 82, y: 71, name: 'T. BOUCHARD', job: 'PENSIONED, 31 YEARS TRANSIT', note: 'STILL PAYS FOR A FAX LINE', money: '$29,110' },
  ];

  window.FranchiseExclusives.register('watch-dogs', {
    mount({ hero }) {
      const scene = document.createElement('div');
      scene.className = 'fxwd-scene';
      scene.setAttribute('aria-hidden', 'true');

      const grid = '<div class="fxwd-grid"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>';
      const skyline = `<div class="fxwd-skyline">${
        Array.from({ length: 14 }, (_, i) =>
          `<i style="--h:${28 + ((i * 37) % 52)}%;--w:${4 + (i % 3)}vw"></i>`).join('')
      }</div>`;

      // One node per citizen, positioned by the table above. The card is a
      // sibling rather than a child so it can sit outside the node's own
      // clipping and still travel with it.
      const nodes = CITIZENS.map((who, i) => `
        <div class="fxwd-node" data-n="${i}" style="--x:${who.x}%;--y:${who.y}%">
          <i class="fxwd-ping"></i>
          <i class="fxwd-body"></i>
          <div class="fxwd-card">
            <b>${who.name}</b>
            <span>${who.job}</span>
            <em>${who.note}</em>
            <u>${who.money}</u>
          </div>
        </div>`).join('');

      const feed = `<div class="fxwd-feed">${
        ['CTOS NODE 0x4A ONLINE', 'JUNCTION 14 SIGNAL HELD', 'CAMERA 0x117 PIVOTED',
         'BLUME UPLINK RESOLVED', 'PROFILER PASS 3 OF 3'].map((line, i) =>
          `<p style="--i:${i}"><i></i>${line}</p>`).join('')
      }</div>`;

      const hack = '<div class="fxwd-hack"><svg viewBox="0 0 120 120">'
        + '<circle class="fxwd-ring-back" cx="60" cy="60" r="52"></circle>'
        + '<circle class="fxwd-ring" cx="60" cy="60" r="52"></circle></svg>'
        + '<b class="fxwd-pct">00</b><span>PROFILING</span></div>';

      scene.innerHTML = grid + skyline + '<div class="fxwd-mesh"></div>' + nodes
        + feed + hack + '<div class="fxwd-glitch"></div>';
      hero.append(scene);

      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const nodeEls = [...scene.querySelectorAll('.fxwd-node')];
      const pct = scene.querySelector('.fxwd-pct');

      // Still: the profiler stops on one person, resolved, and nothing moves.
      // A shortened sweep would still be a sweep, and the request was for none.
      if (reduced) {
        nodeEls[1].dataset.on = '1';
        pct.textContent = '100';
        return null;
      }

      let at = 0;
      let count = 0;
      let step = 0;
      let ticker = 0;

      const walk = () => {
        for (const node of nodeEls) delete node.dataset.on;
        nodeEls[at].dataset.on = '1';
        at = (at + 1) % nodeEls.length;
        count = 0;
        // The number climbs to a hundred over the time the card is up, so the
        // reading and the arrival are the same event rather than two.
        window.clearInterval(step);
        step = window.setInterval(() => {
          count = Math.min(100, count + 7);
          pct.textContent = String(count).padStart(2, '0');
          if (count >= 100) window.clearInterval(step);
        }, 130);
      };

      walk();
      ticker = window.setInterval(walk, 2600);

      return () => {
        window.clearInterval(ticker);
        window.clearInterval(step);
      };
    },
  });
}());
