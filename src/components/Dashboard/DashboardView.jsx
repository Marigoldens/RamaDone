import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import {
  CheckSquare, Wallet, Target, Clock, Plus, Sparkles,
  TrendingUp, Calendar, ArrowRight, Eye, EyeOff, Settings2,
  MessageCircle, X, Settings
} from 'lucide-react';
import db from '../../db/dexie';

const STORAGE_KEY = 'ramadone_dashboard_widgets';
const DEFAULT_VIS = { tasks: true, expenses: true, habits: true, calendar: true };

/** Format number as IQD — no decimals, comma-separated */
const fmtIQD = (n) => Math.round(n).toLocaleString('en-US') + ' IQD';

/**
 * Dashboard — richer widgets with real data, toggleable visibility,
 * preference persisted in IndexedDB (via localStorage fallback).
 */
export default function DashboardView({ onNavigate }) {
  const today = format(new Date(), 'yyyy-MM-dd');

  // ─── Widget visibility ───
  const [widgetVis, setWidgetVis] = useState(() => {
    try {
      return { ...DEFAULT_VIS, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) };
    } catch { return DEFAULT_VIS; }
  });
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widgetVis));
  }, [widgetVis]);

  function toggleWidget(key) {
    setWidgetVis(prev => ({ ...prev, [key]: !prev[key] }));
  }

  // ─── Tasks data ───
  const tasksDueToday = useLiveQuery(
    () => db.tasks.where('dueDate').equals(today).toArray(), [today]
  ) ?? [];
  const tasksCompleted = useLiveQuery(() => db.tasks.where('completed').equals(1).count()) ?? 0;
  const totalTasks = useLiveQuery(() => db.tasks.count()) ?? 0;

  // ─── Expenses data ───
  const todayExpenses = useLiveQuery(
    () => db.expenses.where('date').equals(today).toArray(), [today]
  ) ?? [];

  const todaySpend = todayExpenses
    .filter(e => e.type === 'expense')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const todayIncome = todayExpenses
    .filter(e => e.type === 'income')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  // top expense category
  const topCategory = useMemo(() => {
    const map = {};
    todayExpenses.filter(e => e.type === 'expense').forEach(e => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? sorted[0][0] : null;
  }, [todayExpenses]);

  // ─── Habits data ───
  const allHabits = useLiveQuery(() => db.habits.where('archived').equals(0).toArray()) ?? [];
  const habitsChecked = useLiveQuery(
    () => db.habitLogs.where('date').equals(today).filter(l => l.completed).count(), [today]
  ) ?? 0;
  const completedHabitIds = useLiveQuery(
    () => db.habitLogs.where('date').equals(today).filter(l => l.completed).toArray(), [today]
  ) ?? [];

  const completedIdSet = new Set(completedHabitIds.map(l => l.habitId));
  const habitsNotDone = allHabits.filter(h => !completedIdSet.has(h.id));
  const habitPct = allHabits.length > 0 ? Math.round((habitsChecked / allHabits.length) * 100) : 0;

  // ─── Calendar data ───
  const todayEvents = useLiveQuery(
    () => db.events.where('date').equals(today).toArray(), [today]
  ) ?? [];
  const nextEvent = todayEvents.sort((a, b) => (a.start || '').localeCompare(b.start || ''))[0];

  const greeting = getGreeting();

  // Close modal on Escape key
  useEffect(() => {
    if (!showSettings) return;
    const handleEsc = (e) => { if (e.key === 'Escape') setShowSettings(false); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showSettings]);

  return (
    <div className="dashboard-view">
      {/* ════ Header ════ */}
      <header className="dashboard-header">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text tracking-tight">
            {greeting} 🌙
          </h1>
          <p className="text-text-muted text-sm mt-1">
            {format(new Date(), 'EEEE, MMMM d yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="dashboard-header__icon"
            title="Dashboard widgets"
          >
            <Settings2 className="w-5 h-5 text-text-muted" />
          </button>
          <button
            onClick={() => onNavigate('settings')}
            className="dashboard-header__icon"
            title="App Settings"
          >
            <Settings className="w-5 h-5 text-text" />
          </button>
        </div>
      </header>

      {/* ════ Settings Modal ════ */}
      {showSettings && (
        <div className="dash-modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="dash-modal" onClick={e => e.stopPropagation()}>
            <div className="dash-modal__header">
              <h2 className="text-base font-bold text-text">Dashboard Settings</h2>
              <button onClick={() => setShowSettings(false)} className="dash-modal__close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-text-muted mb-4">Choose which widgets to show on your dashboard</p>
            <div className="dash-modal__toggles">
              {[
                { key: 'tasks',    label: 'Tasks',    icon: <CheckSquare className="w-4 h-4" />, color: '#3b82f6' },
                { key: 'expenses', label: 'Expenses', icon: <Wallet className="w-4 h-4" />,     color: '#10b981' },
                { key: 'habits',   label: 'Habits',   icon: <Target className="w-4 h-4" />,     color: '#8b5cf6' },
                { key: 'calendar', label: 'Calendar', icon: <Calendar className="w-4 h-4" />,   color: 'var(--c-accent)' },
              ].map(w => (
                <div key={w.key} className="dash-toggle-row">
                  <div className="dash-toggle-row__info">
                    <span style={{ color: w.color }}>{w.icon}</span>
                    <span className="text-sm font-medium text-text">{w.label}</span>
                  </div>
                  <button
                    onClick={() => toggleWidget(w.key)}
                    className={`dash-toggle-switch ${widgetVis[w.key] ? 'dash-toggle-switch--on' : ''}`}
                  >
                    <span className="dash-toggle-knob" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════ Quick Action Buttons ════ */}
      <div className="dashboard-quick-actions">
        <button onClick={() => onNavigate('tasks')} className="dashboard-quick-btn">
          <Plus className="w-4 h-4" />
          <span>Add Task</span>
        </button>
        <button onClick={() => onNavigate('expenses')} className="dashboard-quick-btn">
          <Wallet className="w-4 h-4" />
          <span>Log Expense</span>
        </button>
        <button onClick={() => onNavigate('habits')} className="dashboard-quick-btn">
          <Target className="w-4 h-4" />
          <span>Check Habit</span>
        </button>
      </div>

      {/* ════ Widget Grid ════ */}
      <div className="dashboard-grid">
        {/* ── Tasks Widget ── */}
        {widgetVis.tasks && (
          <button onClick={() => onNavigate('tasks')} className="dashboard-widget dashboard-widget--tasks">
            <div className="dashboard-widget__header">
              <div className="dashboard-widget__icon-wrap dashboard-widget__icon-wrap--blue">
                <CheckSquare className="w-4 h-4" />
              </div>
              <span className="dashboard-widget__label">Tasks</span>
              <ArrowRight className="w-3.5 h-3.5 text-text-muted ml-auto opacity-0 group-hover:opacity-100" />
            </div>
            <div className="dashboard-widget__body">
              <span className="dashboard-widget__number">{tasksDueToday.length}</span>
              <span className="dashboard-widget__subtitle">due today</span>
            </div>
            {/* Show actual task names */}
            {tasksDueToday.length > 0 && (
              <div className="dashboard-widget__detail-list">
                {tasksDueToday.slice(0, 3).map(t => (
                  <div key={t.id} className="dashboard-widget__detail-item">
                    <span className={`dashboard-widget__detail-dot ${t.status === 'done' ? 'dashboard-widget__detail-dot--done' : ''}`} />
                    <span className={`text-[11px] font-medium truncate ${t.status === 'done' ? 'line-through text-text-muted' : 'text-text'}`}>
                      {t.title}
                    </span>
                  </div>
                ))}
                {tasksDueToday.length > 3 && (
                  <span className="text-[10px] text-text-muted">+{tasksDueToday.length - 3} more</span>
                )}
              </div>
            )}
            <div className="dashboard-widget__footer">
              <div className="dashboard-widget__stat-row">
                <span className="text-[11px] text-text-muted">{tasksCompleted}/{totalTasks} completed overall</span>
              </div>
            </div>
          </button>
        )}

        {/* ── Expenses Widget ── */}
        {widgetVis.expenses && (
          <button onClick={() => onNavigate('expenses')} className="dashboard-widget dashboard-widget--expenses">
            <div className="dashboard-widget__header">
              <div className="dashboard-widget__icon-wrap dashboard-widget__icon-wrap--green">
                <Wallet className="w-4 h-4" />
              </div>
              <span className="dashboard-widget__label">Expenses</span>
              <ArrowRight className="w-3.5 h-3.5 text-text-muted ml-auto opacity-0 group-hover:opacity-100" />
            </div>
            <div className="dashboard-widget__body">
              <span className="dashboard-widget__number">{fmtIQD(todaySpend)}</span>
              <span className="dashboard-widget__subtitle">
                {todayExpenses.filter(e => e.type === 'expense').length} transactions
              </span>
            </div>
            {todayIncome > 0 && (
              <div className="dashboard-widget__income-badge">
                <TrendingUp className="w-3 h-3" />
                <span>+{fmtIQD(todayIncome)} income</span>
              </div>
            )}
            {topCategory && (
              <div className="dashboard-widget__footer">
                <span className="text-[11px] text-text-muted">
                  Top: <strong className="text-text font-semibold capitalize">{topCategory}</strong>
                </span>
              </div>
            )}
          </button>
        )}

        {/* ── Habits Widget ── */}
        {widgetVis.habits && (
          <button onClick={() => onNavigate('habits')} className="dashboard-widget dashboard-widget--habits">
            <div className="dashboard-widget__header">
              <div className="dashboard-widget__icon-wrap dashboard-widget__icon-wrap--purple">
                <Target className="w-4 h-4" />
              </div>
              <span className="dashboard-widget__label">Habits</span>
              <ArrowRight className="w-3.5 h-3.5 text-text-muted ml-auto opacity-0 group-hover:opacity-100" />
            </div>
            <div className="dashboard-widget__body">
              <span className="dashboard-widget__number">{habitsChecked}<span className="text-base font-semibold text-text-muted">/{allHabits.length}</span></span>
              <span className="dashboard-widget__subtitle">{habitPct}% completed</span>
            </div>
            {/* Show which habits are still undone */}
            {habitsNotDone.length > 0 && habitsNotDone.length <= 4 && (
              <div className="dashboard-widget__detail-list">
                {habitsNotDone.slice(0, 3).map(h => (
                  <div key={h.id} className="dashboard-widget__detail-item">
                    <span className="text-[11px]">{h.emoji}</span>
                    <span className="text-[11px] font-medium text-text-muted truncate">{h.name}</span>
                  </div>
                ))}
                {habitsNotDone.length > 3 && (
                  <span className="text-[10px] text-text-muted">+{habitsNotDone.length - 3} more</span>
                )}
              </div>
            )}
            {allHabits.length > 0 && (
              <div className="dashboard-widget__progress-bar">
                <div
                  className="dashboard-widget__progress-fill"
                  style={{ width: `${Math.min(100, habitPct)}%` }}
                />
              </div>
            )}
          </button>
        )}

        {/* ── Calendar Widget ── */}
        {widgetVis.calendar && (
          <button onClick={() => onNavigate('calendar')} className="dashboard-widget dashboard-widget--calendar">
            <div className="dashboard-widget__header">
              <div className="dashboard-widget__icon-wrap dashboard-widget__icon-wrap--gold">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="dashboard-widget__label">Schedule</span>
              <ArrowRight className="w-3.5 h-3.5 text-text-muted ml-auto opacity-0 group-hover:opacity-100" />
            </div>
            <div className="dashboard-widget__body">
              <span className="dashboard-widget__number">{todayEvents.length}</span>
              <span className="dashboard-widget__subtitle">events today</span>
            </div>
            {nextEvent && (
              <div className="dashboard-widget__footer">
                <span className="text-[11px] text-text-muted">
                  Next: <strong className="text-text font-semibold">{nextEvent.title}</strong>
                  {nextEvent.start && <span className="ml-1 text-accent font-mono text-[10px]">{nextEvent.start}</span>}
                </span>
              </div>
            )}
          </button>
        )}
      </div>

      {/* ════ AI Chat Button ════ */}
      <button onClick={() => onNavigate('chat')} className="dashboard-ai-fab">
        <MessageCircle className="w-5 h-5" />
        <span>Ask AI Assistant</span>
        <Sparkles className="w-4 h-4 dashboard-ai-fab__sparkle" />
      </button>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}
