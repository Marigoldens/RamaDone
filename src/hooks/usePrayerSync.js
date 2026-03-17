import { useState, useCallback, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { usePreferences } from './usePreferences';
import { fetchMonthPrayerTimes, parsePrayerTime } from '../services/prayerService';
import db from '../db/dexie';

/**
 * Hook to synchronize prayer times into the dedicated prayerTimes table.
 *
 * The prayerTimes table stores one row per date with clean fields:
 *   { date, fajr, dhuhr, asr, maghrib, isha, method }
 *
 * This hook fetches from AlAdhan for the entire month and bulk-inserts
 * only dates that aren't already cached.
 *
 * @param {string} selectedDate — any YYYY-MM-DD date within the target month
 * @returns {{ loading: boolean, syncPrayers: () => Promise<void> }}
 */
export function usePrayerSync(selectedDate) {
  const [loading, setLoading] = useState(false);
  const { prefs } = usePreferences();

  const syncPrayers = useCallback(async () => {
    if (!prefs.latitude || !prefs.longitude) return;

    setLoading(true);
    try {
      const [y, m] = selectedDate.split('-');
      const year = parseInt(y, 10);
      const month = parseInt(m, 10);

      // Check which dates we already have cached for this month
      const startDate = `${y}-${m}-01`;
      const endDate = `${y}-${m}-31`;

      const existingRows = await db.prayerTimes
        .where('date').between(startDate, endDate, true, true)
        .toArray();
      const existingDates = new Set(existingRows.map(r => r.date));

      // Fetch entire month from AlAdhan
      const monthData = await fetchMonthPrayerTimes(
        prefs.latitude, prefs.longitude, month, year, prefs.calcMethod
      );

      const batch = [];

      for (const dayData of monthData) {
        // AlAdhan returns date as DD-MM-YYYY
        const [dayStr, monthStr, yearStr] = dayData.date.gregorian.date.split('-');
        const ds = `${yearStr}-${monthStr}-${dayStr}`;

        if (existingDates.has(ds)) continue;

        const timings = dayData.timings;

        // Parse each prayer time string (e.g. "04:32 (AST)") → "04:32"
        const fajr    = parsePrayerTime(timings.Fajr);
        const dhuhr   = parsePrayerTime(timings.Dhuhr);
        const asr     = parsePrayerTime(timings.Asr);
        const maghrib = parsePrayerTime(timings.Maghrib);
        const isha    = parsePrayerTime(timings.Isha);

        batch.push({
          date: ds,
          fajr:    `${String(fajr.hours).padStart(2, '0')}:${String(fajr.minutes).padStart(2, '0')}`,
          dhuhr:   `${String(dhuhr.hours).padStart(2, '0')}:${String(dhuhr.minutes).padStart(2, '0')}`,
          asr:     `${String(asr.hours).padStart(2, '0')}:${String(asr.minutes).padStart(2, '0')}`,
          maghrib: `${String(maghrib.hours).padStart(2, '0')}:${String(maghrib.minutes).padStart(2, '0')}`,
          isha:    `${String(isha.hours).padStart(2, '0')}:${String(isha.minutes).padStart(2, '0')}`,
          method:  prefs.calcMethod,
        });
      }

      if (batch.length > 0) {
        // Use bulkPut (upsert) instead of bulkAdd to avoid ConstraintError
        // when the hook fires multiple times before the first batch completes
        await db.prayerTimes.bulkPut(batch);
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
