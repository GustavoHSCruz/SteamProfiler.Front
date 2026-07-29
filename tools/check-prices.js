/* The batch checklist for the per-game price blocks, run as a command.

   The point of these five checks is that "these are eight different designs"
   stops being an opinion. Four of them are structural and one is the one that
   actually matters:

     a block that reads `g` has stopped being a price and started being a
     second layout - the (f)-only signature is the whole defence against a
     hundred and twenty-eight blocks turning into one block copied that many
     times, and it is worth nothing if it is not enforced;

     a block that reuses none of its own page's classes is a template with a
     new prefix. Furniture from the room, or it is not bespoke.

   Run from the repo root: node tools/check-prices.js */
const fs = require('fs'), vm = require('vm');

const LANGS = ['en', 'pt', 'ru'];
const fail = [];
const js = fs.readFileSync('site/game.js', 'utf8');
const css = fs.readFileSync('site/games.css', 'utf8');

const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('site/dict.js', 'utf8') + ';globalThis.__D=DICT;', ctx);
const DICT = ctx.__D;

/* ── The registry ──────────────────────────────────────────────────── */

const registry = js.match(/const PRICES = \{([\s\S]*?)\n\};/);
if (!registry) {
  console.error('  ✗ PRICES not found in game.js');
  process.exit(1);
}
const themes = [...registry[1].matchAll(/'([^']+)':\s*(\w+)/g)].map((m) => [m[1], m[2]]);

const layouts = js.match(/const LAYOUTS = \{([\s\S]*?)\n\};/);
const known = new Set([...layouts[1].matchAll(/'([^']+)':/g)].map((m) => m[1]));

for (const [theme] of themes) {
  if (!known.has(theme)) fail.push(`PRICES has "${theme}", which is not a theme in LAYOUTS`);
}

/* ── Per block ─────────────────────────────────────────────────────── */

/** The body of one function, from its declaration to the next top-level one. */
function bodyOf(name) {
  const at = js.indexOf(`\nfunction ${name}(`);
  if (at < 0) return null;
  const rest = js.slice(at + 10);
  const next = rest.search(/\n(function |const [A-Z])/);
  return next < 0 ? rest : rest.slice(0, next);
}

/** The same body with every string literal and comment blanked out. Needed
 *  because `g.p_head` inside t('g.p_head') is a dictionary key, not a read of
 *  the payload, and the first version of this check could not tell them
 *  apart - it failed all eight blocks for doing nothing wrong. */
const code = (body) => body
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\/\/[^\n]*/g, ' ')
  .replace(/'(?:[^'\\]|\\.)*'/g, "''")
  .replace(/"(?:[^"\\]|\\.)*"/g, '""')
  .replace(/`(?:[^`\\]|\\.)*`/g, '``');

for (const [theme, fn] of themes) {
  const body = bodyOf(fn);
  if (!body) { fail.push(`${theme}: ${fn}() not found`); continue; }

  // 1. The signature. `(f)` and nothing else.
  const sig = body.match(/^\s*(\w+)\s*\(([^)]*)\)/);
  if (!sig || sig[2].trim() !== 'f') {
    fail.push(`${theme}: ${fn}(${sig ? sig[2] : '?'}) - a price block takes (f) and nothing else`);
  }
  // 2. And it must not reach for the payload by any other route.
  const reaches = code(body).match(/\bg\.[a-z_]+/g);
  if (reaches) fail.push(`${theme}: ${fn}() reads ${[...new Set(reaches)].join(', ')} - blocks never see g`);

  // 3. Its CSS lives in its own theme's section, not in a shared one.
  const own = [...body.matchAll(/cls: '([a-z0-9\- ]+)'/g)]
    .flatMap((m) => m[1].split(' ')).filter(Boolean);
  const mine = own.filter((c) => c.includes('-price'));
  const section = sectionOf(theme);
  for (const c of new Set(mine)) {
    if (css.includes(`.${c} `) || css.includes(`.${c},`) || css.includes(`.${c}[`)) {
      if (section && !section.includes(`.${c}`)) {
        fail.push(`${theme}: .${c} is styled outside that theme's own section in games.css`);
      }
    }
  }

  // 4. Furniture from the room. At least one class that this page already had
  //    before the price block existed.
  const borrowed = own.filter((c) => !c.includes('-price') && !c.startsWith('pz'));
  if (!borrowed.length) {
    fail.push(`${theme}: ${fn}() reuses no class from its own page - that is a template, not a block`);
  }

  // 5. Every string it asks for exists in all three languages.
  // (?<![\w.]) so that the `t` at the end of priceFoot( is not read as t(.
  for (const key of [...body.matchAll(/(?<![\w.])t\('([^']+)'/g)].map((m) => m[1])) {
    for (const l of LANGS) {
      if (DICT[l][key] == null) fail.push(`${theme}: ${key} missing in "${l}"`);
    }
  }
  // Including the per-game sentences, which are looked up by name at runtime
  // and so would never show up in a grep for t('...').
  const slug = theme.replace(/-/g, '_');
  const states = LANGS.flatMap((l) => Object.keys(DICT[l])
    .filter((k) => k.startsWith(`g.p_${slug}_`)));
  if (!states.length) {
    fail.push(`${theme}: no g.p_${slug}_<state> sentence - the block would speak in the shared voice`);
  }
  for (const key of new Set(states)) {
    for (const l of LANGS) {
      if (DICT[l][key] == null) fail.push(`${theme}: ${key} missing in "${l}"`);
    }
  }
}

/** The slice of games.css that belongs to one theme, banner to banner. */
function sectionOf(theme) {
  const at = css.indexOf(`:root[data-game="${theme}"]`);
  if (at < 0) return null;
  const before = css.lastIndexOf('/* ══', at);
  const after = css.indexOf('/* ══', at);
  return css.slice(before < 0 ? 0 : before, after < 0 ? css.length : after);
}

/* ── Verdict ───────────────────────────────────────────────────────── */

if (fail.length) {
  for (const f of fail) console.error(`  ✗ ${f}`);
  console.error(`\n${fail.length} problem(s) in the price blocks.`);
  process.exit(1);
}
console.log(`price blocks ok: ${themes.length} of 128 themes have one of their own`);
console.log(`  ${themes.map(([t]) => t).join(', ')}`);
