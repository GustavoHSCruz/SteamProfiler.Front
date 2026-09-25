import { useRef, useState } from 'react';
import { ButtonLink, Button, Notice, Panel } from '../ui-kit/react';
import { BarNote, Sheet } from '../sheet';
import { copyText, useApi } from '../lib';
import { resolveApi } from '../i18n';
import type { T } from '../i18n';
import type { PageProps } from '../routes';

/* /support. Only the channels the server says are configured and valid are
   drawn, so a half-filled .env never shows a broken address - and the
   service checks the addresses, so what is printed here is one it has read
   and not just one somebody typed. */

type Channel = {
  id: string;
  kind: 'link' | 'address';
  label: string;
  blurb: string;
  value: string;
  verified: string | null;
};

function Address({ t, c }: { t: T; c: Channel }) {
  const code = useRef<HTMLElement>(null);
  const [said, setSaid] = useState<string | null>(null);
  const copy = async () => {
    setSaid(await copyText(t, c.value, code.current));
    window.setTimeout(() => setSaid(null), 2500);
  };
  return (
    <div className="mt-3 grid gap-2">
      <div className="flex min-w-0 items-center gap-2 rounded-md border border-line bg-panel-2 p-2">
        <code ref={code} className="font-mono min-w-0 flex-1 break-all text-[12px] text-text">{c.value}</code>
        <Button size="sm" variant="quiet" onClick={copy}>{said ?? t('sup.copy')}</Button>
      </div>
      {c.verified && <span className="font-mono text-[10.5px] text-faint">✓ {resolveApi(t, c.verified)}</span>}
    </div>
  );
}

export default function Support({ t }: PageProps) {
  const [got] = useApi<{ channels: Channel[]; expected: string[] }>('/support');

  return (
    <Sheet eyebrow={t('sup.eyebrow')} h1={t('sup.h1')} lede={t('sup.lede')}>
      {got.state === 'failed' && <Notice tone="bad">{t('sup.failed')}</Notice>}
      {got.state === 'ok' && !got.data.channels.length && (
        /* The owner is the likeliest reader of this state, so it says what
           to fill in. */
        <Notice>{t('sup.none', { vars: got.data.expected.join(', ') })}</Notice>
      )}
      {got.state === 'ok' && got.data.channels.length > 0 && (
        <div className="grid items-start gap-[var(--gap)] md:grid-cols-2 2xl:grid-cols-3">
          {got.data.channels.map((c) => (
            <Panel
              key={c.id}
              title={c.label}
              action={c.kind === 'address' ? <BarNote>{t('sup.address')}</BarNote> : undefined}
            >
              <p className="policy-p">{resolveApi(t, c.blurb)}</p>
              {c.kind === 'link' ? (
                <ButtonLink className="mt-3" href={c.value} target="_blank" rel="noopener noreferrer">
                  {t('sup.open', { label: c.label })}
                </ButtonLink>
              ) : (
                <Address t={t} c={c} />
              )}
            </Panel>
          ))}
        </div>
      )}
      {(got.state !== 'ok' || got.data.channels.length > 0) && (
        <Panel title={t('sup.honest')} action={<BarNote>{t('sup.no_promise')}</BarNote>}>
          <p className="policy-p">{t('sup.honest_1')}</p>
          <p className="policy-p">{t('sup.honest_2')}</p>
          <p className="policy-p" dangerouslySetInnerHTML={{ __html: t('sup.honest_3') }} />
        </Panel>
      )}
    </Sheet>
  );
}
