/* steamprofiler.org - what the front page draws before anybody has typed anything.

   Two lists, and they are different kinds of thing on purpose.

   ── The shape ──
   The first screen is a treemap: one rectangle per game, area proportional to
   hours, which is the one thing this site does that no sentence about it ever
   sold. It is drawn from the numbers below, and those numbers are nobody's.

   That is the whole point of them. The first version of this page drew a real
   library there - a public profile, read once and written down - and what it
   put on the front of the site was one person's game names and one person's
   hour counts, at full screen, for every visitor. Whose library the author's
   is belongs in the footer, on a link, where it already was.

   So the hero draws the shape and not a shelf. A power law with a wobble in
   it: one game that ate a quarter of everything, four more that between them
   ate as much again, and a long tail of sixty that each took an evening. That
   is what a Steam library looks like, and it is what the picture is claiming -
   no names on the rectangles, no hours in them, nothing to click, because
   there is nothing there to be right or wrong about. The real one is the page
   you get after typing a profile in, which is the page this is advertising.

   ── The rail ──
   Storefront capsules of games that have a page of their own. Public art for
   public games; no profile is involved. That list is real because it can be:
   each one is a link to a page anybody can open.

   Regenerating the shape: it is 72 values of `1000 / i^1.06` with a fixed
   sine wobble, sorted descending. Any descending series would do. Nothing
   downstream reads them as anything but relative areas. */

/** The hero's proportions. Not hours, not anybody's, and not a unit - only the
 *  ratios between them are ever used. */
const DEMO_SHAPE = [
  1042.7, 373.9, 350.5, 245.2, 168.5, 167.7, 118.2, 114.1, 93.1,
  90.3, 77.1, 75.6, 60.8, 59.2, 57.6, 55.0, 50.5, 45.5,
  41.7, 40.7, 39.6, 39.3, 37.0, 34.5, 34.3, 30.9, 30.8,
  30.0, 29.9, 27.8, 25.8, 25.3, 24.4, 24.0, 21.9, 20.9,
  20.9, 20.6, 20.1, 19.3, 19.3, 19.2, 19.0, 18.2, 18.0,
  17.4, 17.1, 17.0, 16.7, 16.3, 16.3, 16.3, 15.2, 14.2,
  14.1, 13.5, 13.2, 13.1, 12.9, 12.7, 12.4, 12.0, 12.0,
  11.5, 11.5, 11.4, 11.3, 11.3, 11.2, 10.4, 8.6, 7.9,
];

/* ── The rail ──────────────────────────────────────────────────────────
   A page built out of a game's own interface is not a claim anybody believes
   from a sentence, so the sentence is followed by the covers of the games it is
   about, and each one is the link to the page. 157 games have one; these are
   the ones a reader is likely to recognise, which is the only thing being
   selected for.

   Names are the storefront's own, exactly as the site prints them elsewhere -
   they are proper nouns and are never translated.

   Twenty-four and not a hundred and fifty-seven, because every one of them is a
   picture. The art is `capsule_231x87.jpg` from Steam's CDN - about 10 KB each,
   against 40 for `header.jpg` and 400 for the hero under `/art/` - and it is
   drawn at exactly the size it was cut for, so nothing is downloaded to then be
   thrown away by a resize. Twenty-four of those is a quarter of a megabyte,
   which is about what a strip of covers is worth on a page nobody came here to
   look at pictures on.

   They are also not `loading="lazy"`, and that is not an oversight. The lane is
   `width: max-content` and moves by transform, so the browser's idea of which
   card is near the viewport is the one from before the animation ever ran, and
   half of them sat blank for as long as anybody watched. They load eagerly at
   `fetchpriority="low"` instead: last in the queue, but they do arrive.

   Adding a game here is one line. It has to be a game with a layout, which is
   decided by the api and not by this file, so the check is: does /g/<appid>
   open something other than the generic page. */
const DEMO_RAIL = [
  [570, 'Dota 2'],
  [730, 'Counter-Strike 2'],
  [440, 'Team Fortress 2'],
  [220, 'Half-Life 2'],
  [546560, 'Half-Life: Alyx'],
  [271590, 'Grand Theft Auto V Legacy'],
  [1091500, 'Cyberpunk 2077'],
  [1086940, "Baldur's Gate 3"],
  [413150, 'Stardew Valley'],
  [892970, 'Valheim'],
  [252490, 'Rust'],
  [4000, "Garry's Mod"],
  [227300, 'Euro Truck Simulator 2'],
  [1250410, 'Microsoft Flight Simulator (2020)'],
  [107410, 'Arma 3'],
  [275850, "No Man's Sky"],
  [1174180, 'Red Dead Redemption 2'],
  [550, 'Left 4 Dead 2'],
  [1623730, 'Palworld'],
  [578080, 'PUBG: BATTLEGROUNDS'],
  [359550, "Tom Clancy's Rainbow Six Siege"],
  [1794680, 'Vampire Survivors'],
  [381210, 'Dead by Daylight'],
  [255710, 'Cities: Skylines'],
];

/** How many games have a page built out of their own interface. Written down
 *  rather than counted from DEMO_RAIL, which is a shortlist: the number belongs
 *  to GAME_LAYOUTS in the api, and this is the copy the front page prints. */
const DEMO_THEMES = 157;
