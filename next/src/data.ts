/* The same numbers the served site draws, and for the same reasons.

   The shape is nobody's: seventy-two proportions of a power law with a wobble
   in it, which is what a Steam library looks like drawn to scale. A real
   profile here would put one person's game names on the front of the site,
   which is the mistake this list exists to avoid.

   The rail is real, because it can be: twenty-four public games with a page
   written for their own interface, each one a link anybody can open. */

export const DEMO_SHAPE: number[] = [
  1042.7, 373.9, 350.5, 245.2, 168.5, 167.7, 118.2, 114.1, 93.1,
  90.3, 77.1, 75.6, 60.8, 59.2, 57.6, 55, 50.5, 45.5,
  41.7, 40.7, 39.6, 39.3, 37, 34.5, 34.3, 30.9, 30.8,
  30, 29.9, 27.8, 25.8, 25.3, 24.4, 24, 21.9, 20.9,
  20.9, 20.6, 20.1, 19.3, 19.3, 19.2, 19, 18.2, 18,
  17.4, 17.1, 17, 16.7, 16.3, 16.3, 16.3, 15.2, 14.2,
  14.1, 13.5, 13.2, 13.1, 12.9, 12.7, 12.4, 12, 12,
  11.5, 11.5, 11.4, 11.3, 11.3, 11.2, 10.4, 8.6, 7.9,
];

export const DEMO_THEMES = 157;

export const DEMO_RAIL: [number, string][] = [
  [570, "Dota 2"],
  [730, "Counter-Strike 2"],
  [440, "Team Fortress 2"],
  [220, "Half-Life 2"],
  [546560, "Half-Life: Alyx"],
  [271590, "Grand Theft Auto V Legacy"],
  [1091500, "Cyberpunk 2077"],
  [1086940, "Baldur's Gate 3"],
  [413150, "Stardew Valley"],
  [892970, "Valheim"],
  [252490, "Rust"],
  [4000, "Garry's Mod"],
  [227300, "Euro Truck Simulator 2"],
  [1250410, "Microsoft Flight Simulator (2020)"],
  [107410, "Arma 3"],
  [275850, "No Man's Sky"],
  [1174180, "Red Dead Redemption 2"],
  [550, "Left 4 Dead 2"],
  [1623730, "Palworld"],
  [578080, "PUBG: BATTLEGROUNDS"],
  [359550, "Tom Clancy's Rainbow Six Siege"],
  [1794680, "Vampire Survivors"],
  [381210, "Dead by Daylight"],
  [255710, "Cities: Skylines"],
];

export type Franchise = {
  slug: string; name: string; born: number; last: number;
  n: number; flagship: number; tint: string;
};

export const FRANCHISES: Franchise[] = [
  {"slug": "half-life", "name": "Half-Life", "born": 1998, "flagship": 220, "tint": "#ff9b21", "last": 2020, "n": 11},
  {"slug": "counter-strike", "name": "Counter-Strike", "born": 1999, "flagship": 730, "tint": "#f0a92e", "last": 2023, "n": 7},
  {"slug": "portal", "name": "Portal", "born": 2007, "flagship": 620, "tint": "#f79b2c", "last": 2011, "n": 2},
  {"slug": "grand-theft-auto", "name": "Grand Theft Auto", "born": 1997, "flagship": 271590, "tint": "#ff5fa2", "last": 2025, "n": 10},
  {"slug": "the-elder-scrolls", "name": "The Elder Scrolls", "born": 1994, "flagship": 489830, "tint": "#c9a83f", "last": 2025, "n": 11},
  {"slug": "fallout", "name": "Fallout", "born": 1997, "flagship": 377160, "tint": "#5fe08a", "last": 2018, "n": 8},
  {"slug": "stalker", "name": "S.T.A.L.K.E.R.", "born": 2007, "flagship": 1643320, "tint": "#a8c43f", "last": 2025, "n": 7},
  {"slug": "arma", "name": "Arma", "born": 2001, "flagship": 107410, "tint": "#96331b", "last": 2022, "n": 8},
  {"slug": "dark-souls", "name": "Dark Souls", "born": 2011, "flagship": 374320, "tint": "#c9a227", "last": 2025, "n": 9},
  {"slug": "resident-evil", "name": "Resident Evil", "born": 1996, "flagship": 2050650, "tint": "#c1272d", "last": 2023, "n": 9},
];

export const HEADER_ART = 'https://cdn.cloudflare.steamstatic.com/steam/apps';

export type Rect = { x: number; y: number; w: number; h: number; value: number };

/** Squarified treemap, ported from lib.js unchanged in behaviour: the served
 *  page and this one have to agree about what a library looks like. */
export function squarify(values: number[], x0: number, y0: number, w0: number, h0: number): Rect[] {
  const out: Rect[] = [];
  const total = values.reduce((s, v) => s + v, 0);
  if (!total || w0 <= 0 || h0 <= 0) return out;

  const scale = (w0 * h0) / total;
  let x = x0, y = y0, w = w0, h = h0;
  const queue = values.slice();
  let row: { value: number; area: number }[] = [];
  let rowArea = 0;

  const worst = (areas: number[], sum: number, len: number) => {
    if (!areas.length || sum <= 0) return Infinity;
    let mx = -Infinity, mn = Infinity;
    for (const a of areas) { if (a > mx) mx = a; if (a < mn) mn = a; }
    const s2 = sum * sum, l2 = len * len;
    return Math.max((l2 * mx) / s2, s2 / (l2 * mn));
  };

  const flush = () => {
    if (!row.length) return;
    const len = Math.min(w, h);
    const thick = rowArea / len;
    let off = 0;
    for (const r of row) {
      const side = (r.area / rowArea) * len;
      if (w >= h) out.push({ value: r.value, x, y: y + off, w: thick, h: side });
      else out.push({ value: r.value, x: x + off, y, w: side, h: thick });
      off += side;
    }
    if (w >= h) { x += thick; w = Math.max(0, w - thick); }
    else { y += thick; h = Math.max(0, h - thick); }
    row = [];
    rowArea = 0;
  };

  while (queue.length) {
    const value = queue[0];
    const area = value * scale;
    const len = Math.min(w, h);
    if (len <= 0) break;
    const areas = row.map((r) => r.area);
    if (!row.length || worst(areas, rowArea, len) >= worst([...areas, area], rowArea + area, len)) {
      row.push({ value, area });
      rowArea += area;
      queue.shift();
    } else {
      flush();
    }
  }
  flush();
  return out;
}
