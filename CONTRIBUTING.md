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

Edit a file in `site/`, reload the page. There is nothing to rebuild and
nothing to restart. `serve.py` forwards `/api/` to the live site, so profiles,
prices and the feedback board work from a fresh checkout.

Use `--offline` when working on pages that hold no data. Be considerate with the
default upstream: it is a home server, and it rate limits.

## House style

**No dependencies and no build step.** No npm, no bundler, no framework, no
preprocessor. If something needs a package to work, it does not go in.

**Vanilla everything.** Plain DOM APIs, plain CSS, modern syntax without
transpiling. `lib.js` has the shared helpers; use `h()` to build elements rather
than assembling HTML strings.

**Comments say why.** The code already says what it does. A comment earns its
place by recording the reason a thing is the way it is, especially when the
obvious alternative was tried and failed.

**No em dashes.** Use a spaced hyphen. This is consistent across the whole
codebase and the whole site.

**Copy is not hardcoded.** Every visible string is a key in `dict.js`, in all
three languages. English is the fallback, so `en` is mandatory; a `pt` or `ru`
that is only a copy of the English is worse than leaving the key out.

**A game page reuses its own page's classes.** The point of 158 layouts is that
they are 158 designs. A new page that borrows the shared card and just changes
the accent colour is a page that should have used the generic renderer.

## Before opening a PR

```
./tools/check.sh
```

That is everything: syntax on every file, the policy archive, the price blocks,
the shells against `dict.js`, and the HTML - tag balance, duplicate ids, every
`data-i18n` key present in all three languages, and every internal link
pointing at a route that exists. The pre-push hook runs it for you.

The deployment path refuses a file that does not parse, so `node --check` is not
optional. Run the check scripts if you touched the policy text or a price block.
If you edited any string that a `data-i18n` attribute points at, run
`node tools/gen-shell.js` and commit the shells it rewrites: the HTML carries
the English text so that the page says something before the script runs.

Screenshots help a lot for anything visual. Light and dark are not a thing here,
but three languages are: a layout that fits in English and overflows in Russian
is a common failure, and Russian is the one to check.

## Adding a game page

1. A renderer in `game.js`, registered in `LAYOUTS` under the theme string.
2. A block in `games.css`, scoped to that theme's class.
3. Its strings in `dict.js`, all three languages.

Which appid gets which theme is decided by the API, not here, so a renderer for
a theme the API does not send yet is dead code until it does. Open an issue
first if the game you want does not already have a theme.

## Scope

This repository is the front end. The service behind `/api/` is closed source
and lives in a separate repository. Changes that require the API to send
something new cannot be merged from here alone; open an issue describing what
the page would need and it can be discussed.

## Licence

By contributing you agree that your contribution is licensed under the MIT
licence, the same terms as the rest of this repository.
