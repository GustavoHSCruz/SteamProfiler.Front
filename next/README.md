# steamprofiler.org - the bench

A third cut of the landing page, and the one that keeps the project's own
metaphor instead of decorating it. The site has always been dressed as a
tiling workspace: panels with gaps, a status bar across the top, mono title
bars, the compositor's ring on the panel you are pointing at. This is that,
taken literally. Nine panels, tiled, all of them on screen at once.

```
npm install
npm run dev      # http://localhost:5180   the dev server
npm run build    # tsc, the client bundle, the ssr bundle, then the prerender
node serve-dist.mjs   # http://localhost:5182   what ships, served like nginx
```

`/api` and `/art` are proxied to `https://steamprofiler.org`, the same way
`serve.py` does in the other repo, so the four counts are the live ones and
the field really resolves. `SP_API=http://host:port npm run dev` points it
elsewhere.

A prototype, outside `steamprofiler-front` on purpose: nothing here is
deployed, nothing here is in the OSS repo, the served page is untouched.

Two things in the served repo were changed on its account, and only those two.
The about page and the home's own card for the front end used to promise "no
framework, no build step"; that promise now has a date on it, so it was taken
out rather than inverted - a site that says it uses React before it does is
wrong in the same way, and a claim removed does not need editing twice. The
front's README and CONTRIBUTING say plainly that this rebuild is being weighed
and that the rule still holds for the tree that is served. What has not been
written anywhere is that the switch happened, because it has not.

The two entries this page keeps in a browser are `sp-lang` and `sp-recent`,
which are the names the privacy policy gives them. Keeping the same thing
under a different name is keeping something the policy does not describe.

## What it is, and what it deliberately is not

There is no scroll narrative. Nothing pins, nothing morphs on the way past,
no section is one idea and half a screen of air. On a wide screen the whole
bench is one screenful; on a laptop it is that plus one flick of the wheel.

What moves is only ever what the reader is doing:

- the panel under the pointer takes the gradient ring
- a rectangle in the map lifts out of the sheet and its neighbours step back
- the nine pages are a list, and the one you point at or tab to writes itself
  out underneath, in a fixed-height block so choosing never moves the panel
- the covers run slowly up their column and stop the moment you point at them
- the four counts from the service count up, once, on arrival

```
  find  find  find  find  find   map  map  map  map   live live live
  rail  rail  pages pages pages pages   fx  fx  fx  fx  fx  fx
  ext   ext   ext   emb   emb   emb   repos repos repos repos repos repos
```

| panel | what it holds |
| --- | --- |
| find | the headline, the profile/game switch, the field, what you looked up before |
| map | seventy-two rectangles that are nobody's library |
| live | four counts read from `/api/status` while the page was loading |
| rail | 157, why, and the covers of the games that have a page of their own |
| news | the Steam news hub, live, five posts deep, linking into /news |
| fx | the ten franchise screens, and the two company shelves |
| ext | the extension, drawn rather than screenshotted |
| emb | the embed generator, drawn from the same proportions as the map |
| repos | the five repositories, and how much of the site each language has |

## /news, and why the post is read here

`news` is not a headline that sends the reader away. Steam publishes its news
hub as an app of its own, 593110, and `ISteamNews` hands back the **whole
body** in BBCode - the fest announcements and the full client changelogs -
so the post is drawn on this site and the reader stays on it.

```
/           the bench
/news       the last twenty posts, filtered by fests-and-sales or client updates
/news/<id>  one post, rendered here
/privacy    the policy
/about      who made it
/status     what the service is doing, live
```

The one case that still leaves is the one that has to: an item that arrives
as a headline with no body to draw. `bodyWeight()` measures what is left of a
post once the markup is taken out, and under a hundred and twenty characters
the page says it is handing over and `location.replace`s to Steam. Nothing is
invented to fill a page, and nobody is shown a screen that only says a post
exists somewhere else.

### The band over the title

The words come from `ISteamNews`, which knows nothing about how Steam dresses
the page they are on. The background, the card and the subtitle belong to the
**event** the announcement was published as, and those are in
`store.steampowered.com/events/ajaxgetpartnereventspageable` against the news
hub's own clan, 27766192 - the number already sitting in every image path
inside the bodies. The two feeds are matched on the only id they share: the
gid in a post's own address.

So a post that has artwork on Steam has it here, in the same place Steam puts
it: a wide band across the top of the panel, fading into the panel's colour,
with the title and the subtitle in its lower third. A post that has none -
every client update - gets the plain header rather than an invented picture,
which is also what it gets on Steam. The two feeds are asked for together and
the artwork is allowed to fail on its own: a page that refuses to draw the
words because the background did not arrive would have its priorities exactly
backwards.

The event card, 800x450, is the thumbnail in the `/news` rows. A row without
one keeps the space rather than sliding its title ninety pixels left.

`bbcode.ts` turns Steam's markup into the page. It is a tokeniser, not a
chain of replacements: text runs are escaped before they are emitted, an
unknown tag is dropped rather than passed through, and a URL has to be
http(s) after the `{STEAM_CLAN_IMAGE}` placeholder resolves or the tag around
it is dropped. That is what makes the rendered body the only markup in this
prototype written with innerHTML. `[previewyoutube]` becomes a link and never
an iframe: an embed would put a third party on a page belonging to a site
whose whole argument is that it carries none.

The posts, the text and the images are Valve's, every post carries the link
to it on Steam, and the page says so at the foot of each one.

**This is the one thing here with no counterpart on the served site yet.**
`/api/game/public?appid=593110` already answers with five posts, but it
truncates each body to a 500-character excerpt, which is right for a card and
not enough for a page. So the prototype proxies `ISteamNews` directly through
Vite. In production it is a route on the api, beside the per-game news it
already caches - small, and not written yet.

## The text is in the file

A single-page app serves `<div id="root"></div>`, and this project cannot.
The reason is written in the served repo's own README and in `gen-shell.js`:
three assistants asked whether steamprofiler.org is safe answered from what
survives without a script, and one decided from the silence that it was a
phishing page. That is not an SEO preference, it is the site being read
wrong by the thing most likely to be asked about it.

So `npm run build` runs the components through `react-dom/server` and writes
a real file per page per language:

```
dist/index.pt.html            dist/privacy/index.ru.html
dist/about/index.en.html      dist/status/index.pt.html
```

`/privacy` in Portuguese ships 11,687 characters of policy with the script
never run, with its own `<title>`, its own description and `lang="pt"` on the
root. The browser then hydrates that markup rather than replacing it, so the
words a reader is already looking at do not blink.

**One file per language is not a URL scheme.** The address stays `/privacy`
for everybody; nginx chooses which file to send from the `sp-lang` cookie,
which is the same map it already runs to choose `dict.<lang>.js`, pointed at
a second set of files. `serve-dist.mjs` implements exactly that rule so the
shape can be checked before it is written into the real config.

What is *not* in the prerendered file is anything that comes from the
service: the four counts, the news, a profile. Those arrive with the script,
the same as they do today. What had to survive is the writing, and it does.

## The pages that are not the bench

`/privacy` and `/about` carry the served site's own words, and **not a second
copy of them**. `src/pages.ts` is generated: a script reads
`privacy.html` and `about.html` out of the other repo, keeps the shape - which
cards there are, which key is each heading, which keys are its paragraphs and
its lists - and the strings themselves come from the same built dictionaries,
in all three languages. A hand-typed second copy of what a site promises
about data is a copy that will drift from the first one, and the drift gets
found by somebody who trusted the wrong half.

`/status` has no prose to copy. It reads `/api/status`, which is the service's
own public payload, and draws three lights, what it has learned, and the
week. `/healthz` - the operator's one, with the gate's counters and the ban
table in it - is a different address and this page has never asked for it.

The policy's archive of earlier revisions stays on the served site: a policy's
history is a record, and a prototype has no business keeping a second copy of
one.

## The map

```
src/
  App.tsx      the status bar, the bench, the legal line
  panels.tsx   the nine
  ui.tsx       the panel primitive, the count-up, the treemap
  data.ts      the shape, the rail, the franchises, squarify()
  copy.ts      every string, in en, pt and ru
  pages.ts     the shape of /privacy and /about, generated from the other repo
  pages-view.tsx  those two, and /status
  api.ts       /status, /resolve, /game/search
  styles.css   the palette, the panel, the grid areas
```

Motion is the only library, and only for the count-up and the once-on-view
trigger. Tailwind is layout and spacing; the palette, the type and the panel
are in `styles.css`. The treemap is seventy-two divs laid out against the
size the panel actually got: it is drawn once and then only answers the
pointer, and a canvas would buy nothing for that except a second way for the
page to fail.

## What it costs

| | served page | this |
| --- | --- | --- |
| shipped to the reader | ~113 kB gzip, 51 kB of that the whole dictionary | ~147 kB gzip, dictionary included, three languages |
| dependencies | none | react, motion, tailwind, vite |
| build step | none | yes |
| renders without JavaScript | the whole page, text and all | nothing |

The first row is now this cut's to answer for, and the honest version of it
is that a third of that is React. The last one is the only one
that matters beyond taste. The served page carries its English in the markup
precisely because three assistants, asked whether the site was safe to use,
answered from what survives without a script - and one decided from the
silence that it was a phishing page. A single-page React app has no answer to
that. Putting this cut on steamprofiler.org means accepting it or adding
server rendering, which is a second decision and not a detail.

## What replacing the front actually means

The served `site/` is 52,130 lines of JavaScript, CSS and HTML. This covers
about a twentieth of it, and the twenty nineteenths that are left include the
two things the site is known for:

| not ported | lines |
| --- | --- |
| `games.css` + `game.js`, the 157 pages built from each game's own interface | 15,681 |
| `franchises.*` and the 25 files under `franchises/` | ~3,000 |
| `dash.js`, `router.js`, `profile.html`, the profile itself | 2,672 |
| `public.js`, `/g/<appid>`, the indexable game page | 1,051 |
| `embed.js`, the generator | 714 |
| `houses.js`, the blog, the forms, the block walls | ~1,500 |

An order that keeps the site shippable at every step, rather than a branch
that is broken for a month:

1. **The shell.** Strings from `SteamProfiler.i18n` instead of `copy.ts`, the
   five languages, the routes nginx already knows. Done when this repo can
   answer every address the old one does, even if some of them say "not
   ported yet".
2. **The pages with no profile in them**: `/g/<appid>`, `/franchises`,
   `/publishers`, `/developers`, `/blog`. These are the indexable half, so
   they are the half the prerender matters most for, and none of them needs
   the dashboard to exist.
3. **The profile**: `/u/<name>` and its sub-pages. `robots.txt` keeps `/u/`
   out of the index, so this half can be client-rendered without losing
   anything the prerender was protecting.
4. **The 157 game pages.** The largest piece and the last, because it is the
   one that can be ported a game at a time behind a fallback to the generic
   page - which is what the generic page is already for.
5. **The swap**: `site/` comes out, this goes in, `deploy.sh` grows a build
   step, and CONTRIBUTING stops saying "no dependencies".

Nothing is served from here until step 5, and step 5 is one commit.

## If this is the one

The strings move to `SteamProfiler.i18n` like everything else the project
shows a reader. `copy.ts` is a prototype's shortcut: the `land.*`, `priv.*`,
`abt.*`, `st.*` and `nav.*` keys in it are lifted verbatim from the built
dictionaries and must not be edited here, and the `w.*` and `n.*` ones - the
panel titles and the news pages, which the served site has no equivalent of -
are the only strings written in this repo. Their Russian is mine and wants a
reader who has it.
