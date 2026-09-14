# SteamProfiler: how to build with it

A dark, tiled workspace: panels with a mono title bar, laid on a faint 44px grid, one amber
accent. Everything a design needs is on `window.SteamProfiler` after `styles.css` and
`_ds_bundle.js` load. No provider or wrapper is needed for the bench components.

## Tokens (Tailwind v4 theme, also plain CSS variables)

| Token | Value | Use |
|---|---|---|
| `ink` | `#08070c` | page ground |
| `panel` / `panel-2` | `#101017` / `#15151d` | panel body / raised row, active tab |
| `line` / `line-2` | `#22212c` / `#32313d` | hairlines / stronger border, quiet numerals |
| `text` / `dim` / `faint` | `#f1eff5` / `#948fa0` / `#5f5c6c` | primary / secondary / captions |
| `amber` / `amber-d` | `#ffb454` / `#c97f22` | the one accent / its border and hover |

Utilities exist for every token: `bg-*`, `text-*`, `border-*` (plus `/10`..`/90` opacity on
bg/text/border, `hover:`), e.g. `bg-panel`, `text-dim`, `border-line`, `bg-amber/10`,
`hover:text-amber`. As CSS variables: `var(--color-panel)`, `var(--color-amber)`.
Fonts: `font-display` (Bricolage Grotesque 600/800, headlines and big figures),
`font-sans` (Archivo 400-600, body), `font-mono` (IBM Plex Mono, labels, numbers, captions).

The stylesheet is compiled, not the Tailwind runtime: only token utilities and classes the
product already uses exist. Arbitrary values you invent (`text-[2.6rem]`) will NOT resolve.
For any size or spacing you are unsure of, use an inline `style`.

## Product classes (plain CSS in `_ds_bundle.css`)

- `.display`: Bricolage 800, tight tracking, balanced wrap. `.mono`: Plex Mono.
- `.dot`: the 7px amber square used before titles and the wordmark.
- `.p` panel shell, `.p-bar` title bar (10px mono uppercase dim), `.p-body` (14px padding),
  `.p-tight` (no padding), `.p-go` title-bar link. Prefer the `Panel` component over raw classes.
- `.field` text input and `.go` amber button (pair them in a row); `.pill` outlined chip link.
- `.rowl` list row link (`data-on="1"` highlights it), `.rowl-tall` for taller rows.

## Components

- `Panel` is the only container. `title` + `area` (any class name) required; one exit via
  `go` + `goTo` (route), `goHref` (external, gets an arrow) or `onGo` (button); `tight`
  drops body padding for lists. Tile panels in a CSS grid with `gap: var(--gap)` (8-9px).
  Panels fill their grid cell (`h-full`), so give the cell a height.
- `Link` for in-site routes (`to`), styled with your classes. `CountUp` animates a number
  on first view. `Treemap` fills a `position: relative` box with explicit size.
- Home panels (`Find`, `MapPanel`, `Live`, `Rail`, `News`, `Doors`, `Ext`, `Emb`, `Parts`) are
  finished sections of steamprofiler.org. They take `t = SteamProfiler.translator('pt')`
  (`'en' | 'pt' | 'ru' | 'zh-cn' | 'zh-tw'`); `Live` also takes `live` counts and `lang`.
  `News` and the Steam capsule art in `Rail`/`Doors` need the network and render empty offline.

## Duo (duo.steamprofiler.org)

Duo's stylesheet is scoped: wrap Duo UI in `<div className="duo">`. Inside it you get
`.button`, `.button.primary`, `.text-button`, `.nav-pill`, `.eyebrow`, `.lead`, `.muted`,
`.accent`, and `.controls` (form panel; put `DesignControls` inside it). `Artwork` draws an
SVG from `newDesign(title, 'ember' | 'mint' | 'violet' | 'ice')` with `layout`
`'banner' | 'card' | 'square'`; it scales to its container's width only inside `.duo`.

## Example

```jsx
const { Panel, CountUp } = window.SteamProfiler;

<div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--gap)', height: 260 }}>
  <Panel title="Biblioteca" area="lib" go="ver tudo" goTo="/library">
    <p className="display text-amber" style={{ fontSize: '2.6rem', lineHeight: 1 }}>
      <CountUp to={1284} locale="pt-BR" />
    </p>
    <p className="mono text-faint" style={{ fontSize: 10.5, marginTop: 8 }}>jogos na conta</p>
  </Panel>
  <Panel title="Mais jogados" area="top" tight>
    <ul className="m-0 p-0" style={{ listStyle: 'none' }}>
      <li className="flex items-center justify-between border-b border-line" style={{ padding: '10px 14px' }}>
        <span className="text-text">Dota 2</span><span className="mono text-amber">4.812 h</span>
      </li>
    </ul>
  </Panel>
</div>
```

Copy is lowercase-quiet in title-bar links ("ver tudo", "abrir"), uppercase only via `.p-bar`.
No gradient fills or emoji; one accent (amber) per screen. The only gradient is the hover ring `.p` draws itself.
