(function () {
  'use strict';
  window.FranchiseExclusives.register('counter-strike', {
    mount({ hero }) {
      const scene = document.createElement('div');
      scene.className = 'fxcs-scene';
      scene.setAttribute('aria-hidden', 'true');
      scene.innerHTML = '<div class="fxcs-radar"><i></i><i></i><i></i><i></i></div>' +
        '<div class="fxcs-score"><b>12</b><span class="fxcs-clock">0:45</span><b>09</b></div>' +
        '<div class="fxcs-site">A</div><div class="fxcs-cross"><i></i><i></i></div>';
      hero.append(scene);
      const clock = scene.querySelector('.fxcs-clock');
      let seconds = 45;
      let timer = 0;
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        timer = window.setInterval(() => {
          seconds = seconds > 31 ? seconds - 1 : 45;
          clock.textContent = `0:${String(seconds).padStart(2, '0')}`;
        }, 1000);
      }
      return () => window.clearInterval(timer);
    },
  });
}());
