import { useEffect, useRef, useState } from 'react';
import { Doors, Emb, Ext, Find, Live, Map, News, Parts, Rail } from '../panels';
import type { PageProps } from '../routes';
import * as api from '../api';

/* The bench: nine panels tiled under the status bar. No scroll narrative, no
   band that is one idea and half a screen of air. What moves is what the
   reader is pointing at, what they have focused, and the four numbers on
   their way in from the service. */
export default function Home({ t, lang }: PageProps) {
  const [live, setLive] = useState<api.Status | null>(null);
  const input = useRef<HTMLInputElement>(null);

  /* /status asks for the same payload on its own and gets the same promise
     back, so moving between the two is still one request. */
  useEffect(() => {
    let alive = true;
    api.status().then((out) => alive && setLive(out)).catch(() => alive && setLive(null));
    return () => { alive = false; };
  }, []);

  /* The two panels that offer a lookup do not go anywhere themselves: they
     hand the caret to the field in the corner, which is the only address bar
     this page has. */
  const toField = () => {
    input.current?.focus();
    input.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  return (
    <main className="bench">
      <Find t={t} inputRef={input} />
      <Map t={t} />
      <Live t={t} lang={lang} live={live} />
      <Rail t={t} />
      <News t={t} lang={lang} />
      <Doors t={t} />
      <Ext t={t} />
      <Emb t={t} onLookup={toField} />
      <Parts t={t} />
    </main>
  );
}
