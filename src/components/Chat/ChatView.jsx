import { useState, useRef, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { format } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';

import { useMessages, useChatSessions } from '../../hooks/useMessages';
import { useEvents, useAllEvents } from '../../hooks/useEvents';
import { usePreferences } from '../../hooks/usePreferences';
import { useGlobalApp } from '../../context/GlobalAppContext';
import { chatWithAI, executeCalendarAction, executeQueryTool, sendFunctionResultsToAI, executeProductivityQuery } from '../../services/aiService';
import { QUERY_TOOLS } from '../../services/aiTools';
import { fetchPrayerTimes, parsePrayerTime } from '../../services/prayerService';
import { trackAiUsageSecure, checkApiAccess } from '../../config/admin';
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

  const { sessions, createSession, updateSessionMode } = useChatSessions();
  const { messages, sendMessage, updateMessageData } = useMessages(activeSessionId);
  const { refreshAll } = useGlobalApp();

  const todayDate = format(new Date(), 'yyyy-MM-dd');
  const eventsHook = useEvents(todayDate);
  const allEvents = useAllEvents();
  const { prefs: preferences } = usePreferences();

  // Live productivity data for AI context and tool execution
  const tasks = useLiveQuery(() => db.tasks.toArray(), [], []);
  const expenses = useLiveQuery(() => db.expenses.toArray(), [], []);
  const habits = useLiveQuery(() => db.habits.where('archived').equals(0).toArray(), [], []);
  const habitLogs = useLiveQuery(() => db.habitLogs.toArray(), [], []);
  const workoutPlans = useLiveQuery(() => db.workoutPlans.orderBy('createdAt').reverse().toArray(), [], []);
  const workoutLogs = useLiveQuery(() => db.workoutLogs.orderBy('date').reverse().toArray(), [], []);
  const productivityData = { tasks, expenses, habits, habitLogs, workoutPlans, workoutLogs };

  const ramadanMode = preferences?.ramadanMode ?? false;
  const prayerMode = preferences?.prayerMode ?? true;
  const injectPrayerContext = preferences?.injectPrayerContext ?? false;

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
        const prayerBlock = `=== TODAY'S PRAYER TIMES ===\nFajr: ${fmt('Fajr')} | Dhuhr: ${fmt('Dhuhr')} | Asr: ${fmt('Asr')} | Maghrib${ramadanMode ? ' (Iftar)' : ''}: ${fmt('Maghrib')} | Isha: ${fmt('Isha')}${ramadanMode ? ` | Tarawih: ~${tarawihTime}\nWhen user says "Iftar" → use Maghrib time. "Suhoor" → 30-60 min before Fajr.` : ''}\n=== END PRAYER TIMES ===`;
        setPrayerTimes(prayerBlock);
      } catch (err) {
        console.warn('Could not fetch prayer times:', err.message);
      }
    }
    if (preferences.latitude && prayerMode) loadPrayers();
    else setPrayerTimes(null);
  }, [preferences.latitude, preferences.longitude, preferences.calcMethod, prayerMode]);

  // ── UI state ──
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

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
          const { title, priority, dueDate, category, notes } = action.args;
          await db.tasks.add({ title, priority: priority || 'medium', dueDate, category, notes, status: action.args.status || 'todo', createdAt: Date.now(), updatedAt: Date.now() });
        } else if (action.tool === 'update_task') {
          const cleanUpdates = { ...action.args.updates, updatedAt: Date.now() };
          if (cleanUpdates.category) cleanUpdates.category = cleanUpdates.category.toLowerCase();
          await db.tasks.update(action.args.id, cleanUpdates);
        } else if (action.tool === 'delete_task') {
          await db.tasks.delete(action.args.id);
        } else if (action.tool === 'add_expense') {
          // Create a completely clean object via JSON round-trip
          const tempRecord = {
            amount: parseFloat(action.args.amount) || 0,
            type: String(action.args.type || 'expense'),
            category: String(action.args.category || 'other').toLowerCase(),
            date: String(action.args.date || todayDate),
            note: action.args.note ? String(action.args.note) : null,
            createdAt: Date.now()
          };
          // JSON round-trip ensures no hidden properties or functions
          const cleanRecord = JSON.parse(JSON.stringify(tempRecord));
          console.log('[add_expense] Saving:', JSON.stringify(cleanRecord));
          await db.expenses.add(cleanRecord);
        } else if (action.tool === 'delete_expense') {
          await db.expenses.delete(action.args.id);
        } else if (action.tool === 'update_expense') {
          const cleanUpdates = { ...action.args.updates };
          if (cleanUpdates.amount) cleanUpdates.amount = parseFloat(cleanUpdates.amount);
          if (cleanUpdates.category) cleanUpdates.category = cleanUpdates.category.toLowerCase();
          await db.expenses.update(action.args.id, cleanUpdates);
        } else if (action.tool === 'add_habit') {
          const { name, emoji, frequency } = action.args;
          const category = action.args.category ? action.args.category.toLowerCase() : null;
          await db.habits.add({ name, emoji: emoji || '🎯', category, frequency: frequency || 'daily', archived: 0, createdAt: new Date().toISOString() });
        } else if (action.tool === 'delete_habit') {
          await db.habits.update(action.args.habitId, { archived: 1 });
        } else if (action.tool === 'update_habit') {
          const cleanUpdates = { ...action.args.updates };
          if (cleanUpdates.category) cleanUpdates.category = cleanUpdates.category.toLowerCase();
          await db.habits.update(action.args.habitId, cleanUpdates);
        } else if (action.tool === 'log_habit') {
          const existing = await db.habitLogs.where({ habitId: action.args.habitId, date: action.args.date }).first();
          if (existing) {
            await db.habitLogs.update(existing.id, { completed: action.args.completed });
          } else {
            await db.habitLogs.add({ habitId: action.args.habitId, date: action.args.date, completed: action.args.completed, count: 1, note: '' });
          }
        } else if (action.tool === 'add_workout_plan') {
          const { name, type } = action.args;
          const exercises = (action.args.exercises || []).map(e => ({
            name: e.name, sets: e.sets || 3, reps: e.reps || 10, targetWeight: e.targetWeight || 0,
          }));
          await db.workoutPlans.add({ name, type: type || 'Custom', exercises, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        } else if (action.tool === 'update_workout_plan') {
          const cleanUpdates = { ...action.args.updates, updatedAt: new Date().toISOString() };
          await db.workoutPlans.update(action.args.id, cleanUpdates);
        } else if (action.tool === 'delete_workout_plan') {
          await db.workoutPlans.delete(action.args.id);
        } else if (action.tool === 'add_workout_log') {
          const { planId, planName, notes } = action.args;
          await db.workoutLogs.add({
            date: action.args.date || new Date().toISOString(),
            planId: planId || null,
            planName,
            exercises: action.args.exercises || [],
            notes: notes || '',
            createdAt: new Date().toISOString(),
          });
        } else if (action.tool === 'delete_workout_log') {
          await db.workoutLogs.delete(action.args.id);
        } else if (action.tool === 'generate_monthly_report') {
          // Generate monthly expense report and save to database
          const month = action.args.month;
          const monthStart = month + '-01';
          const monthEnd = month + '-31';
          
          // Get all expenses for the month
          const monthExpenses = expenses.filter(e => e.date >= monthStart && e.date <= monthEnd);
          
          // Calculate totals by category
          const categoryTotals = {};
          let totalExpenses = 0;
          let totalIncome = 0;
          
          monthExpenses.forEach(e => {
            const cat = (e.category || 'other').toLowerCase();
            if (e.type === 'expense') {
              categoryTotals[cat] = (categoryTotals[cat] || 0) + (e.amount || 0);
              totalExpenses += e.amount || 0;
            } else {
              totalIncome += e.amount || 0;
            }
          });
          
          // Build report content
          const report = {
            month,
            title: action.args.title || `Monthly Report - ${month}`,
            summary: {
              totalExpenses,
              totalIncome,
              netSavings: totalIncome - totalExpenses,
              transactionCount: monthExpenses.length,
            },
            categoryBreakdown: Object.entries(categoryTotals)
              .map(([category, amount]) => ({ category, amount, percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0 }))
              .sort((a, b) => b.amount - a.amount),
            topSpendingCategories: Object.entries(categoryTotals)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([cat, amt]) => ({ category: cat, amount: amt })),
            insights: [], // AI will fill this in the conversation
            recommendations: [], // AI will fill this in the conversation
            createdAt: Date.now(),
          };
          
          await db.monthlyReports.add(report);
          console.log('[generate_monthly_report] Saved report for', month);
        }
      }
      await updateMessageData(messageId, { isConfirmed: true });
      // Refresh global cache so Dashboard and other views update immediately
      refreshAll?.();
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
      // Check API access before making AI request
      let hasAccess = false;
      try {
        const result = await checkApiAccess();
        hasAccess = result.hasAccess;
      } catch (err) {
        console.warn('[Chat] Could not verify API access, proceeding anyway');
        hasAccess = true; // Fallback for offline/dev
      }

      if (!hasAccess) {
        await sendMessage('assistant', '⚠️ You do not have API access yet. Please contact the admin to grant you access to use AI features.', {}, activeSessionId || 'default');
        setLoading(false);
        return;
      }

      let currentSessionId = activeSessionId;
      if (!currentSessionId) {
        // chatMode is the mode bar selection before any session exists
        const effectiveModeForNewSession = chatMode;
        const title = textToSubmit.split(' ').slice(0, 4).join(' ') + '...';
        currentSessionId = await createSession(title, effectiveModeForNewSession);
        setActiveSessionId(currentSessionId);
      }

      await sendMessage('user', textToSubmit, {}, currentSessionId);

      const currentMessages = [...(messages || []), { role: 'user', content: textToSubmit }];
      // Pass currentMode (session mode or bar selection) — aiService auto-detects domain when mode is 'all'
      let aiResponse = await chatWithAI(currentMessages, allEvents, preferences, injectPrayerContext ? prayerTimes : null, productivityData, currentMode);

      // ── Auto-categorize session based on detected domain ──────────────────
      // Only fires when the user is in 'all' (auto) mode — if they explicitly
      // picked a mode (chatMode !== 'all') we NEVER override their choice.
      const userPickedMode = chatMode !== 'all';
      if (!userPickedMode && aiResponse.effectiveMode && aiResponse.effectiveMode !== 'all') {
        const sess = sessions?.find(s => s.id === currentSessionId);
        if (!sess?.mode || sess.mode === 'all') {
          await updateSessionMode(currentSessionId, aiResponse.effectiveMode);
        }
      }

      // ── Handle function calls ──────────────────────────────────────────────
      if (aiResponse.isFunctionCall) {
        const batchedEvents = [];
        const batchedDeletes = [];
        const batchedUpdates = [];
        const allPendingCalls = [];
        const queryResultsForAI = [];
        const pendingProductivityActions = [];

        // Helper to push an add_event call into the batched lists
        const pushAddEvent = (args) => {
          batchedEvents.push({
            ...args,
            date: args.start ? args.start.split('T')[0] : null,
            startTime: args.start ? format(new Date(args.start), 'HH:mm') : '',
            endTime: args.end ? format(new Date(args.end), 'HH:mm') : '',
          });
          allPendingCalls.push({ name: 'add_event', args });
        };

        // Helper to build a display label for a productivity action
        const mkProductivity = (call) => {
          const t = tasks?.find(x => x.id === call.args.id);
          const h = habits?.find(x => x.id === call.args.habitId);
          // Sanitize args to remove any non-serializable values
          const sanitize = (obj) => {
            if (!obj || typeof obj !== 'object') return obj;
            if (Array.isArray(obj)) {
              return obj.map(item => {
                if (typeof item === 'function') return undefined;
                if (item && typeof item === 'object') return sanitize(item);
                return item;
              }).filter(item => item !== undefined);
            }
            const clean = {};
            for (const [k, v] of Object.entries(obj)) {
              if (typeof v === 'function') continue;
              if (v && typeof v === 'object') {
                clean[k] = sanitize(v);
              } else {
                clean[k] = v;
              }
            }
            return clean;
          };
          const cleanArgs = sanitize(call.args);
          switch (call.name) {
            case 'add_task': return { tool: call.name, args: cleanArgs, display: `Add task: "${cleanArgs.title}"`, sub: `Priority: ${cleanArgs.priority || 'medium'}${cleanArgs.dueDate ? ` · Due ${cleanArgs.dueDate}` : ''}` };
            case 'update_task': return { tool: call.name, args: cleanArgs, display: `Update task: "${t?.title || `#${cleanArgs.id}`}"`, sub: JSON.stringify(cleanArgs.updates) };
            case 'delete_task': return { tool: call.name, args: cleanArgs, display: `Delete task: "${t?.title || `#${cleanArgs.id}`}"`, sub: 'Cannot be undone', danger: true };
            case 'add_expense': return { tool: call.name, args: cleanArgs, display: `Log ${cleanArgs.type}: ${cleanArgs.amount} · ${cleanArgs.category}`, sub: cleanArgs.note || cleanArgs.date || todayDate };
            case 'update_expense': return { tool: call.name, args: cleanArgs, display: `Edit expense #${cleanArgs.id}`, sub: Object.entries(cleanArgs.updates || {}).map(([k, v]) => `${k}: ${v}`).join(', ') };
            case 'delete_expense': return { tool: call.name, args: cleanArgs, display: `Delete entry #${cleanArgs.id}`, sub: 'Expense entry', danger: true };
            case 'add_habit': return { tool: call.name, args: cleanArgs, display: `Add habit: "${cleanArgs.name}"`, sub: `${cleanArgs.emoji || '🎯'} · ${cleanArgs.frequency || 'daily'}${cleanArgs.category ? ` · ${cleanArgs.category}` : ''}` };
            case 'update_habit': return { tool: call.name, args: cleanArgs, display: `Edit habit: "${h?.name || `Habit #${cleanArgs.habitId}`}"`, sub: Object.entries(cleanArgs.updates || {}).map(([k, v]) => `${k}: ${v}`).join(', ') };
            case 'delete_habit': return { tool: call.name, args: cleanArgs, display: `Archive habit: "${h?.name || `Habit #${cleanArgs.habitId}`}"`, sub: 'Habit will be hidden', danger: true };
            case 'log_habit': return { tool: call.name, args: cleanArgs, display: `${cleanArgs.completed ? '✅ Mark done' : '↩️ Undo'}: "${h?.name || `Habit #${cleanArgs.habitId}`}"`, sub: `Date: ${cleanArgs.date}` };
            case 'add_workout_plan': return { tool: call.name, args: cleanArgs, display: `Create plan: "${cleanArgs.name}"`, sub: `${cleanArgs.type} · ${(cleanArgs.exercises || []).length} exercises` };
            case 'update_workout_plan': return { tool: call.name, args: cleanArgs, display: `Update plan #${cleanArgs.id}`, sub: Object.entries(cleanArgs.updates || {}).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(', ') };
            case 'delete_workout_plan': return { tool: call.name, args: cleanArgs, display: `Delete plan: "${cleanArgs.planName || `#${cleanArgs.id}`}"`, sub: 'Cannot be undone', danger: true };
            case 'add_workout_log': return { tool: call.name, args: cleanArgs, display: `Log workout: "${cleanArgs.planName}"`, sub: `${(cleanArgs.exercises || []).length} exercises` };
            case 'delete_workout_log': return { tool: call.name, args: cleanArgs, display: `Delete workout log #${cleanArgs.id}`, sub: 'Cannot be undone', danger: true };
            default: return null;
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
        // Track AI usage via Cloud Function (secure, server-side)
        if (user?.uid) {
          const approxTokens = Math.ceil((textToSubmit.length + aiResponse.text.length) / 4);
          trackAiUsageSecure(approxTokens).catch(err => {
            console.warn('[Chat] Failed to track AI usage:', err);
          });
        }
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
  const activeSession = sessions?.find(s => s.id === activeSessionId);

  // currentMode = what the AI uses for routing (the bar selection, chatMode).
  // The session's saved .mode is purely a display label in the sidebar — it
  // is set once by auto-detection and is NEVER changed by the mode bar.
  const currentMode = chatMode;

  // ── When switching to a different session, reset bar to 'all' ──
  // (The bar is ephemeral per-session context, not tied to the saved label)
  useEffect(() => {
    setChatMode('all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId]);

  // ── Handle mode change: local state only, never writes to DB ──
  // The mode bar is a temporary AI routing hint. It does not relabel the session.
  const handleModeChange = (newMode) => {
    setChatMode(newMode);
  };

  return (
    <div className="chat-root flex-col">
      {/* Unified Top Header Ribbon */}
      <header className="chat-header unified-header relative flex items-center justify-start md:justify-center w-full border-b border-[var(--c-border)] bg-[var(--c-surface)] z-10">
        <div className="flex justify-start md:justify-center flex-1 w-full">
          <ChatModeBar
            activeMode={currentMode}
            onModeChange={handleModeChange}
            leftElement={
              <button
                className="chat-menu-btn md:hidden shrink-0 flex items-center justify-center px-4 py-2 rounded-full hover:bg-[var(--c-border)] transition-colors"
                onClick={() => setIsSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <Menu className="w-6 h-6 text-[var(--c-text-muted)] hover:text-[var(--c-text)]" />
              </button>
            }
          />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <ChatSidebar
          activeSessionId={activeSessionId}
          onSelectSession={(id) => { setActiveSessionId(id); setIsSidebarOpen(false); }}
          isMobileOpen={isSidebarOpen}
          onCloseMobile={() => setIsSidebarOpen(false)}
          activeChatMode={chatMode}
          onNewChat={() => { setActiveSessionId(null); setIsSidebarOpen(false); }}
        />

        {/* Main Area */}
        <div className="chat-main">
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
              activeMode={currentMode}
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
            activeMode={currentMode}
          />
        </div>
      </div>
    </div>
  );
}
