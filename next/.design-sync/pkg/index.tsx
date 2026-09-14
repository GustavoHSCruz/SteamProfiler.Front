/* The library the claude.ai/design project is built from. It writes no
   component of its own: every export below is the one the bench or Duo
   already renders, re-exported so one bundle can carry both.

   `Map` goes out as `MapPanel`. Handed to a design agent as `Map`, a
   destructured import shadows the global Map constructor. */

export { Panel, CountUp, Treemap } from '../../src/ui';
export { Link, navigate } from '../../src/router';
export { Find, Map as MapPanel, Live, Rail, News, Doors, Ext, Emb, Parts } from '../../src/panels';
export { translator, LANGS, LANG_NAMES, LOCALES } from '../../src/copy';
export type { Lang, T } from '../../src/copy';

/* Duo: its own checkout, sibling of steamprofiler-front. Scoped by the
   `.duo` class in steamprofiler.css. */
export { Artwork, palettes, sizes } from '../../../../steamprofiler-duo-front/src/Artwork';
export { DesignControls } from '../../../../steamprofiler-duo-front/src/DesignControls';
export { newDesign } from '../../../../steamprofiler-duo-front/src/api';
export type { Design, Theme, Layout } from '../../../../steamprofiler-duo-front/src/api';
export { newGenerator } from '../../../../steamprofiler-duo-front/src/generator';
export type { GeneratorDesign, Kind } from '../../../../steamprofiler-duo-front/src/generator';
export { themes } from '../../../../steamprofiler-duo-front/src/themes';
