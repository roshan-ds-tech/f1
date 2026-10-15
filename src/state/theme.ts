import { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';
const KEY = 'pw.theme';

export function readTheme(): Theme {
  try { return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark'; } catch { return 'dark'; }
}

export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(readTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(KEY, theme); } catch { }
    window.dispatchEvent(new CustomEvent('pw-theme', { detail: theme }));
  }, [theme]);
  return [theme, setTheme];
}

export function useThemeValue(): Theme {
  const [t, setT] = useState<Theme>(readTheme);
  useEffect(() => {
    const on = (e: Event) => setT((e as CustomEvent<Theme>).detail);
    window.addEventListener('pw-theme', on);
    return () => window.removeEventListener('pw-theme', on);
  }, []);
  return t;
}
