# steamprofiler.org - front end

[![check](https://github.com/GustavoHSCruz/SteamProfiler.Front/actions/workflows/ci.yml/badge.svg)](https://github.com/GustavoHSCruz/SteamProfiler.Front/actions/workflows/ci.yml)

<a href="https://ko-fi.com/gordziilla"><img src="https://storage.ko-fi.com/cdn/kofi3.png?v=3" alt="Support me on Ko-fi" height="36"></a>

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

This repository is the front end only. The service that answers `/api/` is also
open source under MIT and lives in
[SteamProfiler.Api](https://github.com/GustavoHSCruz/SteamProfiler.Api). Its
implementation remains out of scope for changes made in this repository.

That boundary is also the contribution surface. Layout, CSS, copy,
accessibility, translations, a new game page: all of it lives here and none of
it needs the API to change.

## The map

```
site/
  index.html      the landing page and the lookup field           search.js
    demo.js       the library the front page draws, and the games it shows off
  profile.html    every /u/* path                                 router.js
    dash.js       the treemap, the panels, the years, the library
    game.js       one renderer per game, dispatched on `theme`
    embed.js      the generator: charts, banners and badges to take away
    lib.js        helpers shared by both, the API calls, the footer
  game-public.html  every /g/<appid>                              public.js
  franchises.html   /franchises and /franchises/<slug>            fxpage.js
    franchises.js   the screens, and what every franchise has in common
    franchise-list.js      the ten with a screen written for them
    franchise-catalogue.js every other series
    franchises/<slug>.css|.js  one pair per written screen, loaded on demand
  blog.html       the index                    blog.js
  post.html       one post                     post.js
  feedback.html   the form and the public board                   feedback.js
  support.html    the donation channels                           support.js
  extension.html  the browser extension, and the panel it draws  extension.js
  privacy.html    what the site does with data                    privacy.js
  policy-history.html   every past revision of that policy        policy-history.js
  appeal.html     the form behind a block, plus appeal-sent.html
  banned.html     what a blocked visitor sees, plus abuse.html

  style.css       tokens, reset, chrome, shared primitives
  home.css        the landing page
  games.css       every game page, one block each
  franchises.css  the ten franchise screens, one block each
  embed.css       the generator
  extras.css      blog, feedback, support, privacy, appeal, the extension
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
| `/g/<appid>` | one game without a profile: catalogue, live audience, reviews, news and global achievements |
| `/franchises`, `/franchises/<slug>` | ten Steam series, and one of them. Every game in it against the years it was made across, and against the years it took to reach Steam |
| `/u/<profile>/franchises`, `/u/<profile>/franchises/<slug>` | the same screens with that library's hours in them |
| `/u/<profile>/vs/<other>` | two libraries against each other |
| `/u/<profile>/backlog` | everything owned and never launched |
| `/u/<profile>/cards` | the trading-card badges this profile has made, the sets it has not, and what one of each card in those would cost on the market today |
| `/u/<profile>/embed` | the generator: a bar chart, a badge, a banner or a Unicode chart of this library, each one as an address that stays current or as a file that does not. Steam's own About Me only loads pictures already on Steam's hosts, so the page says so and offers the download for that case |
| `/u/<profile>/year/<year>` | one year of it: what was put down that year, and what was unlocked during it. The word `year` is in the path because an appid is digits too |
| `/blog`, `/blog/<id>/<title>` | the index and a post. The id resolves it; the title is that post's own title in the language the link was made in, and the page rewrites it to the reader's without reloading |
| `/feedback` | leave a bug or an idea, and the public board |
| `/support` | the donation channels |
| `/extension` | SteamProfiler Companion, the extension this project makes: what it draws on a Steam store page, everything it may touch, and how to install it while it is not in the stores yet. The panel in the middle of that page is markup and not a screenshot, so it speaks the reader's language and is corrected in a diff |
| `/privacy`, `/privacy/history` | the policy and its archive |

Paths under `/u/` are resolved in `router.js` after `profile.html` loads. The
server hands the same shell to all of them, so a new sub-page is a case in the
router and nothing else.

### The card page

`/u/<profile>/cards` is drawn in two passes, and that is worth knowing before
editing it. The badges come from Steam with the answer and are exact. The
prices come from the Community Market through a cache the api fills a few games
a minute, so a set with no price yet is drawn without one rather than held
back - `cd.no_price` is this site still reading, `cd.no_cards` is a set nobody
is selling a complete run of, and they are not the same sentence. The page asks
once more fifteen seconds later for whatever landed in the meantime, and never
again: it is a page somebody reads, not a dashboard that ticks.

The figures on it are in dollars and the note under the list says why: the
market quotes in the currency of whoever is signed in, nobody is signed in, and
converting would be inventing a price. Every other number on this site is in
the reader's own storefront currency.

## Game pages

`/g/<appid>` is the indexable, profile-free side of the same idea. Its public
record is rendered by `public.js`: catalogue facts come from the storefront,
current players and news from the Steam Web API, review totals from the review
endpoint and achievement rarity from Steam's global percentages. The ten
games with complete bespoke openings reuse their profile composition with
global facts; every other app gets the generic public composition.

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

## The franchise screens

`/franchises` is ten series, and each of them gets a screen the way each game
gets one: its own palette, its own lettering, an opening drawn for it, and one
panel built out of something only that series has - the suit readout, the buy
menu, a test chamber, the radio dial, the provinces of Tamriel, the Pip-Boy's
quest list, the Zone, a briefing board, the bonfires, the attaché case.

Which series exist is written in two files and nothing else. `franchise-list.js`
holds the ten that have a screen written for them - a CSS and JS pair each
under `site/franchises/`, loaded on demand by `exclusive-loader.js` and kept
honest by `tools/check-franchise-exclusives.js`. `franchise-catalogue.js` holds
every other series, drawn by the shared code in the site's own furniture with
that series' colour on it.

It is the same split the game pages already have, one level up: a page built
out of the game's own interface against the generic one. A series moves from
the catalogue to the list the day somebody writes its screen - cut the entry
across and add the pair.

Every appid in both files was checked against the storefront rather than
remembered, because a wrong one is a page about the wrong game with the wrong
art on it. One candidate turned out to be a different game entirely under an
appid that looked right, and eleven more never came back as a released game
with a date, so they are not there.

The ten carry the year each game came out; the catalogue carries the year
Steam publishes, because nobody has been through those by hand. So the
two-date line and its hairline appear on the ten and stay quiet elsewhere,
which is the honest shape of "we only know one of them".

The landing page loads `franchise-list.js` alone: it prints ten plates as a
way in, and should not carry six hundred rows to do it.

Two dates per game, and that is what the screens are actually about. `year` in
the table is when the game came out; the storefront's own date comes from the
api. They disagree constantly - Arena is from 1994 and reached Steam in 2022,
GTA III is from 2001 and arrived in 2008 - and the line at the top of each
screen draws both, with the distance between them as a hairline.

The table also carries each game's name, so the screens read properly before
the api answers and with it down entirely. Steam's name wins when it arrives,
because that is the one on the shop today.

### On the front page

The ten are on the landing page as well, under the rail, as ten plates in
their own colours. It is the only block on that page whose links go somewhere
without a profile, which is why it is above the list of what a lookup opens
rather than inside it: somebody who never types a name into the field can
still open all ten.

Drawn by `search.js` out of the same table the screens use, so a franchise
added there appears there. The picture on each plate is the storefront capsule
and not the key art the screens use - `library_hero.jpg` is around 400 KB and
there would be ten of them above the fold.

### The openings

Every franchise screen opens on a few seconds of that franchise, drawn rather
than played: shapes, type and keyframes at the foot of `franchises.css`, no
video file and nothing fetched. They are skippable from the first frame, they
play once per franchise per visit, and they do not run at all for a reader who
asked for less motion - the script does not build the overlay and the CSS is
inside the guard as well.

The real trailer is behind a button, and it weighs about twenty megabytes:
`preload="none"` is the whole contract, so nothing crosses the network until
somebody presses play. Steam stopped putting a file in the store payload -
`movies` now carries DASH and HLS manifests, which need a player library, and
this site has none - but the flat file each movie id has always had is still
served from the one host the media policy allows, so the api sends the id and
the page builds the address.

### One prefix, for a reason

Every class in `franchises.css` starts with `fx-`, including the ones inside
the signature panels. This stylesheet and `games.css` load together on a
profile, and `games.css` is 128 themes deep in short names: the Half-Life suit
readout was written as `.hev`, which is what that game's own page already
calls its own, and it silently inherited that page's padding.

## Three languages

English is the default and the fallback. Portuguese and Russian are picked up
from the browser or chosen in the status bar, and the choice lives in
`localStorage`, so a link is never language-specific.

- `dict.js` holds every string, 1670 keys times three languages, at full
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
