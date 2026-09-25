import type { ReactNode } from 'react';

/* The body of a blog post, as it is typed in the owner's panel.

   Not markdown, and deliberately not: it is the six things a post here
   actually needs, each of which maps onto one element. Anything unrecognised
   stays as the characters that were typed, which is the right answer for a
   post quoting the syntax rather than using it.

   Everything is built as elements with text in them - never HTML - so a stray
   angle bracket in a sentence about HTML is a sentence about HTML, and the
   page's `script-src 'self'` means what it says here too. */

/** Only three shapes of href are ever emitted: same-site, http(s), and an
 *  anchor. Anything else - javascript:, data:, a bare word - stays as text,
 *  so a mistyped link reads as a mistyped link and not as a surprise. */
function safeHref(url: string) {
  const raw = url.trim();
  return /^(https?:\/\/|\/(?!\/)|#)/i.test(raw) ? raw : null;
}

const INLINE = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\))/g;

/** `**bold**`, `*italic*`, `` `code` `` and `[text](url)`. */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let at = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index! > at) out.push(text.slice(at, m.index));
    const token = m[0];
    const k = out.length;
    at = m.index! + token.length;
    if (token.startsWith('**')) out.push(<b key={k}>{token.slice(2, -2)}</b>);
    else if (token.startsWith('`')) out.push(<code key={k}>{token.slice(1, -1)}</code>);
    else if (token.startsWith('[')) {
      const cut = token.indexOf('](');
      const label = token.slice(1, cut);
      const href = safeHref(token.slice(cut + 2, -1));
      if (!href) out.push(token);
      else if (/^https?:/i.test(href)) out.push(<a key={k} href={href} rel="noopener noreferrer">{label}</a>);
      else out.push(<a key={k} href={href}>{label}</a>);
    } else out.push(<em key={k}>{token.slice(1, -1)}</em>);
  }
  if (at < text.length) out.push(text.slice(at));
  return out;
}

/** `![alt](/path)` or `![alt](https://cdn.steamprofiler.org/...)`, the same
 *  shape blog.py reads the preview image from, and the only two places the
 *  page's img-src lets a picture come from. */
const IMAGE = /^!\[([^\]\n]*)\]\(((?:\/(?!\/)|https:\/\/cdn\.steamprofiler\.org\/)[^)\s]*)\)$/;
const BLOCK_START = /^(```|#{2,4}\s|[-*]\s|\d+\.\s|>)/;

export function Prose({ body }: { body: string }) {
  const lines = (body || '').replace(/\r\n?/g, '\n').split('\n');
  const out: ReactNode[] = [];
  let i = 0;
  const gather = (test: (l: string) => boolean, strip: (l: string) => string) => {
    const got: string[] = [];
    while (i < lines.length && test(lines[i])) got.push(strip(lines[i++]));
    return got;
  };

  while (i < lines.length) {
    const raw = lines[i];
    const k = out.length;
    if (!raw.trim()) { i += 1; continue; }

    /* Fenced code first and verbatim: inside it nothing is a marker. */
    if (raw.startsWith('```')) {
      i += 1;
      const code: string[] = [];
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++]);
      i += 1;
      out.push(<pre key={k}><code>{code.join('\n')}</code></pre>);
      continue;
    }
    const heading = /^(#{2,4})\s+/.exec(raw);
    if (heading) {
      const H = `h${Math.min(heading[1].length, 4)}` as 'h2' | 'h3' | 'h4';
      out.push(<H key={k}>{inline(raw.slice(heading[0].length))}</H>);
      i += 1;
      continue;
    }
    const image = IMAGE.exec(raw.trim());
    if (image) {
      out.push(<figure key={k}><img src={image[2]} alt={image[1]} loading="lazy" decoding="async" /></figure>);
      i += 1;
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(raw.trim())) { out.push(<hr key={k} />); i += 1; continue; }
    if (/^[-*]\s+/.test(raw) || /^\d+\.\s+/.test(raw)) {
      const ordered = /^\d+\.\s+/.test(raw);
      const marker = ordered ? /^\d+\.\s+/ : /^[-*]\s+/;
      const items = gather((l) => marker.test(l), (l) => l.replace(marker, ''));
      const L = ordered ? 'ol' : 'ul';
      out.push(<L key={k}>{items.map((item, n) => <li key={n}>{inline(item)}</li>)}</L>);
      continue;
    }
    if (raw.startsWith('>')) {
      const said = gather((l) => l.startsWith('>'), (l) => l.replace(/^>\s?/, ''));
      out.push(<blockquote key={k}><p>{inline(said.join(' '))}</p></blockquote>);
      continue;
    }
    /* A paragraph runs until a blank line; a single newline inside one is a
       wrapped line from a textarea, not a break anybody meant. */
    const para = gather((l) => !!l.trim() && !BLOCK_START.test(l) && !IMAGE.test(l.trim()), (l) => l);
    out.push(<p key={k}>{inline(para.join(' '))}</p>);
  }
  return <div className="reading">{out}</div>;
}
