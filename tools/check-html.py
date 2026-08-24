#!/usr/bin/env python3
"""Fails if a shell is broken in a way a browser would hide.

The three checks that exist because each one already shipped once:

    key parity     `foot.repo` reached production printed as `foot.repo`. The
                   key was in the HTML and in dict.js, and the page still
                   showed the key, because a stale copy of the dictionary was
                   in the reader's browser and the fresh HTML asked it for a
                   string it did not have yet. Nothing about that is visible
                   from either file on its own: it is visible from asking
                   whether every key the markup names exists in all three
                   languages, which is what this does. A key present in `en`
                   and missing from `ru` is the same bug on a slower fuse.

    tag balance    gen-shell.js writes strings into elements. A string that
                   closes the element it sits in orphans the rest of the page,
                   and the generator refuses that - but a shell edited by hand
                   has no such guard, and an unclosed <article> looks fine
                   until the footer climbs inside it.

    routes         a link to /suporte instead of /support is a 404 that the
                   author never clicks, because the author knows the address.

The rest is what a search engine and a link preview read, and neither of them
reports a problem: a page with no description gets a snippet invented from its
markup, and a page with two elements sharing an id is a page where half the
script talks to the wrong one.

serve.py owns the route map; this reads it from there rather than keeping a
second copy, because a second copy is a thing that drifts and then this file
starts refusing links that work.

Run from the repo root: python3 tools/check-html.py
"""

import json
import pathlib
import re
import subprocess
import sys
from html.parser import HTMLParser

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = ROOT / "site"

sys.path.insert(0, str(ROOT))
import serve  # noqa: E402  - for PAGES and REDIRECTS, the live URL map

LANGS = ("en", "pt", "ru")

# Elements that never close. Left here rather than imported from anywhere
# because the list is fixed by HTML itself and has not changed in a decade.
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link",
        "meta", "param", "source", "track", "wbr"}

# What a link may point at besides a file on disk or a route in serve.PAGES.
DYNAMIC = (re.compile(r"^/u/"),
           re.compile(r"^/g/\d{1,8}$"),
           re.compile(r"^/blog/[a-z0-9][a-z0-9-]{0,79}(?:/[a-z0-9][a-z0-9-]{0,79})?$"))

# Google truncates a snippet around here. Not a rule, and not enforced as one:
# the warning is that a description this short is usually a placeholder and one
# this long is usually the first paragraph pasted in.
DESC_MIN, DESC_MAX = 50, 320

# Shells nobody arrives at from a search result, so a description on them would
# be written for a reader who does not exist. The first four are served
# `internal` by nginx and have no address of their own; post.html has a real
# description, written by the api into the head at request time out of the
# post's own title, because a shell shared by every post cannot carry one.
NO_DESCRIPTION = {"abuse.html", "banned.html", "appeal.html", "appeal-sent.html",
                  "post.html"}

fail = []
warn = []


def dictionary():
    """DICT out of dict.js, via node, because dict.js is JavaScript and the
    alternative is a regex that would disagree with the browser about what the
    file says."""
    out = subprocess.run(
        ["node", "-e",
         f"const fs=require('fs'),vm=require('vm'),c={{}};vm.createContext(c);"
         f"vm.runInContext(fs.readFileSync({str(SITE / 'dict.js')!r},'utf8')"
         f"+';globalThis.__D=DICT;',c);"
         f"console.log(JSON.stringify(c.__D))"],
        capture_output=True, text=True)
    if out.returncode != 0:
        fail.append(f"dict.js did not load: {out.stderr.strip().splitlines()[-1:]}")
        return {lang: {} for lang in LANGS}
    return json.loads(out.stdout)


class Shell(HTMLParser):
    """One pass, collecting everything the checks below need."""

    def __init__(self, name):
        super().__init__(convert_charrefs=True)
        self.name = name
        self.stack = []
        self.ids = {}
        self.keys = []          # (attribute, key)
        self.links = []
        self.title = None
        self.description = None
        self.lang = None
        self.in_title = False
        self.in_ld = False
        self.ld = []

    def handle_starttag(self, tag, attrs):
        at = dict(attrs)
        line = self.getpos()[0]

        if tag == "html":
            self.lang = at.get("lang")
        if tag == "title":
            self.in_title = True
        if tag == "script" and at.get("type") == "application/ld+json":
            self.in_ld = True
        if tag == "meta" and at.get("name") == "description":
            self.description = at.get("content")

        if "id" in at:
            first = self.ids.get(at["id"])
            if first:
                fail.append(f"{self.name}:{line}: id={at['id']!r} already used "
                            f"on line {first}")
            else:
                self.ids[at["id"]] = line

        for name, value in at.items():
            if name.startswith("data-i18n") and value:
                self.keys.append((line, value))

        href = at.get("href") or ""
        if href.startswith("/"):
            self.links.append((line, href))

        if tag not in VOID:
            self.stack.append((tag, line))

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
        if tag == "script":
            self.in_ld = False
        if tag in VOID:
            return
        if not self.stack:
            fail.append(f"{self.name}:{self.getpos()[0]}: </{tag}> with nothing open")
            return
        if self.stack[-1][0] != tag:
            open_tag, open_line = self.stack[-1]
            fail.append(f"{self.name}:{self.getpos()[0]}: </{tag}> closes "
                        f"<{open_tag}> opened on line {open_line}")
            return
        self.stack.pop()

    def handle_data(self, data):
        if self.in_title:
            self.title = (self.title or "") + data
        if self.in_ld:
            self.ld.append(data)


def known_route(href):
    """Whether the live server would answer this path with something."""
    path = href.split("#")[0].split("?")[0]
    if path in serve.PAGES or path in serve.REDIRECTS:
        return True
    if any(rx.match(path) for rx in DYNAMIC):
        return True
    if path == "/":
        return True
    # A file served straight off disk: /style.css, /fonts/x.woff2, /llms.txt.
    if (SITE / path.lstrip("/")).exists():
        return True
    return False


def check(path, DICT):
    name = path.name
    shell = Shell(name)
    shell.feed(path.read_text(encoding="utf-8"))
    shell.close()

    for tag, line in shell.stack:
        fail.append(f"{name}: <{tag}> opened on line {line} is never closed")

    for line, key in shell.keys:
        missing = [lang for lang in LANGS if DICT.get(lang, {}).get(key) is None]
        if missing:
            fail.append(f"{name}:{line}: {key} missing from " + ", ".join(missing))

    for line, href in shell.links:
        if not known_route(href):
            fail.append(f"{name}:{line}: {href} is not a route or a file")

    for block in shell.ld:
        if not block.strip():
            continue
        try:
            json.loads(block)
        except json.JSONDecodeError as e:
            fail.append(f"{name}: the ld+json block does not parse: {e}")

    # The two a crawler reads before anything else.
    if not (shell.title or "").strip():
        fail.append(f"{name}: no <title>")
    if not shell.lang:
        fail.append(f"{name}: <html> has no lang")
    if name in NO_DESCRIPTION:
        pass
    elif shell.description is None:
        warn.append(f"{name}: no meta description")
    elif not DESC_MIN <= len(shell.description) <= DESC_MAX:
        warn.append(f"{name}: meta description is {len(shell.description)} "
                    f"characters, outside {DESC_MIN}-{DESC_MAX}")


def main():
    DICT = dictionary()
    files = sorted(SITE.glob("*.html"))
    for path in files:
        check(path, DICT)

    for line in warn:
        print(f"warn: {line}")
    for line in fail:
        print(f"FAIL: {line}", file=sys.stderr)

    if fail:
        print(f"\n{len(fail)} problem(s) in {len(files)} shells", file=sys.stderr)
        return 1
    print(f"html ok: {len(files)} shells, "
          f"{sum(1 for _ in files)} titles, keys present in all three languages")
    return 0


if __name__ == "__main__":
    sys.exit(main())
