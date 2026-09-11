/* The built site, served the way nginx would serve it.

   One rule worth proving before it is written into the real config: the
   language is chosen per request from the `sp-lang` cookie, and what changes
   is which prerendered file is sent, not the address. That is the same map
   the server already runs for `dict.<lang>.js`, pointed at a second set of
   files. `?lang=xx` is here for testing only and is not part of the design.

   Development runs `vite dev`; this is for checking what ships. */
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = 'dist';
const LANGS = ['en', 'pt', 'ru'];
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.json': 'application/json',
};
const PAGES = new Set(['/', '/news', '/privacy', '/about', '/status']);

/* The policy the real server sends, copied from nginx.conf, because a
   preview that is more permissive than production is a preview that hides
   exactly the class of bug worth catching here: `style-src 'self'` with no
   'unsafe-inline' blocks a `style=` attribute, and server-rendered React
   writes those into the markup. */
const CSP = "default-src 'self'; img-src 'self' data: https://avatars.steamstatic.com "
  + "https://cdn.cloudflare.steamstatic.com https://cdn.akamai.steamstatic.com "
  + "https://shared.akamai.steamstatic.com https://shared.fastly.steamstatic.com "
  + "https://community.fastly.steamstatic.com https://community.cloudflare.steamstatic.com "
  + "https://images.steamusercontent.com https://clan.cloudflare.steamstatic.com "
  + "https://clan.steamstatic.com https://steamcdn-a.akamaihd.net https://media.steampowered.com; "
  + "media-src blob: https://cdn.cloudflare.steamstatic.com https://video.akamai.steamstatic.com; "
  + "style-src 'self'; script-src 'self'; font-src 'self'; "
  + "connect-src 'self' https://video.akamai.steamstatic.com; base-uri 'none'; frame-ancestors 'self'";

/* The same three upstreams vite.config.ts forwards in development. Without
   them this preview is the built site with the service unplugged, which
   looks like a different build and is not one: the counts panel takes itself
   off the page and the news panel says Steam did not answer, both of which
   are the behaviour those panels are supposed to have. */
const UP = {
  /* `keep` is whether the prefix is part of the address upstream. /api and
     /art are paths the service really has; /steamnews and /steamevents are
     names invented here for two endpoints that live somewhere else entirely,
     so those two are replaced rather than kept. Same split vite.config.ts
     makes with its `rewrite`. */
  '/api': { to: 'https://steamprofiler.org', keep: true },
  '/art': { to: 'https://steamprofiler.org', keep: true },
  '/steamnews': { to: 'https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/', keep: false },
  '/steamevents': { to: 'https://store.steampowered.com/events/ajaxgetpartnereventspageable/', keep: false },
};

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const path = normalize(url.pathname);

  const prefix = Object.keys(UP).find((p) => path === p || path.startsWith(p + '/') || path.startsWith(p + '?'));
  if (prefix) {
    const { to, keep } = UP[prefix];
    const target = keep
      ? to + url.pathname + url.search
      : to + url.pathname.slice(prefix.length) + url.search;
    try {
      const up = await fetch(target, { headers: { Accept: 'application/json' } });
      res.writeHead(up.status, { 'Content-Type': up.headers.get('content-type') ?? 'application/json' });
      return Readable.fromWeb(up.body).pipe(res);
    } catch {
      res.writeHead(502); return res.end('{}');
    }
  }

  if (PAGES.has(path)) {
    const cookie = (req.headers.cookie ?? '').match(/sp-lang=([a-z-]+)/)?.[1];
    const asked = url.searchParams.get('lang') ?? cookie;
    const lang = LANGS.includes(asked) ? asked : 'en';
    const file = join(ROOT, path === '/' ? '' : path, `index.${lang}.html`);
    try {
      res.writeHead(200, {
        'Content-Type': TYPES['.html'],
        'Content-Security-Policy': CSP,
        Vary: 'Cookie, Accept-Language',
      });
      return res.end(await readFile(file));
    } catch {
      res.writeHead(404); return res.end('no such page');
    }
  }

  try {
    const body = await readFile(join(ROOT, path));
    res.writeHead(200, { 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('not found');
  }
}).listen(5182, () => console.log('dist on http://localhost:5182'));
