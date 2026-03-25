import { Send } from 'lucide-react';

/**
 * The text input bar at the bottom of the chat.
 * Handles text entry and keyboard submission.
 */
export default function ChatInputBar({ input, setInput, loading, onSend, inputRef, ramadanMode, activeMode }) {
  return (
    <div className="chat-input-area">
      <div className="chat-input-wrap">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onSend()}
          placeholder={ramadanMode ? 'Message Ramadan AI...' : 'Ask your AI assistant...'}
          className="chat-input"
          disabled={loading}
        />
        <button
          onClick={onSend}
          disabled={!input.trim() || loading}
          className="chat-send-btn"
          style={{ background: `var(--color-mode-${activeMode || 'all'})`, color: 'white' }}
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
