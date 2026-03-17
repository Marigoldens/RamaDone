/**
 * @fileoverview Time helper utilities for the calendar grid.
 *
 * GRID MATH EXPLAINED:
 * The 24-hour timeline uses 48 CSS Grid rows (one per 30-min slot).
 * To place an event, we convert its start/end times to grid row numbers.
 *
 * Formula: gridRow = (hour * 2) + (minutes >= 30 ? 1 : 0) + 1
 *   - Hours 0-23 map to rows 1-48
 *   - +1 because CSS Grid rows are 1-indexed
 *   - Minutes 0-29 → first half of the hour
 *   - Minutes 30-59 → second half of the hour
 *
 * Example: 14:45 → (14 * 2) + 1 + 1 = row 30
 */

/**
 * Convert a time string or Date to a CSS Grid row number.
 *
 * @param {string | Date} time — ISO string, or HH:MM string, or Date object
 * @returns {number} Grid row number (1-indexed, range 1-49)
 */
export function timeToGridRow(time) {
  let hours, minutes;

  if (time instanceof Date) {
    hours = time.getHours();
    minutes = time.getMinutes();
  } else if (typeof time === 'string') {
    if (time.includes('T')) {
      // ISO string like "2026-03-01T14:30:00"
      const d = new Date(time);
      hours = d.getHours();
      minutes = d.getMinutes();
    } else {
      // HH:MM string like "14:30"
      [hours, minutes] = time.split(':').map(Number);
    }
  }

  return hours * 2 + (minutes >= 30 ? 1 : 0) + 1;
}

/**
 * Convert a grid row number back to a time string.
 *
 * @param {number} row — Grid row (1-indexed)
 * @param {'12h' | '24h'} format — Time display format
 * @returns {string} Formatted time string
 */
export function gridRowToTime(row, format = '12h') {
  const adjustedRow = row - 1; // Convert to 0-indexed
  const hours = Math.floor(adjustedRow / 2);
  const minutes = (adjustedRow % 2) * 30;

  if (format === '24h') {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  // 12-hour format
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Format a Date or ISO string to display time.
 *
 * @param {string | Date} time
 * @param {'12h' | '24h'} format
 * @returns {string}
 */
export function formatTime(time, format = '12h') {
  const d = time instanceof Date ? time : new Date(time);
  const hours = d.getHours();
  const minutes = d.getMinutes();

  if (format === '24h') {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Get today's date in YYYY-MM-DD format (local time).
 * @returns {string}
 */
export function getTodayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Get a date in DD-MM-YYYY format (AlAdhan API format).
 * @param {string} isoDate — YYYY-MM-DD
 * @returns {string} DD-MM-YYYY
 */
export function toAlAdhanDate(isoDate) {
  const [y, m, d] = isoDate.split('-');
  return `${d}-${m}-${y}`;
}

/**
 * Build a local ISO datetime string from a date string and time.
 *
 * IMPORTANT: We intentionally avoid .toISOString() here because that
 * converts to UTC, which shifts times by the user's timezone offset.
 * All times in this app are in the user's local time.
 *
 * @param {string} date — YYYY-MM-DD
 * @param {number} hours
 * @param {number} minutes
 * @returns {string} Local ISO datetime string like "2026-03-01T14:30:00"
 */
export function buildISODateTime(date, hours, minutes) {
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  return `${date}T${hh}:${mm}:00`;
}
