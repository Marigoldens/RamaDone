import { Sparkles } from 'lucide-react';
import { MODE_SUGGESTIONS, MODE_SUGGESTIONS_RAMADAN } from './ChatModeBar';

/**
 * Shown when the chat has no messages yet.
 * Displays a greeting, subtitle, and clickable suggestion prompts
 * that vary by the active chat mode.
 */
export default function ChatEmptyState({ activeMode, ramadanMode, onSendSuggestion }) {
  const suggestions =
    (ramadanMode && MODE_SUGGESTIONS_RAMADAN[activeMode]) ||
    MODE_SUGGESTIONS[activeMode] ||
    MODE_SUGGESTIONS.all;

  const greeting = ramadanMode ? 'Assalamu Alaikum! 🌙' : 'Hello! 👋';
  const subtitle = ramadanMode
    ? "I'm your Ramadan scheduling assistant. Ask me anything about prayer times, your calendar, or how to plan your day."
    : activeMode === 'all'
      ? "I'm your productivity assistant. I can manage your calendar, tasks, expenses, and habits — just ask."
      : `I'm in ${activeMode} mode. I'll focus on helping you manage your ${activeMode} efficiently.`;

  return (
    <div className="chat-empty">
      <div className="chat-empty-icon" style={{ background: `var(--color-mode-${activeMode || 'all'})` }}>
        <Sparkles className="w-8 h-8 text-white" />
      </div>
      <h2 className="chat-empty-title">{greeting}</h2>
      <p className="chat-empty-subtitle">{subtitle}</p>
      <div className="chat-suggestions">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSendSuggestion(s.text)}
            className="chat-suggestion-btn"
          >
            <span className="chat-suggestion-icon">{s.icon}</span>
            <span className="chat-suggestion-text">{s.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
