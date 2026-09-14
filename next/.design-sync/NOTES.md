# design-sync notes

Target: claude.ai/design project "SteamProfiler" (id in config.json). Run everything from
`steamprofiler-front/next`.

## How this package is put together

- There is no published library. `.design-sync/pkg/` is a stand-in package: `index.tsx`
  re-exports the real components from `next/src` and from the sibling Duo checkout
  (`../../steamprofiler-duo-front`, must sit next to `steamprofiler-front`).
- `node .design-sync/build.mjs` (cfg.buildCmd) must run before the converter. It writes
  `pkg/dist/` (gitignored by next's `dist` rule): Tailwind compiled from `src/styles.css` +
  `pkg/steamprofiler.tw.css` (sources `src/` and `.design-sync/previews/`, plus token utility
  safelists), Duo's `src/styles.css` wrapped in `.duo { }` and flattened with lightningcss,
  the fonts from `public/fonts`, and `.d.ts` via `tsc --ignoreConfig` (rootDir is the
  workspace, then the entry `.d.ts` is moved to `dist/types/index.d.ts`).
- Converter: `node .ds-sync/package-build.mjs --config .design-sync/config.json --node-modules ./node_modules --entry .design-sync/pkg/index.tsx --out ./ds-bundle`.
- Converter deps in `.ds-sync/`: esbuild (needs `npm install-scripts approve esbuild` and
  `npm rebuild esbuild` under npm's script gate), ts-morph, @types/react, playwright@1.62.0
  (pins chromium-1234, which is what `~/.cache/ms-playwright` holds; Duo's 1.63 wants 1243).
- `Map` is exported as `MapPanel`: a destructured `Map` shadows the global constructor.
- Groups come from `docs/*.md` stubs via `docsMap`. Duo components must NOT be in
  `componentSrcMap`, or the group becomes the directory name instead of "Duo".
- `dtsPropsFor` hand-writes Find, Live, Link, Artwork, DesignControls: the extractor left
  `api.Status`, `Design`, `RefObject` unqualified.

## Gotchas found

- Preview utilities only exist if Tailwind saw them: `pkg/steamprofiler.tw.css` sources
  `../previews`. An arbitrary class in a preview without a rebuild of `build.mjs` renders unstyled.
- The bundle must be ASCII. `src/panels.tsx` and `src/news.tsx` had `[A-ZÀ-ÖØ-Þ]` in a regex;
  served without a charset it decoded as Latin-1 and killed `window.SteamProfiler`. Rewritten as
  `À-ÖØ-Þ` (checked equivalent over U+0000-02FF).
- Grid cells are narrow: Panel, Link, Treemap, Artwork, DesignControls, Find, Doors and Parts
  use `cardMode: column`. Parts must be `width: 100%`, its grid is breakpoint-driven.
- Duo previews need `<div className="duo">`; DesignControls also needs `.controls` around it.

## Known render warns

- CountUp and Live capture mid-animation (the figure is a few percent short). That is the
  component; grades stand.
- News renders its offline state everywhere (the Steam feed is a dev-server proxy only).

## Re-sync risks

- Duo is read from a sibling checkout with no commits yet: a missing or moved
  `steamprofiler-duo-front` fails `build.mjs`, and Duo changes there move the bundle silently.
- Rail and Doors load capsule art from Steam's CDN. The local capture shows it; inside
  claude.ai/design (no network) those images are empty. Grades were made on the local capture.
- `dtsPropsFor` bodies are copies of source types (Design, GeneratorDesign, Status). If those
  types change in src, the `.d.ts` the design agent sees goes stale without any error.
- The token safelist in `steamprofiler.tw.css` names the token list by hand; a new `@theme`
  color needs adding there.
- Built with Node 26.4, TypeScript 7.0.2, Tailwind 4.3.3, lightningcss from next's node_modules.
