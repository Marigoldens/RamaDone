import { useState, useEffect, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import {
  CheckSquare, Wallet, Target, Clock, Plus, Sparkles,
  TrendingUp, Calendar, ArrowRight, Eye, EyeOff, Settings2,
  MessageCircle, X, Settings, Dumbbell, Compass, Play, Zap, Check
} from 'lucide-react';
import { usePreferences } from '../../hooks/usePreferences';
import { useGlobalApp } from '../../context/GlobalAppContext';
import { formatTime } from '../../utils/timeHelpers';

const STORAGE_KEY = 'ramadone_dashboard_widgets';
const DEFAULT_VIS = { tasks: true, expenses: true, habits: true, calendar: true, gym: true, prayers: true };

/** Format number as IQD — no decimals, comma-separated */
const fmtIQD = (n) => Math.round(n).toLocaleString('en-US') + ' IQD';

/**
 * Dashboard — instant rendering using globally pre-cached data.
 * No loading states - data is already in memory when this renders.
 */
export default function DashboardView({ onNavigate }) {
  const { getPref, setPref } = usePreferences();
  const globalApp = useGlobalApp();
  const prayerMode = getPref('prayerMode');
  const gymWidgetMode = getPref('gymWidgetMode');
  const gymWidgetShortcuts = getPref('gymWidgetShortcuts');
  const prayersWidgetMode = getPref('prayersWidgetMode');

  // ─── Widget visibility ───
  const [widgetVis, setWidgetVis] = useState(() => {
    try {
      return { ...DEFAULT_VIS, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) };
    } catch { return DEFAULT_VIS; }
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showGymSettings, setShowGymSettings] = useState(false);
  const [showPrayersSettings, setShowPrayersSettings] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widgetVis));
  }, [widgetVis]);

  function toggleWidget(key) {
    setWidgetVis(prev => ({ ...prev, [key]: !prev[key] }));
  }

  // ─── All data from global cache (instant, no loading) ───
  const {
    tasksDueToday,
    expensesToday,
    todaySpend,
    todayIncome,
    expenses,
    habits,
    habitsCheckedToday,
    habitsNotDoneToday,
    habitsPercent,
    eventsToday,
    todayPrayers,
    weeklyWorkouts,
    lastWorkout,
    workoutPlans,
  } = globalApp;

  // Compute next event with formatted time
  const nextEvent = useMemo(() => {
    const sorted = eventsToday.sort((a, b) => (a.start || '').localeCompare(b.start || ''))[0];
    if (!sorted) return null;
    
    // Format time nicely based on user preference
    const timeFormat = getPref('timeFormat') || '12h';
    const formattedTime = sorted.start ? formatTime(sorted.start, timeFormat) : null;
    
    return { ...sorted, formattedTime };
  }, [eventsToday, getPref]);

  // Compute next prayer
  const nextPrayer = useMemo(() => {
    if (!todayPrayers) return null;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const prayerNames = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    for (const p of prayerNames) {
      const timeStr = todayPrayers[p];
      if (timeStr) {
        const [h, m] = timeStr.split(':').map(Number);
        if (h * 60 + m > currentMinutes) {
          return { name: p, time: timeStr };
        }
      }
    }
    return { name: 'isha', time: todayPrayers.isha || '--:--' };
  }, [todayPrayers]);

  // Compute top expense category
  const topCategory = useMemo(() => {
    const map = {};
    expensesToday.filter(e => e.type === 'expense').forEach(e => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? sorted[0][0] : null;
  }, [expensesToday]);

  // Compute gym shortcut plans
  const gymShortcuts = useMemo(() => {
    if (gymWidgetMode !== 'shortcuts' || !gymWidgetShortcuts?.length) return [];
    return gymWidgetShortcuts
      .map(id => workoutPlans.find(p => p.id === id))
      .filter(Boolean)
      .slice(0, 4);
  }, [gymWidgetMode, gymWidgetShortcuts, workoutPlans]);

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
                ...(prayerMode ? [{ key: 'prayers', label: 'Prayers', icon: <Compass className="w-4 h-4" />, color: '#14b8a6' }] : []),
                { key: 'gym', label: 'Gym', icon: <Dumbbell className="w-4 h-4" />, color: '#f97316' },
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
              {tasksDueToday.length > 0 ? (
                <>
                  <span className="dashboard-widget__number">{tasksDueToday.length}</span>
                  <span className="dashboard-widget__subtitle">due today</span>
                </>
              ) : (
                <>
                  <span className="dashboard-widget__number text-emerald-500">✓</span>
                  <span className="dashboard-widget__subtitle">No tasks due</span>
                </>
              )}
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
                {expensesToday.filter(e => e.type === 'expense').length} transactions
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
              <span className="dashboard-widget__number">{habitsCheckedToday}<span className="text-base font-semibold text-text-muted">/{habits.length}</span></span>
              <span className="dashboard-widget__subtitle">{habitsPercent}% completed</span>
            </div>
            {habitsNotDoneToday.length > 0 && habitsNotDoneToday.length <= 4 && (
              <div className="dashboard-widget__detail-list">
                {habitsNotDoneToday.slice(0, 3).map(h => (
                  <div key={h.id} className="dashboard-widget__detail-item">
                    <span className="text-[11px]">{h.emoji}</span>
                    <span className="text-[11px] font-medium text-text-muted truncate">{h.name}</span>
                  </div>
                ))}
                {habitsNotDoneToday.length > 3 && (
                  <span className="text-[10px] text-text-muted">+{habitsNotDoneToday.length - 3} more</span>
                )}
              </div>
            )}
            {habits.length > 0 && (
              <div className="dashboard-widget__progress-bar">
                <div
                  className="dashboard-widget__progress-fill"
                  style={{ width: `${Math.min(100, habitsPercent)}%` }}
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
              <span className="dashboard-widget__number">{eventsToday.length}</span>
              <span className="dashboard-widget__subtitle">events today</span>
            </div>
            {nextEvent && (
              <div className="dashboard-widget__footer">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-accent" />
                  <span className="text-[11px] font-semibold text-accent">{nextEvent.formattedTime}</span>
                </div>
                <span className="text-[11px] text-text-muted mt-1 block">
                  <strong className="text-text font-semibold">{nextEvent.title}</strong>
                </span>
              </div>
            )}
          </button>
        )}

        {/* ── Prayers Widget ── */}
        {widgetVis.prayers && prayerMode && (
          <div className="dashboard-widget dashboard-widget--prayers" style={{ cursor: 'default' }}>
            <div className="dashboard-widget__header">
              <div className="dashboard-widget__icon-wrap dashboard-widget__icon-wrap--teal">
                <Compass className="w-4 h-4" />
              </div>
              <span className="dashboard-widget__label">Prayers</span>
              <button
                onClick={() => setShowPrayersSettings(true)}
                className="ml-auto p-1 rounded hover:bg-[var(--c-border)] transition-colors"
                title="Configure prayers widget"
              >
                <Settings2 className="w-3.5 h-3.5 text-text-muted" />
              </button>
            </div>

            {prayersWidgetMode === 'next' ? (
              /* Next prayer mode - show upcoming prayer */
              <button
                onClick={() => onNavigate('prayers')}
                className="w-full text-left"
                style={{ cursor: 'pointer' }}
              >
                <div className="dashboard-widget__body">
                  {nextPrayer ? (
                    <>
                      <span className="dashboard-widget__number capitalize">{nextPrayer.name}</span>
                      <span className="dashboard-widget__subtitle">{nextPrayer.time}</span>
                    </>
                  ) : (
                    <>
                      <span className="dashboard-widget__number">--:--</span>
                      <span className="dashboard-widget__subtitle">No prayer data</span>
                    </>
                  )}
                </div>
              </button>
            ) : (
              /* All prayers mode - show all prayer times */
              <button
                onClick={() => onNavigate('prayers')}
                className="w-full text-left"
                style={{ cursor: 'pointer' }}
              >
                <div className="dashboard-widget__prayers-list">
                  {todayPrayers ? (
                    ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].map(prayer => (
                      <div key={prayer} className="dashboard-widget__prayer-row">
                        <span className="dashboard-widget__prayer-name capitalize">{prayer}</span>
                        <span className="dashboard-widget__prayer-time">{todayPrayers[prayer] || '--:--'}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-[11px] text-text-muted py-2">No prayer data</span>
                  )}
                </div>
              </button>
            )}
          </div>
        )}

        {/* ── Gym Widget ── */}
        {widgetVis.gym && (
          <div className="dashboard-widget dashboard-widget--gym" style={{ cursor: 'default' }}>
            <div className="dashboard-widget__header">
              <div className="dashboard-widget__icon-wrap dashboard-widget__icon-wrap--orange">
                <Dumbbell className="w-4 h-4" />
              </div>
              <span className="dashboard-widget__label">Gym</span>
              <button
                onClick={() => setShowGymSettings(true)}
                className="ml-auto p-1 rounded hover:bg-[var(--c-border)] transition-colors"
                title="Configure gym widget"
              >
                <Settings2 className="w-3.5 h-3.5 text-text-muted" />
              </button>
            </div>

            {gymWidgetMode === 'sessions' ? (
              /* Sessions mode - show weekly count */
              <button
                onClick={() => onNavigate('gym')}
                className="w-full text-left"
                style={{ cursor: 'pointer' }}
              >
                <div className="dashboard-widget__body">
                  <span className="dashboard-widget__number">{weeklyWorkouts.length}</span>
                  <span className="dashboard-widget__subtitle">sessions this week</span>
                </div>
              </button>
            ) : (
              /* Shortcuts mode - show plan shortcuts */
              <div className="dashboard-widget__shortcuts">
                {gymShortcuts.length > 0 ? (
                  gymShortcuts.map(plan => (
                    <button
                      key={plan.id}
                      onClick={() => onNavigate('gym')}
                      className="dashboard-widget__shortcut-btn"
                    >
                      <Play className="w-3 h-3" fill="currentColor" />
                      <span className="truncate">{plan.name}</span>
                    </button>
                  ))
                ) : (
                  <div className="text-[11px] text-text-muted py-2">
                    No shortcuts configured. Click ⚙️ to add.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ════ Gym Widget Settings Modal ════ */}
      {showGymSettings && (
        <GymWidgetSettingsModal
          mode={gymWidgetMode}
          shortcuts={gymWidgetShortcuts}
          plans={workoutPlans}
          onClose={() => setShowGymSettings(false)}
          onSave={(mode, shortcuts) => {
            setPref('gymWidgetMode', mode);
            setPref('gymWidgetShortcuts', shortcuts);
            setShowGymSettings(false);
          }}
        />
      )}

      {/* ════ Prayers Widget Settings Modal ════ */}
      {showPrayersSettings && (
        <PrayersWidgetSettingsModal
          mode={prayersWidgetMode}
          onClose={() => setShowPrayersSettings(false)}
          onSave={(mode) => {
            setPref('prayersWidgetMode', mode);
            setShowPrayersSettings(false);
          }}
        />
      )}

      {/* ════ AI Chat Button ════ */}
      <button onClick={() => onNavigate('chat')} className="dashboard-ai-fab">
        <MessageCircle className="w-5 h-5" />
        <span>Ask AI Assistant</span>
        <Sparkles className="w-4 h-4 dashboard-ai-fab__sparkle" />
      </button>
    </div>
  );
}

/* ────── Gym Widget Settings Modal ────── */
function GymWidgetSettingsModal({ mode, shortcuts, plans, onClose, onSave }) {
  const [localMode, setLocalMode] = useState(mode);
  const [localShortcuts, setLocalShortcuts] = useState(shortcuts || []);

  function toggleShortcut(planId) {
    setLocalShortcuts(prev => 
      prev.includes(planId)
        ? prev.filter(id => id !== planId)
        : [...prev, planId].slice(0, 4)
    );
  }

  return (
    <div className="dash-modal-overlay" onClick={onClose}>
      <div className="dash-modal gym-settings-modal" onClick={e => e.stopPropagation()}>
        <div className="dash-modal__header">
          <h2 className="text-base font-bold text-text">Gym Widget Settings</h2>
          <button onClick={onClose} className="dash-modal__close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="gym-settings-modal__content">
          {/* Mode Selection */}
          <div className="gym-settings-modal__section">
            <label className="gym-settings-modal__label">Widget Mode</label>
            <div className="gym-settings-modal__mode-btns">
              <button
                onClick={() => setLocalMode('sessions')}
                className={`gym-mode-btn ${localMode === 'sessions' ? 'gym-mode-btn--active' : ''}`}
              >
                <Zap className="w-4 h-4" />
                <span>Weekly Sessions</span>
              </button>
              <button
                onClick={() => setLocalMode('shortcuts')}
                className={`gym-mode-btn ${localMode === 'shortcuts' ? 'gym-mode-btn--active' : ''}`}
              >
                <Play className="w-4 h-4" />
                <span>Plan Shortcuts</span>
              </button>
            </div>
          </div>

          {/* Shortcuts Selection */}
          {localMode === 'shortcuts' && (
            <div className="gym-settings-modal__section">
              <label className="gym-settings-modal__label">Select Plans (up to 4)</label>
              {plans.length === 0 ? (
                <p className="gym-settings-modal__empty">
                  No workout plans yet. Create some in the Gym section first.
                </p>
              ) : (
                <div className="gym-settings-modal__plan-list">
                  {plans.map(plan => (
                    <button
                      key={plan.id}
                      onClick={() => toggleShortcut(plan.id)}
                      className={`gym-plan-select ${localShortcuts.includes(plan.id) ? 'gym-plan-select--selected' : ''}`}
                    >
                      <div className={`gym-plan-select__check ${localShortcuts.includes(plan.id) ? 'gym-plan-select__check--checked' : ''}`}>
                        {localShortcuts.includes(plan.id) && <Check className="w-3 h-3" />}
                      </div>
                      <div className="gym-plan-select__info">
                        <div className="gym-plan-select__name">{plan.name}</div>
                        <div className="gym-plan-select__meta">{plan.type} · {plan.exercises?.length || 0} exercises</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Save Button */}
        <button
          onClick={() => onSave(localMode, localShortcuts)}
          className="gym-settings-modal__save-btn"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}

/* ────── Prayers Widget Settings Modal ────── */
function PrayersWidgetSettingsModal({ mode, onClose, onSave }) {
  const [localMode, setLocalMode] = useState(mode);

  return (
    <div className="dash-modal-overlay" onClick={onClose}>
      <div className="dash-modal prayers-settings-modal" onClick={e => e.stopPropagation()}>
        <div className="dash-modal__header">
          <h2 className="text-base font-bold text-text">Prayers Widget Settings</h2>
          <button onClick={onClose} className="dash-modal__close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="prayers-settings-modal__content">
          {/* Mode Selection */}
          <div className="prayers-settings-modal__section">
            <label className="prayers-settings-modal__label">Widget Mode</label>
            <div className="prayers-settings-modal__mode-btns">
              <button
                onClick={() => setLocalMode('next')}
                className={`prayers-mode-btn ${localMode === 'next' ? 'prayers-mode-btn--active' : ''}`}
              >
                <Compass className="w-4 h-4" />
                <span>Next Prayer</span>
              </button>
              <button
                onClick={() => setLocalMode('all')}
                className={`prayers-mode-btn ${localMode === 'all' ? 'prayers-mode-btn--active' : ''}`}
              >
                <Clock className="w-4 h-4" />
                <span>All Prayers</span>
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={() => onSave(localMode)}
          className="prayers-settings-modal__save-btn"
        >
          Save Settings
        </button>
      </div>
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
