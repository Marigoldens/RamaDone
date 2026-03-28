import { Send } from 'lucide-react';
import { MODE_PLACEHOLDERS } from './ChatModeBar';

/**
 * The text input bar at the bottom of the chat.
 * Placeholder adjusts to the active mode so users understand the AI's current focus.
 */
export default function ChatInputBar({ input, setInput, loading, onSend, inputRef, ramadanMode, activeMode }) {
  const placeholder = ramadanMode
    ? 'Ask about prayer times, calendar, Ramadan planning…'
    : (MODE_PLACEHOLDERS[activeMode] || MODE_PLACEHOLDERS.all);

  return (
    <div className="chat-input-area">
      <div className="chat-input-wrap">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onSend()}
          placeholder={placeholder}
          className="chat-input"
          // INSTANT: Input stays enabled even while AI thinks
        />
        <button
          onClick={onSend}
          disabled={!input.trim()}
          className="chat-send-btn"
          style={{ background: `var(--color-mode-${activeMode || 'all'})` }}
          aria-label="Send message"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>
      <p className="chat-input-disclaimer">
        {ramadanMode ? 'Ramadan AI' : 'RamaDone AI'} can make mistakes. Verify important info.
      </p>
    </div>
  );
}
