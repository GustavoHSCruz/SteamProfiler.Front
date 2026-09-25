# Contributing

Issues and pull requests are welcome. This is a hobby project, so review may
take a few days.

## Running it

```
git config core.hooksPath .githooks   # once, per checkout
python3 serve.py                      # http://127.0.0.1:8013
```

The first line points git at the versioned pre-push hook, which runs the checks
before anything leaves your machine. Without it the checks still run in CI, but
you find out after the push instead of before.

```
npm --prefix next ci                  # once, and after package-lock.json moves
npm --prefix next run dev             # http://localhost:5180
```

The front is `next/`: React and TypeScript, built by Vite and rendered to one
HTML file per page and language by `next/prerender.mjs`. The dev server
reloads on save. `site/` holds the pages that have not been moved to `next/`
yet; edit a file there and reload, there is nothing to rebuild. Both servers
forward `/api/` to the live site, so profiles, prices and the feedback board
work from a fresh checkout.

Use `--offline` with `serve.py` when working on pages that hold no data. Be
considerate with the default upstream: it is a home server, and it rate limits.

## House style

**Few dependencies, and each one argued for.** `next/package.json` is React,
React DOM, Motion, Tailwind, TypeScript and Vite. A package that does one
function's worth of work is a function instead; a new dependency is a pull
request that says what it replaces and what it weighs in the bundle.

**The text is in the file.** Every page `next/` serves is prerendered through
`react-dom/server`, so it reads without a script. Data from the service
arrives after hydration; the words that explain the page do not wait for it.
`tools/check.sh` fails when a page stops rendering to a file.

**Components, typed.** A screen is a React component in `next/src`, and the
shared pieces - panel, table, chip, meter, nav - come from `src/ui-kit`, which
is generated from [SteamProfiler.UI](https://github.com/GustavoHSCruz/SteamProfiler.UI)
and edited there, not here.

**`site/` until it is gone.** Pages not yet moved are plain HTML, CSS and
JavaScript with no build step. A fix there stays in that style, with `h()` from
`lib.js` rather than HTML strings; a new feature goes in `next/`.

**Comments say why.** The code already says what it does. A comment earns its
place by recording the reason a thing is the way it is, especially when the
obvious alternative was tried and failed.

**No em dashes.** Use a spaced hyphen. This is consistent across the whole
codebase and the whole site.

**Copy is not hardcoded.** Every visible string is a key in the dictionary, in
all supported languages. English is the fallback, so `en` is mandatory; a
translation that only copies the English is worse than leaving the key out.

**The strings are written elsewhere.** `site/dict.<lang>.js` is built from
[SteamProfiler.i18n](https://github.com/GustavoHSCruz/SteamProfiler.i18n) and
committed here so that a clone renders without it. A new key or a better
sentence is a pull request there; this repository takes the built files. If you
are adding a game page, open both, and say in each that the other exists.

**One dictionary reaches the reader.** `/dict.js` is served as whichever
`dict.<lang>.js` the `sp-lang` cookie names, so a page cannot read a string in a
language it was not sent. If you add something that switches language without a
reload, it has to fetch that file, not look in a second one - there is no
second one. `tools/check-language-boot.js` walks the four ways that goes wrong.

**A game page reuses its own page's classes.** The point of 158 layouts is that
they are 158 designs. A new page that borrows the shared card and just changes
the accent colour is a page that should have used the generic renderer.

## Before opening a PR

```
./tools/check.sh
```

That is everything: syntax on every file, the policy archive, the price blocks,
the shells against `dict.js`, and the HTML - tag balance, duplicate ids, every
`data-i18n` key present in every built dictionary, and every internal link
pointing at a route that exists. The pre-push hook runs it for you.

The deployment path refuses a file that does not parse, so `node --check` is not
optional. Run the check scripts if you touched the policy text or a price block.
If you edited any string that a `data-i18n` attribute points at, run
`node tools/gen-shell.js` and commit the shells it rewrites: the HTML carries
the English text so that the page says something before the script runs.

Screenshots help a lot for anything visual. Light and dark are not a thing here,
but several languages are: a layout that fits in English and overflows in Russian
is a common failure, and Russian is the one to check.

## Adding a game page

1. A renderer in `game.js`, registered in `LAYOUTS` under the theme string.
2. A block in `games.css`, scoped to that theme's class.
3. Its strings in the i18n repository, all supported languages, and the rebuilt
   `dict.js` here.

Which appid gets which theme is decided by the API, not here, so a renderer for
a theme the API does not send yet is dead code until it does. Open an issue
first if the game you want does not already have a theme.

## Scope

This repository is the front end. The service behind `/api/` is open source in
[SteamProfiler.Api](https://github.com/GustavoHSCruz/SteamProfiler.Api).
Changes that require the API to send something new need a coordinated change
there rather than a front-end patch alone.

## Licence

By contributing you agree that your contribution is licensed under the MIT
licence, the same terms as the rest of this repository.
