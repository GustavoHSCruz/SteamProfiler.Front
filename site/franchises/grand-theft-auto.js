(function () {
  'use strict';
  window.FranchiseExclusives.register('grand-theft-auto', {
    mount({ hero }) {
      const scene = document.createElement('div');
      scene.className = 'fxgta-scene';
      scene.setAttribute('aria-hidden', 'true');
      scene.innerHTML = '<div class="fxgta-sun"></div><div class="fxgta-city">' +
        '<i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>' +
        '<div class="fxgta-stars">★★★★★</div><div class="fxgta-radio"><span>FLASH FM</span><b>98.7</b></div>';
      hero.append(scene);
      const station = scene.querySelector('.fxgta-radio span');
      const stations = ['FLASH FM', 'RADIO LOS SANTOS', 'K-DST', 'NON STOP POP'];
      let index = 0;
      let timer = 0;
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        timer = window.setInterval(() => {
          index = (index + 1) % stations.length;
          station.textContent = stations[index];
        }, 2200);
      }
      return () => window.clearInterval(timer);
    },
  });
}());
