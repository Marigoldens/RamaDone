import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, User, Menu, Moon } from 'lucide-react';
import { format } from 'date-fns';
import { useMessages, useChatSessions } from '../../hooks/useMessages';
import { useEvents } from '../../hooks/useEvents';
import { useAllEvents } from '../../hooks/useEvents';
import { usePreferences } from '../../hooks/usePreferences';
import { chatWithGemini, executeCalendarAction, executeQueryTool, sendFunctionResultsToGemini } from '../../services/aiService';
import { fetchPrayerTimes, parsePrayerTime } from '../../services/prayerService';
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
  const allEvents = useAllEvents();
  const { prefs: preferences } = usePreferences();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [prayerTimes, setPrayerTimes] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch today's prayer times once on mount (uses user's lat/lon from preferences)
  useEffect(() => {
    async function loadPrayers() {
      try {
        const todayAlAdhan = format(new Date(), 'dd-MM-yyyy');
        const timings = await fetchPrayerTimes(
          preferences.latitude,
          preferences.longitude,
          todayAlAdhan,
          preferences.calcMethod ?? 2
        );
        // Build a clean prayer times string for the AI system prompt
        const fmt = (key) => {
          const t = timings[key];
          if (!t) return 'N/A';
          const { hours, minutes } = parsePrayerTime(t);
          return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        };
        const ishaTime = timings['Isha'] ? parsePrayerTime(timings['Isha']) : null;
        const tarawihTime = ishaTime
          ? `${String(Math.floor((ishaTime.hours * 60 + ishaTime.minutes + 30) / 60) % 24).padStart(2, '0')}:${String((ishaTime.hours * 60 + ishaTime.minutes + 30) % 60).padStart(2, '0')}`
          : '20:30';
        const prayerBlock = `=== TODAY'S PRAYER TIMES ===\nFajr: ${fmt('Fajr')} | Dhuhr: ${fmt('Dhuhr')} | Asr: ${fmt('Asr')} | Maghrib (Iftar): ${fmt('Maghrib')} | Isha: ${fmt('Isha')} | Tarawih: ~${tarawihTime}\nWhen user says "Iftar" → use Maghrib time. "Suhoor" → 30-60 min before Fajr.\n=== END PRAYER TIMES ===`;
        setPrayerTimes(prayerBlock);
      } catch (err) {
        console.warn('Could not fetch prayer times:', err.message);
      }
    }
    if (preferences.latitude) loadPrayers();
  }, [preferences.latitude, preferences.longitude, preferences.calcMethod]);

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
      let geminiResponse = await chatWithGemini(currentMessages, allEvents, preferences, prayerTimes);

      // ── Handle function calls from the AI ───────────────────────────────
      if (geminiResponse.isFunctionCall) {
        const QUERY_TOOLS = ['query_events', 'get_schedule_summary', 'clear_date_range'];
        const CALENDAR_TOOLS = ['add_event', 'update_event', 'delete_event'];

        const batchedEvents = [];
        const batchedDeletes = [];
        const batchedUpdates = [];
        const allPendingCalls = [];
        const queryResultsForGemini = [];

        for (const call of geminiResponse.functionCalls) {
          if (call.name === 'add_event') {
            const dateOnly = call.args.start ? call.args.start.split('T')[0] : null;
            batchedEvents.push({
              ...call.args,
              date: dateOnly,
              startTime: call.args.start ? format(new Date(call.args.start), 'HH:mm') : '',
              endTime: call.args.end ? format(new Date(call.args.end), 'HH:mm') : '',
            });
            allPendingCalls.push(call);

          } else if (call.name === 'repeat_event') {
            // Execute locally — returns a batch of events to add
            const result = await executeQueryTool(call, allEvents);
            if (result.requiresBatch && result.events?.length > 0) {
              result.events.forEach(ev => {
                batchedEvents.push({
                  ...ev,
                  startTime: ev.start ? format(new Date(ev.start), 'HH:mm') : '',
                  endTime: ev.end ? format(new Date(ev.end), 'HH:mm') : '',
                });
                allPendingCalls.push({ name: 'add_event', args: ev });
              });
            }

          } else if (call.name === 'delete_event') {
            const existingEvent = allEvents?.find(e => e.id === call.args.id);
            batchedDeletes.push({
              id: call.args.id,
              title: existingEvent?.title || `Event #${call.args.id}`,
              start: existingEvent?.start,
              end: existingEvent?.end,
            });
            allPendingCalls.push(call);

          } else if (call.name === 'update_event') {
            const existingEvent = allEvents?.find(e => e.id === call.args.id);
            batchedUpdates.push({
              id: call.args.id,
              title: existingEvent?.title || `Event #${call.args.id}`,
              updates: call.args.updates,
            });
            allPendingCalls.push(call);

          } else if (call.name === 'clear_date_range') {
            // Execute locally to get which events are in range, then show confirmation
            const queryResult = await executeQueryTool(call, allEvents);
            if (queryResult.requiresConfirmation && queryResult.eventsToDelete?.length > 0) {
              queryResult.eventsToDelete.forEach(ev => {
                batchedDeletes.push(ev);
                allPendingCalls.push({ name: 'delete_event', args: { id: ev.id } });
              });
            }
            queryResultsForGemini.push({ name: call.name, result: queryResult });

          } else if (QUERY_TOOLS.includes(call.name)) {
            // Execute query locally and collect for Gemini follow-up
            const queryResult = await executeQueryTool(call, allEvents);
            queryResultsForGemini.push({ name: call.name, result: queryResult });
          }
        }

        // If query tools were called, send results back to Gemini and get a reply
        if (queryResultsForGemini.length > 0) {
          const followUp = await sendFunctionResultsToGemini(
            geminiResponse.chatInstance,
            queryResultsForGemini
          );
          if (followUp.text) {
            await sendMessage('assistant', followUp.text, {}, currentSessionId);
          }
        }

        // If calendar mutation calls were batched, show confirmation card
        const hasPendingActions = batchedEvents.length > 0 || batchedDeletes.length > 0 || batchedUpdates.length > 0;
        if (hasPendingActions) {
          let defaultMessage = 'Please review and confirm the following changes:';
          if (batchedDeletes.length > 0 && batchedEvents.length === 0 && batchedUpdates.length === 0) {
            defaultMessage = `I will delete ${batchedDeletes.length} event${batchedDeletes.length > 1 ? 's' : ''}. Please confirm:`;
          }
          await sendMessage('assistant', geminiResponse.text || defaultMessage, {
            proposedEvents: batchedEvents,
            proposedDeletes: batchedDeletes,
            proposedUpdates: batchedUpdates,
            rawCalls: allPendingCalls,
            isConfirmed: false,
          }, currentSessionId);
          setLoading(false);
          return;
        }

        // Pure text response (no mutations, no follow-up queries)
        if (!queryResultsForGemini.length && geminiResponse.text) {
          await sendMessage('assistant', geminiResponse.text, {}, currentSessionId);
        }
        setLoading(false);
        return;
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
                      
                      {(msg.proposedEvents?.length > 0 || msg.proposedDeletes?.length > 0 || msg.proposedUpdates?.length > 0) && (
                        <InChatEventCard
                          events={msg.proposedEvents || []}
                          deletedEvents={msg.proposedDeletes || []}
                          updatedEvents={msg.proposedUpdates || []}
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
