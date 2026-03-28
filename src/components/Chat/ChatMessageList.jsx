import { Bot, User, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import InChatEventCard from './InChatEventCard';
import InChatTaskCard from './InChatTaskCard';

/**
 * Renders the scrollable list of chat messages (user + assistant bubbles).
 * Handles the loading indicator when AI is thinking.
 */
export default function ChatMessageList({ messages, loading, scrollRef, onConfirmEvents, onConfirmProductivity, activeMode, className }) {
  // Debug: log loading state changes
  console.log('[ChatMessageList] loading:', loading, 'messages count:', messages?.length);
  
  return (
    <div ref={scrollRef} className={`chat-messages-scroll ${className || ''}`}>
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
          <div 
            className="chat-message-row" 
            style={{ 
              animation: 'fadeIn 0.3s ease-out',
              display: 'flex',
              alignItems: 'flex-end',
              gap: '0.625rem'
            }}
          >
            <div 
              className="chat-avatar"
              style={{ 
                width: '2rem',
                height: '2rem',
                borderRadius: '9999px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--c-accent)', 
                color: 'white' 
              }}
            >
              <Sparkles 
                className="w-4 h-4" 
                style={{ 
                  color: 'white',
                  animation: 'pulse 1.5s ease-in-out infinite' 
                }} 
              />
            </div>
            <div 
              className="chat-bubble chat-bubble--assistant chat-bubble--loading"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.875rem 1.125rem',
                background: 'var(--c-surface-elevated)',
                border: '1px solid var(--c-border)',
                borderRadius: '1.125rem',
                borderBottomLeftRadius: '0.375rem'
              }}
            >
              <div 
                className="chat-ai-thinking-dots"
                style={{ display: 'flex', gap: '0.3rem' }}
              >
                <div className="chat-ai-dot" />
                <div className="chat-ai-dot" />
                <div className="chat-ai-dot" />
              </div>
              <span 
                className="chat-ai-thinking-text"
                style={{ fontSize: '0.875rem', color: 'var(--c-text-muted)' }}
              >
                Thinking...
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
