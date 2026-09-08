(function () {
  'use strict';

  window.FranchiseExclusives.register('yakuza', {
    mount({ hero }) {
      const scene = document.createElement('div');
      scene.className = 'fxyk-scene';
      scene.setAttribute('aria-hidden', 'true');
      scene.innerHTML =
        '<div class="fxyk-sky"><i></i><i></i><i></i><i></i><i></i></div>' +
        '<div class="fxyk-tower fxyk-tower-a"><i></i><i></i><i></i><i></i><i></i><i></i></div>' +
        '<div class="fxyk-tower fxyk-tower-b"><i></i><i></i><i></i><i></i><i></i></div>' +
        '<div class="fxyk-road"><i></i><i></i><i></i><i></i><i></i><i></i></div>' +
        '<div class="fxyk-gate"><span>天下一通り</span><b>神室町</b></div>' +
        '<div class="fxyk-sign fxyk-sign-a"><small>24時間</small><b>龍</b></div>' +
        '<div class="fxyk-sign fxyk-sign-b"><small>KARAOKE</small><b>カラオケ</b></div>' +
        '<div class="fxyk-sign fxyk-sign-c"><small>CLUB</small><b>セレナ</b></div>' +
        '<div class="fxyk-sign fxyk-sign-d"><small>ARCADE</small><b>劇場前</b></div>' +
        '<div class="fxyk-kanji">龍</div>' +
        '<div class="fxyk-district"><i></i><span>KAMUROCHO</span><b>01:47</b></div>' +
        '<div class="fxyk-heat"><span>HEAT</span><div><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div>' +
        '<div class="fxyk-rain"></div><div class="fxyk-splash"></div>';

      const rain = scene.querySelector('.fxyk-rain');
      for (let i = 0; i < 42; i++) {
        const drop = document.createElement('i');
        drop.style.setProperty('--n', String(i));
        drop.style.setProperty('--x', `${(i * 37 + 11) % 101}%`);
        drop.style.setProperty('--delay', `${-((i * 17) % 29) / 10}s`);
        drop.style.setProperty('--speed', `${0.75 + (i % 7) * 0.11}s`);
        drop.style.setProperty('--alpha', String(0.22 + (i % 5) * 0.09));
        rain.append(drop);
      }
      hero.append(scene);

      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const district = scene.querySelector('.fxyk-district span');
      const clock = scene.querySelector('.fxyk-district b');
      const places = ['KAMUROCHO', 'SOTENBORI', 'Isezaki Ijincho', 'HONOLULU'];
      let place = 0;
      let minutes = 107;
      let timer = 0;

      if (!reduced) {
        timer = window.setInterval(() => {
          place = (place + 1) % places.length;
          minutes += 7;
          district.textContent = places[place];
          clock.textContent = `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
          scene.dataset.shift = String(place);
        }, 2400);
      }

      const move = (event) => {
        const box = hero.getBoundingClientRect();
        const x = ((event.clientX - box.left) / box.width - 0.5) * 2;
        const y = ((event.clientY - box.top) / box.height - 0.5) * 2;
        hero.style.setProperty('--fxyk-art-x', `${x * -7}px`);
        hero.style.setProperty('--fxyk-art-y', `${y * -4}px`);
        hero.style.setProperty('--fxyk-near-x', `${x * 18}px`);
        hero.style.setProperty('--fxyk-near-y', `${y * 7}px`);
        hero.style.setProperty('--fxyk-far-x', `${x * -4}px`);
        hero.style.setProperty('--fxyk-far-y', `${y * -2}px`);
        hero.style.setProperty('--fxyk-dragon-x', `${x * -10}px`);
        hero.style.setProperty('--fxyk-dragon-y', `${y * -5}px`);
      };
      if (!reduced) hero.addEventListener('pointermove', move);

      return () => {
        window.clearInterval(timer);
        hero.removeEventListener('pointermove', move);
        for (const name of ['--fxyk-art-x', '--fxyk-art-y', '--fxyk-near-x', '--fxyk-near-y',
          '--fxyk-far-x', '--fxyk-far-y', '--fxyk-dragon-x', '--fxyk-dragon-y']) {
          hero.style.removeProperty(name);
        }
      };
    },

    ready({ root }) {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const venues = [...root.querySelectorAll('.fxyk-venue')];
      venues.forEach((venue, index) => {
        venue.style.setProperty('--venue-delay', `${(index % 7) * -0.37}s`);
      });
    },
  });
}());
