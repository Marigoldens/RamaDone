# RamaDone — AI Chatbot Documentation

> A plain-English guide to how the chat assistant works, what it can do, and how all the pieces fit together.

---

## What Is the AI Chatbot?

The chat screen in RamaDone is powered by **DeepSeek V3.2**. It is not a generic chatbot — it is a **specialized Ramadan calendar brain** that can read your schedule, detect conflicts, add events, delete events, and understand verbal time expressions like "tomorrow night" or "this weekend".

Everything the AI does goes through your **local device** first (IndexedDB via Dexie). Nothing is sent to a cloud calendar unless you've connected Google Calendar in settings.

---

## How a Chat Message Works (Step by Step)

1. **You type a message** and hit send.
2. The app sends your message to DeepSeek along with:
   - Your preferences (location, Ramadan Mode, time format)
   - Today's real prayer times (Fajr, Dhuhr, Asr, Maghrib/Iftar, Isha, Tarawih)
   - A "today + 3 days" preview of your upcoming events
   - The current date, time, day of Ramadan, and time-reference rules (so "next week" always resolves to the correct dates)
3. **DeepSeek responds** — either with plain text, or by calling one of 10 built-in tools.
4. If DeepSeek calls a **mutation tool** (add, update, delete), you see a **confirmation card** — you must approve before anything changes.
5. If DeepSeek calls a **query tool** (search, free slots, day summary), it runs locally on your device and the result is fed back to DeepSeek, which then writes you a natural reply.

---

## The 10 AI Tools

### Mutation Tools (require your confirmation)

| Tool | What it does | Example trigger |
|---|---|---|
| `add_event` | Adds one event to your calendar | *"Add a Quran session tomorrow at 7pm"* |
| `update_event` | Edits an existing event | *"Move my Quran session to 8pm"* |
| `delete_event` | Removes one event | *"Delete my 3pm meeting"* |
| `clear_date_range` | Removes all events in a date range | *"Clear everything this Sunday"* |

### Query Tools (no confirmation needed — read-only)

| Tool | What it does | Example trigger |
|---|---|---|
| `query_events` | Searches your events by date/type/keyword | *"What prayer events do I have this week?"* |
| `get_schedule_summary` | Count of events per day in a range | *"How busy is my schedule this week?"* |
| `check_conflicts` | Checks if a time slot is already taken | Runs automatically before every new event |
| `find_free_slots` | Finds open time windows on a day | *"Find me a free 30 minutes after Asr"* |
| `get_day_narrative` | Full event breakdown for a day | *"What's my day looking like tomorrow?"* |
| `repeat_event` | Adds the same event across multiple dates | *"Add Tarawih every night this week at 9pm"* |

---

## The Confirmation Card

Whenever DeepSeek wants to **add, update, or delete** events, it pauses and shows you a card instead of acting immediately. The card shows:

- 🟢 **Green cards** — events to be added (with title, date, time, type)
- 🔴 **Red cards** — events to be deleted (with title and time)
- 🔵 **Blue cards** — events to be updated (with what changes)

You can **Confirm** (saves to your local calendar) or **Cancel** (nothing happens).

For recurring events (e.g., 7 nights of Tarawih), all 7 events appear in one big confirmation card.

---

## Prayer Time Injection

Every time you open the chat, the app silently fetches **today's real prayer times** from the [AlAdhan API](https://aladhan.com) using your location saved in Settings.

These get injected into the AI's instructions so it knows:
- Exactly when Iftar (Maghrib) is
- When Fajr is (so "Suhoor time" = 30–60 min before Fajr)
- When Tarawih typically starts (30 min after Isha)

**This means:** if you say *"add Iftar prep at Maghrib time"*, the AI uses your actual Maghrib time — not a guess.

If you're offline or the API fails, the AI still works — it just won't have prayer times, so it'll ask you for the exact time instead.

---

## Temporal Understanding

The AI receives a live "time reference block" every request:

```
Today    : Mon 17 Mar 2026
Tomorrow : Tue 18 Mar 2026
This week: Mon 17 – Sun 23 Mar 2026
Next week: Mon 24 – Sun 30 Mar 2026
Ramadan Day: 28 of 30
Current time: 14:35
```

This means phrases like *"next Tuesday"*, *"this weekend"*, *"the day after tomorrow"* all resolve automatically to the correct ISO dates when tools are called.

---

## Scheduling Rules the AI Follows

| Rule | Detail |
|---|---|
| **Conflict check first** | Before adding any event, the AI calls `check_conflicts`. If something exists, it warns you and suggests another time. |
| **Smart durations** | Prayer = 15 min, Iftar = 45 min, Suhoor = 20 min, custom = 60 min |
| **Ramadan Mode** | If enabled in Settings → AI proactively suggests 15-min buffer blocks around prayers (Wudu before, Sunnah after) |
| **Empty day advice** | If your schedule for today is empty, the AI offers to build you a full balanced Ramadan day plan |
| **Recurring events** | "Every night" / "for 7 days" → AI generates all dates and sends them as one batch |

---

## Where Data Is Stored

All data lives **on your device only** in IndexedDB (via Dexie):

| Store | What's in it |
|---|---|
| `events` | All your calendar events (title, start, end, type, date) |
| `messages` | Your full chat history, organized by session |
| `chatSessions` | Session titles and timestamps (shown in the sidebar) |
| `preferences` | Your settings: location, theme, time format, Ramadan Mode |

If you connect Google Calendar in Settings, events sync there too — but the source of truth is always local first.

---

## Key Files for Developers

| File | Role |
|---|---|
| `src/services/aiService.js` | **Everything AI**: tools, system prompt, query execution, prayer context |
| `src/components/Chat/ChatView.jsx` | **Chat orchestration**: sends messages, handles tool results, renders confirmation cards |
| `src/components/Chat/InChatEventCard.jsx` | **Confirmation card UI**: shows proposed events with approve/cancel |
| `src/services/prayerService.js` | **AlAdhan API**: fetch prayer times for any date + location |
| `src/hooks/useEvents.js` | **Dexie events hook**: add, update, delete, live query |
| `src/db/dexie.js` | **Database schema** |

---

## Common Questions

**Q: Does the AI ever change my calendar without asking?**
No. All mutations (add/update/delete) go through the confirmation card. The AI cannot touch your calendar without your explicit approval.

**Q: Can the AI see all my events?**
For today + 3 days, it receives them directly. For any other date, it calls `query_events` to search — it never has your entire calendar in memory at once.

**Q: What if I'm offline?**
The calendar app works fully offline. The AI chat requires an internet connection (for DeepSeek API) but prayer times load from cache if already fetched.

**Q: Why does the AI ask for confirmation instead of just adding the event?**
By design — the AI is confident about the data but you should always be in control of your own calendar. The card also lets you review the exact time before committing.
