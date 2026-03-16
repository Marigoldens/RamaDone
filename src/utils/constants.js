/**
 * @fileoverview App-wide constants.
 *
 * Centralized configuration for Ramadan dates, API endpoints,
 * event types, and color mappings.
 */

/**
 * Ramadan 2026 dates (approximate — based on astronomical predictions).
 * These may shift by 1 day based on moon sighting.
 */
export const RAMADAN_2026 = {
  start: '2026-02-18',  // 1 Ramadan 1447 AH (approximate)
  end: '2026-03-19',    // 29 or 30 Ramadan
};

/**
 * Event types with their visual properties.
 * Used to style events differently on the timeline grid.
 */
export const EVENT_TYPES = {
  prayer: {
    label: 'Prayer',
    colorClass: 'bg-prayer text-prayer-text',
    dominant: true,
    pillClass: 'cal-event-pill--prayer',
    chipClass: 'cal-chip--prayer',
  },
  iftar: {
    label: 'Iftar',
    colorClass: 'bg-iftar text-iftar-text',
    dominant: true,
    pillClass: 'cal-event-pill--iftar',
    chipClass: 'cal-chip--iftar',
  },
  suhoor: {
    label: 'Suhoor',
    colorClass: 'bg-primary text-prayer-text',
    dominant: true,
    pillClass: 'cal-event-pill--suhoor',
    chipClass: 'cal-chip--suhoor',
  },
  custom: {
    label: 'Custom',
    colorClass: 'bg-accent/20 text-text border border-accent/30',
    dominant: false,
    pillClass: 'cal-event-pill--custom',
    chipClass: 'cal-chip--custom',
  },
};

/**
 * Prayer names we track (subset of AlAdhan response).
 * Each maps to an event type for visual styling.
 */
export const TRACKED_PRAYERS = [
  { name: 'Fajr', type: 'prayer', duration: 30 },
  { name: 'Dhuhr', type: 'prayer', duration: 20 },
  { name: 'Asr', type: 'prayer', duration: 20 },
  { name: 'Maghrib', type: 'iftar', duration: 60 },  // Maghrib = Iftar time
  { name: 'Isha', type: 'prayer', duration: 30 },
];

/** API endpoints */
export const API = {
  ALADHAN: 'https://api.aladhan.com/v1',
  GCAL: 'https://www.googleapis.com/calendar/v3',
};
