# RamaDone — AI Workspace Context (GEMINI.md)

> This file is read automatically by AI assistants working in this workspace.
> It describes the full architecture, conventions, and key files of the project.

---

## Project Overview

**RamaDone** is an offline-first Ramadan Rhythm Scheduler — a React PWA where users manage
their daily Ramadan schedule (prayers, Iftar, Suhoor, custom events) with the help of a
specialized AI chatbot powered by Gemini.

**Stack:**
- React 18 + Vite (frontend)
- Dexie (IndexedDB — offline-first local DB)
- Google Gemini API (`gemini-2.5-flash`) via `@google/genai`
- AlAdhan REST API (free, no key — prayer times)
- Google Calendar API (optional sync via OAuth)
- CSS custom properties + theme system (no Tailwind)

---

## Directory Structure

```
src/
├── components/
│   ├── Chat/
│   │   ├── ChatView.jsx          ← Main chat UI + AI orchestration
│   │   ├── ChatSidebar.jsx       ← Session list sidebar
│   │   └── InChatEventCard.jsx   ← Confirmation card for proposed events
│   ├── Calendar/
│   │   ├── CalendarView.jsx      ← Monthly calendar grid
│   │   └── AddEventModal.jsx     ← Manual add-event form
│   └── Settings/
│       └── SettingsView.jsx      ← User preferences (location, theme, etc.)
├── hooks/
│   ├── useEvents.js              ← Dexie: events CRUD + live queries
│   ├── useMessages.js            ← Dexie: chat messages + sessions
│   └── usePreferences.js         ← Dexie: key-value settings store
├── services/
│   ├── aiService.js              ← ALL AI logic: tools, system prompt, query execution
│   ├── prayerService.js          ← AlAdhan API wrapper (fetchPrayerTimes, parsePrayerTime)
│   ├── calendarService.js        ← Google Calendar sync helpers
│   └── authService.js            ← Google OAuth helpers
├── db/
│   └── dexie.js                  ← DB schema (version 3)
└── config/
    └── theme.js                  ← CSS theme application logic
```

---

## Database Schema (Dexie v3)

```
chatSessions : ++id, title, updatedAt
messages     : ++id, sessionId, role, timestamp
events       : ++id, googleId, title, start, end, type, date, synced, updatedAt, deleted
preferences  : key (primary)
```

**Event fields:**
- `start` / `end` — ISO datetime strings (`YYYY-MM-DDThh:mm:ss`)
- `date` — `YYYY-MM-DD` (indexed for fast per-day queries)
- `type` — `'prayer' | 'iftar' | 'suhoor' | 'custom'`
- `deleted` — soft-delete flag (0/1) for Google Calendar sync

**Preferences (key-value):**
- `theme`, `timeFormat` (`12h`/`24h`)
- `latitude`, `longitude`, `calcMethod` — for AlAdhan prayer times
- `ramadanMode` — boolean: AI suggests buffer blocks around prayers
- `syncPrayerTimes`, `calendarId` — Google Calendar sync config

---

## AI Service Architecture (`src/services/aiService.js`)

### Key Exports

| Export | Description |
|---|---|
| `chatWithGemini(messages, allEvents, preferences, prayerTimes)` | Main chat function — returns `{ isFunctionCall, functionCalls, chatInstance }` or `{ text }` |
| `executeCalendarAction(functionCall, eventsHook)` | Executes confirmed mutations (add/update/delete) against Dexie |
| `executeQueryTool(functionCall, allEvents)` | Executes read-only + utility tools locally, returns data |
| `sendFunctionResultsToGemini(chatInstance, results)` | Sends tool results back to Gemini for a follow-up reply |

### Tool Categories

**Mutation tools** (go through user confirmation card before executing):
- `add_event` — add a single event
- `update_event` — update an existing event by ID
- `delete_event` — delete a single event by ID
- `clear_date_range` — bulk-delete all events in a date range

**Query/Utility tools** (executed locally, results sent back to Gemini):
- `query_events` — search by date range / type / keyword
- `get_schedule_summary` — event counts per day/type in a range
- `check_conflicts` — detect overlapping events for a proposed time
- `find_free_slots` — find open time windows on a given day
- `get_day_narrative` — structured event list for a date (AI narrates)
- `repeat_event` — generate a batch of identical events on multiple dates
- `get_schedule_summary` — aggregate view of a date range

### System Prompt Contents (rebuilt each request)
1. **Calendar rules** — duration defaults, conflict-check mandate, advice mode
2. **Temporal reference block** — today, tomorrow, this/next week, Ramadan day, current time
3. **Prayer times block** — live Fajr/Dhuhr/Asr/Maghrib/Isha/Tarawih from AlAdhan
4. **Context payload** — user preferences + today+3-day event preview

---

## ChatView Orchestration Flow (`src/components/Chat/ChatView.jsx`)

```
User types message
      ↓
chatWithGemini() → Gemini responds
      ↓
  isFunctionCall?
  ├── NO  → save text message to DB → display
  └── YES → loop over functionCalls:
        ├── add_event       → push to batchedEvents + allPendingCalls
        ├── repeat_event    → executeQueryTool → unpack batch → push to batchedEvents
        ├── delete_event    → push to batchedDeletes + allPendingCalls
        ├── update_event    → push to batchedUpdates + allPendingCalls
        ├── clear_date_range→ executeQueryTool → push found events to batchedDeletes
        └── query tools     → executeQueryTool → collect in queryResultsForGemini
              ↓
        queryResultsForGemini.length > 0?
        └── YES → sendFunctionResultsToGemini → save follow-up text to DB
              ↓
        hasPendingActions (mutations)?
        └── YES → save assistant message with { proposedEvents, proposedDeletes, proposedUpdates, rawCalls, isConfirmed: false }
                   → InChatEventCard renders confirmation UI
                   → on confirm: executeCalendarAction() for each rawCall → updateMessageData({ isConfirmed: true })
```

### Prayer Times Loading
On `ChatView` mount (and when `preferences.latitude` changes):
- Calls `fetchPrayerTimes(lat, lon, date, method)` from AlAdhan
- Builds a one-line prayer-times block string
- Stores in `prayerTimes` state
- Passed into every `chatWithGemini()` call as the 4th argument
- Fails gracefully (console.warn, no UI impact)

---

## Coding Conventions

- **No TypeScript** — plain JavaScript with JSDoc comments
- **No Tailwind** — vanilla CSS with `var(--*)` design tokens
- **Dexie live queries** via `useLiveQuery` for all reactive data
- **Soft deletes** for Google-synced events (`deleted: 1`)
- Event `start`/`end` always ISO strings; `date` is `YYYY-MM-DD` (separate field for Dexie indexing)
- AI tools are declared as plain objects (not class instances) inside `chatWithGemini`
- `buildTemporalContext()` and `buildPrayerContext()` run fresh on every chat call

---

## Environment Variables (`.env.local`)

```
VITE_GEMINI_API_KEY=...          # Required — Google Gemini API key
VITE_GOOGLE_CLIENT_ID=...        # Optional — Google OAuth for calendar sync
```

---

## Important Gotchas for AI Assistants

1. **Never edit `db/dexie.js` schema without bumping the version number**, or IndexedDB will throw.
2. **`executeQueryTool` is pure** — it reads `allEvents` (passed in as argument) not from DB directly.
3. **`handleConfirmEvents` in ChatView uses `eventsHook`** which is scoped to `todayDate`. For events on other dates, `addEvent` still works because it uses `event.date` not the hook's date.
4. **Prayer times are fetched in ChatView, not in aiService** — `aiService.buildPrayerContext()` is an unused helper left for reference; the live block comes from ChatView's `prayerTimes` state.
5. **`repeat_event` result has `requiresBatch: true`** — ChatView detects this and unpacks `.events[]` into individual `add_event` pending calls.
6. **Messages with pending actions** store the full `rawCalls` array in `metadata` in Dexie — this is how the confirmation card knows what to execute.
