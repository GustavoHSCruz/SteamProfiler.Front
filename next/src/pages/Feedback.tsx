import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Empty, Field, Input, Notice, Panel, Segmented, Tag, Textarea } from '../ui-kit/react';
import type { TagTone } from '../ui-kit/react';
import { BarNote, Sheet } from '../sheet';
import { ApiError, apiPost, formats, useApi } from '../lib';
import { Vote } from '../vote';
import { cameFrom } from '../router';
import type { Lang, T } from '../i18n';
import type { PageProps } from '../routes';

/* /feedback: one form, one board. The board is what was accepted, with the
   state it is in, and one vote per person - counted by a salted hash of the
   address, which is the sentence under the form. */

type Item = {
  id: number;
  kind: 'bug' | 'ideia' | 'outro' | 'appeal';
  status: 'novo' | 'lido' | 'aceito' | 'fazendo' | 'feito' | 'recusado';
  title: string;
  message: string;
  reply?: string | null;
  votes: number;
  voted?: boolean;
  created_at: string;
};

const KIND_TONE: Record<Item['kind'], TagTone> = { bug: 'bad', ideia: 'info', outro: 'muted', appeal: 'violet' };
const STATUS_TONE: Record<Item['status'], TagTone> = {
  novo: 'accent', lido: 'neutral', aceito: 'good', fazendo: 'alert', feito: 'good', recusado: 'muted',
};

const MAX = 2000;

function Card({ t, lang, item, onError }: { t: T; lang: Lang; item: Item; onError: (m: string) => void }) {
  const { shortDate } = formats(lang);
  return (
    <article className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 border-b border-line px-4 py-3.5 last:border-b-0">
      <Vote t={t} endpoint="/vote" body={{ id: item.id }} votes={item.votes} voted={item.voted} agree={t('msg.agree')} onError={onError} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="m-0 text-[14px] font-semibold text-text">{item.title}</h3>
          <Tag tone={KIND_TONE[item.kind]}>{t(`kind.${item.kind}`)}</Tag>
          <Tag tone={STATUS_TONE[item.status]}>{t(`state.${item.status}`)}</Tag>
        </div>
        <p className="policy-p mt-1.5 whitespace-pre-line">{item.message}</p>
        {item.reply && (
          <div className="mt-2 border-l-2 border-amber-d pl-3">
            <span className="font-mono text-[10px] uppercase tracking-[.12em] text-faint">{t('msg.reply')}</span>
            <p className="policy-p mt-1 whitespace-pre-line">{item.reply}</p>
          </div>
        )}
        <p className="font-mono mt-1.5 text-[10.5px] text-faint">{shortDate(item.created_at)}</p>
      </div>
    </article>
  );
}

export default function Feedback({ t, lang }: PageProps) {
  const [board] = useApi<{ items: Item[] }>('/board');
  const [kind, setKind] = useState<'bug' | 'ideia' | 'outro'>('bug');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const trap = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null);
  /* How long the form was open before it was sent: a person takes more
     than a second to write a bug report, and a script does not. */
  const [opened] = useState(() => Date.now());

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setResult(null);
    setSending(true);
    try {
      await apiPost('/feedback', {
        kind, title, message, contact,
        // Where they came from, which is the most useful thing in a bug report.
        context: cameFrom(),
        website: trap.current?.value ?? '',
        elapsed: (Date.now() - opened) / 1000,
      });
      setTitle(''); setMessage(''); setContact(''); setKind('bug');
      setResult({ tone: 'good', text: t('msg.sent') });
    } catch (err) {
      setResult({ tone: 'bad', text: err instanceof ApiError ? err.say(t) : String(err) });
    }
    setSending(false);
  };

  const items = board.state === 'ok' ? board.data.items : [];
  const count = board.state === 'failed' ? t('msg.board_unavailable')
    : board.state === 'loading' ? '-'
    : !items.length ? t('msg.board_empty_label')
    : items.length === 1 ? t('msg.board_item') : t('msg.board_items', { n: items.length });

  return (
    <Sheet eyebrow={t('msg.eyebrow')} h1={t('msg.h1')} lede={t('msg.lede')}>
      <div className="grid items-start gap-[var(--gap)] lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <Panel title={t('msg.form')} action={<BarNote>{t('msg.no_login')}</BarNote>}>
          <form onSubmit={submit} noValidate className="grid gap-4">
            <div className="grid gap-2">
              <span className="sp-label">{t('msg.what')}</span>
              <Segmented
                label={t('msg.what')}
                value={kind}
                onChange={setKind}
                options={[
                  { value: 'bug', label: t('msg.kind_bug') },
                  { value: 'ideia', label: t('msg.kind_idea') },
                  { value: 'outro', label: t('msg.kind_other') },
                ]}
              />
            </div>
            <Field label={t('msg.title_field')}>
              {(id) => <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} autoComplete="off" placeholder={t('msg.title_ph')} />}
            </Field>
            <Field label={t('msg.body')} hint={t('msg.count', { n: message.length })}>
              {(id) => <Textarea id={id} rows={6} value={message} onChange={(e) => setMessage(e.target.value.slice(0, MAX))} maxLength={MAX} placeholder={t('msg.body_ph')} />}
            </Field>
            <Field label={t('msg.contact')} labelHint={t('msg.contact_opt')}>
              {(id) => <Input id={id} value={contact} onChange={(e) => setContact(e.target.value)} maxLength={200} autoComplete="off" placeholder={t('msg.contact_ph')} />}
            </Field>
            {/* Filled in only by something that fills in every field. Off
                screen rather than display:none, which some of them skip. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
              <label htmlFor="website">{t('msg.trap')}</label>
              <input ref={trap} id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>
            <div>
              <Button type="submit" variant="primary" disabled={sending}>{sending ? t('msg.sending') : t('msg.send')}</Button>
            </div>
            {result && <Notice tone={result.tone}>{result.text}</Notice>}
          </form>
          <p className="font-mono mt-4 border-t border-line pt-3 text-[10.5px] leading-relaxed text-faint" dangerouslySetInnerHTML={{ __html: t('msg.privacy') }} />
        </Panel>

        <Panel title={t('msg.board')} action={<BarNote>{count}</BarNote>} tight>
          {board.state === 'ok' && !items.length && <Empty className="m-4">{t('msg.board_empty')}</Empty>}
          {items.map((item) => (
            <Card key={item.id} t={t} lang={lang} item={item} onError={(text) => setResult({ tone: 'bad', text })} />
          ))}
        </Panel>
      </div>
    </Sheet>
  );
}
