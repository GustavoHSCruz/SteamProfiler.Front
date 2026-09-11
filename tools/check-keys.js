/* Fails if any site script asks for a dictionary key that does not exist.

   t() is deliberately forgiving: a missing key falls back to English and then
   to the key itself, so nothing crashes and nothing is blank. What happens
   instead is that the literal string `hs.owned_idle` is drawn in the column
   where a reader expected "owned, never opened" - which looks like the site
   working, until somebody reads it. That is worse than a crash, because a
   crash gets noticed.

   Only literal keys are checked - `t('gen.note')` and not `t(axis.title)` or
   `t(\`genre.${g.id}\`)`. A computed key cannot be resolved without running
   the page, and the two kinds have different failure modes anyway: the
   computed ones are looked up against a table that already fell back on
   purpose, and this is the one class that is simply a typo.

   The other direction is not checked. A key in the dictionary that nothing reads is
   dead weight and not a bug, and half of them are read from HTML or sent by
   the api rather than named in a script here.

   Run from the repo root:

     node tools/check-keys.js
*/
const fs = require('fs'), path = require('path');

const SITE = 'site';

/* English is the one that has to answer for every key: it is what the shells
   are baked in and what every other language is built on top of. */
const EN = require('./dicts.js').load().en;

/* `t('some.key'` and nothing else: a quoted literal in the shape a key has,
   read straight off the source. A parser would be the tidier answer and would
   not be a better one - this is a lint over a convention, and the convention
   is that keys are written out. */
const CALL = /\bt\('([a-z][a-z0-9_]*\.[a-z0-9_.]+)'/g;

const missing = [];
for (const file of fs.readdirSync(SITE).sort()) {
  if (!file.endsWith('.js') || file.startsWith('dict.')) continue;
  const src = fs.readFileSync(path.join(SITE, file), 'utf8');
  for (const m of src.matchAll(CALL)) {
    if (!(m[1] in EN)) missing.push(`${file}: ${m[1]}`);
  }
}

if (missing.length) {
  console.error(`${missing.length} key(s) asked for and not in the dictionary:`);
  for (const line of missing) console.error(`  ✗ ${line}`);
  process.exit(1);
}
console.log('keys ok: every literal t() in site/*.js is in the dictionary');
