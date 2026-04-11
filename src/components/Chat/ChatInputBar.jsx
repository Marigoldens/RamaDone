import { Send } from 'lucide-react';
import { useRef, useEffect, useCallback } from 'react';
import { MODE_PLACEHOLDERS } from './ChatModeBar';

/**
 * The text input bar at the bottom of the chat.
 * Uses a textarea that auto-grows up to 4 lines on mobile.
 * Placeholder adjusts to the active mode so users understand the AI's current focus.
 */
export default function ChatInputBar({ input, setInput, loading, onSend, inputRef, ramadanMode, activeMode }) {
  const placeholder = ramadanMode
    ? 'Ask about prayer times, calendar, Ramadan planning…'
    : (MODE_PLACEHOLDERS[activeMode] || MODE_PLACEHOLDERS.all);

  // Auto-resize textarea to fit content (up to max-height set in CSS)
  const handleAutoResize = useCallback(() => {
    const el = inputRef?.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'; // Max ~4 lines
  }, [inputRef]);

  useEffect(() => {
    handleAutoResize();
  }, [input, handleAutoResize]);

  const handleKeyDown = (e) => {
    // Enter sends, Shift+Enter inserts newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend?.();
    }
  };

  return (
    <div className="chat-input-area">
      <div className="chat-input-wrap">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="chat-input"
          rows={1}
        />
        <button
          onClick={onSend}
          disabled={!input.trim()}
          className="chat-send-btn"
          style={{ background: `var(--c-mode-${activeMode || 'all'})` }}
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
