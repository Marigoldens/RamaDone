import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, User, Menu, Moon } from 'lucide-react';
import { format } from 'date-fns';
import { useMessages, useChatSessions } from '../../hooks/useMessages';
import { useEvents } from '../../hooks/useEvents';
import { usePreferences } from '../../hooks/usePreferences';
import { chatWithGemini, executeCalendarAction, sendFunctionResultsToGemini } from '../../services/aiService';
import ChatSidebar from './ChatSidebar';
import ReactMarkdown from 'react-markdown';
import InChatEventCard from './InChatEventCard';

const SUGGESTIONS = [
  { text: 'Plan my day around prayers', icon: '🕌' },
  { text: 'Add a Quran study session', icon: '📖' },
  { text: 'When is the next prayer?', icon: '🌙' },
];

export default function ChatView({ user, accessToken }) {
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { createSession } = useChatSessions();
  const { messages, sendMessage, updateMessageData } = useMessages(activeSessionId);

  const handleConfirmEvents = async (messageId, proposedEvents, rawCalls) => {
    try {
      for (const call of rawCalls) {
        await executeCalendarAction(call, eventsHook);
      }
      await updateMessageData(messageId, { isConfirmed: true });
    } catch (err) {
      console.error("Failed to confirm events", err);
    }
  };
  const todayDate = format(new Date(), 'yyyy-MM-dd');
  const eventsHook = useEvents(todayDate);
  const { prefs: preferences } = usePreferences();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async (messageText = input) => {
    if (!messageText.trim() || loading) return;

    const textToSubmit = messageText.trim();
    setInput('');
    setLoading(true);
    inputRef.current?.focus();

    try {
      let currentSessionId = activeSessionId;
      if (!currentSessionId) {
        const title = textToSubmit.split(' ').slice(0, 4).join(' ') + '...';
        currentSessionId = await createSession(title);
        setActiveSessionId(currentSessionId);
      }

      await sendMessage('user', textToSubmit, {}, currentSessionId);

      const currentMessages = [...(messages || []), { role: 'user', content: textToSubmit }];
      let geminiResponse = await chatWithGemini(currentMessages, eventsHook.events, preferences);

      if (geminiResponse.isFunctionCall) {
        const batchedEvents = [];
        const functionResults = [];

        for (const call of geminiResponse.functionCalls) {
          if (call.name === "add_event") {
            const dateOnly = call.args.start ? call.args.start.split('T')[0] : null;
            batchedEvents.push({
               ...call.args,
               date: dateOnly,
               startTime: call.args.start ? format(new Date(call.args.start), 'HH:mm') : '',
               endTime: call.args.end ? format(new Date(call.args.end), 'HH:mm') : '',
            });
          } else {
            const result = await executeCalendarAction(call, eventsHook);
            functionResults.push({ name: call.name, result });
          }
        }

        if (batchedEvents.length > 0) {
          if (functionResults.length > 0) {
            await sendFunctionResultsToGemini(geminiResponse.chatInstance, functionResults);
          }
          await sendMessage('assistant', geminiResponse.text || "I have prepared the following events for your calendar. Please review and confirm:", {
            proposedEvents: batchedEvents,
            rawCalls: geminiResponse.functionCalls.filter(c => c.name === "add_event"),
            isConfirmed: false
          }, currentSessionId);
          setLoading(false);
          return;
        } else if (functionResults.length > 0) {
          geminiResponse = await sendFunctionResultsToGemini(geminiResponse.chatInstance, functionResults);
        }
      }

      if (geminiResponse.text) {
        await sendMessage('assistant', geminiResponse.text, {}, currentSessionId);
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

  return (
    <div className="chat-root">
      {/* Sidebar */}
      <ChatSidebar
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        isMobileOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
      />

      {/* Main Area */}
      <div className="chat-main">
        {/* Header */}
        <header className="chat-header">
          <div className="chat-header-left">
            <button
              className="chat-menu-btn md:hidden"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="chat-header-icon ai-gradient">
              <Moon className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="chat-header-title">Ramadan AI</h1>
              <p className="chat-header-subtitle">Powered by Gemini</p>
            </div>
          </div>
          {/* Status pill */}
          <div className="chat-status-pill">
            <span className="chat-status-dot" />
            <span>Online</span>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="chat-messages-scroll">
          <div className="chat-messages-inner">
            {showEmptyState ? (
              <div className="chat-empty">
                <div className="chat-empty-icon ai-gradient">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2 className="chat-empty-title">Assalamu Alaikum! 🌙</h2>
                <p className="chat-empty-subtitle">
                  I'm your Ramadan scheduling assistant. Ask me anything about prayer times, your calendar, or how to plan your day.
                </p>
                <div className="chat-suggestions">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(s.text)}
                      className="chat-suggestion-btn"
                    >
                      <span className="chat-suggestion-icon">{s.icon}</span>
                      <span className="chat-suggestion-text">{s.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages?.map((msg) => (
                  <div
                    key={msg.id}
                    className={`chat-message-row ${msg.role === 'user' ? 'chat-message-row--user' : ''}`}
                  >
                    <div className={`chat-avatar ${msg.role === 'user' ? 'chat-avatar--user' : 'ai-gradient'}`}>
                      {msg.role === 'user'
                        ? <User className="w-4 h-4 text-accent" />
                        : <Bot className="w-4 h-4 text-white" />
                      }
                    </div>
                    <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble--user' : 'chat-bubble--assistant'}`}>
                      {msg.role === 'user' ? (
                        msg.content
                      ) : (
                        <div className="markdown-body">
                          <ReactMarkdown>{msg.content || ''}</ReactMarkdown>
                        </div>
                      )}
                      
                      {msg.proposedEvents && (
                        <InChatEventCard
                          events={msg.proposedEvents}
                          isConfirmed={msg.isConfirmed}
                          onConfirmAll={() => handleConfirmEvents(msg.id, msg.proposedEvents, msg.rawCalls)}
                        />
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="chat-message-row">
                    <div className="chat-avatar ai-gradient">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="chat-bubble chat-bubble--assistant chat-bubble--loading">
                      <span className="chat-dot chat-dot-1" />
                      <span className="chat-dot chat-dot-2" />
                      <span className="chat-dot chat-dot-3" />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Input Bar */}
        <div className="chat-input-area">
          <div className="chat-input-wrap">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Message Ramadan AI..."
              className="chat-input"
              disabled={loading}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="chat-send-btn ai-gradient"
              aria-label="Send message"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
          <p className="chat-input-disclaimer">
            Ramadan AI can make mistakes. Verify important info.
          </p>
        </div>
      </div>

    </div>
  );
}
