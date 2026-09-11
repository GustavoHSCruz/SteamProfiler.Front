import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/* The same trick serve.py plays in the other repo: this holds no data, and
   anything under /api or /art is forwarded to a running instance, so a
   checkout renders real figures without the service being here. */
const UPSTREAM = process.env.SP_API ?? 'https://steamprofiler.org';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5180,
    strictPort: true,
    open: false,
    proxy: {
      '/api': { target: UPSTREAM, changeOrigin: true, secure: true },
      '/art': { target: UPSTREAM, changeOrigin: true, secure: true },

      /* Steam's own news feed, direct, and this is the one thing in this
         prototype that has no counterpart on the served site yet.

         `/api/game/public?appid=593110` already answers with five posts,
         which is what the bench panel was reading, but it truncates each
         body to a 500-character excerpt: that is the right payload for a
         card and not enough to render the post. ISteamNews returns the whole
         thing in BBCode, needs no key, and refuses a browser only because it
         sends no CORS header - which is what a proxy is for.

         In production this is a route on the api instead, next to the
         per-game news it already caches. It is a small route and it is not
         written yet, so until it is, /news works here and nowhere else. */
      /* The artwork behind a post. ISteamNews knows the words and nothing
         about how Steam dresses the page they are on: the background, the
         capsule and the subtitle belong to the *event* the announcement was
         published as, and that is a different endpoint on a different host.
         Same reason for the proxy as the feed: no CORS header, no key. */
      '/steamevents': {
        target: 'https://store.steampowered.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path: string) => path.replace(/^\/steamevents/, '/events/ajaxgetpartnereventspageable/'),
      },

      '/steamnews': {
        target: 'https://api.steampowered.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path: string) => path.replace(/^\/steamnews/, '/ISteamNews/GetNewsForApp/v2/'),
      },
    },
  },
});
