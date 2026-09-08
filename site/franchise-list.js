/* steamprofiler.org - which ten franchises there are.

   The table and nothing else, because three pages want it and only one of
   them wants the code that draws it: the landing page prints the ten as a way
   in, franchises.js builds the screens, and both of those load on a profile.
   Splitting it is what keeps the front page from carrying ten renderers and
   an animation engine to show ten names.

   This file is the whole editorial content of the franchise screens and is
   meant to be edited: a franchise is an entry, and a game in one is a line.
   Every appid in it was checked against the storefront rather than
   remembered, because a wrong one is a page about the wrong game with the
   wrong art on it. The names were taken off the storefront too, so a screen
   reads properly before the api answers and with it down entirely.

   `year` is the year the game came out. It is deliberately not the year Steam
   says, because those are two different facts and the whole timeline turns on
   the difference: Arena was made in 1994 and reached this shop in 2022, GTA III
   was made in 2001 and arrived in 2008. Steam's date comes from the api, is
   printed beside this one, and the screen says so wherever they disagree.

   Nothing here is executed and nothing here reads the DOM: it is a list. */

/* Games a franchise's screen links to. `id` is the appid, `year` is when the
   game shipped anywhere, and `tag` is the one word this entry needs so a row
   of near-identical names reads as a list of different things. */
const FRANCHISES = [
  {
    slug: 'half-life',
    name: 'Half-Life',
    house: 'Valve',
    born: 1998,
    flagship: 220,
    tint: '#ff9b21',
    apps: [
      { id: 70, year: 1998, name: 'Half-Life' },
      { id: 50, year: 1999, tag: 'fx.tag_expansion', name: 'Half-Life: Opposing Force' },
      { id: 130, year: 2001, tag: 'fx.tag_expansion', name: 'Half-Life: Blue Shift' },
      { id: 220, year: 2004, name: 'Half-Life 2' },
      { id: 320, year: 2004, tag: 'fx.tag_multiplayer', name: 'Half-Life 2: Deathmatch' },
      { id: 280, year: 2004, tag: 'fx.tag_port', name: 'Half-Life: Source' },
      { id: 340, year: 2005, tag: 'fx.tag_demo', name: 'Half-Life 2: Lost Coast' },
      { id: 360, year: 2006, tag: 'fx.tag_multiplayer', name: 'Half-Life Deathmatch: Source' },
      { id: 380, year: 2006, tag: 'fx.tag_episode', name: 'Half-Life 2: Episode One' },
      { id: 420, year: 2007, tag: 'fx.tag_episode', name: 'Half-Life 2: Episode Two' },
      { id: 546560, year: 2020, tag: 'fx.tag_vr', name: 'Half-Life: Alyx' },
    ],
  },
  {
    slug: 'counter-strike',
    name: 'Counter-Strike',
    house: 'Valve',
    born: 1999,
    flagship: 730,
    tint: '#f0a92e',
    apps: [
      { id: 10, year: 2000, name: 'Counter-Strike' },
      { id: 80, year: 2004, name: 'Counter-Strike: Condition Zero' },
      { id: 100, year: 2004, tag: 'fx.tag_deleted', name: 'Counter-Strike: Condition Zero' },
      { id: 240, year: 2004, tag: 'fx.tag_port', name: 'Counter-Strike: Source' },
      { id: 4465480, year: 2012, tag: 'fx.tag_restored', name: 'Counter-Strike: Global Offensive' },
      { id: 273110, year: 2014, tag: 'fx.tag_spinoff', name: 'Counter-Strike Nexon' },
      { id: 730, year: 2023, name: 'Counter-Strike 2' },
    ],
  },
  {
    slug: 'portal',
    name: 'Portal',
    house: 'Valve',
    born: 2007,
    flagship: 620,
    tint: '#f79b2c',
    apps: [
      { id: 400, year: 2007, name: 'Portal' },
      { id: 620, year: 2011, name: 'Portal 2' },
    ],
  },
  {
    slug: 'grand-theft-auto',
    name: 'Grand Theft Auto',
    house: 'Rockstar Games',
    born: 1997,
    flagship: 271590,
    tint: '#ff5fa2',
    apps: [
      { id: 12100, year: 2001, name: 'Grand Theft Auto III' },
      { id: 12110, year: 2002, name: 'Grand Theft Auto: Vice City' },
      { id: 12120, year: 2004, name: 'Grand Theft Auto: San Andreas' },
      { id: 12210, year: 2008, name: 'Grand Theft Auto IV: The Complete Edition' },
      { id: 12220, year: 2009, tag: 'fx.tag_episode', name: 'Grand Theft Auto: Episodes from Liberty City' },
      { id: 271590, year: 2013, name: 'Grand Theft Auto V Legacy' },
      { id: 1546970, year: 2021, tag: 'fx.tag_remaster', name: 'Grand Theft Auto III – The Definitive Edition' },
      { id: 1546990, year: 2021, tag: 'fx.tag_remaster', name: 'Grand Theft Auto: Vice City – The Definitive Edition' },
      { id: 1547000, year: 2021, tag: 'fx.tag_remaster', name: 'Grand Theft Auto: San Andreas – The Definitive Edition' },
      { id: 3240220, year: 2025, tag: 'fx.tag_remaster', name: 'Grand Theft Auto V Enhanced' },
    ],
  },
  {
    slug: 'the-elder-scrolls',
    name: 'The Elder Scrolls',
    house: 'Bethesda',
    born: 1994,
    flagship: 489830,
    tint: '#c9a83f',
    apps: [
      { id: 1812290, year: 1994, name: 'The Elder Scrolls: Arena' },
      { id: 1812390, year: 1996, name: 'The Elder Scrolls II: Daggerfall' },
      { id: 1812420, year: 1997, tag: 'fx.tag_spinoff', name: 'An Elder Scrolls Legend: Battlespire' },
      { id: 1812410, year: 1998, tag: 'fx.tag_spinoff', name: 'The Elder Scrolls Adventures: Redguard' },
      { id: 22320, year: 2002, name: 'The Elder Scrolls III: Morrowind® Game of the Year Edition' },
      { id: 22330, year: 2006, name: 'The Elder Scrolls IV: Oblivion® Game of the Year Edition (2009)' },
      { id: 72850, year: 2011, name: 'The Elder Scrolls V: Skyrim' },
      { id: 306130, year: 2014, tag: 'fx.tag_mmo', name: 'The Elder Scrolls® Online' },
      { id: 489830, year: 2016, tag: 'fx.tag_remaster', name: 'The Elder Scrolls V: Skyrim Special Edition' },
      { id: 611670, year: 2018, tag: 'fx.tag_vr', name: 'The Elder Scrolls V: Skyrim VR' },
      { id: 2623190, year: 2025, tag: 'fx.tag_remaster', name: 'The Elder Scrolls IV: Oblivion Remastered' },
    ],
  },
  {
    slug: 'fallout',
    name: 'Fallout',
    house: 'Interplay, then Bethesda',
    born: 1997,
    flagship: 377160,
    tint: '#5fe08a',
    apps: [
      { id: 38400, year: 1997, name: 'Fallout: A Post Nuclear Role Playing Game' },
      { id: 38410, year: 1998, name: 'Fallout 2: A Post Nuclear Role Playing Game' },
      { id: 38420, year: 2001, tag: 'fx.tag_spinoff', name: 'Fallout Tactics: Brotherhood of Steel' },
      { id: 22300, year: 2008, name: 'Fallout 3' },
      { id: 22370, year: 2009, tag: 'fx.tag_goty', name: 'Fallout 3: Game of the Year Edition' },
      { id: 22380, year: 2010, name: 'Fallout: New Vegas' },
      { id: 377160, year: 2015, name: 'Fallout 4' },
      { id: 1151340, year: 2018, tag: 'fx.tag_mmo', name: 'Fallout 76' },
    ],
  },
  {
    slug: 'stalker',
    name: 'S.T.A.L.K.E.R.',
    house: 'GSC Game World',
    born: 2007,
    flagship: 1643320,
    tint: '#a8c43f',
    apps: [
      { id: 4500, year: 2007, name: 'S.T.A.L.K.E.R.: Shadow of Chernobyl' },
      { id: 20510, year: 2008, name: 'S.T.A.L.K.E.R.: Clear Sky' },
      { id: 41700, year: 2009, name: 'S.T.A.L.K.E.R.: Call of Pripyat' },
      { id: 1643320, year: 2024, name: 'S.T.A.L.K.E.R. 2: Heart of Chornobyl' },
      { id: 2427410, year: 2025, tag: 'fx.tag_remaster', name: 'S.T.A.L.K.E.R.: Shadow of Chornobyl - Enhanced Edition' },
      { id: 2427420, year: 2025, tag: 'fx.tag_remaster', name: 'S.T.A.L.K.E.R.: Clear Sky - Enhanced Edition' },
      { id: 2427430, year: 2025, tag: 'fx.tag_remaster', name: 'S.T.A.L.K.E.R.: Call of Prypiat - Enhanced Edition' },
    ],
  },
  {
    slug: 'arma',
    name: 'Arma',
    house: 'Bohemia Interactive',
    born: 2001,
    flagship: 107410,
    tint: '#96331b',
    apps: [
      { id: 65790, year: 2001, tag: 'fx.tag_renamed', name: 'Arma: Cold War Assault Remastered' },
      { id: 65780, year: 2006, name: 'ARMA: Gold Edition' },
      { id: 33910, year: 2009, name: 'ARMA 2' },
      { id: 33930, year: 2010, tag: 'fx.tag_expansion', name: 'Arma 2: Operation Arrowhead' },
      { id: 224860, year: 2013, tag: 'fx.tag_spinoff', name: 'Arma Tactics' },
      { id: 107410, year: 2013, name: 'Arma 3' },
      { id: 221100, year: 2013, tag: 'fx.tag_mod', name: 'DayZ' },
      { id: 1874880, year: 2022, name: 'Arma Reforger' },
    ],
  },
  {
    slug: 'dark-souls',
    name: 'Dark Souls',
    house: 'FromSoftware',
    born: 2011,
    flagship: 374320,
    tint: '#c9a227',
    apps: [
      { id: 211420, year: 2012, name: 'DARK SOULS™: Prepare To Die™ Edition' },
      { id: 236430, year: 2014, name: 'DARK SOULS™ II' },
      { id: 335300, year: 2015, tag: 'fx.tag_remaster', name: 'DARK SOULS™ II: Scholar of the First Sin' },
      { id: 374320, year: 2016, name: 'DARK SOULS™ III' },
      { id: 570940, year: 2018, tag: 'fx.tag_remaster', name: 'DARK SOULS™: REMASTERED' },
    ],
    /* The same studio, and not the same series. They are on this screen
       because leaving out Elden Ring would be pretending nobody arrived here
       through it, and they are in their own band because calling Armored Core
       a Dark Souls game would be wrong in a way this site can avoid. */
    after: [
      { id: 814380, year: 2019, name: 'Sekiro™: Shadows Die Twice - GOTY Edition' },
      { id: 1245620, year: 2022, name: 'ELDEN RING' },
      { id: 1888160, year: 2023, name: 'ARMORED CORE™ VI FIRES OF RUBICON™' },
      { id: 2622380, year: 2025, name: 'ELDEN RING NIGHTREIGN' },
    ],
  },
  {
    slug: 'resident-evil',
    name: 'Resident Evil',
    house: 'Capcom',
    born: 1996,
    flagship: 2050650,
    tint: '#c1272d',
    apps: [
      { id: 304240, year: 2015, made: 1996, tag: 'fx.tag_remaster', name: 'Resident Evil' },
      { id: 339340, year: 2016, made: 2002, tag: 'fx.tag_remaster', name: 'Resident Evil 0' },
      { id: 21690, year: 2009, name: 'Resident Evil 5' },
      { id: 221040, year: 2013, name: 'Resident Evil 6' },
      { id: 418370, year: 2017, name: 'Resident Evil 7 Biohazard' },
      { id: 883710, year: 2019, tag: 'fx.tag_remake', name: 'Resident Evil 2' },
      { id: 952060, year: 2020, tag: 'fx.tag_remake', name: 'Resident Evil 3' },
      { id: 1196590, year: 2021, name: 'Resident Evil Village' },
      { id: 2050650, year: 2023, tag: 'fx.tag_remake', name: 'Resident Evil 4' },
    ],
  },
];

const BY_SLUG = new Map(FRANCHISES.map((f) => [f.slug, f]));
