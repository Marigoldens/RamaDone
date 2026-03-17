import { useState, useCallback, useEffect } from 'react';
import { addDays, format } from 'date-fns';
import { usePreferences } from './usePreferences';
import { fetchMonthPrayerTimes, parsePrayerTime } from '../services/prayerService';
import { buildISODateTime } from '../utils/timeHelpers';
import db from '../db/dexie';

/**
 * Hook to synchronize prayer times with Dexie local storage.
 * Fetches prayer times from AlAdhan API and stores them as events in IndexedDB.
 */
export function usePrayerSync(selectedDate) {
  const [loading, setLoading] = useState(false);
  const { prefs } = usePreferences();

  const syncPrayers = useCallback(async () => {
    if (!prefs.latitude || !prefs.longitude) return;

    setLoading(true);
    try {
      const [y, m, d] = selectedDate.split('-');
      
      // Fetch the entire month
      const monthData = await fetchMonthPrayerTimes(
        prefs.latitude, prefs.longitude, parseInt(m, 10), parseInt(y, 10), prefs.calcMethod
      );

      // Find existing prayer events for this month to avoid duplicates
      const startDate = `${y}-${m}-01`;
      const endDate = `${y}-${m}-31`;
      
      const existingEvents = await db.events
        .where('date').between(startDate, endDate, true, true)
        .and((e) => e.type === 'prayer' || e.type === 'iftar')
        .toArray();
        
      const existingDates = new Set(existingEvents.map(e => e.date));

      const batch = [];
      
      for (const dayData of monthData) {
        const [dayStr, monthStr, yearStr] = dayData.date.gregorian.date.split('-');
        const ds = `${yearStr}-${monthStr}-${dayStr}`;
        
        if (existingDates.has(ds)) continue;
        
        const timings = dayData.timings;
        
        const prayers = [
          { name: 'Fajr',            type: 'prayer', dur: 30, t: timings.Fajr    },
          { name: 'Dhuhr',           type: 'prayer', dur: 20, t: timings.Dhuhr   },
          { name: 'Asr',             type: 'prayer', dur: 20, t: timings.Asr     },
          { name: 'Maghrib (Iftar)', type: 'iftar',  dur: 60, t: timings.Maghrib },
          { name: 'Isha',            type: 'prayer', dur: 30, t: timings.Isha    },
        ];
        
        for (const p of prayers) {
          const { hours, minutes } = parsePrayerTime(p.t);
          const start = buildISODateTime(ds, hours, minutes);
          const end = new Date(start);
          end.setMinutes(end.getMinutes() + p.dur);
          
          batch.push({
            title: p.name,
            start: start,
            end: end.toISOString(),
            type: p.type,
            date: ds,
            googleId: null,
            synced: 0,
            updatedAt: Date.now(),
            deleted: 0,
          });
        }
      }
      
      if (batch.length > 0) {
        await db.events.bulkAdd(batch);
      }

    } catch (err) {
      console.error('[usePrayerSync] Sync failed:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, prefs.latitude, prefs.longitude, prefs.calcMethod]);

  useEffect(() => {
    syncPrayers();
  }, [syncPrayers]);

  return { loading, syncPrayers };
}
