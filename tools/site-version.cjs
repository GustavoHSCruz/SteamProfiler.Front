/* The Front commit being built, independent of the terms revision. */
const { execFileSync } = require('node:child_process');

function getSiteVersion(repository) {
  const git = (...args) => execFileSync('git', ['-C', repository, ...args], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    env: Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_'))),
  }).trim();
  try {
    const commit = git('rev-parse', 'HEAD');
    const dirty = Boolean(git('status', '--porcelain', '--untracked-files=normal'));
    return { commit, dirty };
  } catch { return { commit: null, dirty: true }; }
}

function validateSiteVersion(version) {
  if (!version || (version.commit !== null && !/^[a-f0-9]{40}$/.test(version.commit)) || typeof version.dirty !== 'boolean')
    throw Error('Invalid site version metadata');
  return version;
}

module.exports = { getSiteVersion, validateSiteVersion };
