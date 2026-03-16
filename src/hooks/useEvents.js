/**
 * @fileoverview React hook for Dexie events store with live queries.
 *
 * Uses dexie-react-hooks' useLiveQuery for reactive updates —
 * whenever IndexedDB changes, the UI re-renders automatically.
 *
 * Events are queried by date (YYYY-MM-DD) for the timeline view.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../db/dexie';

/**
 * Hook that provides reactive events for a given date.
 *
 * @param {string} date — YYYY-MM-DD format
 * @returns {{
 *   events: Array<Object>,
 *   addEvent: (event: Object) => Promise<number>,
 *   updateEvent: (id: number, changes: Object) => Promise<void>,
 *   deleteEvent: (id: number) => Promise<void>,
 * }}
 */
export function useEvents(date) {
  /**
   * Live query: whenever the events table changes, this re-runs
   * and the component re-renders with the new data. No manual
   * subscription management needed.
   */
  const events = useLiveQuery(
    () => db.events
      .where('date').equals(date)
      .filter(event => event.deleted !== 1) // 1 in Dexie/JS can be represented as true if using boolean but usually Dexie uses 0/1 for booleans in indexes if not careful
      .sortBy('start'),
    [date],
    []
  );

  /**
   * Add a new event to the local Dexie store.
   * @param {Object} event — Must include: title, start, end, type, date
   * @returns {Promise<number>} The auto-generated Dexie ID
   */
  async function addEvent(event) {
    const now = Date.now();
    return db.events.add({
      ...event,
      date: event.date || date,
      synced: 0,
      updatedAt: now,
      deleted: 0,
    });
  }

  /**
   * Update an existing event by its Dexie ID.
   * @param {number} id — Dexie primary key
   * @param {Object} changes — Partial event fields to update
   */
  async function updateEvent(id, changes) {
    await db.events.update(id, {
      ...changes,
      synced: 0,
      updatedAt: Date.now(),
    });
  }

  /**
   * Delete an event by its Dexie ID.
   * @param {number} id — Dexie primary key
   */
  async function deleteEvent(id) {
    const event = await db.events.get(id);
    if (!event) return;

    if (event.googleId) {
      // Soft delete: keep in DB to sync removal to Google
      await db.events.update(id, {
        deleted: 1,
        synced: 0,
        updatedAt: Date.now(),
      });
    } else {
      // Hard delete: not synced to Google, just remove it
      await db.events.delete(id);
    }
  }

  return { events, addEvent, updateEvent, deleteEvent };
}
