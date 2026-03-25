import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import InChatEventCard from './InChatEventCard';
import InChatTaskCard from './InChatTaskCard';

/**
 * Renders the scrollable list of chat messages (user + assistant bubbles).
 * Handles the loading indicator when AI is thinking.
 */
export default function ChatMessageList({ messages, loading, scrollRef, onConfirmEvents, onConfirmProductivity, activeMode }) {
  return (
    <div ref={scrollRef} className="chat-messages-scroll">
      <div className="chat-messages-inner">
        {messages?.map((msg) => (
          <div
            key={msg.id}
            className={`chat-message-row ${msg.role === 'user' ? 'chat-message-row--user' : ''}`}
          >
            <div 
              className={`chat-avatar ${msg.role === 'user' ? 'chat-avatar--user' : ''}`}
              style={msg.role !== 'user' ? { background: `var(--color-mode-${activeMode || 'all'})`, color: 'white' } : {}}
            >
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
                  onConfirmAll={() => onConfirmEvents(msg.id, msg.proposedEvents, msg.rawCalls)}
                />
              )}
              {msg.pendingProductivityActions?.length > 0 && (
                <InChatTaskCard
                  actions={msg.pendingProductivityActions}
                  isConfirmed={msg.isConfirmed}
                  onConfirm={() => onConfirmProductivity(msg.id, msg.pendingProductivityActions)}
                />
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-message-row">
            <div className="chat-avatar" style={{ background: `var(--color-mode-${activeMode || 'all'})`, color: 'white' }}>
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="chat-bubble chat-bubble--assistant chat-bubble--loading">
              <span className="chat-dot chat-dot-1" />
              <span className="chat-dot chat-dot-2" />
              <span className="chat-dot chat-dot-3" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
