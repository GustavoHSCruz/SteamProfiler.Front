(function () {
  'use strict';
  window.FranchiseExclusives.register('portal', {
    mount({ hero }) {
      const scene = document.createElement('div');
      scene.className = 'fxpt-scene';
      scene.setAttribute('aria-hidden', 'true');
      scene.innerHTML = '<div class="fxpt-portal fxpt-orange"></div><div class="fxpt-portal fxpt-blue"></div>' +
        '<div class="fxpt-cube"><i></i><i></i><i></i></div><div class="fxpt-route"><i></i><i></i><i></i></div>' +
        '<div class="fxpt-chamber"><b>19</b><span>TEST CHAMBER</span></div>';
      hero.append(scene);
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
      const move = (event) => {
        const box = hero.getBoundingClientRect();
        hero.style.setProperty('--fxpt-x', String((event.clientX - box.left) / box.width - .5));
        hero.style.setProperty('--fxpt-y', String((event.clientY - box.top) / box.height - .5));
      };
      hero.addEventListener('pointermove', move);
      return () => hero.removeEventListener('pointermove', move);
    },
  });
}());
