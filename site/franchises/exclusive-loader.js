/* One tiny dispatcher for deliberately separate franchise experiences.
 *
 * A franchise page downloads only its own stylesheet and script. The theme
 * files do not import one another and every selector is rooted in the slug,
 * so changing a radar in Counter-Strike cannot move a portal or relight a
 * Dark Souls bonfire. */
(function () {
  'use strict';

  const themes = new Map();
  const requests = new Map();

  function register(slug, theme) {
    themes.set(slug, theme);
  }

  function asset(tag, attrs) {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
    document.head.append(node);
    return new Promise((resolve) => {
      node.addEventListener('load', resolve, { once: true });
      node.addEventListener('error', resolve, { once: true });
    });
  }

  async function load(slug) {
    if (themes.has(slug)) return themes.get(slug);
    if (!requests.has(slug)) {
      const base = `/franchises/${slug}`;
      requests.set(slug, Promise.all([
        asset('link', { rel: 'stylesheet', href: `${base}.css`, 'data-fx-exclusive': slug }),
        asset('script', { src: `${base}.js`, defer: '', 'data-fx-exclusive': slug }),
      ]));
    }
    await requests.get(slug);
    return themes.get(slug) || null;
  }

  window.FranchiseExclusives = { register, load };
}());
