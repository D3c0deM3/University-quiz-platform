import { create } from 'zustand';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const resolved = theme === 'system' ? getSystemTheme() : theme;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  // Update meta theme-color
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', resolved === 'dark' ? '#0f172a' : '#ffffff');
  }
}

export const useThemeStore = create<ThemeState>((set) => {
  const stored = (typeof window !== 'undefined' ? localStorage.getItem('theme') as Theme : null) || 'light';
  // Apply on init
  if (typeof window !== 'undefined') {
    applyTheme(stored);
    // Listen for system changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const current = useThemeStore.getState().theme;
      if (current === 'system') {
        applyTheme('system');
        set({ resolvedTheme: getSystemTheme() });
      }
    });
  }

  return {
    theme: stored,
    resolvedTheme: stored === 'system' ? getSystemTheme() : (stored as 'light' | 'dark'),
    setTheme: (theme) => {
      if (typeof window !== 'undefined') localStorage.setItem('theme', theme);
      applyTheme(theme);
      set({ theme, resolvedTheme: theme === 'system' ? getSystemTheme() : theme });
    },
  };
});
