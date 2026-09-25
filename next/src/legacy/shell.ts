/* A page's shell, in the reader's language, before any script has run.

   The shells in site/ carry English in the markup - tools/gen-shell.js puts
   it there - and i18n.js used to swap in the reader's language on boot. Here
   the swap happens before the markup exists: the build machine writes each
   language's file with its own words in it, and the browser hands the same
   words to the page it hydrates, so nothing is rewritten in front of the
   reader. Same rules as gen-shell.js: `data-i18n` is text and is escaped,
   `data-i18n-html` is markup and is not; placeholders and tooltips are
   attributes. */
import type { T } from '../i18n';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** Where the element opened at `from` closes, counting nested ones of the
 *  same tag. -1 for an element never closed. */
function endOf(html: string, tag: string, from: number) {
  const open = new RegExp(`<${tag}(?=[\\s/>])`, 'gi');
  const close = new RegExp(`</${tag}\\s*>`, 'gi');
  let depth = 1, at = from;
  for (;;) {
    open.lastIndex = close.lastIndex = at;
    const o = open.exec(html), c = close.exec(html);
    if (!c) return -1;
    if (o && o.index < c.index) { depth++; at = o.index + 1; continue; }
    if (--depth === 0) return c.index;
    at = c.index + 1;
  }
}

export function translateShell(html: string, t: T): string {
  /* Attributes first: they never change where an element ends. */
  html = html.replace(/<[a-z][a-z0-9]*\s[^>]*data-i18n-(ph|title)="([^"]+)"[^>]*>/gi, (tag, kind: string, key: string) => {
    const attr = kind === 'ph' ? 'placeholder' : 'title';
    const value = escAttr(t(key));
    const re = new RegExp(`\\s${attr}="[^"]*"`);
    return re.test(tag) ? tag.replace(re, ` ${attr}="${value}"`) : tag.replace(/\s*\/?>$/, (end) => ` ${attr}="${value}"${end}`);
  });

  let out = '', at = 0;
  const tags = /<([a-z][a-z0-9]*)\s[^>]*?data-i18n(-html)?="([^"]+)"[^>]*>/gi;
  for (;;) {
    tags.lastIndex = at;
    const m = tags.exec(html);
    if (!m) break;
    const [open, tag, markup, key] = m;
    const inner = m.index + open.length;
    const end = endOf(html, tag, inner);
    if (end < 0) { out += html.slice(at, inner); at = inner; continue; }
    const text = t(key);
    /* A key the dictionary lacks comes back as itself; the English that is
       already in the shell is a better thing to show than the key. */
    const body = text === key ? html.slice(inner, end) : markup ? text : esc(text);
    out += html.slice(at, inner) + body;
    at = end;
  }
  return out + html.slice(at);
}
