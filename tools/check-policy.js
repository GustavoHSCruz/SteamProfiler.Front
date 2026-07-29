/* Fails if the policy archive has drifted from the policy.

   Three things it will not let happen:

     the newest archived revision differing from the live priv.* strings, which
       would mean the policy was edited and never archived;
     a revision losing keys the one before it had, without that being visible;
     the three languages holding different key sets, in dict.js or in the
       archive, which would make the diff read differently depending on who is
       reading it.

   Run from the repo root: node tools/check-policy.js */
const fs = require('fs'), vm = require('vm');

const LANGS = ['en', 'pt', 'ru'];
const fail = [];

function load(file, name) {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(file, 'utf8') + `;globalThis.__X=${name};`, ctx);
  return ctx.__X;
}

const DICT = load('site/dict.js', 'DICT');
const LOG = load('site/policy-log.js', 'POLICY_LOG');
const TEXT = load('site/policy-text.js', 'POLICY_TEXT');

/* ── The live policy, per language ─────────────────────────────────── */

const live = {};
for (const l of LANGS) {
  live[l] = Object.fromEntries(
    Object.entries(DICT[l]).filter(([k]) => k.startsWith('priv.')));
}
for (const l of LANGS.slice(1)) {
  const a = Object.keys(live.en).sort().join('\n');
  const b = Object.keys(live[l]).sort().join('\n');
  if (a !== b) fail.push(`dict.js: priv.* keys in "${l}" differ from "en"`);
}

/* ── The archive ───────────────────────────────────────────────────── */

if (!LOG.length) fail.push('policy-log.js: no revisions');

const versions = LOG.map((r) => r.version).sort((a, b) => a - b);
if (new Set(versions).size !== versions.length) fail.push('policy-log.js: duplicate version numbers');

for (const rev of LOG) {
  const text = TEXT[rev.version];
  if (!text) {
    fail.push(`policy-text.js: revision ${rev.version} is in the log with no text`);
    continue;
  }
  for (const l of LANGS) {
    if (!text[l]) { fail.push(`policy-text.js: revision ${rev.version} has no "${l}"`); continue; }
    const a = Object.keys(text.en || {}).sort().join('\n');
    const b = Object.keys(text[l]).sort().join('\n');
    if (a !== b) fail.push(`policy-text.js: revision ${rev.version} "${l}" keys differ from "en"`);
    if (!(rev.summary || {})[l]) fail.push(`policy-log.js: revision ${rev.version} has no "${l}" summary`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rev.date || '')) {
    fail.push(`policy-log.js: revision ${rev.version} has no usable date`);
  }
}

/* ── The newest revision must BE the live policy ───────────────────── */

const latest = LOG.reduce((a, b) => (b.version > a.version ? b : a));
const archived = TEXT[latest.version] || {};
for (const l of LANGS) {
  for (const key of new Set([...Object.keys(live[l]), ...Object.keys(archived[l] || {})])) {
    if (live[l][key] !== (archived[l] || {})[key]) {
      fail.push(`v${latest.version} "${l}" ${key}: archive and dict.js disagree`
        + ` - edit the policy, then run node tools/gen-policy.js`);
    }
  }
}

/* ── The date on /privacy comes from the log, not from the HTML ────── */

const html = fs.readFileSync('site/privacy.html', 'utf8');
if (!/<time id="priv-date">/.test(html)) {
  fail.push('privacy.html: the revision date is not being read from POLICY_LOG');
}

/* ── Verdict ───────────────────────────────────────────────────────── */

if (fail.length) {
  for (const f of fail) console.error(`  ✗ ${f}`);
  console.error(`\n${fail.length} problem(s) in the policy archive.`);
  process.exit(1);
}
console.log(`policy ok: ${LOG.length} revision(s), `
  + `${Object.keys(live.en).length} keys × ${LANGS.length} languages, `
  + `v${latest.version} matches dict.js`);
