// ─── Query & Action Executors for AI Tools ────────────────────────────────────
import { format, addDays } from "date-fns";

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

// ─── Calendar Query Tool Executor ─────────────────────────────────────────────
export const executeQueryTool = async (functionCall, allEvents) => {
  const { name, args } = functionCall;
  console.log("Executing query tool:", name, args);

  // ── query_events ────────────────────────────────────────────────────────
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

  // ── get_schedule_summary ────────────────────────────────────────────────
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

  // ── clear_date_range ────────────────────────────────────────────────────
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

  // ── check_conflicts ─────────────────────────────────────────────────────
  if (name === "check_conflicts") {
    const { start, end } = args;
    const events = allEvents || [];
    const conflicts = events.filter(e => {
      if (!e.start || !e.end) return false;
      return e.start < end && e.end > start;
    });
    const minimal = conflicts.map(e => ({ id: e.id, title: e.title, start: e.start, end: e.end, type: e.type }));
    return { success: true, hasConflicts: minimal.length > 0, conflicts: minimal, count: minimal.length };
  }

  // ── find_free_slots ─────────────────────────────────────────────────────
  if (name === "find_free_slots") {
    const { date, duration_minutes = 30, earliest = "06:00", latest = "22:00" } = args;
    const events = (allEvents || [])
      .filter(e => e.start?.startsWith(date) && !e.deleted)
      .sort((a, b) => a.start.localeCompare(b.start));

    const durationMs = duration_minutes * 60 * 1000;
    const dayBase = date;

    const windowStart = new Date(`${dayBase}T${earliest}:00`).getTime();
    const windowEnd   = new Date(`${dayBase}T${latest}:00`).getTime();

    const slots = [];
    let cursor = windowStart;

    for (const ev of events) {
      const evStart = new Date(ev.start).getTime();
      const evEnd   = new Date(ev.end).getTime();
      if (evStart <= cursor) {
        cursor = Math.max(cursor, evEnd);
        continue;
      }
      if (evStart - cursor >= durationMs && cursor >= windowStart) {
        slots.push({
          start: format(new Date(cursor), "HH:mm"),
          end:   format(new Date(Math.min(evStart, windowEnd)), "HH:mm"),
          duration_minutes: Math.floor((Math.min(evStart, windowEnd) - cursor) / 60000),
        });
      }
      cursor = Math.max(cursor, evEnd);
    }

    if (windowEnd - cursor >= durationMs && cursor < windowEnd) {
      slots.push({
        start: format(new Date(cursor), "HH:mm"),
        end:   format(new Date(windowEnd), "HH:mm"),
        duration_minutes: Math.floor((windowEnd - cursor) / 60000),
      });
    }

    return { success: true, date, slots, count: slots.length };
  }

  // ── get_day_narrative ───────────────────────────────────────────────────
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

  // ── repeat_event ────────────────────────────────────────────────────────
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

// ─── Productivity Query Executor (used in follow-up loop) ─────────────────────
export function executeProductivityQuery(callName, callArgs, productivityData) {
  const { tasks = [], expenses = [], habits = [], habitLogs = [] } = productivityData;

  if (callName === 'query_tasks') {
    const f = tasks.filter(t => {
      if (callArgs.status && t.status !== callArgs.status) return false;
      if (callArgs.priority && t.priority !== callArgs.priority) return false;
      if (callArgs.keyword && !t.title?.toLowerCase().includes(callArgs.keyword.toLowerCase())) return false;
      if (callArgs.dueDate && t.dueDate !== callArgs.dueDate) return false;
      return true;
    });
    const slim = f.slice(0, 50).map(t => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, dueDate: t.dueDate || null, category: t.category || null }));
    return { tasks: slim, total: f.length, truncated: f.length > 50 };
  }

  if (callName === 'query_expenses') {
    const f = expenses.filter(e => {
      if (callArgs.type && e.type !== callArgs.type) return false;
      if (callArgs.category && e.category !== callArgs.category) return false;
      if (callArgs.date_from && e.date < callArgs.date_from) return false;
      if (callArgs.date_to && e.date > callArgs.date_to) return false;
      return true;
    });
    const slim = f.slice(0, 50).map(e => ({ id: e.id, amount: e.amount, type: e.type, category: e.category, date: e.date, note: e.note || null }));
    return { expenses: slim, total: f.length, totalAmount: Math.round(f.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)), truncated: f.length > 50 };
  }

  if (callName === 'query_habits') {
    const fh = habits.filter(h => {
      if (callArgs.keyword && !h.name?.toLowerCase().includes(callArgs.keyword.toLowerCase())) return false;
      return true;
    });
    const fl = habitLogs.filter(l => {
      if (callArgs.date_from && l.date < callArgs.date_from) return false;
      if (callArgs.date_to && l.date > callArgs.date_to) return false;
      return true;
    });
    const slimH = fh.map(h => ({ id: h.id, name: h.name, emoji: h.emoji, frequency: h.frequency, category: h.category || null }));
    const slimL = fl.slice(0, 100).map(l => ({ habitId: l.habitId, date: l.date, completed: l.completed }));
    return { habits: slimH, logs: slimL, totalLogs: fl.length, truncated: fl.length > 100 };
  }

  // ── Gym queries ───────────────────────────────────────────────────────
  const { workoutPlans = [], workoutLogs = [] } = productivityData;

  if (callName === 'query_workout_plans') {
    let fp = workoutPlans;
    if (callArgs.keyword) fp = fp.filter(p => p.name?.toLowerCase().includes(callArgs.keyword.toLowerCase()));
    if (callArgs.type) fp = fp.filter(p => p.type === callArgs.type);
    const slim = fp.slice(0, 30).map(p => ({
      id: p.id, name: p.name, type: p.type,
      exerciseCount: p.exercises?.length ?? 0,
      exercises: (p.exercises || []).map(e => ({ name: e.name, sets: e.sets, reps: e.reps, targetWeight: e.targetWeight || 0 })),
    }));
    return { plans: slim, total: fp.length, truncated: fp.length > 30 };
  }

  if (callName === 'query_workout_logs') {
    let fl = workoutLogs;
    if (callArgs.date_from) fl = fl.filter(l => (l.date || l.createdAt || '').substring(0, 10) >= callArgs.date_from);
    if (callArgs.date_to) fl = fl.filter(l => (l.date || l.createdAt || '').substring(0, 10) <= callArgs.date_to);
    if (callArgs.keyword) {
      const kw = callArgs.keyword.toLowerCase();
      fl = fl.filter(l =>
        l.planName?.toLowerCase().includes(kw) ||
        l.exercises?.some(e => e.name?.toLowerCase().includes(kw))
      );
    }
    const slim = fl.slice(0, 30).map(l => ({
      id: l.id, date: (l.date || l.createdAt || '').substring(0, 10),
      planName: l.planName, planId: l.planId,
      exerciseCount: l.exercises?.length ?? 0,
      exercises: (l.exercises || []).map(e => ({ 
        name: e.name, 
        setCount: e.sets?.length ?? 0,
        sets: (e.sets || []).map(s => ({ weight: s.weight, reps: s.reps }))
      })),
      notes: l.notes || null,
    }));
    return { logs: slim, total: fl.length, truncated: fl.length > 30 };
  }

  if (callName === 'get_exercise_progression') {
    const kw = (callArgs.exerciseName || callArgs.exercise_name)?.toLowerCase();
    if (!kw) return { error: "Missing exerciseName" };
    
    // Sort logs oldest to newest
    const sortedLogs = [...workoutLogs].sort((a, b) => {
      const d1 = (a.date || a.createdAt || '').substring(0, 10);
      const d2 = (b.date || b.createdAt || '').substring(0, 10);
      return d1.localeCompare(d2);
    });

    const progression = [];
    sortedLogs.forEach(l => {
      const ex = l.exercises?.find(e => e.name?.toLowerCase().includes(kw));
      if (ex) {
        progression.push({
          date: (l.date || l.createdAt || '').substring(0, 10),
          planName: l.planName,
          sets: (ex.sets || []).map(s => ({ weight: s.weight, reps: s.reps }))
        });
      }
    });
    
    // Keep max 20 latest sessions for context limits
    const latest = progression.slice(-20);
    return { exercise: callArgs.exercise_name, progression: latest, totalSessions: progression.length, truncated: progression.length > 20 };
  }

  return { error: "Unknown productivity query" };
}
