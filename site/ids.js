/* steamprofiler.org - every code an account has, at /u/<perfil>/ids.

   One number, written nine ways. Steam has handed out several id formats over
   twenty years and never stopped honouring the old ones, so the account a
   Source server calls STEAM_1:0:11101 is the account the Web API calls
   76561197960287930 and the account a FiveM allowlist calls
   steam:1100001000056ba. Somebody moving between a server config, an allowlist
   and a profile link needs all of them and has to find a converter every time.

   Nothing on this screen is fetched for it. Every code here is arithmetic on
   the 64-bit id the lookup already resolved, which is why the page is instant
   and why it is honest to have at all: it is not a second opinion about
   somebody's account, it is the same number in other clothes. The four lines
   that are not arithmetic - the name, the custom URL, the day the account was
   made and the avatar - were already on the payload the dashboard reads.

   The universe digit is the one place a converter has to choose. STEAM_1 and
   STEAM_0 name the same account; the first is what Steam publishes today and
   the second is what a game from 2007 prints, so both are drawn rather than
   one being declared correct. */

const SID_BASE = 76561197960265728n;
/* Steam's own alphabet for an invite code: the sixteen letters it maps the hex
   digits of an account id onto, in order, so 0 is b and f is w. The letters
   that are not here are the ones that turn a code read aloud into the wrong
   code - there is no e, no i, no o, no u, no l, no s. */
const SID_INVITE = 'bcdfghjkmnpqrtvw';

/** The 32-bit account id inside a 64-bit Steam id. */
function sidAccount(steamid) {
  return BigInt(steamid) - SID_BASE;
}

/** STEAM_<universe>:Y:Z, the format a Source server prints. */
function sidSteam2(account, universe = 1) {
  return `STEAM_${universe}:${account % 2n}:${account / 2n}`;
}

/** [U:1:<account>], the modern text form. */
function sidSteam3(account) {
  return `[U:1:${account}]`;
}

/** The id in hex, which is what FiveM writes after `steam:`. */
function sidHex(steamid) {
  return BigInt(steamid).toString(16);
}

/** The invite code behind s.team/p/<code>. Each hex digit of the account id
 *  becomes a letter, and a code longer than three letters is cut in half by a
 *  hyphen the way Steam prints it. */
function sidInvite(account) {
  const code = [...account.toString(16)]
    .map((digit) => SID_INVITE[parseInt(digit, 16)]).join('');
  return code.length > 3
    ? `${code.slice(0, Math.floor(code.length / 2))}-${code.slice(Math.floor(code.length / 2))}`
    : code;
}

/** The hash inside an avatar address, which is the account's own and is the
 *  part somebody actually wants: the three sizes are that hash and a suffix. */
function sidAvatarHash(url) {
  const match = String(url || '').match(/\/([0-9a-f]{40})(?:_\w+)?\.jpg/);
  return match ? match[1] : null;
}

/** One line: what it is called, what it is, and a button that copies it.
 *  `href` turns the value into a link, for the rows that are addresses. */
function sidRow(label, value, href) {
  if (!value) return null;
  const shown = href
    ? h('a', { cls: 'sid-value', text: value, attr: { href, rel: 'noopener' } })
    : h('code', { cls: 'sid-value', text: value });
  const button = h('button', {
    cls: 'sid-copy', text: t('sup.copy'), attr: { type: 'button' },
  });
  let timer = 0;
  button.addEventListener('click', async () => {
    button.textContent = await copy(value, shown);
    clearTimeout(timer);
    timer = setTimeout(() => { button.textContent = t('sup.copy'); }, 2500);
  });
  return h('div', { cls: 'sid-row' },
    h('span', { cls: 'sid-label', text: label }), shown, button);
}

function sidPanel(title, tag, rows) {
  const body = h('div', { cls: 'panel-body sid-rows' });
  put(body, ...rows);
  return h('article', { cls: 'panel sid-panel' },
    h('div', { cls: 'panel-bar' },
      h('span', { text: title }), tag ? h('b', { text: tag }) : null),
    body);
}

/** The screen. `d` is the profile payload the router already has. */
function renderIds(root, d, steamid, query) {
  const account = sidAccount(steamid);
  const invite = sidInvite(account);
  const custom = d.profile?.custom_url || null;
  const hash = sidAvatarHash(d.profile?.avatar);

  root.textContent = '';
  put(root, h('header', { cls: 'sid-head' },
    h('p', { cls: 'sid-kicker', text: t('sid.kicker') }),
    h('h1', { cls: 'display sid-title', text: t('sid.title') }),
    h('p', { cls: 'sid-lede', text: t('sid.lede') })));

  put(root, sidPanel(t('sid.numbers'), t('sid.numbers_tag'), [
    sidRow(t('sid.steam64'), String(steamid)),
    sidRow(t('sid.steam64_hex'), sidHex(steamid)),
    sidRow(t('sid.steam2'), sidSteam2(account)),
    sidRow(t('sid.steam2_old'), sidSteam2(account, 0)),
    sidRow(t('sid.steam3'), sidSteam3(account)),
    sidRow(t('sid.account'), String(account)),
    sidRow(t('sid.fivem'), `steam:${sidHex(steamid)}`),
    sidRow(t('sid.invite_code'), invite),
  ]));

  put(root, sidPanel(t('sid.addresses'), t('sid.addresses_tag'), [
    sidRow(t('sid.url_id'), `https://steamcommunity.com/profiles/${steamid}`,
      `https://steamcommunity.com/profiles/${steamid}`),
    sidRow(t('sid.url_steam3'), `https://steamcommunity.com/profiles/${sidSteam3(account)}`,
      `https://steamcommunity.com/profiles/${encodeURIComponent(sidSteam3(account))}`),
    custom ? sidRow(t('sid.url_custom'), `https://steamcommunity.com/id/${custom}`,
      `https://steamcommunity.com/id/${custom}`) : null,
    sidRow(t('sid.url_invite'), `https://steamcommunity.com/user/${invite}`,
      `https://steamcommunity.com/user/${invite}`),
    sidRow(t('sid.url_short'), `https://s.team/p/${invite}`, `https://s.team/p/${invite}`),
    sidRow(t('sid.url_here'), `https://steamprofiler.org/u/${custom || steamid}`,
      `/u/${encodeURIComponent(custom || steamid)}`),
  ]));

  put(root, sidPanel(t('sid.account_head'), t('sid.account_tag'), [
    sidRow(t('sid.persona'), d.profile?.persona),
    sidRow(t('sid.custom'), custom || t('sid.custom_none')),
    sidRow(t('sid.made'), d.profile?.member_since ? longDate(d.profile.member_since) : null),
    sidRow(t('sid.avatar_hash'), hash),
    hash ? sidRow(t('sid.avatar_full'),
      `https://avatars.steamstatic.com/${hash}_full.jpg`,
      `https://avatars.steamstatic.com/${hash}_full.jpg`) : null,
  ]));

  put(root, h('p', { cls: 'sid-note', text: t('sid.note') }));
}
