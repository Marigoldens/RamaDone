import { Sparkles, MessageSquare } from 'lucide-react';
import { MODE_SUGGESTIONS, MODE_SUGGESTIONS_RAMADAN } from './ChatModeBar';

/**
 * Shown when the chat has no messages yet.
 * Simple, focused welcome for productivity assistant.
 */
export default function ChatEmptyState({ activeMode, ramadanMode, onSendSuggestion }) {
  const suggestions =
    (ramadanMode && MODE_SUGGESTIONS_RAMADAN[activeMode]) ||
    MODE_SUGGESTIONS[activeMode] ||
    MODE_SUGGESTIONS.all;

  const greeting = ramadanMode ? 'Assalamu Alaikum' : 'Welcome back';

  // Mode-specific subtitle
  const getSubtitle = () => {
    if (ramadanMode) return 'Your Ramadan scheduling assistant';
    switch (activeMode) {
      case 'calendar': return 'Manage your schedule and events';
      case 'tasks': return 'Track and organize your tasks';
      case 'expenses': return 'Monitor your spending';
      case 'habits': return 'Build better habits';
      case 'gym': return 'Plan your workouts';
      default: return 'Your productivity companion';
    }
  };

  return (
    <div className="chat-empty-claude">
      <div className="chat-empty-claude-content">
        {/* Simple centered greeting */}
        <div className="chat-empty-claude-header">
          <Sparkles size={28} className="chat-empty-claude-sparkle" />
          <h1 className="chat-empty-claude-title">{greeting}</h1>
        </div>

        <p className="chat-empty-claude-subtitle">{getSubtitle()}</p>

        {/* Mode-specific suggestions only */}
        {suggestions.length > 0 && (
          <div className="chat-empty-claude-suggestions">
            {suggestions.slice(0, 4).map((s, i) => (
              <button
                key={i}
                className="chat-empty-claude-suggestion-btn"
                onClick={() => onSendSuggestion(s.text)}
              >
                <span className="chat-suggestion-icon">{s.icon}</span>
                <span>{s.text}</span>
              </button>
            ))}
          </div>
        )}

        {/* Or start typing hint */}
        <p className="chat-empty-claude-hint">
          <MessageSquare size={14} />
          Start typing to chat
        </p>
      </div>
    </div>
  );
}
