/* Writes the English strings from site/dict.js into the HTML shells, so that a
   reader without JavaScript gets the page instead of the skeleton of one.

   Every page here is markup plus `data-i18n` attributes, and i18n.js fills them
   on boot. That is the right arrangement for a browser and it was the wrong one
   for everything else: a fetch of steamprofiler.org returned a nav bar, a form
   with no label and eight empty paragraphs. What that costs is not abstract.
   Three different assistants were asked whether this site was safe to use, and
   all three answered from the little that survives without a script - one said
   it could not read the privacy policy at all, one called the site unverified,
   and one decided from the silence that it was a phishing page. The site
   answers all of those questions. It was answering them in a file the reader
   never ran.

   So the text is put in the markup, and i18n.js keeps doing exactly what it did:
   applyStatic() sets textContent on every one of these elements at boot, which
   overwrites the English with the English for an English reader and with the
   translation for anybody else. Nothing about the browser changes. What changes
   is what is there before the script runs, which is what a crawler, a link
   preview, a screen reader on a slow line and a search engine all read.

   The strings are still only written in dict.js. This file copies them; it is
   not a second place to edit them, and `--check` is what keeps that true.

   Attributes and not just elements: `data-i18n-doc` is the <title>, and a page
   whose title is "steamprofiler.org" no matter which page it is tells a crawler
   the site has one page. `data-i18n-ph` and `data-i18n-title` are left alone -
   a placeholder and a tooltip are affordances for somebody pointing at the
   thing, and neither is prose anybody reads.

   Run from the repo root:

     node tools/gen-shell.js          rewrite the shells
     node tools/gen-shell.js --check  fail if any of them has drifted
*/
const fs = require('fs'), path = require('path'), vm = require('vm');

const SITE = 'site';
const CHECK = process.argv.includes('--check');

/* The three attributes that name an element's own text. The value of the map is
   whether the string is markup: `data-i18n` is escaped, `data-i18n-html` is not,
   which is the same distinction applyStatic() makes with textContent against
   innerHTML. Getting it backwards would either print tags at a reader or put an
   unescaped ampersand into the document. */
const ATTRS = { 'data-i18n': false, 'data-i18n-html': true, 'data-i18n-doc': false };

const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(SITE, 'dict.js'), 'utf8') + ';globalThis.__D=DICT;', ctx);
const EN = ctx.__D.en;

const fail = [];
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* Where an element's content ends, counting nested tags of the same name.

   A non-greedy match to the first `</p>` is wrong the moment a paragraph holds
   a paragraph, and while none does today, a generator that quietly eats half a
   page the first time one does is not worth the ten lines it saved. Returns the
   index of the `<` that opens the closing tag, or -1 if the element is never
   closed - which is a broken file, and is reported rather than repaired. */
function endOf(html, tag, from) {
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

function rewrite(file) {
  const full = path.join(SITE, file);
  let html = fs.readFileSync(full, 'utf8'), out = '', at = 0;

  /* One pass over the opening tags, left to right, rebuilding the file as it
     goes. Scanning from `at` rather than restarting means an injected string is
     never itself scanned for attributes, which is what makes a second run of
     this produce the same file as the first. */
  const tags = /<([a-z][a-z0-9]*)\s[^>]*?data-i18n(?:-html|-doc)?="([^"]+)"[^>]*>/gi;
  for (;;) {
    tags.lastIndex = at;
    const m = tags.exec(html);
    if (!m) break;

    const [tag, name] = [m[1], m[0]];
    const attr = Object.keys(ATTRS).find((a) => name.includes(`${a}="`));
    const key = name.match(new RegExp(`${attr}="([^"]+)"`))[1];
    const inner = m.index + name.length;
    const end = endOf(html, tag, inner);

    if (end < 0) {
      fail.push(`${file}: <${tag}> holding ${key} is never closed`);
      at = inner;
      continue;
    }

    let text = EN[key];
    if (typeof text !== 'string') {
      /* A key the dictionary does not have, or one that is a function of its
         arguments. Either way there is no fixed English to write down, and
         leaving the element as it was is better than writing the key into the
         page. */
      fail.push(`${file}: ${key} is not a plain string in DICT.en`);
      at = end;
      continue;
    }
    text = ATTRS[attr] ? text : esc(text);

    /* Markup that closes the element it was put inside would end the element
       early and orphan the rest of the page. Nothing in the dictionary does
       this - the tags in there are <b>, <a> and <br> - but a string is a thing
       somebody edits later, and this is the edit that would look fine in a
       browser and break the shell. */
    if (new RegExp(`</${tag}\\s*>`, 'i').test(text)) {
      fail.push(`${file}: ${key} closes the <${tag}> it sits in`);
      at = end;
      continue;
    }

    out += html.slice(at, inner) + text;
    at = end;
  }
  out += html.slice(at);

  if (out === html) return false;
  if (!CHECK) fs.writeFileSync(full, out);
  return true;
}

const files = fs.readdirSync(SITE).filter((f) => f.endsWith('.html')).sort();
const changed = files.filter(rewrite);

if (fail.length) {
  for (const line of fail) console.error(line);
  process.exit(1);
}
if (CHECK) {
  if (changed.length) {
    console.error(`the shells have drifted from dict.js: ${changed.join(', ')}`);
    console.error('run: node tools/gen-shell.js');
    process.exit(1);
  }
  console.log('shells match dict.js');
} else {
  console.log(changed.length ? `wrote ${changed.join(', ')}` : 'nothing to write');
}
