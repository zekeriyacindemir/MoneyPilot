'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = Exclude<Theme, 'system'>;
const storageKey = 'moneypilot-theme';
const ThemeContext = createContext<{ resolvedTheme: ResolvedTheme; theme: Theme; setTheme: (theme: Theme) => void } | null>(null);
function resolve(theme: Theme): ResolvedTheme { return theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme; }
function apply(theme: Theme) { const resolved = resolve(theme); document.documentElement.classList.toggle('dark', resolved === 'dark'); document.documentElement.style.colorScheme = resolved; }

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system'); const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey); const initial: Theme = saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system'; const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = (next: Theme) => { const resolved = resolve(next); setResolvedTheme(resolved); apply(next); };
    const initialize = window.setTimeout(() => { setThemeState(initial); sync(initial); }, 0);
    const change = () => { if ((window.localStorage.getItem(storageKey) ?? 'system') === 'system') sync('system'); };
    media.addEventListener('change', change); return () => { window.clearTimeout(initialize); media.removeEventListener('change', change); };
  }, []);
  function setTheme(theme: Theme) { window.localStorage.setItem(storageKey, theme); setThemeState(theme); const resolved = resolve(theme); setResolvedTheme(resolved); apply(theme); }
  return <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>{children}</ThemeContext.Provider>;
}
export function useTheme() { const value = useContext(ThemeContext); if (!value) throw new Error('useTheme must be used inside ThemeProvider'); return value; }
