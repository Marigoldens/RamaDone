// ─── AI Service — Slim Coordinator ────────────────────────────────────────────
// This file handles the DeepSeek API communication. Tool declarations, prompts,
// and query execution are in separate modules for maintainability.

import { format, addDays } from "date-fns";
import { getToolDeclarations, getToolsForMode, FOLLOW_UP_QUERY_TOOLS } from "./aiTools";
import { buildTemporalContext, buildPrayerContext, buildProductivityContext, buildSystemPrompt, buildScopedSystemPrompt } from "./aiPrompt";
import { executeCalendarAction, executeQueryTool, executeProductivityQuery } from "./queryExecutor";

// Re-export for ChatView and other consumers
export { executeCalendarAction, executeQueryTool, executeProductivityQuery };
export { buildPrayerContext };

// ─── DeepSeek Config ──────────────────────────────────────────────────────────
const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY;
const DEEPSEEK_BASE    = "https://api.deepseek.com";

// ─── Smart Fixup: Catches common model mistakes at code level ─────────────────

/**
 * Detects when the user's message is about expenses/tasks/habits but the AI
 * incorrectly called query_events. Redirects to the correct query tool.
 */
function redirectMisroutedQueries(functionCalls, userMessage) {
  if (!userMessage) return functionCalls;
  const msg = userMessage.toLowerCase();

  // Keywords that indicate the user is talking about expenses
  const expenseWords = ['expense', 'spent', 'spend', 'cost', 'money', 'paid', 'pay', 'budget', 'income', 'salary', 'food expense', 'transport', 'bill'];
  const taskWords = ['task', 'todo', 'to-do', 'homework', 'assignment', 'chore'];
  const habitWords = ['habit', 'streak', 'tracker', 'daily goal'];

  const isAboutExpense = expenseWords.some(w => msg.includes(w));
  const isAboutTask    = taskWords.some(w => msg.includes(w));
  const isAboutHabit   = habitWords.some(w => msg.includes(w));

  return functionCalls.map(call => {
    // Fix: AI called query_events but user is asking about expenses
    if (call.name === 'query_events' && isAboutExpense && !msg.includes('event') && !msg.includes('schedule')) {
      console.log('🔧 Smart redirect: query_events → query_expenses (user is asking about expenses)');
      return { ...call, name: 'query_expenses', args: { ...call.args } };
    }
    // Fix: AI called query_events but user is asking about tasks
    if (call.name === 'query_events' && isAboutTask && !msg.includes('event') && !msg.includes('schedule')) {
      console.log('🔧 Smart redirect: query_events → query_tasks (user is asking about tasks)');
      return { ...call, name: 'query_tasks', args: { keyword: call.args.keyword } };
    }
    // Fix: AI called query_events but user is asking about habits
    if (call.name === 'query_events' && isAboutHabit && !msg.includes('event') && !msg.includes('schedule')) {
      console.log('🔧 Smart redirect: query_events → query_habits (user is asking about habits)');
      return { ...call, name: 'query_habits', args: { keyword: call.args.keyword } };
    }
    return call;
  });
}

/**
 * Detects delete+add patterns and converts them to update calls.
 * Example: AI returns [delete_expense(id:5), add_expense(amount:20000)]
 *        → converts to [update_expense(id:5, updates:{amount:20000})]
 */
function convertDeleteAddToUpdate(functionCalls) {
  const result = [];
  const processed = new Set();

  for (let i = 0; i < functionCalls.length; i++) {
    if (processed.has(i)) continue;
    const call = functionCalls[i];

    // ── Expense: delete_expense + add_expense → update_expense ────────
    if (call.name === 'delete_expense') {
      const addIdx = functionCalls.findIndex((c, j) => j > i && !processed.has(j) && c.name === 'add_expense');
      if (addIdx !== -1) {
        const addCall = functionCalls[addIdx];
        const updates = {};
        if (addCall.args.amount)   updates.amount = addCall.args.amount;
        if (addCall.args.category) updates.category = addCall.args.category;
        if (addCall.args.type)     updates.type = addCall.args.type;
        if (addCall.args.date)     updates.date = addCall.args.date;
        if (addCall.args.note)     updates.note = addCall.args.note;

        console.log(`🔧 Smart convert: delete_expense(#${call.args.id}) + add_expense → update_expense(#${call.args.id})`);
        result.push({
          name: 'update_expense',
          args: { id: call.args.id, updates },
        });
        processed.add(i);
        processed.add(addIdx);
        continue;
      }
    }

    // ── Task: delete_task + add_task → update_task ────────────────────
    if (call.name === 'delete_task') {
      const addIdx = functionCalls.findIndex((c, j) => j > i && !processed.has(j) && c.name === 'add_task');
      if (addIdx !== -1) {
        const addCall = functionCalls[addIdx];
        const updates = {};
        if (addCall.args.title)    updates.title = addCall.args.title;
        if (addCall.args.priority) updates.priority = addCall.args.priority;
        if (addCall.args.dueDate)  updates.dueDate = addCall.args.dueDate;
        if (addCall.args.category) updates.category = addCall.args.category;
        if (addCall.args.notes)    updates.notes = addCall.args.notes;

        console.log(`🔧 Smart convert: delete_task(#${call.args.id}) + add_task → update_task(#${call.args.id})`);
        result.push({
          name: 'update_task',
          args: { id: call.args.id, updates },
        });
        processed.add(i);
        processed.add(addIdx);
        continue;
      }
    }

    // ── Habit: delete_habit + add_habit → update_habit ────────────────
    if (call.name === 'delete_habit') {
      const addIdx = functionCalls.findIndex((c, j) => j > i && !processed.has(j) && c.name === 'add_habit');
      if (addIdx !== -1) {
        const addCall = functionCalls[addIdx];
        const updates = {};
        if (addCall.args.name)      updates.name = addCall.args.name;
        if (addCall.args.emoji)     updates.emoji = addCall.args.emoji;
        if (addCall.args.category)  updates.category = addCall.args.category;
        if (addCall.args.frequency) updates.frequency = addCall.args.frequency;

        console.log(`🔧 Smart convert: delete_habit(#${call.args.habitId}) + add_habit → update_habit(#${call.args.habitId})`);
        result.push({
          name: 'update_habit',
          args: { habitId: call.args.habitId, updates },
        });
        processed.add(i);
        processed.add(addIdx);
        continue;
      }
    }

    result.push(call);
  }

  return result;
}

/**
 * Master sanitizer — runs ALL fixups on the function calls.
 * Called both on initial response and on follow-up responses.
 */
export function sanitizeFunctionCalls(functionCalls, userMessage = '') {
  let fixed = redirectMisroutedQueries(functionCalls, userMessage);
  fixed = convertDeleteAddToUpdate(fixed);
  return fixed;
}

// ─── OpenAI Tool Format Converter ─────────────────────────────────────────────

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

// ─── Low-level DeepSeek Chat Call ─────────────────────────────────────────────

async function chatWithDeepSeek(messages, systemInstruction, googleTools, model = "deepseek-chat", userMessage = '') {
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
    // Standard model: lower temperature = more deterministic = fewer tool mistakes
    temperature: isThinkingMode ? 1.0 : 0.3,
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

  if (msg.tool_calls?.length > 0) {
    let functionCalls = msg.tool_calls
      .filter(tc => tc.type === "function")
      .map(tc => ({
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments ?? "{}"),
        id: tc.id,
      }));

    // ★ Apply smart fixups BEFORE returning to ChatView
    functionCalls = sanitizeFunctionCalls(functionCalls, userMessage);

    const historyForFollowUp = [...openAIMessages, msg];

    return {
      isFunctionCall: true,
      functionCalls,
      chatInstance: { provider: "deepseek", history: historyForFollowUp, tools: googleTools },
    };
  }

  return { isFunctionCall: false, text: msg.content ?? "" };
}

// ─── Auto-detect chat mode from message keywords ──────────────────────────────

/**
 * When the user hasn't explicitly picked a mode ('all'), analyze the message
 * for domain keywords and auto-route to the best scoped mode.
 * Returns the detected mode, or 'all' if the message is ambiguous/multi-domain.
 */
function detectModeFromMessage(message) {
  if (!message) return 'all';
  const m = message.toLowerCase();

  const signals = {
    calendar: ['event', 'schedule', 'appointment', 'meeting', 'calendar', 'plan my day',
                'what\'s on', 'what do i have', 'add to calendar', 'block time', 'free slot',
                'reschedule', 'reminder', 'when is', 'add session', 'prayer', 'iftar', 'suhoor'],
    tasks:    ['task', 'todo', 'to-do', 'to do', 'homework', 'assignment', 'chore',
                'checklist', 'pending', 'finish', 'complete task', 'add task', 'mark done'],
    expenses: ['expense', 'spent', 'spend', 'cost', 'money', 'paid', 'pay', 'budget',
                'income', 'salary', 'purchase', 'bought', 'food cost', 'log expense',
                'how much', 'total spend', 'bill', 'invoice', 'transaction'],
    habits:   ['habit', 'streak', 'tracker', 'daily goal', 'mark habit', 'log habit',
                'workout done', 'check off', 'routine', 'did my', 'completed my'],
  };

  const hits = {};
  for (const [mode, words] of Object.entries(signals)) {
    hits[mode] = words.filter(w => m.includes(w)).length;
  }

  // Find the mode(s) with hits
  const matched = Object.entries(hits).filter(([, count]) => count > 0);

  // Single domain match → route to that scoped mode
  if (matched.length === 1) return matched[0][0];

  // Multiple domains → find the strongest signal
  if (matched.length > 1) {
    matched.sort((a, b) => b[1] - a[1]);
    // Only route if winner is clearly dominant (2× the next)
    if (matched[0][1] >= 2 * (matched[1]?.[1] ?? 0)) return matched[0][0];
  }

  // Ambiguous or no match → use full 'all' mode
  return 'all';
}

// ─── Main Chat Function ───────────────────────────────────────────────────────
export const chatWithAI = async (messages, allEvents, preferences, prayerTimes = null, productivityData = {}, chatMode = 'all') => {
  if (!DEEPSEEK_API_KEY) throw new Error("DeepSeek API key not configured");

  const ramadanMode   = preferences?.ramadanMode ?? false;
  const prayerMode    = preferences?.prayerMode  ?? true;
  const selectedModel = preferences?.deepseekModel || 'deepseek-chat';

  const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';

  // When in 'all' mode, auto-detect domain from the message keywords.
  // Explicit button selections always take priority over auto-detection.
  const effectiveMode = chatMode === 'all' ? detectModeFromMessage(lastUserMsg) : chatMode;

  // Scoped tools — filtered to the effective mode
  const tools = getToolsForMode(effectiveMode);

  // Context: today + 3-day preview of events (only included for calendar/all modes)
  const todayStr   = format(new Date(), "yyyy-MM-dd");
  const previewEnd = format(addDays(new Date(), 3), "yyyy-MM-dd");
  const previewEvents = (allEvents || []).filter(e => {
    const d = e.start?.substring(0, 10);
    return d && d >= todayStr && d <= previewEnd;
  }).map(e => ({ id: e.id, title: e.title, start: e.start, end: e.end, type: e.type }));

  const contextStr = `Preferences: ${JSON.stringify(preferences)}.
Upcoming events (today + 3 days): ${JSON.stringify(previewEvents)}.
Use query_events for any other date.`;

  const temporalContext = buildTemporalContext(ramadanMode);

  // Scoped system prompt — only includes context relevant to the effective mode
  const systemInstruction = buildScopedSystemPrompt(effectiveMode, {
    ramadanMode,
    prayerTimes: prayerMode && prayerTimes ? prayerTimes : null,
    productivityData,
    contextStr,
    temporalContext,
  });

  console.log(`Provider: DeepSeek (${selectedModel === 'deepseek-reasoner' ? 'Thinking' : 'Standard'}) | Mode: ${effectiveMode} | Tools: ${tools.length}`);
  return await chatWithDeepSeek(messages, systemInstruction, tools, selectedModel, lastUserMsg);
};

// ─── Send Function Results Back to DeepSeek (with multi-turn loop) ────────────
export const sendFunctionResultsToAI = async (chatInstance, results, allEvents = [], preferences = {}, productivityData = {}, userMessage = '') => {
  try {
    let history = [...chatInstance.history];
    let pendingResults = results;

    // Loop up to 8 rounds — DeepSeek may chain query tools before settling
    for (let round = 0; round < 8; round++) {
      const toolMessages = pendingResults.map(r => ({
        role: "tool",
        tool_call_id: r.id ?? r._toolCallId ?? r.name,
        content: JSON.stringify(r.result),
      }));
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
          temperature: isThinking ? 1.0 : 0.3,
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

      if (msg.tool_calls?.length > 0) {
        let calls = msg.tool_calls
          .filter(tc => tc.type === "function")
          .map(tc => ({ name: tc.function.name, args: JSON.parse(tc.function.arguments ?? "{}"), id: tc.id }));

        // ★ Apply smart fixups on follow-up calls too
        calls = sanitizeFunctionCalls(calls, userMessage);

        const hasMutation = calls.some(c => !FOLLOW_UP_QUERY_TOOLS.includes(c.name));

        // Mutation tools — return for ChatView to show confirmation card
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
          if (['query_tasks', 'query_expenses', 'query_habits'].includes(call.name)) {
            const result = executeProductivityQuery(call.name, call.args, productivityData);
            pendingResults.push({ name: call.name, result, _toolCallId: call.id });
          } else if (FOLLOW_UP_QUERY_TOOLS.includes(call.name)) {
            console.log(`Executing follow-up query tool: ${call.name}`);
            const result = await executeQueryTool({ name: call.name, args: call.args }, allEvents);
            pendingResults.push({ name: call.name, result, _toolCallId: call.id });
          }
        }
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
