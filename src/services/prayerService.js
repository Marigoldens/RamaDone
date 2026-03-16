/**
 * @fileoverview AlAdhan API service for fetching Islamic prayer times.
 *
 * API: https://aladhan.com/prayer-times-api
 *
 * WHY AlAdhan?
 * - Free, no API key required
 * - Supports multiple calculation methods
 * - Provides all 5 daily prayer times + sunrise/sunset
 *
 * CALCULATION METHOD:
 * We use method 2 (ISNA — Islamic Society of North America) as the
 * default. This is the most widely used method in North America.
 * Other methods can be configured in settings.
 */

const ALADHAN_BASE = 'https://api.aladhan.com/v1';

/**
 * Fetch prayer times for a specific date and location.
 *
 * @param {number} latitude
 * @param {number} longitude
 * @param {string} date — Format: DD-MM-YYYY (AlAdhan's expected format)
 * @param {number} [method=2] — Calculation method (2 = ISNA)
 * @returns {Promise<Object>} Prayer timings object with keys like Fajr, Sunrise, Dhuhr, etc.
 */
export async function fetchPrayerTimes(latitude, longitude, date, method = 2) {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    method: method.toString(),
  });

  const res = await fetch(`${ALADHAN_BASE}/timings/${date}?${params}`);

  if (!res.ok) {
    throw new Error(`AlAdhan API error: ${res.status}`);
  }

  const data = await res.json();
  return data.data.timings;
}

/**
 * Fetch prayer times for an entire month.
 *
 * Useful for pre-loading all of Ramadan at once, reducing API calls.
 *
 * @param {number} latitude
 * @param {number} longitude
 * @param {number} month — 1-12
 * @param {number} year — e.g. 2026
 * @param {number} [method=2]
 * @returns {Promise<Array<{ date: Object, timings: Object }>>} Array of daily timings
 */
export async function fetchMonthPrayerTimes(latitude, longitude, month, year, method = 2) {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    method: method.toString(),
  });

  const res = await fetch(
    `${ALADHAN_BASE}/calendar/${year}/${month}?${params}`
  );

  if (!res.ok) {
    throw new Error(`AlAdhan API error: ${res.status}`);
  }

  const data = await res.json();
  return data.data;
}

/**
 * Parse an AlAdhan time string (e.g., "05:23" or "05:23 (EET)") into
 * hours and minutes.
 *
 * WHY THIS EXISTS:
 * AlAdhan sometimes appends timezone abbreviations to times.
 * This strips them to get clean HH:MM values.
 *
 * @param {string} timeStr — e.g., "05:23 (EET)"
 * @returns {{ hours: number, minutes: number }}
 */
export function parsePrayerTime(timeStr) {
  const clean = timeStr.replace(/\s*\(.*\)/, '').trim();
  const [hours, minutes] = clean.split(':').map(Number);
  return { hours, minutes };
}
