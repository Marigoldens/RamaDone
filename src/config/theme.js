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
  {
    id: 'default',
    name: 'Warm Cream',
    emoji: '☀️',
    className: '',       // :root styles apply (no extra class)
    description: 'A warm, cream-toned light theme',
  },
  {
    id: 'dark',
    name: 'Night Sky',
    emoji: '🌙',
    className: 'theme-dark',
    description: 'Deep navy dark mode for night usage',
  },
  {
    id: 'desert',
    name: 'Desert Sand',
    emoji: '🏜️',
    className: 'theme-desert',
    description: 'Rich sand and gold tones',
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
