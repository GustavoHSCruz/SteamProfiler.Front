(function () {
  'use strict';
  window.FranchiseExclusives.register('dark-souls', {
    mount({ hero }) {
      const scene = document.createElement('div');
      scene.className = 'fxds-scene';
      scene.setAttribute('aria-hidden', 'true');
      const embers = Array.from({ length: 16 }, (_, i) => `<i style="--n:${i}"></i>`).join('');
      scene.innerHTML = `<div class="fxds-eclipse"></div><div class="fxds-greatsword"><i></i><b></b></div>` +
        `<div class="fxds-embers">${embers}</div><div class="fxds-oath">ASH SEEKETH EMBERS</div>`;
      hero.append(scene);
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
      const move = (event) => {
        const box = hero.getBoundingClientRect();
        hero.style.setProperty('--fxds-x', `${event.clientX - box.left}px`);
        hero.style.setProperty('--fxds-y', `${event.clientY - box.top}px`);
      };
      hero.addEventListener('pointermove', move);
      return () => hero.removeEventListener('pointermove', move);
    },
  });
}());
