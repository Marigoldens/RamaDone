import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { fetchPrayerTimes, parsePrayerTime } from "./prayerService";

// No longer using Google GenAI SDK directly. DeepSeek is accessed via fetch.

// ─── Temporal Context Helper ───────────────────────────────────────────────────
function buildTemporalContext() {
  const now = new Date();
  const todayLabel = format(now, "EEE d MMM yyyy");
  const tomorrow = addDays(now, 1);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd   = endOfWeek(now,   { weekStartsOn: 1 });
  const nextWeekStart = addDays(weekStart, 7);
  const nextWeekEnd   = addDays(weekEnd,   7);
  const monthStart = startOfMonth(now);
  const monthEnd   = endOfMonth(now);

  const ramadanStart = new Date("2026-02-18");
  const diffMs = now - ramadanStart;
  const ramadanDay = diffMs >= 0 ? Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1 : null;

  const fmt = (d) => format(d, "EEE d MMM yyyy");
  const isoDate = (d) => format(d, "yyyy-MM-dd");

  return `
=== TEMPORAL REFERENCE ===
Today            : ${todayLabel}  (ISO: ${isoDate(now)})
Tomorrow         : ${fmt(tomorrow)}  (ISO: ${isoDate(tomorrow)})
This week        : ${fmt(weekStart)} – ${fmt(weekEnd)}
This weekend     : ${fmt(addDays(weekEnd, -1))} – ${fmt(weekEnd)}
Next week        : ${fmt(nextWeekStart)} – ${fmt(nextWeekEnd)}
This month       : ${fmt(monthStart)} – ${fmt(monthEnd)}
${ramadanDay ? `Ramadan Day      : ${ramadanDay} of 30` : ""}
Current time     : ${format(now, "HH:mm")} LOCAL TIME (UTC+3)

Rules:
- "today" → ${isoDate(now)}
- "tomorrow" → ${isoDate(tomorrow)}
- "this weekend" → ${isoDate(addDays(weekEnd, -1))} to ${isoDate(weekEnd)}
- "next week" → ${isoDate(nextWeekStart)} to ${isoDate(nextWeekEnd)}
- ⚠️ ALL TIMES ARE LOCAL (UTC+3). ISO strings like 2026-03-18T09:00:00 mean 9 AM local. NEVER subtract 3 hours. NEVER convert to UTC. If user says "9 AM" → use T09:00:00. If user says "3 hours" → start + 3h in local time.
- Always emit dates as ISO strings (YYYY-MM-DDThh:mm:ss) when calling tools.
=== END TEMPORAL REFERENCE ===`;
}

// ─── Prayer Time Context Helper ───────────────────────────────────────────────
async function buildPrayerContext(preferences) {
  try {
    const { latitude, longitude, calcMethod } = preferences;
    const todayForAlAdhan = format(new Date(), "dd-MM-yyyy");
    const timings = await fetchPrayerTimes(latitude, longitude, todayForAlAdhan, calcMethod ?? 2);

    // parsePrayerTime strips timezone suffixes like " (EET)"
    const fmt = (key) => {
      const t = timings[key];
      if (!t) return "N/A";
      const { hours, minutes } = parsePrayerTime(t);
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    };

    return `
=== TODAY'S PRAYER TIMES (use these when the user mentions any prayer by name) ===
Fajr     : ${fmt("Fajr")}
Sunrise  : ${fmt("Sunrise")}
Dhuhr    : ${fmt("Dhuhr")}
Asr      : ${fmt("Asr")}
Maghrib  : ${fmt("Maghrib")}  ← this is Iftar time
Isha     : ${fmt("Isha")}
Tarawih  : ~${fmt("Isha")} + 30 min after Isha (suggest ~${(() => {
      const t = timings["Isha"];
      if (!t) return "20:30";
      const { hours, minutes } = parsePrayerTime(t);
      const total = hours * 60 + minutes + 30;
      return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
    })()})

When the user says "Iftar" use Maghrib time. When they say "Suhoor" suggest ~30–60 min before Fajr.
=== END PRAYER TIMES ===`;
  } catch {
    // Graceful fallback if offline or API error
    return "";
  }
}

// ─── Calendar Action Executor ─────────────────────────────────────────────────
export const executeCalendarAction = async (functionCall, useEventsHook) => {
  const { name, args } = functionCall;
  console.log("Executing calendar action:", name, args);

  try {
    if (name === "add_event") {
      const dateOnly = args.start ? args.start.split("T")[0] : null;
      const eventPayload = { ...args, date: dateOnly };
      await useEventsHook.addEvent(eventPayload);
      return { success: true, message: "Event added successfully", event: eventPayload };
    } else if (name === "update_event") {
      await useEventsHook.updateEvent(args.id, args.updates);
      return { success: true, message: "Event updated successfully" };
    } else if (name === "delete_event") {
      await useEventsHook.deleteEvent(args.id);
      return { success: true, message: "Event deleted successfully", id: args.id };
    }
  } catch (error) {
    console.error("Action execution failed:", error);
    return { success: false, error: error.message };
  }

  return { success: false, error: "Unknown action" };
};

// ─── Query / Utility Tool Executor ───────────────────────────────────────────
export const executeQueryTool = async (functionCall, allEvents) => {
  const { name, args } = functionCall;
  console.log("Executing query tool:", name, args);

  // ── query_events ─────────────────────────────────────────────────────────
  if (name === "query_events") {
    let results = allEvents || [];
    if (args.date_from) results = results.filter(e => e.start >= args.date_from);
    if (args.date_to) {
      const toStr = args.date_to.length === 10 ? args.date_to + "T23:59:59" : args.date_to;
      results = results.filter(e => e.start <= toStr);
    }
    if (args.type)    results = results.filter(e => e.type === args.type);
    if (args.keyword) {
      const kw = args.keyword.toLowerCase();
      results = results.filter(e => e.title?.toLowerCase().includes(kw));
    }
    const minimal = results.map(e => ({ id: e.id, title: e.title, start: e.start, end: e.end, type: e.type, color: e.color }));
    return { success: true, events: minimal, count: minimal.length };
  }

  // ── get_schedule_summary ─────────────────────────────────────────────────
  if (name === "get_schedule_summary") {
    const events = allEvents || [];
    const dateFrom = args.date_from || format(new Date(), "yyyy-MM-dd");
    const dateTo   = args.date_to   || format(addDays(new Date(), 6), "yyyy-MM-dd");
    const filtered = events.filter(e => {
      const d = e.start?.substring(0, 10);
      return d && d >= dateFrom && d <= dateTo;
    });
    const byDay = {};
    filtered.forEach(e => {
      const day = e.start.substring(0, 10);
      if (!byDay[day]) byDay[day] = { total: 0, byType: {}, events: [] };
      byDay[day].total++;
      byDay[day].byType[e.type] = (byDay[day].byType[e.type] || 0) + 1;
      byDay[day].events.push({ id: e.id, title: e.title, start: e.start, end: e.end, type: e.type });
    });
    return { success: true, summary: byDay, totalEvents: filtered.length, range: { from: dateFrom, to: dateTo } };
  }

  // ── clear_date_range ─────────────────────────────────────────────────────
  if (name === "clear_date_range") {
    const events = allEvents || [];
    const from = args.date_from;
    const to   = args.date_to?.length === 10 ? args.date_to + "T23:59:59" : args.date_to;
    let toDelete = events.filter(e => e.start && e.start >= from && e.start <= to);
    if (args.type) toDelete = toDelete.filter(e => e.type === args.type);
    return {
      success: true,
      requiresConfirmation: true,
      eventsToDelete: toDelete.map(e => ({ id: e.id, title: e.title, start: e.start, end: e.end })),
      count: toDelete.length,
    };
  }

  // ── check_conflicts ──────────────────────────────────────────────────────
  if (name === "check_conflicts") {
    const { start, end } = args;
    const events = allEvents || [];
    const conflicts = events.filter(e => {
      if (!e.start || !e.end) return false;
      // Overlap: e.start < end AND e.end > start
      return e.start < end && e.end > start;
    });
    const minimal = conflicts.map(e => ({ id: e.id, title: e.title, start: e.start, end: e.end, type: e.type }));
    return { success: true, hasConflicts: minimal.length > 0, conflicts: minimal, count: minimal.length };
  }

  // ── find_free_slots ──────────────────────────────────────────────────────
  if (name === "find_free_slots") {
    const { date, duration_minutes = 30, earliest = "06:00", latest = "22:00" } = args;
    const events = (allEvents || [])
      .filter(e => e.start?.startsWith(date) && !e.deleted)
      .sort((a, b) => a.start.localeCompare(b.start));

    const durationMs = duration_minutes * 60 * 1000;
    const dayBase = date; // YYYY-MM-DD

    // Parse earliest/latest bounds
    const [eh, em] = earliest.split(":").map(Number);
    const [lh, lm] = latest.split(":").map(Number);
    const windowStart = new Date(`${dayBase}T${earliest}:00`).getTime();
    const windowEnd   = new Date(`${dayBase}T${latest}:00`).getTime();

    const slots = [];
    let cursor = windowStart;

    for (const ev of events) {
      const evStart = new Date(ev.start).getTime();
      const evEnd   = new Date(ev.end).getTime();
      if (evStart <= cursor) {
        // This event overlaps or starts before cursor — push cursor forward
        cursor = Math.max(cursor, evEnd);
        continue;
      }
      // Gap between cursor and evStart
      if (evStart - cursor >= durationMs && cursor >= windowStart) {
        slots.push({
          start: format(new Date(cursor), "HH:mm"),
          end:   format(new Date(Math.min(evStart, windowEnd)), "HH:mm"),
          duration_minutes: Math.floor((Math.min(evStart, windowEnd) - cursor) / 60000),
        });
      }
      cursor = Math.max(cursor, evEnd);
    }

    // Final gap after last event until window end
    if (windowEnd - cursor >= durationMs && cursor < windowEnd) {
      slots.push({
        start: format(new Date(cursor), "HH:mm"),
        end:   format(new Date(windowEnd), "HH:mm"),
        duration_minutes: Math.floor((windowEnd - cursor) / 60000),
      });
    }

    return { success: true, date, slots, count: slots.length };
  }

  // ── get_day_narrative ────────────────────────────────────────────────────
  if (name === "get_day_narrative") {
    const { date } = args;
    const events = (allEvents || [])
      .filter(e => e.start?.startsWith(date))
      .sort((a, b) => a.start.localeCompare(b.start));

    if (events.length === 0) {
      return { success: true, date, eventCount: 0, narrative: "No events scheduled. The day is completely free.", events: [] };
    }

    const eventList = events.map(e => ({
      title: e.title,
      start: format(new Date(e.start), "h:mm a"),
      end:   format(new Date(e.end),   "h:mm a"),
      type:  e.type,
    }));

    const typeCounts = {};
    events.forEach(e => { typeCounts[e.type] = (typeCounts[e.type] || 0) + 1; });

    return { success: true, date, eventCount: events.length, events: eventList, typeCounts };
  }

  // ── repeat_event ─────────────────────────────────────────────────────────
  if (name === "repeat_event") {
    const { title, start_time, end_time, type, color, dates } = args;
    if (!dates || dates.length === 0) {
      return { success: false, error: "No dates provided for repeat_event" };
    }
    const events = dates.map(date => ({
      title,
      start: `${date}T${start_time}:00`,
      end:   `${date}T${end_time}:00`,
      type:  type || "custom",
      color: color || null,
      date,
    }));
    return { success: true, requiresBatch: true, events, count: events.length };
  }

  return { success: false, error: "Unknown query tool" };
};

// ─── DeepSeek Chat (OpenAI-compatible API, no extra npm package) ──────────────
const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY;
const DEEPSEEK_BASE    = "https://api.deepseek.com";

/**
 * Converts Google-style tool definitions → OpenAI/DeepSeek format.
 * Also strips Google's Type enum strings to plain JSON Schema strings.
 */
function toOpenAITools(googleTools) {
  const typeMap = { OBJECT: "object", STRING: "string", INTEGER: "integer", ARRAY: "array", BOOLEAN: "boolean" };
  function convertSchema(schema) {
    if (!schema) return {};
    const out = {};
    if (schema.type) out.type = typeMap[schema.type] ?? schema.type.toLowerCase();
    if (schema.description) out.description = schema.description;
    if (schema.properties) {
      out.properties = {};
      for (const [k, v] of Object.entries(schema.properties)) out.properties[k] = convertSchema(v);
    }
    if (schema.required) out.required = schema.required;
    if (schema.items) out.items = convertSchema(schema.items);
    return out;
  }
  return googleTools.map(t => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: convertSchema(t.parameters),
    },
  }));
}

/**
 * Chat with DeepSeek (OpenAI-compatible).
 * - deepseek-chat: fast, efficient, great for tool calling (default)
 * - deepseek-reasoner: slower, deeper reasoning, uses thinking tokens
 *
 * Returns: { text } or { isFunctionCall, functionCalls, chatInstance }.
 * chatInstance is a plain object holding the full message history for follow-ups.
 */
async function chatWithDeepSeek(messages, systemInstruction, googleTools, model = "deepseek-chat") {
  if (!DEEPSEEK_API_KEY) throw new Error("DeepSeek API key not configured");

  const isThinkingMode = model === "deepseek-reasoner";

  const openAIMessages = [
    { role: "system", content: systemInstruction },
    ...messages.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
  ];

  const body = {
    model: model,
    messages: openAIMessages,
    tools: toOpenAITools(googleTools),
    tool_choice: "auto",
    temperature: isThinkingMode ? 1.0 : 0.7,
    max_tokens: isThinkingMode ? 16384 : 8192,
  };

  const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 402) throw new Error("DeepSeek API: Insufficient balance. Please top up your DeepSeek account.");
    if (res.status === 429) throw new Error("DeepSeek API: Rate limited. Please wait a moment and try again.");
    if (res.status === 503) throw new Error("DeepSeek API: Service temporarily overloaded. Please try again shortly.");
    throw new Error(`DeepSeek API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const choice = data.choices?.[0];
  if (!choice) throw new Error("DeepSeek returned no choices");

  const msg = choice.message;

  // Tool / function calls
  if (msg.tool_calls?.length > 0) {
    const functionCalls = msg.tool_calls
      .filter(tc => tc.type === "function")
      .map(tc => ({
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments ?? "{}"),
        id: tc.id,
      }));

    // Keep full history (including assistant's tool_call message) for follow-up
    const historyForFollowUp = [
      ...openAIMessages,
      msg, // the assistant message with tool_calls
    ];

    return {
      isFunctionCall: true,
      functionCalls,
      chatInstance: { provider: "deepseek", history: historyForFollowUp, tools: googleTools },
    };
  }

  return { isFunctionCall: false, text: msg.content ?? "" };
}

// ─── Main Chat Function ───────────────────────────────────────────────────────
export const chatWithAI = async (messages, allEvents, preferences, prayerTimes = null) => {
  if (!DEEPSEEK_API_KEY) throw new Error("DeepSeek API key not configured");

  // ── Tool Declarations ──────────────────────────────────────────────────────
  const tools = [
    {
      name: "add_event",
      description: "Adds a new event to the user's Ramadan schedule.",
      parameters: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING", description: "The title of the event" },
          start: { type: "STRING", description: "Start time in ISO format, e.g., '2026-03-15T15:00:00'" },
          end:   { type: "STRING", description: "End time in ISO format, e.g., '2026-03-15T16:00:00'" },
          type:  { type: "STRING", description: "Event type: 'prayer', 'iftar', 'suhoor', or 'custom'" },
          color: { type: "STRING", description: "Optional. Color category, e.g., 'indigo', 'rose', 'emerald'" },
        },
        required: ["title", "start", "end", "type"],
      },
    },
    {
      name: "update_event",
      description: "Updates an existing event in the user's Ramadan schedule.",
      parameters: {
        type: "OBJECT",
        properties: {
          id:      { type: "INTEGER", description: "The ID of the event to update" },
          updates: { type: "OBJECT",  description: "Fields to update (title, start, end, type, color)" },
        },
        required: ["id", "updates"],
      },
    },
    {
      name: "delete_event",
      description: "Deletes a single existing event from the user's Ramadan schedule.",
      parameters: {
        type: "OBJECT",
        properties: {
          id: { type: "INTEGER", description: "The ID of the event to delete" },
        },
        required: ["id"],
      },
    },
    {
      name: "query_events",
      description: "Search the calendar for events by date range, type, or keyword. Use this before updating or deleting to find event IDs, or when the user asks what's scheduled.",
      parameters: {
        type: "OBJECT",
        properties: {
          date_from: { type: "STRING", description: "ISO date (YYYY-MM-DD or full ISO) – start of range" },
          date_to:   { type: "STRING", description: "ISO date – end of range" },
          type:      { type: "STRING", description: "Filter by event type: prayer, iftar, suhoor, custom" },
          keyword:   { type: "STRING", description: "Filter by keyword in event title" },
        },
      },
    },
    {
      name: "check_conflicts",
      description: "Check if any existing events overlap a proposed time range. ALWAYS call this before adding an event unless the user explicitly says to override.",
      parameters: {
        type: "OBJECT",
        properties: {
          start: { type: "STRING", description: "Proposed start time in ISO format" },
          end:   { type: "STRING", description: "Proposed end time in ISO format" },
        },
        required: ["start", "end"],
      },
    },
    {
      name: "find_free_slots",
      description: "Find free time windows on a specific day that fit a minimum duration. Use when the user asks for a free slot, gap, or available time.",
      parameters: {
        type: "OBJECT",
        properties: {
          date:             { type: "STRING",  description: "Date to search (YYYY-MM-DD)" },
          duration_minutes: { type: "INTEGER", description: "Minimum free block length in minutes (default 30)" },
          earliest:         { type: "STRING",  description: "Start of search window, HH:MM 24h (default 06:00)" },
          latest:           { type: "STRING",  description: "End of search window, HH:MM 24h (default 22:00)" },
        },
        required: ["date"],
      },
    },
    {
      name: "get_day_narrative",
      description: "Get a structured breakdown of all events on a specific day. Use when the user asks 'what's my day looking like?' or wants a schedule overview.",
      parameters: {
        type: "OBJECT",
        properties: {
          date: { type: "STRING", description: "Date to describe (YYYY-MM-DD)" },
        },
        required: ["date"],
      },
    },
    {
      name: "repeat_event",
      description: "Schedule the same event on multiple dates at once (recurring). Use when the user says 'every day', 'every night', 'for N days', etc. Provide all target dates.",
      parameters: {
        type: "OBJECT",
        properties: {
          title:      { type: "STRING", description: "Event title" },
          start_time: { type: "STRING", description: "Start time HH:MM (24h), e.g. '20:30'" },
          end_time:   { type: "STRING", description: "End time HH:MM (24h), e.g. '21:30'" },
          type:       { type: "STRING", description: "Event type: prayer, iftar, suhoor, custom" },
          color:      { type: "STRING", description: "Optional color category" },
          dates:      { type: "ARRAY",  items: { type: "STRING" }, description: "List of YYYY-MM-DD dates to add the event on" },
        },
        required: ["title", "start_time", "end_time", "dates"],
      },
    },
    {
      name: "get_schedule_summary",
      description: "Get an aggregated count of events per day/type in a date range. Use to answer 'how busy is my week?' style questions.",
      parameters: {
        type: "OBJECT",
        properties: {
          date_from: { type: "STRING", description: "ISO date (YYYY-MM-DD)" },
          date_to:   { type: "STRING", description: "ISO date (YYYY-MM-DD)" },
        },
      },
    },
    {
      name: "clear_date_range",
      description: "Bulk-delete all events in a date range (optionally filtered by type). Shows a confirmation card to the user before executing.",
      parameters: {
        type: "OBJECT",
        properties: {
          date_from: { type: "STRING", description: "ISO date (YYYY-MM-DD) – start" },
          date_to:   { type: "STRING", description: "ISO date (YYYY-MM-DD) – end" },
          type:      { type: "STRING", description: "Optional – only delete this event type" },
        },
        required: ["date_from", "date_to"],
      },
    },
  ];

  // ── Context payload (today + 3-day preview) ────────────────────────────────
  const todayStr  = format(new Date(), "yyyy-MM-dd");
  const previewEnd = format(addDays(new Date(), 3), "yyyy-MM-dd");
  const previewEvents = (allEvents || []).filter(e => {
    const d = e.start?.substring(0, 10);
    return d && d >= todayStr && d <= previewEnd;
  }).map(e => ({ id: e.id, title: e.title, start: e.start, end: e.end, type: e.type }));

  const contextStr = `Preferences: ${JSON.stringify(preferences)}.
Upcoming events (today + 3 days): ${JSON.stringify(previewEvents)}.
Use query_events for any other date.`;

  // ── System Prompt ──────────────────────────────────────────────────────────
  const selectedModel = preferences?.deepseekModel || 'deepseek-chat';

  const systemInstruction = `You are **Ramadan AI** — a warm, knowledgeable assistant inside the 'RamaDone' Ramadan Rhythm Scheduler app.
You help Muslims plan their blessed Ramadan days by managing prayers, Iftar, Suhoor, Quran sessions, and custom events.

Your personality: You are encouraging, concise, and spiritually mindful. Use Islamic greetings naturally (e.g. "In shaa Allah", "Masha'Allah"). Keep answers short and action-oriented.

Your primary job is calendar management: adding, editing, finding, and organizing events with surgical precision.

⚠️ TIMEZONE RULE (CRITICAL): ALL times — user input, event times, prayer times — are in the USER'S LOCAL TIME. Do NOT convert to UTC. Do NOT do timezone math. If the user says "9 AM", store it as 09:00 local. The prayer times shown are already in local time.

SCHEDULING RULES:
- Default durations: prayer = 15 min, iftar = 45 min, suhoor = 20 min, custom = 60 min.
- BATCHING (CRITICAL): If the user asks for MULTIPLE events, output ALL required function calls simultaneously in ONE response. Do not stop after the first event.
- SKIPPING CHECKS: To save time on multi-event requests, you may skip 'check_conflicts' if slots are obviously distinct.
- When intent is clear for a single event, call check_conflicts ONCE then immediately call add_event. Do NOT ask clarifying questions if the slot is free.
- If a real conflict exists, offer 1–2 concise alternatives then ask the user to choose.
- For recurring requests ("every night", "for 7 days", "rest of Ramadan"), use repeat_event with all target dates.
- When the user asks "what's my day?", "am I free?", or "what's on?", call get_day_narrative.
- When the user asks for a free slot, use find_free_slots.
${preferences?.ramadanMode ? "- Ramadan Mode ON: proactively suggest 15-min buffer blocks around prayers (Wudu before, Sunnah after)." : ""}
- If the user's schedule for today is empty, proactively offer to build them a balanced Ramadan day plan.

${buildTemporalContext()}

${prayerTimes || ""}

Context: ${contextStr}

Return Markdown for readability. Be concise and action-oriented.`;

  // ── DeepSeek API call ──────────────────────────────────────────────────
  console.log(`Using provider: DeepSeek (${selectedModel === 'deepseek-reasoner' ? 'Thinking Mode' : 'Standard Mode'})`);
  return await chatWithDeepSeek(messages, systemInstruction, tools, selectedModel);
};

// ─── Send Function Results Back to DeepSeek (with multi-turn loop) ────────────
const FOLLOW_UP_QUERY_TOOLS = [
  'query_events', 'get_schedule_summary', 'check_conflicts',
  'find_free_slots', 'get_day_narrative',
];

export const sendFunctionResultsToAI = async (chatInstance, results, allEvents = [], preferences = {}) => {
  try {
    let history = [...chatInstance.history];
    let pendingResults = results;

    // Loop up to 8 rounds — DeepSeek may chain query tools before settling on a text or mutation response
    for (let round = 0; round < 8; round++) {
      // Attach tool results to history
      const toolMessages = pendingResults.map(r => {
        return {
          role: "tool",
          tool_call_id: r.id ?? r._toolCallId ?? r.name,
          content: JSON.stringify(r.result),
        };
      });
      history = [...history, ...toolMessages];

      const followUpModel = preferences?.deepseekModel || "deepseek-chat";
      const isThinking = followUpModel === "deepseek-reasoner";
      const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
        body: JSON.stringify({
          model: followUpModel,
          messages: history,
          tools: chatInstance.tools ? toOpenAITools(chatInstance.tools) : undefined,
          tool_choice: "auto",
          temperature: isThinking ? 1.0 : 0.7,
          max_tokens: isThinking ? 16384 : 8192,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`DeepSeek follow-up error ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const msg = data.choices?.[0]?.message;
      if (!msg) throw new Error("DeepSeek returned no message");

      // If DeepSeek calls more tools, handle query ones locally and loop
      if (msg.tool_calls?.length > 0) {
        const calls = msg.tool_calls
          .filter(tc => tc.type === "function")
          .map(tc => ({ name: tc.function.name, args: JSON.parse(tc.function.arguments ?? "{}"), id: tc.id }));

        const hasMutation = calls.some(c => !FOLLOW_UP_QUERY_TOOLS.includes(c.name));

        // Mutation tools (add_event etc.) — return them for ChatView to show confirmation card
        if (hasMutation) {
          return {
            text: msg.content ?? "",
            isFunctionCall: true,
            functionCalls: calls.map(c => ({ name: c.name, args: c.args })),
            chatInstance: { ...chatInstance, history: [...history, msg] },
          };
        }

        // Query tools — execute locally and loop
        history = [...history, msg];
        pendingResults = [];
        for (const call of calls) {
          if (FOLLOW_UP_QUERY_TOOLS.includes(call.name)) {
            console.log(`Executing follow-up query tool: ${call.name}`);
            const result = await executeQueryTool({ name: call.name, args: call.args }, allEvents);
            pendingResults.push({ name: call.name, result, _toolCallId: call.id });
          }
        }
        // Patch tool_call_ids to match properly
        continue;
      }

      // Plain text response — done
      return { text: msg.content ?? "" };
    }

    return { text: "I got a bit confused — please try again." };
  } catch (error) {
    console.error("Error sending function results:", error);
    throw error;
  }
};
