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
      const meter = scene.querySelector('.fxst-meter');
      let timer = 0;
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        timer = window.setInterval(() => {
          meter.style.setProperty('--signal', String(3 + Math.floor(Math.random() * 15)));
        }, 420);
      }
      return () => window.clearInterval(timer);
    },
  });
}());
