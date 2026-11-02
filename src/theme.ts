type Theme = 'light' | 'dark';
const KEY = 'adventurers-shop-theme';
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
const valid = (value: string | null): value is Theme => value === 'light' || value === 'dark';
let preference: Theme | null = null;
try {
  const saved = localStorage.getItem(KEY);
  if (valid(saved)) preference = saved;
} catch { /* The toggle still works when browser storage is unavailable. */ }

function applyTheme(theme: Theme) {
  const dark = theme === 'dark';
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!.content = dark ? '#131c18' : '#233d32';
  const toggle = document.querySelector<HTMLButtonElement>('#theme-toggle')!;
  toggle.setAttribute('aria-pressed', String(dark));
  toggle.title = dark ? 'Включить светлую тему' : 'Включить тёмную тему';
}

export function initTheme() {
  applyTheme(preference ?? (systemTheme.matches ? 'dark' : 'light'));
  systemTheme.addEventListener('change', () => {
    if (preference === null) applyTheme(systemTheme.matches ? 'dark' : 'light');
  });
  window.addEventListener('storage', event => {
    if (event.key !== KEY && event.key !== null) return;
    preference = valid(event.newValue) ? event.newValue : null;
    applyTheme(preference ?? (systemTheme.matches ? 'dark' : 'light'));
  });
}

export function toggleTheme() {
  preference = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(preference);
  try { localStorage.setItem(KEY, preference); } catch { /* Session choice remains active. */ }
}
