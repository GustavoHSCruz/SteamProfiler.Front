import { useState } from 'react';
import { ApiError, apiPost } from './lib';
import type { T } from './i18n';

/* One vote per address, toggled - the board's items and the blog's posts
   are counted the same way, and both pages say so under the list. */
export function Vote({ t, endpoint, body, votes, voted, agree, onError }: {
  t: T;
  endpoint: string;
  body: unknown;
  votes: number;
  voted?: boolean;
  /** The tooltip before a vote: "I agree", "worth reading". */
  agree: string;
  onError?: (message: string) => void;
}) {
  const [n, setN] = useState(votes);
  const [on, setOn] = useState(!!voted);
  const [busy, setBusy] = useState(false);

  const click = async () => {
    setBusy(true);
    try {
      const got = await apiPost<{ votes: number; voted: boolean }>(endpoint, body);
      setN(got.votes);
      setOn(got.voted);
    } catch (e) {
      onError?.(e instanceof ApiError ? e.say(t) : String(e));
    }
    setBusy(false);
  };

  return (
    <button
      type="button"
      disabled={busy}
      onClick={click}
      title={on ? t('msg.unvote') : agree}
      aria-pressed={on}
      className={`font-mono flex h-12 w-11 shrink-0 flex-col items-center justify-center rounded-md border text-[11px] transition-colors ${on ? 'border-amber text-amber' : 'border-line text-dim hover:border-amber-d hover:text-text'}`}
    >
      <i className="not-italic">▲</i>
      <b className="font-semibold">{n}</b>
    </button>
  );
}
