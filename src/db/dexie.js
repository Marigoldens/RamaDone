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
  /**
   * Chat sessions store.
   * - id: auto-incremented primary key
   * - title: dynamically generated short title
   * - updatedAt: Unix timestamp for ordering
   */
  chatSessions: '++id, title, updatedAt',

  /**
   * Chat messages store.
   * - id: auto-incremented primary key
   * - sessionId: relation to chatSessions.id
   * - role: 'user' | 'assistant' | 'system'
   * - timestamp: Unix timestamp for ordering
   */
  messages: '++id, sessionId, role, timestamp',

  /**
   * Calendar events store.
   * - id: auto-incremented primary key
   * - googleId: Google Calendar event ID (for sync deduplication)
   * - title: event name
   * - start: ISO datetime string
   * - end: ISO datetime string
   * - type: 'prayer' | 'iftar' | 'suhoor' | 'custom'
   * - date: YYYY-MM-DD for fast per-day queries
   * - synced: boolean (0/1) for delta sync
   * - updatedAt: timestamp for conflict/sync tracking
   * - deleted: boolean (0/1) for syncable deletions
   */
  events: '++id, googleId, title, start, end, type, date, synced, updatedAt, deleted',

  /**
   * Preferences key-value store.
   * - key: unique preference identifier (primary key)
   * - value: the preference value
   *
   * Using 'key' as the primary key (no ++) means we use put() to upsert.
   */
  preferences: 'key',
});

export default db;
