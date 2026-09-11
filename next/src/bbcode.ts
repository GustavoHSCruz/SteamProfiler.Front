/* Steam's news bodies are BBCode, and this turns them into markup.

   Written rather than pulled in, because the dialect is small and known: a
   count over the last twenty posts of the news hub gives p, b, i, u, h2,
   list, *, url, img, video and previewyoutube, and nothing else. A parser
   for all of BBCode would be a dependency and a larger attack surface for a
   vocabulary this page can enumerate.

   It is a tokeniser and not a chain of replacements, and that is the part
   worth reading. Text runs are escaped before they are emitted, so anything
   in Steam's copy that looks like markup arrives as the characters somebody
   typed; a tag this file does not know is dropped rather than passed
   through; and every URL has to be http(s) after the placeholder is resolved
   or it does not become an attribute at all. The output of this function is
   the only thing on the page written with innerHTML, and that is the reason
   it can be. */

/* Steam writes the host as a placeholder so it can move it. Both spellings
   appear in the same feed; both resolve to the same CDN, which is already
   one of the image hosts the served site's policy allows. */
const CLAN = 'https://clan.steamstatic.com/images';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const resolve = (s: string) =>
  s.replace(/\{STEAM_CLAN_LOC_IMAGE\}/g, CLAN).replace(/\{STEAM_CLAN_IMAGE\}/g, CLAN).trim();

/** An http(s) address or nothing. Everything else - javascript:, data:, a
 *  relative path, a placeholder Steam has stopped filling in - is dropped,
 *  and the tag around it is dropped with it. */
function link(raw: string | undefined): string | null {
  if (!raw) return null;
  const url = resolve(raw.replace(/^["']|["']$/g, ''));
  return /^https?:\/\//i.test(url) ? esc(url) : null;
}

/** `key="value"` pairs out of a tag's tail. */
function attrs(tail: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tail.matchAll(/([a-z_]+)\s*=\s*"([^"]*)"/gi)) out[m[1].toLowerCase()] = m[2];
  return out;
}

const TAG = /\[(\/?)([a-zA-Z*][a-zA-Z0-9]*)((?:=|\s)[^\]]*)?\]/g;

export function bbcode(source: string): string {
  let out = '';
  let at = 0;
  /* What is open, so a tag that never closes cannot leave the document open
     either: whatever is still on this stack at the end is closed here. */
  const open: string[] = [];

  const close = (tag: string) => {
    const i = open.lastIndexOf(tag);
    if (i === -1) return;
    while (open.length > i) out += `</${open.pop()}>`;
  };

  for (const m of source.matchAll(TAG)) {
    out += esc(source.slice(at, m.index));
    at = m.index + m[0].length;

    const closing = m[1] === '/';
    const name = m[2].toLowerCase();
    const tail = m[3] ?? '';

    if (closing) {
      if (name === 'p') close('p');
      else if (name === 'b' || name === 'i' || name === 'u') close({ b: 'strong', i: 'em', u: 'u' }[name]!);
      else if (name === 'list') close('ul');
      else if (name === '*') close('li');
      else if (/^h[1-6]$/.test(name)) close('h3');
      else if (name === 'url') close('a');
      continue;
    }

    switch (true) {
      case name === 'p':
        out += '<p>'; open.push('p'); break;
      case name === 'b':
        out += '<strong>'; open.push('strong'); break;
      case name === 'i':
        out += '<em>'; open.push('em'); break;
      case name === 'u':
        out += '<u>'; open.push('u'); break;
      case /^h[1-6]$/.test(name):
        out += '<h3>'; open.push('h3'); break;
      case name === 'list':
        out += '<ul>'; open.push('ul'); break;
      case name === '*':
        /* Steam closes these, but not always in the same post. An item that
           is still open when the next one starts is closed here. */
        close('li');
        out += '<li>'; open.push('li'); break;
      case name === 'url': {
        const href = link(tail.replace(/^=/, ''));
        if (href) { out += `<a href="${href}" target="_blank" rel="noopener nofollow">`; open.push('a'); }
        break;
      }
      case name === 'img': {
        const src = link(attrs(tail).src);
        if (src) out += `<img src="${src}" alt="" loading="lazy" decoding="async">`;
        break;
      }
      case name === 'video': {
        const a = attrs(tail);
        const mp4 = link(a.mp4);
        const webm = link(a.webm);
        const poster = link(a.poster);
        if (mp4 || webm) {
          /* preload="none" and controls on, whatever the post asked for.
             Steam writes autoplay="true" controls="false" into most of
             these, which is a decision about somebody else's page and about
             somebody else's data allowance. */
          out += `<video controls playsinline preload="none"${poster ? ` poster="${poster}"` : ''}>`;
          if (webm) out += `<source src="${webm}" type="video/webm">`;
          if (mp4) out += `<source src="${mp4}" type="video/mp4">`;
          out += '</video>';
        }
        break;
      }
      case name === 'previewyoutube': {
        /* A link and not an embed. An iframe here would put YouTube on a
           page belonging to a site whose whole argument is that it carries
           no third party, and it would do it to autoplay a trailer nobody
           asked for. The id is all that is needed to offer the door. */
        const id = (tail.replace(/^=/, '').replace(/^["']|["']$/g, '').split(';')[0] || '').trim();
        if (/^[\w-]{6,20}$/.test(id)) {
          out += `<p class="yt"><a href="https://www.youtube.com/watch?v=${esc(id)}" target="_blank" rel="noopener nofollow">youtube ↗</a></p>`;
        }
        break;
      }
      default:
        /* Unknown tag: dropped, and its text kept. */
        break;
    }
  }

  out += esc(source.slice(at));
  while (open.length) out += `</${open.pop()}>`;
  /* Steam's editor leaves a lot of these behind as spacing. */
  return out.replace(/<p>\s*<\/p>/g, '');
}
