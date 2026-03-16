/**
 * @fileoverview Hook for querying events across a date range.
 * Used by Week, Month, and Year views.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../db/dexie';

/**
 * Returns all non-deleted events between startDate and endDate (inclusive).
 * Both dates must be YYYY-MM-DD strings.
 *
 * @param {string} startDate
 * @param {string} endDate
 * @returns {Object[]} events sorted by date then start time
 */
export function useEventsRange(startDate, endDate) {
  return useLiveQuery(
    () =>
      db.events
        .where('date')
        .between(startDate, endDate, true, true)
        .filter((e) => e.deleted !== 1)
        .sortBy('start'),
    [startDate, endDate],
    []
  );
}
