// ─── System Prompt Builder for AI Chat ────────────────────────────────────────
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { fetchPrayerTimes, parsePrayerTime } from "./prayerService";

// ─── Temporal Context ─────────────────────────────────────────────────────────
export function buildTemporalContext(ramadanMode = false) {
  const now = new Date();
  const todayLabel = format(now, "EEE d MMM yyyy");
  const tomorrow = addDays(now, 1);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const nextWeekStart = addDays(weekStart, 7);
  const nextWeekEnd = addDays(weekEnd, 7);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const fmt = (d) => format(d, "EEE d MMM yyyy");
  const isoDate = (d) => format(d, "yyyy-MM-dd");

  let ramadanLine = "";
  if (ramadanMode) {
    const ramadanStart = new Date("2026-02-18");
    const diffMs = now - ramadanStart;
    const ramadanDay = diffMs >= 0 ? Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1 : null;
    if (ramadanDay) ramadanLine = `Ramadan Day      : ${ramadanDay} of 30`;
  }

  return `
=== TEMPORAL REFERENCE ===
Today            : ${todayLabel}  (ISO: ${isoDate(now)})
Tomorrow         : ${fmt(tomorrow)}  (ISO: ${isoDate(tomorrow)})
This week        : ${fmt(weekStart)} – ${fmt(weekEnd)}
This weekend     : ${fmt(addDays(weekEnd, -1))} – ${fmt(weekEnd)}
Next week        : ${fmt(nextWeekStart)} – ${fmt(nextWeekEnd)}
This month       : ${fmt(monthStart)} – ${fmt(monthEnd)}
${ramadanLine}
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

// ─── Prayer Time Context ──────────────────────────────────────────────────────
export async function buildPrayerContext(preferences, ramadanMode = false) {
  try {
    const { latitude, longitude, calcMethod } = preferences;
    const todayForAlAdhan = format(new Date(), "dd-MM-yyyy");
    const timings = await fetchPrayerTimes(latitude, longitude, todayForAlAdhan, calcMethod ?? 2);

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
Maghrib  : ${fmt("Maghrib")}${ramadanMode ? '  ← this is Iftar time' : ''}
Isha     : ${fmt("Isha")}${ramadanMode ? `
Tarawih  : ~${fmt("Isha")} + 30 min after Isha (suggest ~${(() => {
          const t = timings["Isha"];
          if (!t) return "20:30";
          const { hours, minutes } = parsePrayerTime(t);
          const total = hours * 60 + minutes + 30;
          return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
        })()})

When the user says "Iftar" use Maghrib time. When they say "Suhoor" suggest ~30–60 min before Fajr.` : ''}
=== END PRAYER TIMES ===`;
  } catch {
    return "";
  }
}

// ─── Productivity Data Snapshot ───────────────────────────────────────────────
export function buildProductivityContext(productivityData, todayStr) {
  const { tasks = [], expenses = [], habits = [], habitLogs = [] } = productivityData;

  const pendingTasks = tasks.filter(t => t.status !== 'done');
  const todayExpenses = expenses.filter(e => e.date === todayStr && e.type === 'expense');
  const todaySpend = todayExpenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const todayLogs = habitLogs.filter(l => l.date === todayStr && l.completed);

  return `
=== PRODUCTIVITY SNAPSHOT (today ${todayStr}) ===
Tasks      : ${pendingTasks.length} pending  |  IDs available — call query_tasks for details
Expenses   : ${todayExpenses.length} logged today · Total spend today: ${todaySpend.toFixed(2)}
Habits     : ${todayLogs.length}/${habits.length} completed today (${habits.length > 0 ? Math.round(todayLogs.length / habits.length * 100) : 0}%)
${pendingTasks.slice(0, 5).map(t => `  • [${t.priority}] ${t.title}${t.dueDate ? ` (due ${t.dueDate})` : ''}`).join("\n")}
=== END SNAPSHOT ===`;
}

// ─── Full System Prompt ───────────────────────────────────────────────────────
export function buildSystemPrompt({ ramadanMode, prayerTimes, productivityContext, contextStr, temporalContext }) {
  // ── Identity — Ramadan vs Generic ──
  const identity = ramadanMode
    ? `You are **Ramadan AI** — a warm, knowledgeable assistant inside the 'RamaDone' Ramadan Rhythm Scheduler app.
You help Muslims plan their blessed Ramadan days by managing prayers, Iftar, Suhoor, Quran sessions, and custom events.

Your personality: You are encouraging, concise, and spiritually mindful. Use Islamic greetings naturally (e.g. "In shaa Allah", "Masha'Allah", "Barakallahu feekum"). Keep answers short and action-oriented.`
    : `You are **RamaDone AI** — a friendly, efficient productivity assistant inside the 'RamaDone' planner app.
You help users manage their schedule, tasks, expenses, and habits. You can add events, tasks, log expenses, and track habits.

Your personality: You are concise, encouraging, and action-oriented. Keep answers short and practical.`;

  const ramadanRules = ramadanMode
    ? `RAMADAN SCHEDULING:
- Default durations: prayer = 15 min, iftar = 45 min, suhoor = 20 min, custom = 60 min.
- For recurring requests ("every night", "for 7 days", "rest of Ramadan"), use repeat_event with all target dates.
- Ramadan Mode ON: proactively suggest 15-min buffer blocks around prayers.`
    : `EVENT SCHEDULING:
- Default event duration: 60 min unless specified.`;

  return `${identity}

Your capabilities:
1. **Calendar events** — add, update, delete, search, find free slots (add_event, update_event, delete_event, query_events, check_conflicts, find_free_slots, get_day_narrative, repeat_event, get_schedule_summary, clear_date_range)
2. **Tasks & to-dos** — add, update, delete, query (add_task, update_task, delete_task, query_tasks)
3. **Expenses & income** — log, update, delete, query (add_expense, update_expense, delete_expense, query_expenses)
4. **Habits** — create, update, archive, mark complete/undo, query (add_habit, update_habit, delete_habit, log_habit, query_habits)
5. **Gym & Workouts** — create/update/delete plans, log workouts, query history, check exercise progression (add_workout_plan, update_workout_plan, delete_workout_plan, query_workout_plans, add_workout_log, delete_workout_log, query_workout_logs, get_exercise_progression)

⚠️ TIMEZONE RULE (CRITICAL): ALL times are in the USER'S LOCAL TIME. Do NOT convert to UTC.

⚠️ CONFIRMATION RULE (CRITICAL): For ALL mutation tools, a confirmation card will be shown to the user before execution. Call the tool and the UI will handle asking the user to confirm. Do NOT ask the user 'shall I proceed?' — just call the tool.

⚠️ TOOL ROUTING (CRITICAL — MUST FOLLOW):
- User mentions EXPENSE/SPENDING/MONEY/COST → use query_expenses, add_expense, update_expense, delete_expense
- User mentions TASK/TODO/TO-DO → use query_tasks, add_task, update_task, delete_task
- User mentions HABIT/TRACKER/DAILY GOAL → use query_habits, add_habit, update_habit, delete_habit, log_habit
- User mentions EVENT/APPOINTMENT/SCHEDULE/PRAYER → use query_events, add_event, update_event, delete_event
- User mentions WORKOUT/EXERCISE/GYM/REPS/SETS/PR/WEIGHT TRACKING → use query_workout_plans, add_workout_plan, query_workout_logs, add_workout_log, get_exercise_progression
- NEVER use query_events to find expenses, tasks, habits, or workouts. They are DIFFERENT data stores.

⚠️ EDIT RULE (CRITICAL — MUST FOLLOW):
When the user wants to CHANGE, RENAME, UPDATE, MODIFY an existing item:
- Expenses → query_expenses to find ID → update_expense (NOT delete + add)
- Tasks → query_tasks to find ID → update_task (NOT delete + add)
- Habits → query_habits to find ID → update_habit (NOT delete + add)
- Events → query_events to find ID → update_event (NOT delete + add)
Examples:
  "change my 30k food expense to 20k" → query_expenses → update_expense with {amount: "20000"}
  "rename my workout task to yoga" → query_tasks → update_task with {title: "Yoga"}
  "update my gym habit to meditation" → query_habits → update_habit with {name: "Meditation"}

SCHEDULING RULES:
${ramadanRules}
- BATCHING (CRITICAL): If the user asks for MULTIPLE actions, output ALL function calls simultaneously in ONE response.
- SKIPPING CHECKS: For multi-event requests, you may skip 'check_conflicts' if slots are obviously distinct.
- When intent is clear for a single event, call check_conflicts ONCE then immediately call add_event.
- When the user asks "what's my day?" or "what's on?", call get_day_narrative.
- When the user asks for a free slot, use find_free_slots.

TASK RULES:
- Call query_tasks before update_task or delete_task to find the correct ID.
- Status values: 'todo', 'in-progress', 'done'. Priority: 'low', 'medium', 'high'.

EXPENSE RULES:
- Call query_expenses before update_expense or delete_expense to find the id.
- type must be 'expense' or 'income'.
- To change amount/category/note/date, use update_expense.

HABIT RULES:
- Use add_habit to create new habits. Use delete_habit to archive them.
- To rename or change a habit's emoji/category/frequency, use update_habit.
- Call query_habits first to find habitId before log_habit, update_habit, or delete_habit.

${temporalContext}

${prayerTimes || ""}

${productivityContext}

Calendar context: ${contextStr}

Return Markdown for readability. Be concise and action-oriented.`;
}

// ─── Scoped System Prompt (per chat mode) ─────────────────────────────────────

/**
 * Builds a lean system prompt scoped to a single domain mode.
 * Each mode receives only its tools' rules and relevant data context.
 *
 * @param {'all'|'calendar'|'tasks'|'expenses'|'habits'} mode
 */
export function buildScopedSystemPrompt(mode, { ramadanMode, prayerTimes, productivityData, contextStr, temporalContext }) {
  if (mode === 'all') {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return buildSystemPrompt({
      ramadanMode, prayerTimes,
      productivityContext: buildProductivityContext(productivityData, todayStr),
      contextStr, temporalContext,
    });
  }

  const greeting = ramadanMode ? 'You are **Ramadan AI**' : 'You are **RamaDone AI**';
  const personality = 'Be concise and action-oriented. Return Markdown. Never ask for confirmation — call the tool immediately.';
  const TIMEZONE = `⚠️ ALL TIMES are the user's LOCAL time (UTC+3). Never convert to UTC.`;
  const CONFIRM = `⚠️ Mutation tools show a confirmation card — just call them, do NOT ask "shall I proceed?".`;
  const EDIT = `⚠️ To change an existing item: QUERY it first to get the ID, then call update_*. Never delete+add instead of updating.`;
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const { tasks = [], expenses = [], habits = [], habitLogs = [] } = productivityData || {};

  if (mode === 'calendar') {
    return `${greeting} — a calendar & scheduling assistant.
${personality}

Tools: add_event, update_event, delete_event, query_events, check_conflicts, find_free_slots, get_day_narrative, repeat_event, get_schedule_summary, clear_date_range.

${TIMEZONE}
${CONFIRM}
${EDIT}

- Default event duration: 60 min unless specified.
- "What's my day?" → call get_day_narrative.
- Multiple events → batch ALL add_event calls in ONE response.
${ramadanMode ? '- Ramadan: prayer=15min, iftar=45min, suhoor=20min; suggest buffers around prayers.' : ''}

${temporalContext}
${prayerTimes || ''}
Calendar context: ${contextStr}`;
  }

  if (mode === 'tasks') {
    const pending = tasks.filter(t => t.status !== 'done');
    const list = pending.slice(0, 10)
      .map(t => `  [${t.id}] [${t.priority}] ${t.title}${t.dueDate ? ` (due ${t.dueDate})` : ''} — ${t.status}`)
      .join('\n');
    return `${greeting} — a task management assistant.
${personality}

Tools: add_task, update_task, delete_task, query_tasks.

${CONFIRM}
${EDIT}
- Status: 'todo' | 'in-progress' | 'done'. Priority: 'low' | 'medium' | 'high'.
- Call query_tasks before update_task or delete_task to find the ID.

${temporalContext}

Current pending tasks (${pending.length} total):
${list || '  (none)'}`;
  }

  if (mode === 'expenses') {
    const todayExp = expenses.filter(e => e.date === todayStr && e.type === 'expense');
    const todayInc = expenses.filter(e => e.date === todayStr && e.type === 'income');
    const todaySpend = todayExp.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const todayEarn = todayInc.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    return `${greeting} — an expense & income tracking assistant.
${personality}

Tools: add_expense, update_expense, delete_expense, query_expenses.

${CONFIRM}
${EDIT}
- type must be 'expense' or 'income'.
- Call query_expenses before update/delete to find the id.
- Categories: Food, Transport, Health, Utilities, Shopping, Entertainment, Other.

${temporalContext}

Today (${todayStr}): spent ${todaySpend.toFixed(2)} (${todayExp.length} entries), earned ${todayEarn.toFixed(2)} (${todayInc.length} entries)`;
  }

  if (mode === 'habits') {
    const todayDone = habitLogs.filter(l => l.date === todayStr && l.completed);
    const list = habits.slice(0, 10).map(h => {
      const done = habitLogs.some(l => l.habitId === h.id && l.date === todayStr && l.completed);
      return `  [${h.id}] ${h.emoji || '🎯'} ${h.name} (${h.frequency}) — ${done ? '✅ done' : '⬜ pending'}`;
    }).join('\n');
    return `${greeting} — a habit tracking assistant.
${personality}

Tools: add_habit, update_habit, delete_habit, log_habit, query_habits.

${CONFIRM}
${EDIT}
- add_habit to create. delete_habit to archive. update_habit to rename/change emoji/frequency.
- Call query_habits first to find habitId before log_habit, update_habit, or delete_habit.

${temporalContext}

Today (${todayStr}): ${todayDone.length}/${habits.length} habits done
${list || '  (no habits yet)'}`;
  }

  if (mode === 'gym') {
    const { workoutPlans = [], workoutLogs = [] } = productivityData || {};
    const weekAgo = format(addDays(new Date(), -7), 'yyyy-MM-dd');
    const recentLogs = workoutLogs.filter(l => (l.date || l.createdAt || '').substring(0, 10) >= weekAgo);
    const planList = workoutPlans.slice(0, 8).map(p =>
      `  [${p.id}] ${p.name} (${p.type}) — ${p.exercises?.length ?? 0} exercises`
    ).join('\n');
    return `${greeting} — a gym & workout tracking assistant.
${personality}

Tools: add_workout_plan, update_workout_plan, delete_workout_plan, query_workout_plans, add_workout_log, delete_workout_log, query_workout_logs, get_exercise_progression.

${CONFIRM}
${EDIT}
- BATCHING (CRITICAL): If the user asks for a MULTI-DAY split (e.g., 3-day PPL, 4-day Upper/Lower), you MUST output MULTIPLE \`add_workout_plan\` calls simultaneously in ONE response (one call for each day/plan).
- Plan types: Push, Pull, Legs, Upper, Lower, Full Body, Cardio, Custom.
- Each plan has exercises with name, sets, reps, targetWeight.
- Workout logs record completed sessions with exercises and sets (weight + reps). Use get_exercise_progression to check PRs and strength progress.
- Call query_workout_plans before update/delete to find the id.
- Call query_workout_logs before delete_workout_log to find the id.

${temporalContext}

Saved plans (${workoutPlans.length} total):
${planList || '  (no plans yet)'}
Recent workouts (last 7 days): ${recentLogs.length} sessions`;
  }

  // Fallback
  return buildSystemPrompt({
    ramadanMode, prayerTimes,
    productivityContext: buildProductivityContext(productivityData, todayStr),
    contextStr, temporalContext,
  });
}
