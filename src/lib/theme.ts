export type Theme = 'light' | 'dark';

export const THEME_COLORS = {
  light: '#f8fafc',
  dark: '#020617',
} as const;

/**
 * Returns the resolved theme based on localStorage,
 * falling back to system preference (prefers-color-scheme).
 */
export function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {
    // Fallback if localStorage is inaccessible
  }
  return 'light';
}

/**
 * Synchronously applies theme to DOM in 0ms:
 * 1) Toggles .dark class on documentElement
 * 2) Sets colorScheme ('light' | 'dark') for native status bar & UI elements
 * 3) Sets inline style.backgroundColor on <html> and <body> permanently
 * 4) Updates <meta name="theme-color"> with a fresh node for WebKit
 * 5) If page is scrolled, runs micro-shift in requestAnimationFrame to force WebKit top content sampling
 */
export function applyThemeToDom(theme: Theme): void {
  if (typeof document === 'undefined') return;

  const isDark = theme === 'dark';
  const targetColor = isDark ? THEME_COLORS.dark : THEME_COLORS.light;
  const root = document.documentElement;

  // 1. Toggle .dark class
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // 2. Set color-scheme for system icons, clock, battery in status bar
  root.style.colorScheme = isDark ? 'dark' : 'light';

  // 3. Set inline style.backgroundColor on <html> and <body> permanently
  root.style.backgroundColor = targetColor;
  if (document.body) {
    document.body.style.backgroundColor = targetColor;
  }

  // Persist to localStorage immediately
  try {
    localStorage.setItem('theme', theme);
  } catch {
    // Ignore storage restrictions
  }

  // 4. Update <meta name="theme-color"> (delete existing, create fresh node for WebKit)
  try {
    const existingMetas = document.querySelectorAll('meta[name="theme-color"]');
    existingMetas.forEach(m => m.remove());

    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    meta.setAttribute('content', targetColor);
    document.head.appendChild(meta);
  } catch {
    // Ignore DOM mutation errors
  }

  // 5. Force WebKit status bar color sampling on scrolled pages
  if (typeof window !== 'undefined' && window.scrollY > 0) {
    requestAnimationFrame(() => {
      const y = window.scrollY;
      if (y > 0) {
        const delta = y > 1 ? -1 : 1;
        window.scrollTo(0, y + delta);
        window.scrollTo(0, y);
      }
    });
  }
}
