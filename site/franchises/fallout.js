(function () {
  'use strict';
  window.FranchiseExclusives.register('fallout', {
    mount({ hero }) {
      const scene = document.createElement('div');
      scene.className = 'fxfo-scene';
      scene.setAttribute('aria-hidden', 'true');
      scene.innerHTML = '<div class="fxfo-dial"><i></i><b>RAD</b><span>03.6</span></div>' +
        '<div class="fxfo-wave">' + Array.from({ length: 14 }, () => '<i></i>').join('') + '</div>' +
        '<div class="fxfo-status"><span>ROBCO INDUSTRIES</span><b>PLEASE STAND BY</b></div><div class="fxfo-scan"></div>';
      hero.append(scene);
      const status = scene.querySelector('.fxfo-status b');
      const messages = ['PLEASE STAND BY', 'VAULT-TEC ONLINE', 'DATA LINK ACTIVE'];
      let index = 0;
      let timer = 0;
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        timer = window.setInterval(() => {
          index = (index + 1) % messages.length;
          status.textContent = messages[index];
        }, 2600);
      }
      return () => window.clearInterval(timer);
    },
  });
}());
