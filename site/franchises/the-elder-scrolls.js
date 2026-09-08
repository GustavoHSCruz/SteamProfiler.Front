(function () {
  'use strict';
  window.FranchiseExclusives.register('the-elder-scrolls', {
    mount({ hero }) {
      const scene = document.createElement('div');
      scene.className = 'fxtes-scene';
      scene.setAttribute('aria-hidden', 'true');
      const marks = Array.from({ length: 24 }, (_, i) => `<i style="--n:${i}"></i>`).join('');
      scene.innerHTML = `<div class="fxtes-seal">${marks}<b>V</b></div>` +
        '<div class="fxtes-compass"><span>W</span><b>N</b><span>E</span></div>' +
        '<div class="fxtes-rule"><i></i><b>THE EMPIRE ENDURES</b><i></i></div>';
      hero.append(scene);
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
      const move = (event) => {
        const box = hero.getBoundingClientRect();
        hero.style.setProperty('--fxtes-turn', `${((event.clientX - box.left) / box.width - .5) * 10}deg`);
      };
      hero.addEventListener('pointermove', move);
      return () => hero.removeEventListener('pointermove', move);
    },
  });
}());
