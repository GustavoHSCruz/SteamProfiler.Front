/* Run before generating other deployment artifacts so a clean release does
   not appear dirty merely because its HTML was prepared for publication. */
const fs = require('node:fs');
const path = require('node:path');
const { getSiteVersion } = require('./site-version.cjs');

const rootIndex = process.argv.indexOf('--git-root');
const repository = rootIndex === -1 ? path.resolve(__dirname, '..') : process.argv[rootIndex + 1];
try {
  if (!repository) throw Error('--git-root requires a repository path');
  const version = getSiteVersion(repository);
  if (process.argv.includes('--require-clean') && (!version.commit || version.dirty))
    throw Error('A published site version requires a clean Git checkout');
  const site = path.resolve(__dirname, '../site');
  const label = version.commit ? version.commit.slice(0, 7) : 'local';
  const link = version.commit
    ? `<a href="https://github.com/GustavoHSCruz/SteamProfiler.Front/commit/${version.commit}" target="_blank" rel="noopener noreferrer">${label}</a>`
    : '<span>local</span>';
  const local = version.dirty ? ' · <span data-i18n="foot.local_changes">local changes</span>' : '';
  const stamp = `<p class="foot-version"><span data-i18n="foot.site_version">site version</span> · ${link}${local}</p>`;
  for (const filename of fs.readdirSync(site).filter(file => file.endsWith('.html'))) {
    const file = path.join(site, filename);
    const html = fs.readFileSync(file, 'utf8');
    if (!html.includes('<footer')) continue;
    const updated = html.includes('<p class="foot-version">')
      ? html.replace(/<p class="foot-version">[\s\S]*?<\/p>/, stamp)
      : html.replace('</footer>', `  ${stamp}\n</footer>`);
    if (updated !== html) fs.writeFileSync(file, updated);
  }
  fs.writeFileSync(path.join(site, 'version.json'), JSON.stringify(version, null, 2) + '\n');
  console.log(`site version: ${label}${version.dirty ? ' (local changes)' : ''}`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
