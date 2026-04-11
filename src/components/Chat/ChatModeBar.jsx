import { Sparkles, Calendar, CheckSquare, Wallet, Target, Dumbbell, Lock } from 'lucide-react';
import { useRef, useEffect } from 'react';

export const CHAT_MODES = [
  { id: 'all',      label: 'All',      Icon: Sparkles,    color: 'all' },
  { id: 'calendar', label: 'Calendar', Icon: Calendar,    color: 'calendar' },
  { id: 'tasks',    label: 'Tasks',    Icon: CheckSquare, color: 'tasks' },
  { id: 'expenses', label: 'Expenses', Icon: Wallet,      color: 'expenses' },
  { id: 'habits',   label: 'Habits',   Icon: Target,      color: 'habits' },
  { id: 'gym',      label: 'Gym',      Icon: Dumbbell,    color: 'gym' },
];

// Per-mode quick suggestion prompts shown in the empty state
export const MODE_SUGGESTIONS = {
  all: [
    { text: 'What do I have today?',          icon: '📅' },
    { text: 'Add a task for tomorrow',         icon: '✅' },
    { text: 'How much did I spend this week?', icon: '💰' },
  ],
  calendar: [
    { text: "What's on today?",                      icon: '📅' },
    { text: 'Find me a free slot tomorrow afternoon', icon: '🕐' },
    { text: 'Add a meeting at 3 PM',                 icon: '📌' },
  ],
  tasks: [
    { text: 'Show my high-priority tasks',         icon: '🔥' },
    { text: 'Add a task: review project proposal', icon: '✅' },
    { text: 'Mark my oldest task as done',         icon: '☑️' },
  ],
  expenses: [
    { text: 'How much did I spend this week?', icon: '💰' },
    { text: 'Log 50 on food',                  icon: '🍔' },
    { text: 'Show my spending breakdown',      icon: '📊' },
  ],
  habits: [
    { text: "Show today's habits",          icon: '🎯' },
    { text: 'Mark my workout done',         icon: '💪' },
    { text: 'Add a habit: read 20 pages',   icon: '📖' },
  ],
  gym: [
    { text: 'Show my workout plans',          icon: '📋' },
    { text: 'Log a push day workout',         icon: '🏋️' },
    { text: 'What did I work out this week?', icon: '📊' },
  ],
};

export const MODE_SUGGESTIONS_RAMADAN = {
  all: [
    { text: 'Plan my day around prayers', icon: '🕌' },
    { text: 'When is Iftar today?',       icon: '🌙' },
    { text: 'Add a Quran study session',  icon: '📖' },
  ],
};

// Placeholder text per mode — makes the input bar feel contextual
export const MODE_PLACEHOLDERS = {
  all:      'Ask about calendar, tasks, expenses, habits…',
  calendar: 'Add an event, check schedule, find free time…',
  tasks:    'Add a task, check priorities, mark done…',
  expenses: 'Log an expense, check spending, view budget…',
  habits:   'Log a habit, check streaks, view progress…',
  gym:      'Log a workout, check plans, view this week…',
};

/**
 * Horizontal pill-button bar for picking a chat mode.
 * Shows a lock icon when the user has manually selected a non-'all' mode
 * to communicate that AI auto-detection is disabled.
 * Auto-scrolls active pill into view on mobile.
 */
export default function ChatModeBar({ activeMode, onModeChange, leftElement }) {
  const isLocked = activeMode !== 'all';
  const pillRefs = useRef({});

  // Auto-scroll active pill into view when mode changes
  useEffect(() => {
    const el = pillRefs.current[activeMode];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeMode]);

  return (
    <div className="chat-mode-bar" role="toolbar" aria-label="Chat mode selector">
      {leftElement}
      {CHAT_MODES.map(({ id, label, Icon, color }) => {
        const isActive = activeMode === id;
        return (
          <button
            key={id}
            ref={el => pillRefs.current[id] = el}
            onClick={() => onModeChange(id)}
            aria-pressed={isActive}
            aria-label={`${label} mode`}
            title={id === 'all' ? 'Auto-detect topic from your message' : `Focus on ${label}`}
            className={`chat-mode-pill chat-mode-pill--${color}${isActive ? ' chat-mode-pill--active' : ''}`}
          >
            <Icon className="chat-mode-pill-icon" />
            <span>{label}</span>
            {/* Lock icon shows when THIS pill is manually active (not 'all') */}
            {isActive && isLocked && (
              <Lock className="chat-mode-lock-icon" aria-label="Mode locked — AI won't change this" />
            )}
          </button>
        );
      })}

      {/* Subtle indicator strip when locked */}
      {isLocked && (
        <span className="chat-mode-locked-hint" aria-live="polite">
          <Lock className="w-3 h-3" />
          Locked
        </span>
      )}
    </div>
  );
}
