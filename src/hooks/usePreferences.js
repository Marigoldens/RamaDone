/**
 * @fileoverview React hook for Dexie preferences store.
 *
 * Preferences are stored as key-value pairs in IndexedDB.
 * This hook provides reactive reads and writes so the UI updates
 * instantly when a setting changes (e.g., theme or time format).
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback } from 'react';
import db from '../db/dexie';
import { applyTheme } from '../config/theme';

/** Default preference values */
const DEFAULTS = {
  theme: 'default',
  timeFormat: '12h',
  latitude: 21.4225,   // Mecca default
  longitude: 39.8262,
  calcMethod: 2,        // ISNA
  calendarId: null,
  syncPrayerTimes: false,      // Whether to sync daily prayers to Google Calendar
  ramadanMode: false,          // Ramadan theming, greetings, Iftar/Suhoor context
  prayerMode: true,            // Prayers tab visible + prayer data loads
  injectPrayerContext: false,  // Whether prayer times are injected into AI prompts
  // Sidebar tab visibility (Home + Chat always shown)
  showTasks: true,
  showExpenses: true,
  showHabits: true,
  showGym: true,
  showCalendar: true,
};

/**
 * Hook for user preferences with reactive reads and upsert writes.
 *
 * @returns {{
 *   prefs: Record<string, any>,
 *   getPref: (key: string) => any,
 *   setPref: (key: string, value: any) => Promise<void>,
 * }}
 */
export function usePreferences() {
  const rawPrefs = useLiveQuery(
    () => db.preferences.toArray(),
    [],
    []
  );

  // Convert array of { key, value } to a flat object, merged with defaults
  const prefs = { ...DEFAULTS };
  if (rawPrefs) {
    rawPrefs.forEach(({ key, value }) => {
      prefs[key] = value;
    });
  }

  /**
   * Get a specific preference value (with default fallback).
   * @param {string} key
   * @returns {any}
   */
  const getPref = useCallback(
    (key) => prefs[key] ?? DEFAULTS[key],
    [prefs]
  );

  /**
   * Set a preference (upsert — creates or updates).
   *
   * Special handling: if the key is 'theme', also apply it
   * immediately via the CSS class system.
   *
   * @param {string} key
   * @param {any} value
   */
  const setPref = useCallback(async (key, value) => {
    await db.preferences.put({ key, value });

    // Immediately apply theme changes so the UI reacts instantly
    if (key === 'theme') {
      applyTheme(value);
    }
  }, []);

  return { prefs, getPref, setPref };
}
