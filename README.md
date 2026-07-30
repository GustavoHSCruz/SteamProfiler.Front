# steamprofiler.org - front end

[![check](https://github.com/GustavoHSCruz/SteamProfiler.Front/actions/workflows/ci.yml/badge.svg)](https://github.com/GustavoHSCruz/SteamProfiler.Front/actions/workflows/ci.yml)

The client half of [steamprofiler.org](https://steamprofiler.org): a Steam
profile reader that draws a whole library to scale and gives every game that was
ever launched a page designed after that game's own interface.

Static HTML, CSS and JavaScript. No framework, no bundler, no build step, no
dependencies. What is in `site/` is what the browser gets.

```
git clone git@github.com:GustavoHSCruz/SteamProfiler.Front.git
cd SteamProfiler.Front
python3 serve.py          # http://127.0.0.1:8013
```

`serve.py` is a development server in the standard library and nothing else. It
serves `site/` under the same URL map the live site uses and forwards `/api/`
and `/art/` to a running instance, `https://steamprofiler.org` by default, so a
fresh checkout renders real profiles immediately. `--api URL` points it
somewhere else and `--offline` cuts the forwarding, which is enough for work on
pages that hold no data.

## What is here, and what is not

This repository is the front end only. The service that answers `/api/` is
closed source and lives elsewhere; from here it is a URL that returns JSON.
Everything about how that JSON is produced is out of scope, and so is anything
about where or how the site is hosted.

That boundary is also the contribution surface. Layout, CSS, copy,
accessibility, translations, a new game page: all of it lives here and none of
it needs the API to change.

## The map

```
site/
  index.html      the landing page and the lookup field           search.js
  profile.html    every /u/* path                                 router.js
    dash.js       the treemap, the panels, the years, the library
    game.js       one renderer per game, dispatched on `theme`
    lib.js        helpers shared by both, the API calls, the footer
  blog.html       the index                    blog.js
  post.html       one post                     post.js
  feedback.html   the form and the public board                   feedback.js
  support.html    the donation channels                           support.js
  privacy.html    what the site does with data                    privacy.js
  policy-history.html   every past revision of that policy        policy-history.js
  appeal.html     the form behind a block, plus appeal-sent.html
  banned.html     what a blocked visitor sees, plus abuse.html

  style.css       tokens, reset, chrome, shared primitives
  home.css        the landing page
  games.css       every game page, one block each
  extras.css      blog, feedback, support, privacy, appeal
  fonts.css       the vendored faces, generated

  i18n.js         t(), plural(), the language picker
  dict.js         every string in three languages
  policy-text.js  past privacy policies, frozen
  policy-log.js   the index of those revisions

  robots.txt      what may be crawled, and why /u/ may not
  llms.txt        the same site described for something reading it

tools/            checks and generators, run with node, never shipped
```

### Routes

| URL | page |
| --- | --- |
| `/` | the lookup field |
| `/u/<profile>` | that profile's dashboard |
| `/u/<profile>/<appid>` | one game |
| `/u/<profile>/vs/<other>` | two libraries against each other |
| `/u/<profile>/backlog` | everything owned and never launched |
| `/blog`, `/blog/<slug>` | the index and a post |
| `/feedback` | leave a bug or an idea, and the public board |
| `/support` | the donation channels |
| `/privacy`, `/privacy/history` | the policy and its archive |

Paths under `/u/` are resolved in `router.js` after `profile.html` loads. The
server hands the same shell to all of them, so a new sub-page is a case in the
router and nothing else.

## Game pages

There is no shared layout below the status bar. `LAYOUTS` in `game.js` holds 158
renderers plus `renderGeneric`, and each one is built out of that game's own
interface: the post-match scoreboard for Dota 2, the buy menu for CS2, the
briefing screen for Arma 3, the research tree for War Thunder, European motorway
signage for ETS2, the pause menu for GTA V. Anything without a renderer gets the
generic page, which has to cope with a 1300-achievement library or with nothing
but a clock.

The payload carries a `theme` string and the renderer is looked up by it, so
which games have a page is decided by the API and which pages exist is decided
here. Adding one means a function in `game.js`, a block in `games.css` under
that theme's class, and its strings in `dict.js`. Nothing else changes.

A game page reuses its own page's classes rather than the shared ones. That is
what keeps 158 designs from collapsing into one design copied 158 times, and
`tools/check-prices.js` enforces it for the price block.

## Three languages

English is the default and the fallback. Portuguese and Russian are picked up
from the browser or chosen in the status bar, and the choice lives in
`localStorage`, so a link is never language-specific.

- `dict.js` holds every string, 1378 keys times three languages, at full
  parity. A key missing from `pt` or `ru` falls back to `en` rather than to
  nothing.
- `i18n.js` has `t()` for a key, `ts()` for a key that arrived in a payload,
  `plural()` with Russian's three forms, and `applyStatic()` for the
  `data-i18n` attributes in the HTML.

The API never sends prose. Anything it would otherwise say in words travels as a
key such as `@err.rate|n=6`, and the browser resolves it. Numbers and dates go
through `Intl` with the active locale, so each language's own separators and
month names come for free.

A translation is therefore a pure front-end change: add or fix keys in `dict.js`
and nothing else has to move.

## The shells carry their text

Every page is markup plus `data-i18n` attributes, and `applyStatic()` fills them
on boot. That is right for a browser and was wrong for everything else: a fetch
of the site with no JavaScript returned a nav bar and eight empty paragraphs, so
anything reading rather than rendering the site - a crawler, a link preview, an
assistant asked whether the site is safe - saw a page that said nothing.

`tools/gen-shell.js` copies the English string into each of those elements. The
browser is unaffected, because `applyStatic()` still overwrites every one of
them with the reader's language a moment later. What changed is what is there
before the script runs.

`dict.js` is still the only place a string is written. The generator copies;
`--check` is what keeps it a copy. After editing any `data-i18n` string, run:

```
node tools/gen-shell.js
```

## The policy archive

`/privacy/history` keeps every past version of the privacy policy whole, with a
diff between each one. A published revision is never edited: if it was wrong,
that is what the next one says, and both stay, because a policy with no archive
is a policy that can be rewritten without anybody noticing.

The live text is in `dict.js` under `priv.*`; `policy-text.js` holds the frozen
copies. To add a revision, edit the policy in `dict.js`, append an entry to
`REVISIONS` in `tools/gen-policy.js` marked `text: 'live'` (removing that marker
from the one before it), then run the generator. It reads the frozen revisions
back out of `policy-text.js` rather than rebuilding them, so re-running can only
append to history.

## How a change reaches the site

A push is what publishes. Saving a file does nothing, and that is deliberate:
it used to publish, five seconds later, to everybody.

```
git push
  |
  +-- .githooks/pre-push runs tools/check.sh here
  |     refused -> nothing is pushed, so nothing is published
  |
  +-- GitHub Actions runs tools/check.sh in the cloud
  |     the badge above, and a log anybody can read
  |
  +-- the deploy exports origin/main, runs tools/check.sh
        against the export, and ships that
```

What is on the site is a commit, not a working tree. Uncommitted work stays on
the machine it was written on; `python3 serve.py` is the preview.

The hook lives in `.githooks/` so that it is versioned rather than existing on
one machine. A fresh checkout has to be pointed at it once:

```
git config core.hooksPath .githooks
```

## Checks

`tools/check.sh` is all of them, and is what the hook, the workflow and the
deploy each run. The individual pieces, for when one of them is what you are
working on:

```
node tools/check-policy.js    # the newest revision matches dict.js, dates agree
node tools/check-prices.js    # the per-game price blocks are still distinct
node tools/gen-shell.js --check  # the HTML shells match dict.js
node tools/gen-policy.js      # regenerate policy-text.js after a policy edit
node tools/gen-shell.js       # rewrite the shells after an edit to dict.js
python3 tools/fonts.py        # re-vendor the faces and rewrite fonts.css
```

There is no test runner and no linter config. `node --check` on a changed file
is what the deployment path runs, and these checks cover the places where a
copy-paste is easy and invisible.

## Fonts

Every face in `site/fonts/` is vendored as a latin-subset `.woff2` and declared
in the generated `fonts.css`. Nothing loads from a font CDN, and each page
declares only the faces it uses. Bricolage Grotesque is the display voice;
Archivo and IBM Plex Mono carry body and data; the rest are one per game theme,
picked to match that game's own lettering.

`python3 tools/fonts.py` re-vendors the whole set and rewrites `fonts.css`. It
is only needed when a family is added or dropped.

## Contributing

Pull requests are welcome. `CONTRIBUTING.md` has the house style, which is
mostly: no dependencies, no build step, and comments that say why rather than
what.

## Licence

MIT. See `LICENSE`.

The fonts under `site/fonts/` are third-party files distributed under their own
licences and are not covered by the MIT grant above.

steamprofiler.org is an independent hobby project. It is not affiliated with,
endorsed by, or connected to Valve Corporation. Steam and the Steam logo are
trademarks of Valve Corporation. Game names and art belong to their respective
owners.

Built with AI assistance, reviewed and shipped by a person.
