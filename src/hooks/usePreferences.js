/**
 * @fileoverview React hook for Dexie preferences store.
 *
 * Preferences are stored as key-value pairs in IndexedDB.
 * This hook provides reactive reads and writes so the UI updates
 * instantly when a setting changes (e.g., theme or time format).
 * 
 * Uses localStorage as a synchronous cache for instant initial loads.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useMemo } from 'react';
import db from '../db/dexie';
import { applyTheme } from '../config/theme';

const LOCAL_CACHE_KEY = 'ramadone_prefs_cache';

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
  // Gym widget configuration
  gymWidgetMode: 'sessions', // 'sessions' | 'shortcuts'
  gymWidgetShortcuts: [], // array of workout plan IDs to show as shortcuts
  // Prayers widget configuration
  prayersWidgetMode: 'next', // 'next' | 'all'
  // UI preferences
  handedness: 'right', // 'left' | 'right' - for mobile FAB positioning
  // AI usage tracking (Ramadan Bundle: 100 messages/month)
  aiMessagesThisMonth: 0,
  aiMessagesMonth: null, // 'YYYY-MM' — resets automatically each new month
};

/**
 * Synchronously read cached preferences from localStorage.
 * Returns merged with defaults for instant UI rendering.
 */
function getCachedPrefs() {
  try {
    const cached = localStorage.getItem(LOCAL_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      return { ...DEFAULTS, ...parsed };
    }
  } catch (e) {
    // Ignore parse errors
  }
  return { ...DEFAULTS };
}

/**
 * Save preferences to localStorage cache.
 */
function cachePrefs(prefs) {
  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(prefs));
  } catch (e) {
    // Ignore storage errors
  }
}

/**
 * Hook for user preferences with reactive reads and upsert writes.
 * Uses localStorage cache for instant synchronous initial load.
 *
 * @returns {{
 *   prefs: Record<string, any>,
 *   getPref: (key: string) => any,
 *   setPref: (key: string, value: any) => Promise<void>,
 * }}
 */
export function usePreferences() {
  // Start with cached prefs for instant render (no flash!)
  const cachedPrefs = useMemo(() => getCachedPrefs(), []);
  
  const rawPrefs = useLiveQuery(
    () => db.preferences.toArray(),
    [],
    null // null = loading, not [] (so we can distinguish)
  );

  // Merge: start with cache, overlay DB values if available
  const prefs = useMemo(() => {
    if (rawPrefs === null) {
      // Still loading - use cached prefs
      return cachedPrefs;
    }
    // DB loaded - merge with defaults and cache
    const merged = { ...DEFAULTS };
    rawPrefs.forEach(({ key, value }) => {
      merged[key] = value;
    });
    // Update cache for next time
    cachePrefs(merged);
    return merged;
  }, [rawPrefs, cachedPrefs]);

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
    // Update cache immediately for instant UI feedback
    const updated = { ...prefs, [key]: value };
    cachePrefs(updated);
    
    // Persist to IndexedDB
    await db.preferences.put({ key, value });

    // Immediately apply theme changes so the UI reacts instantly
    if (key === 'theme') {
      applyTheme(value);
    }
  }, [prefs]);

  return { prefs, getPref, setPref };
}
