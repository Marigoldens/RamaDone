/**
 * @fileoverview Local notification scheduler — browser Notifications API + Dexie queue.
 *
 * HOW IT WORKS:
 * 1. Schedule a notification → stored in Dexie `notifications` table
 * 2. On app load → `initNotifications()` sets timers for all non-fired notifications
 * 3. When timer fires → shows a browser notification + marks it `fired` in Dexie
 *
 * LIMITATIONS:
 * - Only works while the app tab is open (no service worker push in MVP)
 * - timers reset on page reload (but Dexie persists the schedule so they re-arm)
 */

import db from '../db/dexie';

let activeTimers = {};

/**
 * Request notification permission. Call once (e.g., on first launch).
 * @returns {Promise<boolean>} true if permission granted.
 */
export async function requestPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

/**
 * Schedule a new notification.
 * @param {{ type: string, title: string, body: string, scheduledAt: string, relatedId?: number }} opts
 * @returns {Promise<number>} the new notification's id
 */
export async function scheduleNotification({ type, title, body, scheduledAt, relatedId = null }) {
  const id = await db.notifications.add({
    type,
    title,
    body,
    scheduledAt,
    fired: 0,
    relatedId,
  });
  armTimer(id, title, body, scheduledAt);
  return id;
}

/**
 * Cancel a scheduled notification.
 * @param {number} id
 */
export async function cancelNotification(id) {
  if (activeTimers[id]) {
    clearTimeout(activeTimers[id]);
    delete activeTimers[id];
  }
  await db.notifications.delete(id);
}

/**
 * Initialise — arm timers for all un-fired notifications.
 * Call this once on app load (e.g., inside AppShell useEffect).
 */
export async function initNotifications() {
  const pending = await db.notifications.where('fired').equals(0).toArray();
  for (const n of pending) {
    armTimer(n.id, n.title, n.body, n.scheduledAt);
  }
}

/* ── internal ── */
function armTimer(id, title, body, scheduledAt) {
  const delay = new Date(scheduledAt).getTime() - Date.now();
  if (delay <= 0) {
    // Already past — fire immediately if within last 5 minutes
    if (delay > -5 * 60_000) fireNotification(id, title, body);
    return;
  }
  activeTimers[id] = setTimeout(() => fireNotification(id, title, body), delay);
}

async function fireNotification(id, title, body) {
  // Show browser notification
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/pwa-192x192.png' });
  }
  // Mark as fired in Dexie
  await db.notifications.update(id, { fired: 1 });
  delete activeTimers[id];
}
