#!/usr/bin/env python3
"""Development server for the steamprofiler.org front end.

    python3 serve.py

Serves site/ on http://127.0.0.1:8013 with the same URL map the live site uses,
so /u/<profile> reaches the dashboard and /blog/<id>/<title> reaches a post. There is
no build step and nothing to install: the stdlib is the whole dependency list.

This server holds no data. Anything under /api/ or /art/ is forwarded to a
running instance, https://steamprofiler.org by default, because the public site
answers exactly the calls these pages make. That is what makes a checkout
enough to work on layout, copy and CSS against real profiles. Point it
elsewhere with --api, or pass --offline to have those calls answer 503.

Nothing here belongs in production. It is a reader for one browser: it never
caches, it forwards whatever the page asks for, and it has no rate limit of its
own. Be considerate with the default upstream, which is somebody's home server.
"""

import argparse
import re
import sys
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

SITE = Path(__file__).resolve().parent / 'site'

# A URL that is not a file on disk, and the shell that answers it. The live
# server does this with try_files; the effect has to match, or a route works
# here and 404s in production.
PAGES = {
    '/feedback': '/feedback.html',
    '/support': '/support.html',
    '/privacy': '/privacy.html',
    '/privacy/history': '/policy-history.html',
    '/blog': '/blog.html',
    '/about': '/about.html',
    '/appeal': '/appeal.html',
    '/appeal/sent': '/appeal-sent.html',
}

# Old Portuguese paths, kept because links to them exist.
REDIRECTS = {'/apoiar': '/support', '/recados': '/feedback'}

# Two segments, the second optional: a post is addressed by its id, and what
# follows is its own title in whichever language the link was made in. Same
# pattern as the live nginx, which is the point of this file.
BLOG_POST = re.compile(r'^/blog/[a-z0-9][a-z0-9-]{0,79}(?:/[a-z0-9][a-z0-9-]{0,79})?$')
PROFILE = re.compile(r'^/u/')

# One game with nobody attached to it. The live nginx has two locations here: a
# strict `^/g/(?<appid>\d{1,8})$` with SSI on, and a loose `/g/` that falls back
# to the same shell. Both are matched, and the loose one on purpose - `/g/abc` is
# a page in production, where the script reads the address and says that is not
# an app number. A dev server that 404'd it instead would hide the one error
# state this route has.
#
# The shell carries an SSI include that the live server fills with that game's
# title, description and JSON-LD. Nothing here fills it: this is a static file
# server, the directive stays the HTML comment it already is, and the page falls
# back to its own generic head - which is exactly what the comment in the shell
# says happens. Link previews are therefore wrong in development and right in
# production, and that is the one difference worth knowing about this route.
PUBLIC_GAME = re.compile(r'^/g/')

# Everything the browser asks for that this server cannot answer from disk.
PROXY_PREFIXES = ('/api/', '/art/')
PROXY_EXACT = ('/appeal/send',)

# Response headers worth carrying back. An allowlist rather than a copy of the
# whole set: Content-Length and Transfer-Encoding describe the upstream body,
# not the one being written here, and relaying them corrupts the response.
RELAY = ('Content-Type', 'Location', 'Retry-After', 'Content-Language')


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    """Hand 3xx back to the page instead of following it.

    /appeal/send answers with a redirect, and a client that follows it turns
    two round trips into one and hides the status the browser is meant to see.
    """

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


OPENER = urllib.request.build_opener(_NoRedirect)


class Handler(SimpleHTTPRequestHandler):
    api = 'https://steamprofiler.org'
    offline = False

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(SITE), **kwargs)

    # ── Routing ──────────────────────────────────────────────────────────
    def do_GET(self):
        self.route('GET')

    def do_HEAD(self):
        self.route('HEAD')

    def do_POST(self):
        self.route('POST')

    def route(self, method):
        path = urlsplit(self.path).path

        if path.startswith(PROXY_PREFIXES) or path in PROXY_EXACT:
            self.forward(method)
            return

        if path == '/healthz':
            self.answer(200, b'ok\n', 'text/plain')
            return

        if path in REDIRECTS:
            self.send_response(301)
            self.send_header('Location', REDIRECTS[path])
            self.send_header('Content-Length', '0')
            self.end_headers()
            return

        shell = PAGES.get(path)
        if shell is None and (BLOG_POST.match(path) or PROFILE.match(path)):
            shell = '/post.html' if path.startswith('/blog/') else '/profile.html'
        if shell is None and PUBLIC_GAME.match(path):
            shell = '/game-public.html'
        if shell:
            # The router in the page reads the real URL off location, so only
            # what this server opens on disk changes, never what the page sees.
            self.path = shell

        if method == 'HEAD':
            super().do_HEAD()
        elif method == 'POST':
            self.answer(405, b'{"error":"method not allowed"}', 'application/json')
        else:
            super().do_GET()

    # ── The API, borrowed from wherever it is running ────────────────────
    def forward(self, method):
        if self.offline:
            self.answer(
                503,
                b'{"error":"the dev server is offline; drop --offline to reach the API"}',
                'application/json',
            )
            return

        length = int(self.headers.get('Content-Length') or 0)
        body = self.rfile.read(length) if length else None

        req = urllib.request.Request(self.api + self.path, data=body, method=method)
        for name in ('Content-Type', 'Accept', 'Accept-Language'):
            value = self.headers.get(name)
            if value:
                req.add_header(name, value)
        req.add_header('User-Agent', 'steamprofiler-dev-server')

        try:
            with OPENER.open(req, timeout=30) as up:
                self.relay(up.status, up.headers, up.read(), method)
        except urllib.error.HTTPError as e:
            # An error from the API is still an answer: the pages read the JSON
            # body to know what to say, so the status alone is not enough.
            self.relay(e.code, e.headers, e.read(), method)
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            self.answer(
                502,
                f'{{"error":"cannot reach {self.api}: {e}"}}'.encode(),
                'application/json',
            )

    def relay(self, status, headers, body, method):
        self.send_response(status)
        for name in RELAY:
            value = headers.get(name)
            if value:
                self.send_header(name, value)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        if method != 'HEAD':
            self.wfile.write(body)

    # ── Plumbing ─────────────────────────────────────────────────────────
    def answer(self, status, body, content_type):
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(body)

    def end_headers(self):
        # Every response, in one place: editing a file and reloading has to
        # show the edit. Nothing served here is fingerprinted, so a cached copy
        # is a wrong copy.
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write('%s  %s\n' % (self.log_date_time_string(), fmt % args))


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--port', type=int, default=8013)
    ap.add_argument('--host', default='127.0.0.1')
    ap.add_argument(
        '--api',
        default=Handler.api,
        metavar='URL',
        help='where /api/ and /art/ are forwarded (default: %(default)s)',
    )
    ap.add_argument(
        '--offline',
        action='store_true',
        help='answer 503 to /api/ instead of forwarding, for working on static pages',
    )
    args = ap.parse_args()

    if not SITE.is_dir():
        sys.exit(f'no site/ next to {Path(__file__).name}')

    Handler.api = args.api.rstrip('/')
    Handler.offline = args.offline

    # woff2 is missing from the stdlib table on some systems, and a font served
    # as application/octet-stream is a font the browser declines to use.
    SimpleHTTPRequestHandler.extensions_map.setdefault('.woff2', 'font/woff2')

    where = 'offline' if args.offline else Handler.api
    print(f'site/ on http://{args.host}:{args.port}   /api/ -> {where}')
    try:
        ThreadingHTTPServer((args.host, args.port), Handler).serve_forever()
    except KeyboardInterrupt:
        print()


if __name__ == '__main__':
    main()
