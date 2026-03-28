/**
 * @fileoverview Theme configuration — defines all available color themes.
 *
 * Each theme maps to a CSS class applied on the <html> element.
 * The CSS variables in index.css respond to these classes, so theme
 * switching is instant (no React re-render needed — just a className swap).
 *
 * @see src/index.css for the actual variable definitions per theme.
 */

/** @typedef {{ id: string, name: string, emoji: string, className: string, description: string }} Theme */

/** @type {Theme[]} */
export const THEMES = [
  // ─── LIGHT THEMES ─────────────────────────────────
  {
    id: 'default',
    name: 'Paper White',
    emoji: '�',
    className: '',       // :root styles apply (no extra class)
    description: 'Clean minimal light theme, like iOS or Notion',
  },
  {
    id: 'latte',
    name: 'Latte',
    emoji: '☕',
    className: 'theme-latte',
    description: 'Warm coffee tones, cozy and inviting',
  },
  {
    id: 'dawn',
    name: 'Dawn',
    emoji: '🌅',
    className: 'theme-dawn',
    description: 'Soft peachy morning colors',
  },
  {
    id: 'mint',
    name: 'Mint Fresh',
    emoji: '🌿',
    className: 'theme-mint',
    description: 'Light refreshing green, clean and airy',
  },
  {
    id: 'lavender',
    name: 'Lavender',
    emoji: '💜',
    className: 'theme-lavender',
    description: 'Soft purple light, elegant and calm',
  },
  // ─── DARK THEMES ───────────────────────────────────
  {
    id: 'obsidian',
    name: 'Obsidian',
    emoji: '🖤',
    className: 'theme-obsidian',
    description: 'True black OLED, pure and minimal',
  },
  {
    id: 'nord',
    name: 'Nord',
    emoji: '❄️',
    className: 'theme-nord',
    description: 'Arctic bluish dark, beloved by developers',
  },
  {
    id: 'tokyo',
    name: 'Tokyo Night',
    emoji: '🌃',
    className: 'theme-tokyo',
    description: 'Popular purple/blue dark, inspired by Tokyo',
  },
  {
    id: 'dracula',
    name: 'Dracula',
    emoji: '🧛',
    className: 'theme-dracula',
    description: 'Iconic purple/green dark theme',
  },
  {
    id: 'gruvbox',
    name: 'Gruvbox',
    emoji: '🔥',
    className: 'theme-gruvbox',
    description: 'Retro warm dark, cozy and unique',
  },
  {
    id: 'blade',
    name: 'Blade',
    emoji: '🗡️',
    className: 'theme-blade',
    description: 'Bold red and indigo dark theme',
  },
];

/**
 * Apply a theme by setting the appropriate CSS class on <html>.
 *
 * WHY on <html>?
 * CSS variables cascade down from the root element. By setting
 * the theme class on <html>, every element in the page inherits
 * the new values instantly through CSS inheritance. This means:
 * - No React context or state needed for theming
 * - No re-render — it's a pure CSS operation
 * - Animations and transitions work naturally
 *
 * @param {string} themeId — The `id` of the theme to apply
 */
export function applyTheme(themeId) {
  const html = document.documentElement;

  // Remove all existing theme classes
  THEMES.forEach((t) => {
    if (t.className) {
      html.classList.remove(t.className);
    }
  });

  // Apply the new theme class (if it exists — default has no class)
  const theme = THEMES.find((t) => t.id === themeId);
  if (theme?.className) {
    html.classList.add(theme.className);
  }
}
