import { useState } from 'react';
import db from '../db/dexie';
import { syncAllToGoogle, findOrCreateRamadanCalendar } from '../services/calendarService';
import { usePreferences } from './usePreferences';

/**
 * @fileoverview Hook for orchestrating Google Calendar synchronization.
 */
export function useCalendarSync(accessToken) {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const { prefs, setPref } = usePreferences();

  /**
   * Sync all local events to Google Calendar.
   */
  async function syncAllEvents() {
    if (!accessToken) {
      setError("Not signed in");
      return;
    }

    setSyncing(true);
    setError(null);

    try {
      // 0. Fetch calendarId directly from DB to avoid stale closures
      const calendarPref = await db.preferences.get('calendarId');
      let calendarId = calendarPref?.value || prefs.calendarId;

      if (!calendarId) {
        // Streamline: If no calendar ID, try to create it now
        console.log('[Sync] No calendarId found, attempting setup...');
        calendarId = await findOrCreateRamadanCalendar(accessToken);
        await setPref('calendarId', calendarId);
      }

      // 1. Fetch only events that need sync (synced=0)
      // Also filter by date if they are not deletions (we only care about future events for upserts)
      const now = Date.now();
      const today = new Date().toISOString().split('T')[0];

      let syncQueue = await db.events
        .where('synced').equals(0)
        .toArray();

      // 1.5 Filter queue based on business logic
      syncQueue = syncQueue.filter(event => {
        // Always sync deletions
        if (event.deleted === 1) return true;
        
        // Only sync future events (or today's events)
        if (event.date < today) return false;

        // Prayer times filter
        if (!prefs.syncPrayerTimes && (event.type === 'prayer' || event.type === 'iftar')) {
          return false;
        }

        return true;
      });

      if (syncQueue.length === 0) {
        console.log('[Sync] No unsynced events to process.');
        setSyncing(false);
        return;
      }

      console.log(`[Sync] Processing queue of ${syncQueue.length} events...`);

      // 2. Sync to Google (Concurrent)
      const syncResults = await syncAllToGoogle(calendarId, syncQueue, accessToken);

      // 3. Update Dexie with results
      await db.transaction('rw', db.events, async () => {
        for (const res of syncResults) {
          if (!res.success) continue;

          if (res.action === 'delete') {
            // Hard delete after successful Google removal
            await db.events.delete(res.localId);
          } else {
            // Mark as synced and save googleId
            await db.events.update(res.localId, {
              googleId: res.googleId,
              synced: 1,
              // We don't update updatedAt here to avoid infinite loops if sync was triggered by an update
            });
          }
        }
      });

      console.log(`[Sync] Successfully processed ${syncResults.filter(r => r.success).length} events.`);
    } catch (err) {
      console.error('[Sync] Error during sync:', err);
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  }

  return { syncAllEvents, syncing, error };
}
