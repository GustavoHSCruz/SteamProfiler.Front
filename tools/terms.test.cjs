/* Exercise the Git link and preservation rules without touching this repo's Git. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const { generate } = require('./gen-terms.js');

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'steamprofiler-terms-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const folder of ['tools', 'site', 'legal/terms']) fs.mkdirSync(path.join(dir, folder), { recursive: true });
  const files = ['tools/gen-terms.js', 'tools/dicts.js', 'site/terms.html', 'legal/terms/v1.json'];
  files.push(...fs.readdirSync(path.join(root, 'site')).filter(f => /^dict\..*\.js$/.test(f)).map(f => `site/${f}`));
  for (const file of files) fs.copyFileSync(path.join(root, file), path.join(dir, file));
  const git = (...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_'))) }).trim();
  git('init', '--quiet');
  git('config', 'user.name', 'Terms archive test');
  git('config', 'user.email', 'terms-test@example.invalid');
  const run = (...args) => {
    const previous = process.cwd();
    try {
      process.chdir(dir);
      generate({ check: args.includes('--check'), requireCommits: args.includes('--require-commits') });
      return { status: 0, stderr: '' };
    } catch (error) { return { status: 1, stderr: error.message }; }
    finally { process.chdir(previous); }
  };
  const commit = () => { git('add', 'legal/terms'); git('commit', '--quiet', '-m', 'Add terms revision'); return git('rev-parse', 'HEAD'); };
  const log = () => {
    const ctx = {}; vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(dir, 'site/terms-log.js'), 'utf8') + ';globalThis.log = TERMS_LOG;', ctx);
    return ctx.log;
  };
  return { dir, git, run, commit, log };
}

test('drafts have no fabricated hash and cannot be published', t => {
  const f = fixture(t);
  assert.equal(f.run().status, 0);
  assert.equal(f.log()[0].commit, null);
  const result = f.run('--require-commits');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /commit the snapshot before publishing/);
});

test('publication links the introducing commit and later commits do not replace it', t => {
  const f = fixture(t);
  const sha = f.commit();
  f.git('commit', '--allow-empty', '--quiet', '-m', 'Unrelated change');
  const result = f.run('--require-commits');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(f.log()[0].commit, sha);
  const page = fs.readFileSync(path.join(f.dir, 'site/terms.html'), 'utf8');
  assert.ok(page.includes(`/commit/${sha}`));
  assert.ok(page.includes('id="tos-draft" hidden'));
  assert.equal(f.run('--check', '--require-commits').status, 0);
});

test('editing a committed snapshot is rejected', t => {
  const f = fixture(t); f.commit();
  const file = path.join(f.dir, 'legal/terms/v1.json');
  const rev = JSON.parse(fs.readFileSync(file, 'utf8')); rev.summary.en = 'Rewritten history';
  fs.writeFileSync(file, JSON.stringify(rev, null, 2) + '\n');
  const result = f.run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /published snapshot changed/);
});

test('appending a revision preserves the old text and its introducing SHA', t => {
  const f = fixture(t); const first = f.commit();
  const original = fs.readFileSync(path.join(f.dir, 'legal/terms/v1.json'), 'utf8');
  const rev = JSON.parse(original); rev.version = 2; rev.date = '2026-09-16';
  rev.summary.en = 'New effective date'; rev.summary.pt = 'Nova data de vigência';
  fs.writeFileSync(path.join(f.dir, 'legal/terms/v2.json'), JSON.stringify(rev, null, 2) + '\n');
  const second = f.commit();
  const result = f.run('--require-commits');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(f.log()[0].commit, first);
  assert.equal(f.log()[1].commit, second);
  assert.equal(fs.readFileSync(path.join(f.dir, 'legal/terms/v1.json'), 'utf8'), original);
  assert.ok(fs.readFileSync(path.join(f.dir, 'site/terms.html'), 'utf8').includes('datetime="2026-09-16"'));
  assert.equal(f.run('--check', '--require-commits').status, 0);
});
