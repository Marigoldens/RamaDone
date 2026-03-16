/**
 * @fileoverview Google Calendar API service layer.
 *
 * All functions use the raw Google Calendar REST API via fetch().
 * We DON'T use the Google API client library (gapi) because:
 * 1. It adds ~50KB+ to the bundle.
 * 2. The REST API is straightforward for our use case.
 * 3. We already have the OAuth access token from Firebase sign-in.
 *
 * CALENDAR STRATEGY:
 * We create a DEDICATED calendar named "Ramadan Schedule" instead of
 * writing to the user's primary calendar. This keeps Ramadan events
 * organized and lets the user toggle visibility in Google Calendar.
 */

const GCAL_BASE = 'https://www.googleapis.com/calendar/v3';

/**
 * Find an existing "Ramadan Schedule" calendar or create one.
 *
 * WHY a dedicated calendar?
 * - Keeps the user's primary calendar clean
 * - Can be toggled on/off in Google Calendar
 * - Easy to delete all Ramadan events at once after Ramadan ends
 * - Has a distinctive color for quick visual identification
 *
 * @param {string} accessToken — Google OAuth access token
 * @returns {Promise<string>} The calendar ID
 */
export async function findOrCreateRamadanCalendar(accessToken) {
  // Step 1: List all calendars and look for ours
  const listRes = await fetch(`${GCAL_BASE}/users/me/calendarList`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!listRes.ok) {
    const errorText = await listRes.text();
    console.error('[CalendarService] 403 Error full response:', errorText);
    throw new Error(`Failed to list calendars: ${listRes.status} ${listRes.statusText} - ${errorText}`);
  }

  const listData = await listRes.json();
  const existing = listData.items?.find(
    (cal) => cal.summary === 'Ramadan Schedule'
  );

  if (existing) {
    console.log('[CalendarService] Found existing "Ramadan Schedule" calendar:', existing.id);
    return existing.id;
  }

  // Step 2: Create a new calendar
  const createRes = await fetch(`${GCAL_BASE}/calendars`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: 'Ramadan Schedule',
      description: 'Managed by Ramadan Rhythm Scheduler — prayer times, iftar, and custom events',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create calendar: ${createRes.status} ${createRes.statusText}`);
  }

  const newCal = await createRes.json();
  console.log('[CalendarService] Created new "Ramadan Schedule" calendar:', newCal.id);

  // Step 3: Set a distinctive color (gold/amber) for the calendar
  await fetch(`${GCAL_BASE}/users/me/calendarList/${encodeURIComponent(newCal.id)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      backgroundColor: '#f09300',  // Amber/gold — evokes Ramadan lanterns
      foregroundColor: '#000000',
    }),
  });

  return newCal.id;
}

/**
 * Create a single event in the specified calendar.
 *
 * @param {string} calendarId — The Google Calendar ID
 * @param {{ summary: string, start: string, end: string, description?: string, colorId?: string }} event
 * @param {string} accessToken
 * @returns {Promise<Object>} The created Google Calendar event
 */
export async function createCalendarEvent(calendarId, event, accessToken) {
  const res = await fetch(
    `${GCAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: event.summary,
        description: event.description || '',
        start: { dateTime: event.start, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        end: { dateTime: event.end, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        colorId: event.colorId || undefined,
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to create event: ${res.status}`);
  }

  return res.json();
}

/**
 * List events from a calendar within a date range.
 *
 * @param {string} calendarId
 * @param {string} accessToken
 * @param {string} timeMin — ISO 8601 datetime
 * @param {string} timeMax — ISO 8601 datetime
 * @returns {Promise<Object[]>} Array of Google Calendar events
 */
export async function listCalendarEvents(calendarId, accessToken, timeMin, timeMax) {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '100',
  });

  const res = await fetch(
    `${GCAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to list events: ${res.status}`);
  }

  const data = await res.json();
  return data.items || [];
}

/**
 * Update (patch) an existing event.
 *
 * @param {string} calendarId
 * @param {string} eventId — The Google Calendar event ID
 * @param {Object} patch — Fields to update
 * @param {string} accessToken
 * @returns {Promise<Object>}
 */
export async function updateCalendarEvent(calendarId, eventId, patch, accessToken) {
  const body = {};
  if (patch.summary) body.summary = patch.summary;
  if (patch.description !== undefined) body.description = patch.description;
  if (patch.start) body.start = { dateTime: patch.start, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
  if (patch.end) body.end = { dateTime: patch.end, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };

  const res = await fetch(
    `${GCAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to update event: ${res.status}`);
  }

  return res.json();
}

/**
 * Delete an event from the calendar.
 *
 * @param {string} calendarId
 * @param {string} eventId
 * @param {string} accessToken
 * @returns {Promise<void>}
 */
export async function deleteCalendarEvent(calendarId, eventId, accessToken) {
  const res = await fetch(
    `${GCAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to delete event: ${res.status}`);
  }
}

/**
 * Sync selective events to Google Calendar.
 * 
 * Logic:
 * - If event.deleted: DELETE from Google
 * - If event.googleId: PATCH update
 * - If no googleId: POST create
 * 
 * Uses Promise.all for concurrency.
 * 
 * @param {string} calendarId 
 * @param {Array} events — Array of Dexie event objects
 * @param {string} accessToken 
 * @returns {Promise<Array>} Array of { localId, googleId, action: 'upsert'|'delete', success: boolean }
 */
export async function syncAllToGoogle(calendarId, events, accessToken) {
  const syncTask = async (event) => {
    try {
      if (event.deleted === 1) {
        if (event.googleId) {
          await deleteCalendarEvent(calendarId, event.googleId, accessToken);
          return { localId: event.id, action: 'delete', success: true };
        }
        return { localId: event.id, action: 'delete', success: true }; // Already gone or never existed on Google
      }

      if (event.googleId) {
        // Update existing
        await updateCalendarEvent(calendarId, event.googleId, {
          summary: event.title,
          start: event.start,
          end: event.end,
          description: event.description || `Type: ${event.type}`
        }, accessToken);
        return { localId: event.id, googleId: event.googleId, action: 'upsert', success: true };
      } else {
        // Create new
        const gEvent = await createCalendarEvent(calendarId, {
          summary: event.title,
          start: event.start,
          end: event.end,
          description: event.description || `Type: ${event.type}`
        }, accessToken);
        return { localId: event.id, googleId: gEvent.id, action: 'upsert', success: true };
      }
    } catch (err) {
      console.error(`[CalendarSync] Failed to sync event ${event.id}:`, err);
      return { localId: event.id, action: event.deleted ? 'delete' : 'upsert', success: false };
    }
  };

  // Run all sync tasks in parallel
  return Promise.all(events.map(syncTask));
}
