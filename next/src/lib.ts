/* What the pages share once they are components: the service, the numbers
   and dates in the reader's own format, and the clipboard. The same
   behaviour lib.js gives the pages still run from site/, written once more
   in the shape a component wants it. */

import { useEffect, useState } from 'react';
import { LOCALES, resolveApi } from './i18n';
import type { Lang, T } from './i18n';

/* ── The service ─────────────────────────────────────────────────────── */

/** An error the service explained. It answers with a key ("@err.rate|n=6")
 *  rather than a sentence, so the message is read in whatever language the
 *  page is in when it is shown, not when it arrived. */
export class ApiError extends Error {
  status: number;
  key: string | null;
  constructor(status: number, key: string | null) {
    super(key ?? `HTTP ${status}`);
    this.status = status;
    this.key = key;
  }
  /** What to tell the reader. */
  say(t: T) {
    return this.key ? resolveApi(t, this.key) : t('err.request', { status: this.status });
  }
}

async function read<T>(r: Response): Promise<T> {
  const body = await r.json().catch(() => null);
  if (!r.ok) throw new ApiError(r.status, (body && typeof body.error === 'string' && body.error) || null);
  return body as T;
}

export const apiGet = <T>(path: string) =>
  fetch(`/api${path}`, { headers: { Accept: 'application/json' } }).then((r) => read<T>(r));

export const apiPost = <T>(path: string, body: unknown) =>
  fetch(`/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => read<T>(r));

export type Loaded<T> =
  | { state: 'loading' }
  | { state: 'ok'; data: T }
  | { state: 'failed'; error: ApiError | Error };

/** GET on mount and whenever `path` changes; null skips. A response that
 *  lands after the page moved on is dropped, not drawn. */
export function useApi<T>(path: string | null, deps: unknown[] = []): [Loaded<T>, () => void] {
  const [out, setOut] = useState<Loaded<T>>({ state: 'loading' });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (path == null) return;
    let alive = true;
    setOut({ state: 'loading' });
    apiGet<T>(path)
      .then((data) => alive && setOut({ state: 'ok', data }))
      .catch((error: Error) => alive && setOut({ state: 'failed', error }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, tick, ...deps]);
  return [out, () => setTick((n) => n + 1)];
}

/** The sentence for a failure, whichever kind it was. */
export const failure = (t: T, error: Error) => (error instanceof ApiError ? error.say(t) : t('err.request', { status: '-' }));

/* ── Numbers and dates ───────────────────────────────────────────────── */

/** '2026-06-23' as a date at noon UTC, so no timezone moves it a day. */
export function asDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d, 12));
}

export function formats(lang: Lang) {
  const locale = LOCALES[lang];
  const short = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  const long = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  const stamp = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  return {
    locale,
    num: (n: number | null | undefined, digits = 0) =>
      n == null ? '-' : n.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }),
    shortDate: (iso?: string | null) => { const d = asDate(iso); return d ? short.format(d) : ''; },
    longDate: (iso?: string | null) => { const d = asDate(iso); return d ? long.format(d) : ''; },
    /** A moment, not a day: seconds since the epoch or an ISO timestamp. */
    stamp: (at?: number | string | null) =>
      at == null || at === '' ? '' : stamp.format(typeof at === 'number' ? new Date(at * 1000) : new Date(at)),
  };
}

/* ── The clipboard ───────────────────────────────────────────────────── */

/** Copies, or selects the text in `node` for the reader to copy when the
 *  Clipboard API is refused. Returns the sentence to show on the button. */
export async function copyText(t: T, text: string, node?: Element | null) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return t('copy.done');
    }
  } catch { /* fall through to selecting it */ }
  if (node) {
    const range = document.createRange();
    range.selectNodeContents(node);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }
  return t('copy.select');
}
