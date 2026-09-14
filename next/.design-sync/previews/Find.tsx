import { useRef } from 'react';
import { Find, translator } from 'steamprofiler';

const t = translator('pt');

export function ProfileLookup() {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div style={{ display: 'grid', width: 620, minHeight: 420 }}>
      <Find t={t} inputRef={input} />
    </div>
  );
}

export function English() {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div style={{ display: 'grid', width: 620, minHeight: 420 }}>
      <Find t={translator('en')} inputRef={input} />
    </div>
  );
}
