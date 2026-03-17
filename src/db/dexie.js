/**
 * @fileoverview Dexie (IndexedDB) database for offline-first storage.
 *
 * WHY DEXIE?
 * - Wraps IndexedDB with a clean Promise-based API
 * - dexie-react-hooks provides `useLiveQuery` for reactive UI updates
 * - Data persists across sessions without a server
 * - Perfect for PWA offline support
 *
 * SCHEMA DESIGN:
 * - messages: Chat history with the AI (role: user|assistant)
 * - events: Calendar events from prayer times + user-created
 * - preferences: Key-value store for user settings (theme, time format, etc.)
 *
 * The `++id` syntax auto-increments the primary key.
 * Other indexed fields are listed after the comma for fast queries.
 */
import Dexie from 'dexie';

export const db = new Dexie('RamadanDB');

db.version(3).stores({
  chatSessions: '++id, title, updatedAt',
  messages: '++id, sessionId, role, timestamp',
  events: '++id, googleId, title, start, end, type, date, synced, updatedAt, deleted',
  preferences: 'key',
});

/**
 * Version 4: Add dedicated prayerTimes table.
 *
 * WHY?  Previously prayer times were stored as fake events in the events
 * table, polluting the calendar and requiring fragile title-based matching
 * (e.g. e.title.includes('Fajr')).  The new table stores raw prayer times
 * per date with proper fields (fajr, dhuhr, asr, maghrib, isha).
 *
 * The upgrade function cleans old prayer/iftar events from the events table.
 */
db.version(4).stores({
  chatSessions: '++id, title, updatedAt',
  messages: '++id, sessionId, role, timestamp',
  events: '++id, googleId, title, start, end, type, date, synced, updatedAt, deleted',
  preferences: 'key',
  prayerTimes: 'date',   // primary key = date (YYYY-MM-DD), one row per day
}).upgrade(tx => {
  // Clean old prayer events from the events table
  return tx.table('events')
    .filter(e => e.type === 'prayer' || e.type === 'iftar')
    .delete();
});

export default db;
