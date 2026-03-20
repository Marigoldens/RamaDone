import { Sparkles, Calendar, CheckSquare, Wallet, Target } from 'lucide-react';

export const CHAT_MODES = [
  { id: 'all',      label: 'All',      Icon: Sparkles,    color: 'all' },
  { id: 'calendar', label: 'Calendar', Icon: Calendar,    color: 'calendar' },
  { id: 'tasks',    label: 'Tasks',    Icon: CheckSquare, color: 'tasks' },
  { id: 'expenses', label: 'Expenses', Icon: Wallet,      color: 'expenses' },
  { id: 'habits',   label: 'Habits',   Icon: Target,      color: 'habits' },
];

// Per-mode quick suggestion prompts shown in the empty state
export const MODE_SUGGESTIONS = {
  all: [
    { text: 'What do I have today?', icon: '📅' },
    { text: 'Add a task for tomorrow', icon: '✅' },
    { text: 'How much did I spend this week?', icon: '💰' },
  ],
  calendar: [
    { text: "What's on today?", icon: '📅' },
    { text: 'Find me a free slot tomorrow afternoon', icon: '🕐' },
    { text: 'Add a meeting at 3 PM', icon: '📌' },
  ],
  tasks: [
    { text: 'Show my high-priority tasks', icon: '🔥' },
    { text: 'Add a task: review project proposal', icon: '✅' },
    { text: 'Mark my oldest task as done', icon: '☑️' },
  ],
  expenses: [
    { text: 'How much did I spend this week?', icon: '💰' },
    { text: 'Log 50 on food', icon: '🍔' },
    { text: 'Show my spending breakdown', icon: '📊' },
  ],
  habits: [
    { text: "Show today's habits", icon: '🎯' },
    { text: 'Mark my workout done', icon: '💪' },
    { text: 'Add a new habit: read 20 pages', icon: '📖' },
  ],
};

export const MODE_SUGGESTIONS_RAMADAN = {
  all: [
    { text: 'Plan my day around prayers', icon: '🕌' },
    { text: 'When is Iftar today?', icon: '🌙' },
    { text: 'Add a Quran study session', icon: '📖' },
  ],
};

/**
 * Horizontal pill-button bar letting users pick a chat mode.
 * Explicit selection always overrides auto-detection.
 */
export default function ChatModeBar({ activeMode, onModeChange }) {
  return (
    <div className="chat-mode-bar" role="toolbar" aria-label="Chat mode selector">
      {CHAT_MODES.map(({ id, label, Icon, color }) => {
        const isActive = activeMode === id;
        return (
          <button
            key={id}
            onClick={() => onModeChange(id)}
            aria-pressed={isActive}
            aria-label={`${label} mode`}
            className={`chat-mode-pill chat-mode-pill--${color}${isActive ? ' chat-mode-pill--active' : ''}`}
          >
            <Icon className="chat-mode-pill-icon" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
