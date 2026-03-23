import { useState, useRef, useEffect } from 'react';
import { Menu, Moon } from 'lucide-react';
import { format } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';

import { useMessages, useChatSessions } from '../../hooks/useMessages';
import { useEvents, useAllEvents } from '../../hooks/useEvents';
import { usePreferences } from '../../hooks/usePreferences';
import { chatWithAI, executeCalendarAction, executeQueryTool, sendFunctionResultsToAI, executeProductivityQuery } from '../../services/aiService';
import { QUERY_TOOLS } from '../../services/aiTools';
import { fetchPrayerTimes, parsePrayerTime } from '../../services/prayerService';
import db from '../../db/dexie';

import ChatSidebar from './ChatSidebar';
import ChatModeBar from './ChatModeBar';
import ChatEmptyState from './ChatEmptyState';
import ChatMessageList from './ChatMessageList';
import ChatInputBar from './ChatInputBar';

// ─────────────────────────────────────────────────────────────────────────────

export default function ChatView({ user, accessToken }) {
  // ── Session state ──
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // ── Chat mode state ── ('all' → auto-detect; explicit → scoped)
  const [chatMode, setChatMode] = useState('all');

  const { createSession } = useChatSessions();
  const { messages, sendMessage, updateMessageData } = useMessages(activeSessionId);

  const todayDate = format(new Date(), 'yyyy-MM-dd');
  const eventsHook  = useEvents(todayDate);
  const allEvents   = useAllEvents();
  const { prefs: preferences } = usePreferences();

  // Live productivity data for AI context and tool execution
  const tasks     = useLiveQuery(() => db.tasks.toArray(),     [], []);
  const expenses  = useLiveQuery(() => db.expenses.toArray(),  [], []);
  const habits    = useLiveQuery(() => db.habits.where('archived').equals(0).toArray(), [], []);
  const habitLogs = useLiveQuery(() => db.habitLogs.toArray(), [], []);
  const workoutPlans = useLiveQuery(() => db.workoutPlans.orderBy('createdAt').reverse().toArray(), [], []);
  const workoutLogs  = useLiveQuery(() => db.workoutLogs.orderBy('date').reverse().toArray(), [], []);
  const productivityData = { tasks, expenses, habits, habitLogs, workoutPlans, workoutLogs };

  const ramadanMode = preferences?.ramadanMode ?? false;
  const prayerMode  = preferences?.prayerMode  ?? true;

  // ── Prayer times ──
  const [prayerTimes, setPrayerTimes] = useState(null);
  useEffect(() => {
    async function loadPrayers() {
      try {
        const todayAlAdhan = format(new Date(), 'dd-MM-yyyy');
        const timings = await fetchPrayerTimes(
          preferences.latitude,
          preferences.longitude,
          todayAlAdhan,
          preferences.calcMethod ?? 2
        );
        const fmt = (key) => {
          const t = timings[key];
          if (!t) return 'N/A';
          const { hours, minutes } = parsePrayerTime(t);
          return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        };
        const ishaTime = timings['Isha'] ? parsePrayerTime(timings['Isha']) : null;
        const tarawihTime = ishaTime
          ? `${String(Math.floor((ishaTime.hours * 60 + ishaTime.minutes + 30) / 60) % 24).padStart(2, '0')}:${String((ishaTime.hours * 60 + ishaTime.minutes + 30) % 60).padStart(2, '0')}`
          : '20:30';
        const prayerBlock = `=== TODAY'S PRAYER TIMES ===\nFajr: ${fmt('Fajr')} | Dhuhr: ${fmt('Dhuhr')} | Asr: ${fmt('Asr')} | Maghrib (Iftar): ${fmt('Maghrib')} | Isha: ${fmt('Isha')} | Tarawih: ~${tarawihTime}\nWhen user says "Iftar" → use Maghrib time. "Suhoor" → 30-60 min before Fajr.\n=== END PRAYER TIMES ===`;
        setPrayerTimes(prayerBlock);
      } catch (err) {
        console.warn('Could not fetch prayer times:', err.message);
      }
    }
    if (preferences.latitude && prayerMode) loadPrayers();
    else setPrayerTimes(null);
  }, [preferences.latitude, preferences.longitude, preferences.calcMethod, prayerMode]);

  // ── UI state ──
  const [input, setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // ── Confirm calendar events ──
  const handleConfirmEvents = async (messageId, proposedEvents, rawCalls) => {
    try {
      for (const call of rawCalls) await executeCalendarAction(call, eventsHook);
      await updateMessageData(messageId, { isConfirmed: true });
    } catch (err) {
      console.error('Failed to confirm events', err);
    }
  };

  // ── Confirm tasks / expenses / habits ──
  const handleConfirmProductivity = async (messageId, pendingActions) => {
    try {
      for (const action of pendingActions) {
        if (action.tool === 'add_task') {
          await db.tasks.add({ ...action.args, status: action.args.status || 'todo', createdAt: Date.now(), updatedAt: Date.now() });
        } else if (action.tool === 'update_task') {
          await db.tasks.update(action.args.id, { ...action.args.updates, updatedAt: Date.now() });
        } else if (action.tool === 'delete_task') {
          await db.tasks.delete(action.args.id);
        } else if (action.tool === 'add_expense') {
          await db.expenses.add({ ...action.args, amount: parseFloat(action.args.amount), date: action.args.date || todayDate, createdAt: Date.now() });
        } else if (action.tool === 'delete_expense') {
          await db.expenses.delete(action.args.id);
        } else if (action.tool === 'update_expense') {
          const upd = { ...action.args.updates };
          if (upd.amount) upd.amount = parseFloat(upd.amount);
          await db.expenses.update(action.args.id, upd);
        } else if (action.tool === 'add_habit') {
          await db.habits.add({ name: action.args.name, emoji: action.args.emoji || '🎯', category: action.args.category || null, frequency: action.args.frequency || 'daily', archived: 0, createdAt: new Date().toISOString() });
        } else if (action.tool === 'delete_habit') {
          await db.habits.update(action.args.habitId, { archived: 1 });
        } else if (action.tool === 'update_habit') {
          await db.habits.update(action.args.habitId, action.args.updates);
        } else if (action.tool === 'log_habit') {
          const existing = await db.habitLogs.where({ habitId: action.args.habitId, date: action.args.date }).first();
          if (existing) {
            await db.habitLogs.update(existing.id, { completed: action.args.completed });
          } else {
            await db.habitLogs.add({ habitId: action.args.habitId, date: action.args.date, completed: action.args.completed, count: 1, note: '' });
          }
        } else if (action.tool === 'add_workout_plan') {
          const exercises = (action.args.exercises || []).map(e => ({
            name: e.name, sets: e.sets || 3, reps: e.reps || 10, targetWeight: e.targetWeight || 0,
          }));
          await db.workoutPlans.add({ name: action.args.name, type: action.args.type || 'Custom', exercises, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        } else if (action.tool === 'update_workout_plan') {
          const upd = { ...action.args.updates, updatedAt: new Date().toISOString() };
          await db.workoutPlans.update(action.args.id, upd);
        } else if (action.tool === 'delete_workout_plan') {
          await db.workoutPlans.delete(action.args.id);
        } else if (action.tool === 'add_workout_log') {
          await db.workoutLogs.add({
            date: action.args.date || new Date().toISOString(),
            planId: action.args.planId || null,
            planName: action.args.planName,
            exercises: action.args.exercises || [],
            notes: action.args.notes || '',
            createdAt: new Date().toISOString(),
          });
        } else if (action.tool === 'delete_workout_log') {
          await db.workoutLogs.delete(action.args.id);
        }
      }
      await updateMessageData(messageId, { isConfirmed: true });
    } catch (err) {
      console.error('Failed to confirm productivity actions', err);
    }
  };

  // ── Main send handler ──
  const handleSend = async (messageText = input) => {
    if (!messageText.trim() || loading) return;

    const textToSubmit = messageText.trim();
    setInput('');
    setLoading(true);
    inputRef.current?.focus();

    try {
      let currentSessionId = activeSessionId;
      if (!currentSessionId) {
        const title = textToSubmit.split(' ').slice(0, 4).join(' ') + '...';
        currentSessionId = await createSession(title);
        setActiveSessionId(currentSessionId);
      }

      await sendMessage('user', textToSubmit, {}, currentSessionId);

      const currentMessages = [...(messages || []), { role: 'user', content: textToSubmit }];
      // Pass chatMode — aiService auto-detects domain when chatMode is 'all'
      let aiResponse = await chatWithAI(currentMessages, allEvents, preferences, prayerTimes, productivityData, chatMode);

      // ── Handle function calls ──────────────────────────────────────────────
      if (aiResponse.isFunctionCall) {
        const batchedEvents  = [];
        const batchedDeletes = [];
        const batchedUpdates = [];
        const allPendingCalls = [];
        const queryResultsForAI = [];
        const pendingProductivityActions = [];

        // Helper to push an add_event call into the batched lists
        const pushAddEvent = (args) => {
          batchedEvents.push({
            ...args,
            date:      args.start ? args.start.split('T')[0] : null,
            startTime: args.start ? format(new Date(args.start), 'HH:mm') : '',
            endTime:   args.end   ? format(new Date(args.end),   'HH:mm') : '',
          });
          allPendingCalls.push({ name: 'add_event', args });
        };

        // Helper to build a display label for a productivity action
        const mkProductivity = (call) => {
          const t = tasks?.find(x => x.id === call.args.id);
          const h = habits?.find(x => x.id === call.args.habitId);
          switch (call.name) {
            case 'add_task':     return { tool: call.name, args: call.args, display: `Add task: "${call.args.title}"`,                       sub: `Priority: ${call.args.priority || 'medium'}${call.args.dueDate ? ` · Due ${call.args.dueDate}` : ''}` };
            case 'update_task':  return { tool: call.name, args: call.args, display: `Update task: "${t?.title || `#${call.args.id}`}"`,       sub: JSON.stringify(call.args.updates) };
            case 'delete_task':  return { tool: call.name, args: call.args, display: `Delete task: "${t?.title || `#${call.args.id}`}"`,       sub: 'Cannot be undone', danger: true };
            case 'add_expense':  return { tool: call.name, args: call.args, display: `Log ${call.args.type}: ${call.args.amount} · ${call.args.category}`, sub: call.args.note || call.args.date || todayDate };
            case 'update_expense': return { tool: call.name, args: call.args, display: `Edit expense #${call.args.id}`,                       sub: Object.entries(call.args.updates || {}).map(([k,v]) => `${k}: ${v}`).join(', ') };
            case 'delete_expense': return { tool: call.name, args: call.args, display: `Delete entry #${call.args.id}`,                       sub: 'Expense entry', danger: true };
            case 'add_habit':    return { tool: call.name, args: call.args, display: `Add habit: "${call.args.name}"`,                        sub: `${call.args.emoji || '🎯'} · ${call.args.frequency || 'daily'}${call.args.category ? ` · ${call.args.category}` : ''}` };
            case 'update_habit': return { tool: call.name, args: call.args, display: `Edit habit: "${h?.name || `Habit #${call.args.habitId}`}"`, sub: Object.entries(call.args.updates || {}).map(([k,v]) => `${k}: ${v}`).join(', ') };
            case 'delete_habit': return { tool: call.name, args: call.args, display: `Archive habit: "${h?.name || `Habit #${call.args.habitId}`}"`, sub: 'Habit will be hidden', danger: true };
            case 'log_habit':    return { tool: call.name, args: call.args, display: `${call.args.completed ? '✅ Mark done' : '↩️ Undo'}: "${h?.name || `Habit #${call.args.habitId}`}"`, sub: `Date: ${call.args.date}` };
            case 'add_workout_plan':    return { tool: call.name, args: call.args, display: `Create plan: "${call.args.name}"`, sub: `${call.args.type} · ${(call.args.exercises || []).length} exercises` };
            case 'update_workout_plan': return { tool: call.name, args: call.args, display: `Update plan #${call.args.id}`, sub: Object.entries(call.args.updates || {}).map(([k,v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(', ') };
            case 'delete_workout_plan': return { tool: call.name, args: call.args, display: `Delete plan: "${call.args.planName || `#${call.args.id}`}"`, sub: 'Cannot be undone', danger: true };
            case 'add_workout_log':     return { tool: call.name, args: call.args, display: `Log workout: "${call.args.planName}"`, sub: `${(call.args.exercises || []).length} exercises` };
            case 'delete_workout_log':  return { tool: call.name, args: call.args, display: `Delete workout log #${call.args.id}`, sub: 'Cannot be undone', danger: true };
            default:             return null;
          }
        };

        for (const call of aiResponse.functionCalls) {
          if (call.name === 'add_event') {
            pushAddEvent(call.args);
          } else if (call.name === 'repeat_event') {
            const result = await executeQueryTool(call, allEvents);
            if (result.requiresBatch && result.events?.length > 0) {
              result.events.forEach(ev => pushAddEvent(ev));
            }
          } else if (call.name === 'delete_event') {
            const ev = allEvents?.find(e => e.id === call.args.id);
            batchedDeletes.push({ id: call.args.id, title: ev?.title || `Event #${call.args.id}`, start: ev?.start, end: ev?.end });
            allPendingCalls.push(call);
          } else if (call.name === 'update_event') {
            const ev = allEvents?.find(e => e.id === call.args.id);
            batchedUpdates.push({ id: call.args.id, title: ev?.title || `Event #${call.args.id}`, updates: call.args.updates });
            allPendingCalls.push(call);
          } else if (call.name === 'clear_date_range') {
            const queryResult = await executeQueryTool(call, allEvents);
            if (queryResult.requiresConfirmation && queryResult.eventsToDelete?.length > 0) {
              queryResult.eventsToDelete.forEach(ev => {
                batchedDeletes.push(ev);
                allPendingCalls.push({ name: 'delete_event', args: { id: ev.id } });
              });
            }
            queryResultsForAI.push({ name: call.name, result: queryResult, id: call.id });
          } else if (['query_tasks', 'query_expenses', 'query_habits', 'query_workout_plans', 'query_workout_logs'].includes(call.name)) {
            const result = executeProductivityQuery(call.name, call.args, productivityData);
            queryResultsForAI.push({ name: call.name, result, id: call.id });
          } else if (QUERY_TOOLS.includes(call.name)) {
            const result = await executeQueryTool(call, allEvents);
            queryResultsForAI.push({ name: call.name, result, id: call.id });
          } else {
            const prod = mkProductivity(call);
            if (prod) pendingProductivityActions.push(prod);
          }
        }

        // Send query results back to AI and get a follow-up response
        if (queryResultsForAI.length > 0) {
          const followUp = await sendFunctionResultsToAI(
            aiResponse.chatInstance, queryResultsForAI,
            allEvents, preferences, productivityData, textToSubmit
          );
          if (followUp.isFunctionCall) {
            for (const call of followUp.functionCalls) {
              if (call.name === 'add_event') {
                pushAddEvent(call.args);
              } else if (call.name === 'repeat_event') {
                const result = await executeQueryTool(call, allEvents);
                if (result.requiresBatch && result.events?.length > 0) {
                  result.events.forEach(ev => pushAddEvent(ev));
                }
              } else if (call.name === 'delete_event') {
                const ev = allEvents?.find(e => e.id === call.args.id);
                batchedDeletes.push({ id: call.args.id, title: ev?.title || `Event #${call.args.id}`, start: ev?.start, end: ev?.end });
                allPendingCalls.push(call);
              } else if (call.name === 'update_event') {
                const ev = allEvents?.find(e => e.id === call.args.id);
                batchedUpdates.push({ id: call.args.id, title: ev?.title || `Event #${call.args.id}`, updates: call.args.updates });
                allPendingCalls.push(call);
              } else {
                const prod = mkProductivity(call);
                if (prod) pendingProductivityActions.push(prod);
              }
            }
          } else if (followUp.text) {
            await sendMessage('assistant', followUp.text, {}, currentSessionId);
          }
        }

        const hasPendingCalendar = batchedEvents.length > 0 || batchedDeletes.length > 0 || batchedUpdates.length > 0;

        if (pendingProductivityActions.length > 0 && !hasPendingCalendar) {
          await sendMessage('assistant', aiResponse.text || 'Please review and confirm:', { pendingProductivityActions, isConfirmed: false }, currentSessionId);
          setLoading(false);
          return;
        }
        if (hasPendingCalendar) {
          let defaultMessage = 'Please review and confirm the following changes:';
          if (batchedDeletes.length > 0 && batchedEvents.length === 0 && batchedUpdates.length === 0 && pendingProductivityActions.length === 0) {
            defaultMessage = `I will delete ${batchedDeletes.length} event${batchedDeletes.length > 1 ? 's' : ''}. Please confirm:`;
          }
          await sendMessage('assistant', aiResponse.text || defaultMessage, {
            proposedEvents: batchedEvents,
            proposedDeletes: batchedDeletes,
            proposedUpdates: batchedUpdates,
            rawCalls: allPendingCalls,
            ...(pendingProductivityActions.length > 0 ? { pendingProductivityActions } : {}),
            isConfirmed: false,
          }, currentSessionId);
          setLoading(false);
          return;
        }

        if (!queryResultsForAI.length && aiResponse.text) {
          await sendMessage('assistant', aiResponse.text, {}, currentSessionId);
        }
        setLoading(false);
        return;
      }

      if (aiResponse.text) {
        await sendMessage('assistant', aiResponse.text, {}, currentSessionId);
      }
    } catch (err) {
      console.error('Chat Error:', err);
      if (activeSessionId) {
        await sendMessage('assistant', 'Sorry, I encountered an error. Please try again.', {}, activeSessionId);
      }
    } finally {
      setLoading(false);
    }
  };

  const showEmptyState = !activeSessionId || !messages?.length;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="chat-root">
      {/* Sidebar */}
      <ChatSidebar
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        isMobileOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
      />

      {/* Main Area */}
      <div className="chat-main">
        {/* Header */}
        <header className="chat-header">
          <div className="chat-header-left">
            <button
              className="chat-menu-btn md:hidden"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="chat-header-icon ai-gradient">
              <Moon className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="chat-header-title">{ramadanMode ? 'Ramadan AI' : 'RamaDone AI'}</h1>
              <p className="chat-header-subtitle">Powered by DeepSeek</p>
            </div>
          </div>
          <div className="chat-status-pill">
            <span className="chat-status-dot" />
            <span>Online</span>
          </div>
        </header>

        {/* Mode selector bar */}
        <ChatModeBar activeMode={chatMode} onModeChange={setChatMode} />

        {/* Messages / empty state */}
        {showEmptyState ? (
          <div className="chat-messages-scroll">
            <div className="chat-messages-inner">
              <ChatEmptyState
                activeMode={chatMode}
                ramadanMode={ramadanMode}
                onSendSuggestion={handleSend}
              />
            </div>
          </div>
        ) : (
          <ChatMessageList
            messages={messages}
            loading={loading}
            scrollRef={scrollRef}
            onConfirmEvents={handleConfirmEvents}
            onConfirmProductivity={handleConfirmProductivity}
          />
        )}

        {/* Input bar */}
        <ChatInputBar
          input={input}
          setInput={setInput}
          loading={loading}
          onSend={handleSend}
          inputRef={inputRef}
          ramadanMode={ramadanMode}
        />
      </div>
    </div>
  );
}
