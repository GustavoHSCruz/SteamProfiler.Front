(function () {
  'use strict';
  window.FranchiseExclusives.register('stalker', {
    mount({ hero }) {
      const scene = document.createElement('div');
      scene.className = 'fxst-scene';
      scene.setAttribute('aria-hidden', 'true');
      scene.innerHTML = '<div class="fxst-anomaly"><i></i><i></i><i></i></div><div class="fxst-rad"><b>☢</b><span>0.42 μSv/h</span></div>' +
        '<div class="fxst-coord">51°23′22″N<br>30°05′59″E</div><div class="fxst-meter">' +
        Array.from({ length: 18 }, () => '<i></i>').join('') + '</div><div class="fxst-noise"></div>';
      hero.append(scene);
      const noise = scene.querySelector('.fxst-noise');
      let noiseTimer = 0;
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const crackle = () => {
          noise.style.setProperty('--noise-x', `${Math.floor(Math.random() * 146)}px`);
          noise.style.setProperty('--noise-y', `${Math.floor(Math.random() * 131)}px`);
          noise.style.setProperty('--noise-alpha', (0.09 + Math.random() * 0.17).toFixed(2));
          noise.style.setProperty('--burst-top', `${8 + Math.floor(Math.random() * 84)}%`);
          noise.style.setProperty('--burst-height', `${1 + Math.floor(Math.random() * 6)}px`);
          noiseTimer = window.setTimeout(crackle, 45 + Math.floor(Math.random() * 135));
        };
        crackle();
      }
      return () => window.clearTimeout(noiseTimer);
    },
  });
}());
