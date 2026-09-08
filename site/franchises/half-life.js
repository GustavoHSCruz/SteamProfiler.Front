(function () {
  'use strict';
  window.FranchiseExclusives.register('half-life', {
    mount({ hero }) {
      const scene = document.createElement('div');
      scene.className = 'fxhl-scene';
      scene.setAttribute('aria-hidden', 'true');
      scene.innerHTML = '<div class="fxhl-reticle"><i></i><i></i><b>&lambda;</b></div>' +
        '<div class="fxhl-readout"><span>HEV // ONLINE</span><b>100</b><i>SUIT</i></div>' +
        '<div class="fxhl-sector">SECTOR C <b>03</b></div><div class="fxhl-scan"></div>';
      hero.append(scene);
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
      const move = (event) => {
        const box = hero.getBoundingClientRect();
        hero.style.setProperty('--fxhl-x', `${event.clientX - box.left}px`);
        hero.style.setProperty('--fxhl-y', `${event.clientY - box.top}px`);
      };
      hero.addEventListener('pointermove', move);
      return () => hero.removeEventListener('pointermove', move);
    },
  });
}());
