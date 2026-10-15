import { Assumptions } from '../components/Assumptions';
import { Card } from '../components/ui';
import { useState } from 'react';

export function Settings() {
  const [theme, setTheme] = useState(document.documentElement.dataset.theme ?? 'dark');
  const flip = () => { const n = theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = n; setTheme(n); };
  return (
    <div className="page grid" style={{ gap: 16 }}>
      <div><div className="h1">SETTINGS</div></div>
      <Card title="Theme"><button className="btn" onClick={flip}>Switch to {theme === 'dark' ? 'light' : 'dark'}</button></Card>
      <Assumptions startOpen />
    </div>
  );
}
