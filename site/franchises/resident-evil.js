(function () {
  'use strict';
  window.FranchiseExclusives.register('resident-evil', {
    mount({ hero }) {
      const scene = document.createElement('div');
      scene.className = 'fxre-scene';
      scene.setAttribute('aria-hidden', 'true');
      scene.innerHTML = '<div class="fxre-door"><i></i><b>001</b></div><div class="fxre-health"><span>FINE</span>' +
        '<div><i></i><i></i><i></i><i></i><i></i><i></i></div></div>' +
        '<div class="fxre-ribbon">INK RIBBON <b>× 03</b></div><div class="fxre-alert"></div>';
      hero.append(scene);
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
      const move = (event) => {
        const box = hero.getBoundingClientRect();
        hero.style.setProperty('--fxre-x', `${event.clientX - box.left}px`);
        hero.style.setProperty('--fxre-y', `${event.clientY - box.top}px`);
      };
      hero.addEventListener('pointermove', move);
      return () => hero.removeEventListener('pointermove', move);
    },
  });
}());
