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

/**
 * Version 5: Productivity Suite expansion.
 *
 * NEW TABLES:
 * - tasks:         To-do / Kanban items with priority, category, status
 * - expenses:      Income & expense transactions
 * - budgets:       Monthly budget caps per category
 * - habits:        Trackable daily/weekly habits
 * - habitLogs:     Per-day completion records for each habit
 * - notifications: Locally-scheduled browser notification queue
 */
db.version(5).stores({
  chatSessions: '++id, title, updatedAt',
  messages: '++id, sessionId, role, timestamp',
  events: '++id, googleId, title, start, end, type, date, synced, updatedAt, deleted',
  preferences: 'key',
  prayerTimes: 'date',
  // ── Productivity Suite tables ──
  tasks: '++id, title, status, priority, dueDate, category, createdAt, updatedAt, completed',
  expenses: '++id, amount, type, category, date, note, recurring, createdAt',
  budgets: '++id, category, amount, month',
  habits: '++id, name, emoji, frequency, category, createdAt, archived',
  habitLogs: '++id, habitId, date, completed, count, note',
  notifications: '++id, type, title, body, scheduledAt, fired, relatedId',
});

/**
 * Version 7: Gym Tracker
 * 
 * NEW TABLES:
 * - workoutPlans: Saved workout routines/templates
 * - workoutLogs: Completed workout sessions
 */
db.version(7).stores({
  chatSessions: '++id, title, updatedAt',
  messages: '++id, sessionId, role, timestamp',
  events: '++id, googleId, title, start, end, type, date, synced, updatedAt, deleted',
  preferences: 'key',
  prayerTimes: 'date',
  // Productivity Suite tables
  tasks: '++id, title, status, priority, dueDate, category, createdAt, updatedAt, completed',
  expenses: '++id, amount, type, category, date, note, recurring, createdAt',
  budgets: '++id, category, amount, month',
  habits: '++id, name, emoji, frequency, category, createdAt, archived',
  habitLogs: '++id, habitId, date, completed, count, note',
  notifications: '++id, type, title, body, scheduledAt, fired, relatedId',
  // Gym Tracker
  workoutPlans: '++id, name, type, createdAt, updatedAt',
  workoutLogs: '++id, date, planId, duration, createdAt',
});

/**
 * Version 8: Chat enhancements — starring & mode tracking.
 *
 * CHANGES:
 * - chatSessions: added `starred` (boolean) and `mode` (chat mode string) indexes
 *   so we can quickly filter starred chats and color-code by mode.
 */
/**
 * Version 9: Monthly Reports
 * 
 * NEW TABLE:
 * - monthlyReports: AI-generated monthly expense analysis documents
 */
db.version(9).stores({
  chatSessions: '++id, title, updatedAt, starred, mode',
  messages: '++id, sessionId, role, timestamp',
  events: '++id, googleId, title, start, end, type, date, synced, updatedAt, deleted',
  preferences: 'key',
  prayerTimes: 'date',
  tasks: '++id, title, status, priority, dueDate, category, createdAt, updatedAt, completed',
  expenses: '++id, amount, type, category, date, note, recurring, createdAt',
  budgets: '++id, category, amount, month',
  habits: '++id, name, emoji, frequency, category, createdAt, archived',
  habitLogs: '++id, habitId, date, completed, count, note',
  notifications: '++id, type, title, body, scheduledAt, fired, relatedId',
  workoutPlans: '++id, name, type, createdAt, updatedAt',
  workoutLogs: '++id, date, planId, duration, createdAt',
  monthlyReports: '++id, month, title, createdAt',
});

/**
 * Version 11: Persist auth tokens for seamless re-auth on refresh
 * 
 * NEW TABLE:
 * - authTokens: Stores Google OAuth tokens with expiry tracking
 */
db.version(11).stores({
  chatSessions: '++id, title, updatedAt, starred, mode',
  messages: '++id, sessionId, role, timestamp',
  events: '++id, googleId, title, start, end, type, date, synced, updatedAt, deleted',
  preferences: 'key',
  prayerTimes: 'date',
  tasks: '++id, title, status, priority, dueDate, category, createdAt, updatedAt, completed',
  expenses: '++id, amount, type, category, date, note, recurring, createdAt',
  budgets: '++id, category, amount, month',
  habits: '++id, name, emoji, frequency, category, createdAt, archived',
  habitLogs: '++id, habitId, date, completed, count, note',
  notifications: '++id, type, title, body, scheduledAt, fired, relatedId',
  workoutPlans: '++id, name, type, createdAt, updatedAt',
  workoutLogs: '++id, date, planId, duration, createdAt',
  monthlyReports: '++id, month, title, createdAt',
  users: 'uid, email, displayName, photoURL, lastLogin, createdAt, totalMessages, totalTokens, lastAiRequest',
  authTokens: 'id, accessToken, expiresAt, createdAt',
});

export default db;
