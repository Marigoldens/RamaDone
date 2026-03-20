# RamaDone — Project Context (March 2026)

> **This is the single source of truth for any AI agent working on this codebase.**
> If this file contradicts README.md or other docs, THIS FILE wins.

---

## What Is RamaDone?

A **local-first PWA productivity app** themed around Ramadan. Currently a calendar + AI chatbot.
Being expanded into a **full productivity suite** (tasks, expenses, habits, dashboard, notifications).

---

## Tech Stack (Actual)

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | 19.2 |
| Bundler | Vite | 8.0 |
| CSS | Tailwind CSS v4 | 4.2 (via `@tailwindcss/vite`) |
| Database | Dexie (IndexedDB) | 4.3 |
| AI API | **DeepSeek** (OpenAI-compatible) | V3 / Reasoner |
| Auth | Firebase Auth (Google Sign-In) | 12.10 |
| Calendar | Google Calendar API | v3 |
| Icons | Lucide React | 0.577 |
| Routing | react-router-dom | 7.13 |
| PWA | vite-plugin-pwa | 1.2 |
| Dates | date-fns | 4.1 |

> ⚠️ **NOT using Gemini API.** The env has a Gemini key but all AI code uses DeepSeek.
> The `@google/genai` package is in package.json but not imported anywhere.

---

## File Structure (Current)

```
src/
├── App.jsx                    # Auth gate → LandingPage or AppShell
├── main.jsx                   # React DOM mount
├── index.css                  # Tailwind imports + design tokens + themes + animations
├── components/
│   ├── Calendar/              # CalendarView, DayView, WeekView, MonthView, YearView, TimelineGrid, EventBlock, AddEventModal
│   ├── Chat/                  # ChatView, ChatSidebar, InChatEventCard, AIActionModal
│   ├── Common/                # (empty)
│   ├── Landing/               # LandingPage
│   ├── Layout/                # AppShell (tab switcher), BottomNav (4 tabs)
│   ├── Prayers/               # PrayersView
│   └── Settings/              # SettingsView
├── config/                    # theme.js (applyTheme helper)
├── db/
│   └── dexie.js               # Database schema (v4, 5 tables)
├── hooks/
│   ├── useAuth.js             # Firebase auth hook
│   ├── useCalendarSync.js     # Google Calendar sync
│   ├── useEvents.js           # CRUD for events table
│   ├── useEventsRange.js      # Date-range query
│   ├── useMessages.js         # Chat messages CRUD
│   ├── usePrayerSync.js       # Prayer times fetching
│   └── usePreferences.js      # Key-value preferences
├── services/
│   ├── aiService.js           # DeepSeek chat + 10 tool functions
│   ├── authService.js         # Firebase auth setup
│   ├── calendarService.js     # Google Calendar API
│   └── prayerService.js       # AlAdhan prayer times API
├── styles/components/         # CSS files: layout.css, calendar.css, chat.css, settings.css, landing.css, prayers.css
└── utils/
    ├── constants.js           # App constants
    └── timeHelpers.js         # Date/time formatting helpers
```

---

## Dexie Database Schema (v4)

```javascript
chatSessions: '++id, title, updatedAt'
messages:     '++id, sessionId, role, timestamp'
events:       '++id, googleId, title, start, end, type, date, synced, updatedAt, deleted'
preferences:  'key'
prayerTimes:  'date'
```

---

## Current Navigation (4 tabs)

| Tab | Component | Icon |
|-----|-----------|------|
| Settings | SettingsView | `Settings` |
| Chat | ChatView | `MessageCircle` |
| Calendar | CalendarView | `Calendar` |
| Prayers | PrayersView | `Clock` |

Managed by `AppShell.jsx` using `useState('calendar')` for `activeTab`.
`BottomNav.jsx` renders horizontal tabs on mobile, vertical sidebar on desktop.

---

## Theming System

3 themes via CSS custom properties on `:root` / `.theme-dark` / `.theme-desert`:
- **Light** (default): Warm cream
- **Dark**: Deep navy
- **Desert**: Sand & gold

Key variables: `--c-primary`, `--c-surface`, `--c-text`, `--c-accent`, `--c-border`, etc.
Tailwind `@theme` block maps these to utility classes (`bg-surface`, `text-accent`, etc.).

---

## AI Service Architecture

- Uses **DeepSeek V3** via `https://api.deepseek.com/chat/completions`
- OpenAI-compatible format (messages, tools, tool_choice)
- 10 calendar tools (add, update, delete, query, conflicts, free slots, etc.)
- Tool results feed back into multi-turn loop (up to 8 rounds)
- Mutation tools (add/update/delete) show confirmation cards in ChatView
- Query tools execute locally against Dexie data
- System prompt includes temporal context + prayer times + user preferences

---

## Coding Conventions

- **React**: Functional components, hooks only, no class components
- **CSS**: Tailwind utility classes + custom CSS in `styles/components/` files
- **State**: Dexie `useLiveQuery` for reactive data, `useState`/`useEffect` for UI state
- **Exports**: `export default function` for components, named exports for services/hooks
- **Comments**: JSDoc-style file headers explaining "WHY" decisions
- **Naming**: PascalCase components, camelCase functions/hooks, kebab-case CSS classes
