# 🌙 RamaDone — AI-Powered Productivity Suite & Ramadan Companion

**RamaDone** is a **local-first Progressive Web App (PWA)** that combines a full productivity suite with an optional Ramadan companion mode. It features an AI chatbot, interactive calendar, task manager, expense tracker, habit tracker, prayer times, and a unified dashboard — all stored locally on your device using IndexedDB.

> **Branch:** `feature/productivity-suite`

---

## ✨ Features Overview

### 📊 Dashboard
A unified home screen with quick statistics across all modules — pending tasks, today's spending, habit streak completion, and upcoming events. Includes quick-navigate buttons to jump into any feature.

### 📅 Calendar
Full interactive calendar with **Day**, **Week**, **Month**, and **Year** views. Events display on a scrollable 24-hour timeline grid with color-coded event blocks. Supports event creation via modal, viewing event details, and navigating across dates.

- **Google Calendar Sync** — Two-way sync with a dedicated "Ramadan Schedule" Google Calendar
- **Delta Sync** — Only pushes modified/new events for fast updates
- **Soft Deletions** — Deleting locally automatically removes from Google Calendar
- **Event Types** — Prayer, Iftar, Suhoor, and Custom events with distinct visual styles

### ✅ Task Manager
A planner-style task management system with status tracking (`todo`, `in-progress`, `done`), priority levels (`low`, `medium`, `high`), due dates, categories, and notes. Tasks can be created from the calendar view with a pre-filled date.

### 💰 Expense Tracker
Full income & expense tracking with categories (Food, Transport, Health, etc.), date filtering, totals, and per-category breakdowns. Supports both expense and income entry types.

### 🎯 Habit Tracker
Daily/weekly habit tracking with emoji identifiers, category grouping, streak tracking, and completion logs. Habits can be archived (soft-deleted) without losing historical data.

### 🕌 Prayer Times
Auto-fetched prayer times from the [AlAdhan API](https://aladhan.com/prayer-times-api) based on the user's GPS coordinates. Displays Fajr, Sunrise, Dhuhr, Asr, Maghrib (Iftar), and Isha times. Togglable via Settings — non-Muslim users can hide this tab entirely.

### 🤖 AI Chat Assistant
A powerful AI chatbot powered by **DeepSeek** (V3 / Reasoner) that can manage **all** of your productivity data through natural conversation:

- **28 AI tools** across 4 domains: Calendar (10 tools), Tasks (4 tools), Expenses (4 tools), Habits (5 tools), plus 5 query/utility tools
- **Multi-turn tool chaining** — AI can chain up to 8 rounds of tool calls per message
- **Smart fixups** — Automatic correction of misrouted queries (e.g., asking about expenses but AI used `query_events`)
- **Delete-to-update conversion** — Detects when AI uses delete+add pattern and converts to proper update calls
- **Confirmation cards** — Mutation actions (add, update, delete) show interactive UI cards for user confirmation before executing
- **Two AI models**: Standard (fast) and Thinking Mode (deeper reasoning) — switchable in Settings

### ⚙️ Settings
- **Theme selection** — 3 themes: Light (warm cream), Dark (deep navy), Desert (sand & gold)
- **Time format** — 12h or 24h
- **Location sync** — GPS-based location for accurate prayer times
- **Ramadan Mode** — Toggle Ramadan-specific language, greetings, and Iftar/Suhoor context in the AI
- **Prayer Mode** — Toggle prayer times tab and AI prayer awareness
- **AI Model** — Switch between DeepSeek Standard and Thinking Mode
- **Data management** — Clear all local data, sign out

### 🔔 Local Notifications
Browser Notification API-based scheduled notifications stored in Dexie. Notifications are persisted across sessions and re-armed on app load. Currently runs while the app tab is open (no service worker push in MVP).

### 📱 Progressive Web App
- Installable on mobile and desktop
- Offline-first architecture — all data in IndexedDB
- Service worker with Workbox caching for static assets, prayer time API, and Google Calendar API
- Standalone display mode

---

## 🛠️ Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | 19.2 |
| Bundler | Vite | 8.0 |
| CSS | Tailwind CSS v4 | 4.2 (via `@tailwindcss/vite`) |
| Database | Dexie (IndexedDB) | 4.3 |
| AI API | **DeepSeek** (OpenAI-compatible) | V3 / Reasoner |
| Auth | Firebase Auth (Google Sign-In) | 12.10 |
| Calendar API | Google Calendar API | v3 |
| Icons | Lucide React | 0.577 |
| Routing | react-router-dom | 7.13 |
| PWA | vite-plugin-pwa | 1.2 |
| Dates | date-fns | 4.1 |
| Markdown | react-markdown | 10.1 |
| Typography | Outfit + Inter (Google Fonts) | — |

> ⚠️ **NOT using Gemini API.** The `.env` has a Gemini key and `@google/genai` is in `package.json`, but they are **not imported or used anywhere**. All AI code uses DeepSeek via its OpenAI-compatible endpoint.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+) and npm installed
- A [DeepSeek API key](https://platform.deepseek.com/) for the AI chatbot
- A Firebase project with Google Sign-In enabled (for auth + Google Calendar sync)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/ramadone.git
   cd RamaDone
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:
   ```env
   # DeepSeek AI (required for chatbot)
   VITE_DEEPSEEK_API_KEY=your_deepseek_api_key

   # Firebase Auth (required for sign-in)
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id

   # Google Calendar (required for calendar sync)
   VITE_GOOGLE_CLIENT_ID=your_google_client_id
   ```

4. **Run in development**
   ```bash
   npm run dev
   ```
   The app will start at `http://localhost:5173`.

---

## 📂 Project Structure

```
src/
├── App.jsx                    # Auth gate → LandingPage or AppShell
├── main.jsx                   # React DOM mount
├── index.css                  # Tailwind imports + design tokens + 3 themes + animations
│
├── components/
│   ├── Calendar/              # CalendarView, DayView, WeekView, MonthView, YearView,
│   │                          # TimelineGrid, EventBlock, AddEventModal
│   ├── Chat/                  # ChatView, ChatSidebar, AIActionModal,
│   │                          # InChatEventCard, InChatTaskCard
│   ├── Common/                # ErrorBoundary
│   ├── Dashboard/             # DashboardView (unified home screen)
│   ├── Expenses/              # ExpensesView (income & expense tracker)
│   ├── Habits/                # HabitsView (daily/weekly habit tracker)
│   ├── Landing/               # LandingPage (pre-auth welcome)
│   ├── Layout/                # AppShell (tab switcher), BottomNav (8-tab nav)
│   ├── Prayers/               # PrayersView (daily prayer times)
│   ├── Settings/              # SettingsView (preferences, theme, AI model)
│   └── Tasks/                 # TasksView (to-do / planner)
│
├── config/
│   └── theme.js               # applyTheme() helper + THEMES array
│
├── db/
│   └── dexie.js               # Database schema (v5, 11 tables)
│
├── hooks/
│   ├── useAuth.js             # Firebase auth hook
│   ├── useCalendarSync.js     # Google Calendar two-way sync
│   ├── useEvents.js           # CRUD for events table
│   ├── useEventsRange.js      # Date-range event queries
│   ├── useMessages.js         # Chat messages CRUD
│   ├── usePrayerSync.js       # AlAdhan prayer times fetch + cache
│   └── usePreferences.js      # Key-value preferences store
│
├── services/
│   ├── aiService.js           # DeepSeek API communication + smart fixups
│   ├── aiTools.js             # 28 tool declarations (Google-style format)
│   ├── aiPrompt.js            # System prompt builder (temporal, prayer, productivity context)
│   ├── queryExecutor.js       # Local query execution for AI tools against Dexie data
│   ├── notificationService.js # Browser notification scheduling + timer management
│   ├── authService.js         # Firebase auth setup
│   ├── calendarService.js     # Google Calendar API integration
│   └── prayerService.js       # AlAdhan prayer times API
│
├── styles/components/         # CSS modules: layout, calendar, chat, settings, landing,
│                              # prayers, dashboard, tasks, expenses, habits
│
└── utils/
    ├── constants.js           # Ramadan dates, event types, prayer configs, API endpoints
    └── timeHelpers.js         # Date/time formatting utilities
```

---

## 🗄️ Database Schema (Dexie v5 — IndexedDB)

The app uses 11 tables across 3 schema versions:

| Table | Primary Key | Indexed Fields | Purpose |
|-------|-----------|---------------|---------|
| `chatSessions` | `++id` | `title, updatedAt` | AI chat session metadata |
| `messages` | `++id` | `sessionId, role, timestamp` | Individual chat messages |
| `events` | `++id` | `googleId, title, start, end, type, date, synced, updatedAt, deleted` | Calendar events |
| `preferences` | `key` | — | Key-value user settings |
| `prayerTimes` | `date` | — | Cached daily prayer times (one row per day) |
| `tasks` | `++id` | `title, status, priority, dueDate, category, createdAt, updatedAt, completed` | To-do items |
| `expenses` | `++id` | `amount, type, category, date, note, recurring, createdAt` | Income & expense entries |
| `budgets` | `++id` | `category, amount, month` | Monthly budget caps |
| `habits` | `++id` | `name, emoji, frequency, category, createdAt, archived` | Trackable habits |
| `habitLogs` | `++id` | `habitId, date, completed, count, note` | Per-day habit completion records |
| `notifications` | `++id` | `type, title, body, scheduledAt, fired, relatedId` | Scheduled notification queue |

> All data is stored **locally** in the browser's IndexedDB. No personal data is sent to external databases.

---

## 🧭 Navigation (8 Tabs)

| Tab | Component | Icon | Location |
|-----|-----------|------|----------|
| Dashboard | `DashboardView` | `LayoutDashboard` | Primary (mobile bar) |
| Calendar | `CalendarView` | `Calendar` | Primary (mobile bar) |
| Tasks | `TasksView` | `CheckSquare` | Primary (mobile bar) |
| Expenses | `ExpensesView` | `Wallet` | Primary (mobile bar) |
| Habits | `HabitsView` | `Target` | More menu (mobile) |
| Prayers | `PrayersView` | `Clock` | More menu (conditionally shown) |
| AI Chat | `ChatView` | `MessageCircle` | More menu (mobile) |
| Settings | `SettingsView` | `Settings` | More menu (mobile) |

**Mobile:** Bottom nav bar with 4 primary tabs + a "More" button that opens a slide-up sheet with the remaining tabs.

**Desktop:** Full left sidebar showing all 8 tabs with a moon brand icon at the top.

The Prayers tab is conditionally shown based on the `prayerMode` preference — it's hidden when Prayer Mode is off.

---

## 🤖 AI Architecture

### Provider
- **DeepSeek V3** via `https://api.deepseek.com/chat/completions`
- OpenAI-compatible format (messages array, tools, tool_choice)
- Two models available via Settings: `deepseek-chat` (Standard) and `deepseek-reasoner` (Thinking Mode)

### Tool System (28 Tools)

**Calendar Tools (10):**
`add_event`, `update_event`, `delete_event`, `query_events`, `check_conflicts`, `find_free_slots`, `get_day_narrative`, `repeat_event`, `get_schedule_summary`, `clear_date_range`

**Task Tools (4):**
`add_task`, `update_task`, `delete_task`, `query_tasks`

**Expense Tools (4):**
`add_expense`, `update_expense`, `delete_expense`, `query_expenses`

**Habit Tools (5):**
`add_habit`, `update_habit`, `delete_habit`, `log_habit`, `query_habits`

### How It Works
1. User sends a message → `chatWithAI()` builds a system prompt with temporal context, prayer times, and productivity snapshot
2. DeepSeek responds with either text or tool calls
3. **Query tools** (read-only) execute locally against Dexie data and feed results back into a multi-turn loop (up to 8 rounds)
4. **Mutation tools** (add, update, delete) return to the UI as interactive confirmation cards
5. User approves/rejects each action → confirmed actions execute against Dexie

### Smart Fixups
The AI service includes two layers of automatic correction:

1. **Misrouted Query Redirect** — If the user asks about expenses but the AI called `query_events`, the system detects this by keyword matching and redirects to `query_expenses` (also works for tasks and habits)
2. **Delete+Add → Update conversion** — If the AI returns a `delete_expense` + `add_expense` pair (instead of `update_expense`), the system converts this to a single `update_expense` call

### System Prompt Context
The AI receives dynamic context on every message:
- **Temporal reference** — Today's date, this week, this month, Ramadan day counter (if enabled)
- **Prayer times** — Today's Fajr, Dhuhr, Asr, Maghrib, Isha times (if Prayer Mode is on)
- **Productivity snapshot** — Pending task count, today's spending, habit completion percentage, and top 5 tasks
- **Upcoming events** — Next 3 days of calendar events

---

## 🎨 Theming System

Three themes available via CSS custom properties on `:root`, `.theme-dark`, and `.theme-desert`:

| Theme | Style | Surface | Accent |
|-------|-------|---------|--------|
| **Light** (default) | Warm cream | `#fdf6ec` | Gold `#c9a84c` |
| **Dark** | Deep navy | `#0f172a` | Amber `#f59e0b` |
| **Desert** | Sand & gold | `#fef3c7` | Orange `#d97706` |

Key CSS variables: `--c-primary`, `--c-surface`, `--c-surface-elevated`, `--c-text`, `--c-text-muted`, `--c-accent`, `--c-accent-glow`, `--c-border`, `--c-nav-bg`, `--c-prayer`, `--c-iftar`

Tailwind v4's `@theme` block maps these variables to utility classes (`bg-surface`, `text-accent`, `bg-prayer`, etc.), enabling zero-JS theme switching by toggling a class on `<html>`.

---

## 🏗️ Architecture Summary

- **Auth Gate:** `App.jsx` checks Firebase auth → shows `LandingPage` (unauthenticated) or `AppShell` (authenticated)
- **State:** `useState` for UI state, Dexie `useLiveQuery` for reactive data from IndexedDB
- **Navigation:** Tab-based via `AppShell` + `BottomNav` using `useState('dashboard')`
- **AI Service:** Modular — `aiService.js` (API calls), `aiTools.js` (tool schemas), `aiPrompt.js` (prompt builder), `queryExecutor.js` (local execution)
- **Offline-First:** All data in IndexedDB, PWA service worker caches static assets and API responses
- **CSS:** Tailwind utility classes + 10 component CSS modules in `styles/components/`

---

## 📐 Coding Conventions

- **React:** Functional components, hooks only — no class components
- **CSS:** Tailwind utility classes + custom CSS in `styles/components/` files
- **State:** Dexie `useLiveQuery` for reactive data, `useState`/`useEffect` for UI state
- **Exports:** `export default function` for components, named exports for services/hooks
- **Comments:** JSDoc-style file headers explaining "WHY" decisions
- **Naming:** PascalCase components, camelCase functions/hooks, kebab-case CSS classes

---

## ⚡ Performance

- **Parallel sync:** Multiple Google Calendar events synced concurrently
- **Future-only sync:** Past events filtered out to reduce sync load
- **Offline resilience:** Changes tracked in IndexedDB and synced when online
- **Workbox caching:** AlAdhan API (StaleWhileRevalidate, 24h TTL), Google Calendar API (NetworkFirst, 1h TTL)
- **Token optimization:** AI query results are slimmed to essential fields only (max 50 items per query, 100 for habit logs) to minimize API token usage

---

*Built for productivity. Optionally blessed.* 🌙
