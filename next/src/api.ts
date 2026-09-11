/* The service, through Vite's proxy, which forwards to a running instance the
   same way serve.py does in the other repo. These are the same three
   endpoints the served landing page calls, and nothing here holds data. */

export type Status = {
  known?: {
    detailed?: number; catalogue?: number; houses?: number;
    deck?: { rated?: number; known?: number };
  };
};

/* ── Asked once ───────────────────────────────────────────────────────
   Two things make this page ask for the same thing twice, and both are
   real: React's StrictMode mounts an effect, tears it down and mounts it
   again, so every fetch in a `useEffect` happens twice in development; and
   the feed is wanted by the bench panel and by /news, which are two
   components that never exist at the same time and would each ask on their
   way in.

   Neither is fixed by caching in a component. The promise is kept here
   instead, under a key, so the second caller gets the first one's answer and
   the network sees one request. A failed call drops its own entry, so a
   service that was down when the page opened can still be reached by
   whatever asks next. */
const ASKED = new Map<string, Promise<unknown>>();

function once<T>(key: string, ask: () => Promise<T>): Promise<T> {
  const held = ASKED.get(key) as Promise<T> | undefined;
  if (held) return held;
  const run = ask().catch((err) => { ASKED.delete(key); throw err; });
  ASKED.set(key, run);
  return run;
}

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`/api${path}`, { headers: { Accept: 'application/json' } });
  const body = await r.json().catch(() => null);
  if (!r.ok) throw new Error((body && (body.error as string)) || `HTTP ${r.status}`);
  return body as T;
}

export const status = () => once('status', () => get<Status>('/status'));
export const resolve = (q: string) => get<unknown>(`/resolve?q=${encodeURIComponent(q)}`);
export const searchGames = (q: string) =>
  get<{ items?: { appid: number; name: string }[] }>(`/game/search?q=${encodeURIComponent(q)}`);

/* ── Steam's own news ─────────────────────────────────────────────────
   593110 is "Steam News", the app Valve posts the news hub under: sales,
   fests, awards and client updates. ISteamNews is public, needs no key, and
   hands back the whole body in BBCode - which is what makes a post readable
   here rather than a headline that has to be read somewhere else.

   Called through Vite's proxy, because Steam sends no CORS header. On the
   served site this is a route on the api, beside the per-game news it
   already caches; see the note in vite.config.ts. */
export type NewsArt = {
  /** 1920x622, the band Steam runs behind the post's own page. */
  background?: string;
  /** 800x450, the card Steam uses for the event everywhere else. */
  capsule?: string;
  subtitle?: string;
};

export type NewsItem = {
  id: string;
  title: string;
  url: string;
  author?: string;
  date: number;
  feed_name?: string;
  contents?: string;
  is_external_url?: boolean;
  art?: NewsArt;
};

type RawItem = {
  gid: string; title: string; url: string; author?: string; date: number;
  feedname?: string; contents?: string; is_external_url?: boolean;
};

/* The clan behind the news hub. It is in every image path in the bodies
   themselves - {STEAM_CLAN_LOC_IMAGE}/27766192/... - which is where this came
   from, and it is what the events endpoint wants as its account id. */
const HUB_CLAN = 27766192;
const CLAN_IMAGES = `https://clan.steamstatic.com/images/${HUB_CLAN}`;

type RawEvent = {
  jsondata?: string;
  announcement_body?: { gid?: string };
};

/** The gid Steam puts in a post's own address, which is the only id the news
 *  feed and the events feed have in common. An external post has no such
 *  address and therefore no artwork, which is also true of it on Steam. */
function announcementId(url: string): string | null {
  return url.match(/\/detail\/(\d+)/)?.[1] ?? null;
}

async function steamArt(count: number): Promise<Map<string, NewsArt>> {
  const out = new Map<string, NewsArt>();
  const r = await fetch(`/steamevents?clan_accountid=${HUB_CLAN}&appid=593110&count=${count}&lang=english`, {
    headers: { Accept: 'application/json' },
  });
  if (!r.ok) return out;
  const body = await r.json() as { events?: RawEvent[] };
  for (const event of body.events ?? []) {
    const gid = event.announcement_body?.gid;
    if (!gid || !event.jsondata) continue;
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(event.jsondata) as Record<string, unknown>;
    } catch {
      continue;
    }
    /* Steam stores these as one array per language in its own fixed order.
       Only the first entry is taken: it is English, which is the language the
       body is written in anyway, and guessing at the index of any other one
       would be reading an order nobody documented. */
    const first = (key: string) => {
      const list = data[key];
      return Array.isArray(list) && typeof list[0] === 'string' && list[0] ? list[0] : undefined;
    };
    const background = first('localized_title_image');
    const capsule = first('localized_capsule_image');
    out.set(gid, {
      background: background && `${CLAN_IMAGES}/${background}`,
      capsule: capsule && `${CLAN_IMAGES}/${capsule}`,
      subtitle: first('localized_subtitle'),
    });
  }
  return out;
}

export const steamNews = (count = 20) => once(`news:${count}`, () => readSteamNews(count));

async function readSteamNews(count: number): Promise<NewsItem[]> {
  /* Two feeds, asked for together, and the artwork is allowed to fail: a post
     with no picture is a post, and a page that refuses to draw the words
     because the background did not arrive would have its priorities exactly
     backwards. */
  const [feed, art] = await Promise.all([
    fetch(`/steamnews?appid=593110&count=${count}`, { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() as Promise<{ appnews?: { newsitems?: RawItem[] } }> : Promise.reject(new Error(`HTTP ${r.status}`)))),
    steamArt(Math.max(count * 2, 40)).catch(() => new Map<string, NewsArt>()),
  ]);

  return (feed.appnews?.newsitems ?? []).map((i) => {
    const gid = announcementId(i.url);
    return {
      id: i.gid,
      title: i.title,
      url: i.url,
      author: i.author,
      date: i.date,
      feed_name: i.feedname,
      contents: i.contents,
      is_external_url: i.is_external_url,
      art: (gid && art.get(gid)) || undefined,
    };
  });
}

/* What is left of a post once the markup is taken out. A body this project
   cannot draw is a body the reader should be sent to Steam for, and the only
   honest measure of that is how much of it is words. */
export function bodyWeight(item: NewsItem) {
  return (item.contents ?? '').replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim().length;
}

export const READABLE = 120;

/* Where the pages this front does not draw itself actually live.
   
   In production: next door. This front answers /, /news, /privacy, /about and
   /status, and every other address on steamprofiler.org is still served from
   the old tree - so a link to /u/<name> or /blog is an ordinary same-origin
   link and behaves like one, in the same tab, with the back button working.

   In development there is no old tree beside this one, so those addresses
   point at the served site instead. It is the same trick vite.config.ts plays
   with /api: the half that is not here is borrowed from the instance that is
   running. */
export const SITE = import.meta.env.PROD ? '' : 'https://steamprofiler.org';

/** What an anchor to the site's other half needs. Nothing in production,
 *  where that half is next door and the link is ordinary; a new tab in
 *  development, where it is a different origin entirely. Spread it rather
 *  than writing target/rel by hand, so the two cases cannot drift. */
export const OUT = import.meta.env.PROD ? {} : { target: '_blank', rel: 'noopener' } as const;

/** Go to a page this front does not draw. Same tab in production because it
 *  is the same site; a new tab in development because it is not. */
export function open(path: string) {
  if (import.meta.env.PROD) window.location.assign(path);
  else window.open(`${SITE}${path}`, '_blank', 'noopener');
}
