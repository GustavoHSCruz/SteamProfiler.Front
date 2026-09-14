import { useState } from 'react';
import { DesignControls, newGenerator, themes } from 'steamprofiler';

function Controls({ preset }: { preset?: string }) {
  const [design, setDesign] = useState(() => {
    const d = newGenerator('bars');
    const theme = themes.find((x) => x.id === preset);
    return theme ? { ...d, options: { ...d.options, ...theme.options } } : d;
  });
  return (
    <div className="duo" style={{ width: 340 }}>
      <div className="controls">
        <DesignControls design={design} change={setDesign} disabled={false} />
      </div>
    </div>
  );
}

export function DarkPreset() {
  return <Controls preset="dark" />;
}

export function LightPreset() {
  return <Controls preset="light" />;
}
