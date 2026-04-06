// ─── Tool Declarations for the AI Chat ────────────────────────────────────────
// All tools available to the AI, organized by domain.

export const CALENDAR_TOOLS = ['add_event', 'update_event', 'delete_event'];

export const QUERY_TOOLS = [
  'query_events', 'get_schedule_summary', 'clear_date_range',
  'check_conflicts', 'find_free_slots', 'get_day_narrative',
  'query_tasks', 'query_expenses', 'query_habits',
  'query_workout_plans', 'query_workout_logs', 'get_exercise_progression'
];

export const PRODUCTIVITY_MUTATIONS = [
  'add_task', 'update_task', 'delete_task',
  'add_expense', 'update_expense', 'delete_expense',
  'add_habit', 'update_habit', 'delete_habit', 'log_habit',
  'add_workout_plan', 'update_workout_plan', 'delete_workout_plan',
  'add_workout_log', 'delete_workout_log',
  'generate_monthly_report',
];

// Used in the follow-up loop — tools that can be executed locally without user confirmation
export const FOLLOW_UP_QUERY_TOOLS = [
  'query_events', 'get_schedule_summary', 'check_conflicts',
  'find_free_slots', 'get_day_narrative',
  'query_tasks', 'query_expenses', 'query_habits',
  'query_workout_plans', 'query_workout_logs', 'get_exercise_progression'
];

/**
 * Returns the full array of tool declarations in Google-style format.
 * The main aiService converts these to OpenAI/DeepSeek format before calling.
 */
export function getToolDeclarations() {
  return [
    // ── Calendar tools ────────────────────────────────────────────────────
    {
      name: "add_event",
      description: "Adds a new event to the user's schedule.",
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
      description: "Updates an existing event. Use for ANY change to an event (rename, reschedule, recolor).",
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
      description: "Deletes a single existing event. Only use when the user explicitly wants to REMOVE an event, not change it.",
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
      description: "Search the CALENDAR for events by date range, type, or keyword. Use ONLY for calendar events. For tasks use query_tasks, for expenses use query_expenses.",
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
      description: "Check if any existing events overlap a proposed time range. Call before adding an event.",
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
      description: "Find free time windows on a specific day that fit a minimum duration.",
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
      description: "Get a structured breakdown of all events on a specific day. Use for 'what's my day?' questions.",
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
      description: "Schedule the same event on multiple dates at once (recurring). Use for 'every day', 'for N days', etc.",
      parameters: {
        type: "OBJECT",
        properties: {
          title:      { type: "STRING", description: "Event title" },
          start_time: { type: "STRING", description: "Start time HH:MM (24h)" },
          end_time:   { type: "STRING", description: "End time HH:MM (24h)" },
          type:       { type: "STRING", description: "Event type: prayer, iftar, suhoor, custom" },
          color:      { type: "STRING", description: "Optional color category" },
          dates:      { type: "ARRAY",  items: { type: "STRING" }, description: "List of YYYY-MM-DD dates" },
        },
        required: ["title", "start_time", "end_time", "dates"],
      },
    },
    {
      name: "get_schedule_summary",
      description: "Get event counts per day/type. Use for 'how busy is my week?' questions.",
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
      description: "Bulk-delete all events in a date range (optionally filtered by type).",
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

    // ── Task tools ────────────────────────────────────────────────────────
    {
      name: "add_task",
      description: "Add a new task/to-do item.",
      parameters: {
        type: "OBJECT",
        properties: {
          title:    { type: "STRING",  description: "Task title" },
          priority: { type: "STRING",  description: "'low', 'medium', or 'high' (default 'medium')" },
          dueDate:  { type: "STRING",  description: "Due date ISO string YYYY-MM-DD (optional)" },
          category: { type: "STRING",  description: "Category label, e.g. 'Work', 'Personal'" },
          notes:    { type: "STRING",  description: "Optional notes" },
        },
        required: ["title"],
      },
    },
    {
      name: "update_task",
      description: "Update fields on an existing task. Call query_tasks first to get the id.",
      parameters: {
        type: "OBJECT",
        properties: {
          id:      { type: "INTEGER", description: "Task id" },
          updates: { type: "OBJECT",  description: "Fields to update (title, priority, dueDate, category, status, notes)" },
        },
        required: ["id", "updates"],
      },
    },
    {
      name: "delete_task",
      description: "Delete a task by id. Only use when user wants to REMOVE a task, not change it.",
      parameters: {
        type: "OBJECT",
        properties: {
          id:    { type: "INTEGER", description: "Task id" },
          title: { type: "STRING",  description: "Task title for display" },
        },
        required: ["id"],
      },
    },
    {
      name: "query_tasks",
      description: "Search TASKS by status, priority, keyword, or dueDate. Use ONLY for tasks. For calendar events use query_events, for expenses use query_expenses.",
      parameters: {
        type: "OBJECT",
        properties: {
          status:   { type: "STRING", description: "'todo', 'in-progress', or 'done'" },
          priority: { type: "STRING", description: "'low', 'medium', 'high'" },
          keyword:  { type: "STRING", description: "Keyword in task title" },
          dueDate:  { type: "STRING", description: "Filter by exact due date YYYY-MM-DD" },
        },
      },
    },

    // ── Expense tools ─────────────────────────────────────────────────────
    {
      name: "add_expense",
      description: "Log a new expense or income transaction.",
      parameters: {
        type: "OBJECT",
        properties: {
          amount:   { type: "STRING",  description: "Amount in IQD as a number string, e.g. '50000'. Convert k-notation: 50k → '50000', 30k → '30000', 1.5k → '1500'." },
          type:     { type: "STRING",  description: "'expense' or 'income'" },
          category: { type: "STRING",  description: "Category: 'food', 'transport', 'health', 'utilities', 'shopping', 'entertainment', or 'other'" },
          date:     { type: "STRING",  description: "Date YYYY-MM-DD (defaults to today)" },
          note:     { type: "STRING",  description: "Optional description" },
        },
        required: ["amount", "type", "category"],
      },
    },
    {
      name: "delete_expense",
      description: "Delete an expense/income entry by id. Only use when user wants to REMOVE an entry, not change it.",
      parameters: {
        type: "OBJECT",
        properties: {
          id:   { type: "INTEGER", description: "Expense id" },
          note: { type: "STRING",  description: "Entry description for display" },
        },
        required: ["id"],
      },
    },
    {
      name: "update_expense",
      description: "Edit an existing expense/income entry. Use this to change the amount, category, date, or note. Call query_expenses first to find the id.",
      parameters: {
        type: "OBJECT",
        properties: {
          id:      { type: "INTEGER", description: "Expense id to update" },
          updates: {
            type: "OBJECT",
            description: "Fields to update",
            properties: {
              amount:   { type: "STRING",  description: "New amount" },
              type:     { type: "STRING",  description: "'expense' or 'income'" },
              category: { type: "STRING",  description: "New category" },
              date:     { type: "STRING",  description: "New date YYYY-MM-DD" },
              note:     { type: "STRING",  description: "New description" },
            },
          },
        },
        required: ["id", "updates"],
      },
    },
    {
      name: "query_expenses",
      description: "Query EXPENSE transactions by date range, type, or category. Use ONLY for expenses/income. For calendar events use query_events, for tasks use query_tasks.",
      parameters: {
        type: "OBJECT",
        properties: {
          date_from: { type: "STRING", description: "YYYY-MM-DD start" },
          date_to:   { type: "STRING", description: "YYYY-MM-DD end" },
          type:      { type: "STRING", description: "'expense' or 'income'" },
          category:  { type: "STRING", description: "Category filter" },
        },
      },
    },

    // ── Habit tools ───────────────────────────────────────────────────────
    {
      name: "add_habit",
      description: "Create a new trackable habit.",
      parameters: {
        type: "OBJECT",
        properties: {
          name:      { type: "STRING", description: "Habit name, e.g. 'Drink Water'" },
          emoji:     { type: "STRING", description: "Emoji for the habit, default '🎯'" },
          category:  { type: "STRING", description: "Category, e.g. 'Health', 'Fitness'" },
          frequency: { type: "STRING", description: "'daily' or 'weekly' (default 'daily')" },
        },
        required: ["name"],
      },
    },
    {
      name: "delete_habit",
      description: "Archive (soft-delete) a habit. Call query_habits first to find the habitId.",
      parameters: {
        type: "OBJECT",
        properties: {
          habitId:   { type: "INTEGER", description: "Habit id" },
          habitName: { type: "STRING",  description: "Habit name for display" },
        },
        required: ["habitId"],
      },
    },
    {
      name: "update_habit",
      description: "Edit an existing habit's name, emoji, category, or frequency. Call query_habits first.",
      parameters: {
        type: "OBJECT",
        properties: {
          habitId: { type: "INTEGER", description: "Habit id to update" },
          updates: {
            type: "OBJECT",
            description: "Fields to update",
            properties: {
              name:      { type: "STRING", description: "New habit name" },
              emoji:     { type: "STRING", description: "New emoji" },
              category:  { type: "STRING", description: "New category" },
              frequency: { type: "STRING", description: "'daily' or 'weekly'" },
            },
          },
        },
        required: ["habitId", "updates"],
      },
    },
    {
      name: "log_habit",
      description: "Mark a habit as completed (or undo) for a given date.",
      parameters: {
        type: "OBJECT",
        properties: {
          habitId:   { type: "INTEGER", description: "Habit id — call query_habits to find it" },
          habitName: { type: "STRING",  description: "Habit name for display" },
          date:      { type: "STRING",  description: "Date YYYY-MM-DD" },
          completed: { type: "BOOLEAN", description: "true = done, false = undo" },
        },
        required: ["habitId", "date", "completed"],
      },
    },
    {
      name: "query_habits",
      description: "List HABITS and their recent completion logs. Use ONLY for habits. For tasks use query_tasks.",
      parameters: {
        type: "OBJECT",
        properties: {
          date_from: { type: "STRING", description: "YYYY-MM-DD start — filters habitLogs" },
          date_to:   { type: "STRING", description: "YYYY-MM-DD end" },
          keyword:   { type: "STRING", description: "Keyword in habit name" },
        },
      },
    },

    // ── Gym / Workout tools ──────────────────────────────────────────────
    {
      name: "add_workout_plan",
      description: "Create a new workout plan (template). Each plan has a name, type (Push/Pull/Legs/etc.), and a list of exercises.",
      parameters: {
        type: "OBJECT",
        properties: {
          name:      { type: "STRING", description: "Plan name, e.g. 'Monday Push Day'" },
          type:      { type: "STRING", description: "Plan type: Push, Pull, Legs, Upper, Lower, Full Body, Cardio, Custom" },
          exercises: {
            type: "ARRAY",
            description: "List of exercises in the plan",
            items: {
              type: "OBJECT",
              properties: {
                name:         { type: "STRING",  description: "Exercise name, e.g. 'Bench Press'" },
                sets:         { type: "INTEGER", description: "Number of sets (default 3)" },
                reps:         { type: "INTEGER", description: "Target reps per set (default 10)" },
                targetWeight: { type: "NUMBER",  description: "Target weight in kg (optional, default 0)" },
              },
              required: ["name"],
            },
          },
        },
        required: ["name", "type", "exercises"],
      },
    },
    {
      name: "update_workout_plan",
      description: "Update an existing workout plan. Call query_workout_plans first to get the id.",
      parameters: {
        type: "OBJECT",
        properties: {
          id:      { type: "INTEGER", description: "Plan id" },
          updates: {
            type: "OBJECT",
            description: "Fields to update (name, type, exercises)",
            properties: {
              name:      { type: "STRING", description: "New plan name" },
              type:      { type: "STRING", description: "New plan type" },
              exercises: { type: "ARRAY",  description: "New exercises list", items: { type: "OBJECT" } },
            },
          },
        },
        required: ["id", "updates"],
      },
    },
    {
      name: "delete_workout_plan",
      description: "Delete a workout plan. Call query_workout_plans first to find the id.",
      parameters: {
        type: "OBJECT",
        properties: {
          id:       { type: "INTEGER", description: "Plan id" },
          planName: { type: "STRING",  description: "Plan name for display" },
        },
        required: ["id"],
      },
    },
    {
      name: "query_workout_plans",
      description: "List saved workout plans. Use for 'show my plans', 'what workouts do I have?'.",
      parameters: {
        type: "OBJECT",
        properties: {
          keyword: { type: "STRING", description: "Keyword in plan name" },
          type:    { type: "STRING", description: "Filter by plan type (Push, Pull, Legs, etc.)" },
        },
      },
    },
    {
      name: "add_workout_log",
      description: "Log a completed workout session with exercises, sets, weights and reps.",
      parameters: {
        type: "OBJECT",
        properties: {
          planId:   { type: "INTEGER", description: "Optional plan id this log is based on" },
          planName: { type: "STRING",  description: "Workout name, e.g. 'Push Day'" },
          date:     { type: "STRING",  description: "Date ISO string, defaults to now" },
          exercises: {
            type: "ARRAY",
            description: "Exercises performed",
            items: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING", description: "Exercise name" },
                sets: {
                  type: "ARRAY",
                  description: "Sets performed",
                  items: {
                    type: "OBJECT",
                    properties: {
                      weight: { type: "NUMBER",  description: "Weight used" },
                      reps:   { type: "INTEGER", description: "Reps completed" },
                    },
                  },
                },
              },
              required: ["name", "sets"],
            },
          },
          notes: { type: "STRING", description: "Optional session notes" },
        },
        required: ["planName", "exercises"],
      },
    },
    {
      name: "delete_workout_log",
      description: "Delete a workout log entry. Call query_workout_logs first to find the id.",
      parameters: {
        type: "OBJECT",
        properties: {
          id: { type: "INTEGER", description: "Workout log id" },
        },
        required: ["id"],
      },
    },
    {
      name: "query_workout_logs",
      description: "Search workout history. Use for 'show my recent workouts', 'what did I do this week?'.",
      parameters: {
        type: "OBJECT",
        properties: {
          date_from: { type: "STRING", description: "YYYY-MM-DD start" },
          date_to:   { type: "STRING", description: "YYYY-MM-DD end" },
          keyword:   { type: "STRING", description: "Keyword in plan name or exercise name" },
        },
      },
    },
    {
      name: "get_exercise_progression",
      description: "Get the progression history (weight, reps, estimated 1RM) for a specific exercise over time. Use this to tell the user their PRs or if they are getting stronger.",
      parameters: {
        type: "OBJECT",
        properties: {
          exerciseName: { type: "STRING", description: "The name of the exercise, e.g., 'Bench Press'" },
        },
        required: ["exerciseName"],
      },
    },

    // ── Monthly Report tools ─────────────────────────────────────────────
    {
      name: "generate_monthly_report",
      description: "Generate a detailed AI-analyzed monthly expense report and save it to the app. The report includes spending breakdown by category, trends, insights, and recommendations.",
      parameters: {
        type: "OBJECT",
        properties: {
          month: { type: "STRING", description: "Month in YYYY-MM format, e.g., '2026-03'" },
          title: { type: "STRING", description: "Optional custom title for the report" },
        },
        required: ["month"],
      },
    },
  ];
}

/**
 * Returns only the tools relevant to the given chat mode.
 * Scoping tools reduces misrouting errors and trims context sent to the AI.
 *
 * @param {'all'|'calendar'|'tasks'|'expenses'|'habits'} mode
 */
export function getToolsForMode(mode = 'all') {
  const all = getToolDeclarations();
  if (mode === 'all') return all;

  const TOOL_SETS = {
    calendar: [
      'add_event', 'update_event', 'delete_event',
      'query_events', 'check_conflicts', 'find_free_slots',
      'get_day_narrative', 'repeat_event', 'get_schedule_summary', 'clear_date_range',
    ],
    tasks:    ['add_task', 'update_task', 'delete_task', 'query_tasks'],
    expenses: ['add_expense', 'update_expense', 'delete_expense', 'query_expenses', 'generate_monthly_report'],
    habits:   ['add_habit', 'update_habit', 'delete_habit', 'log_habit', 'query_habits'],
    gym:      ['add_workout_plan', 'update_workout_plan', 'delete_workout_plan', 'query_workout_plans',
              'add_workout_log', 'delete_workout_log', 'query_workout_logs', 'get_exercise_progression'],
  };

  const allowed = TOOL_SETS[mode] ?? [];
  return all.filter(t => allowed.includes(t.name));
}
