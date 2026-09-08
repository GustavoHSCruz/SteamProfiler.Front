(function () {
  'use strict';
  window.FranchiseExclusives.register('arma', {
    mount({ hero }) {
      const scene = document.createElement('div');
      scene.className = 'fxar-scene';
      scene.setAttribute('aria-hidden', 'true');
      scene.innerHTML = '<div class="fxar-topo"><i></i><i></i><i></i></div><div class="fxar-target"><i></i><i></i><b></b></div>' +
        '<div class="fxar-north">N<i></i></div><div class="fxar-coords">GRID 035 118</div>' +
        '<div class="fxar-order">OPERATION<br><b>REFORGER</b><span>DECLASSIFIED</span></div>';
      hero.append(scene);
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
      const coords = scene.querySelector('.fxar-coords');
      const move = (event) => {
        const box = hero.getBoundingClientRect();
        const x = Math.max(0, Math.min(999, Math.round(((event.clientX - box.left) / box.width) * 999)));
        const y = Math.max(0, Math.min(999, Math.round(((event.clientY - box.top) / box.height) * 999)));
        coords.textContent = `GRID ${String(x).padStart(3, '0')} ${String(y).padStart(3, '0')}`;
        hero.style.setProperty('--fxar-x', `${event.clientX - box.left}px`);
        hero.style.setProperty('--fxar-y', `${event.clientY - box.top}px`);
      };
      hero.addEventListener('pointermove', move);
      return () => hero.removeEventListener('pointermove', move);
    },
  });
}());
