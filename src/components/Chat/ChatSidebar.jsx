import { Plus, MessageSquare, Trash2, X, Sparkles } from 'lucide-react';
import { useChatSessions } from '../../hooks/useMessages';

export default function ChatSidebar({ activeSessionId, onSelectSession, isMobileOpen, onCloseMobile }) {
  const { sessions, createSession, deleteSession } = useChatSessions();

  const handleCreate = async () => {
    const id = await createSession('New Chat');
    onSelectSession(id);
    if (isMobileOpen) onCloseMobile();
  };

  const handleSelect = (id) => {
    onSelectSession(id);
    if (isMobileOpen) onCloseMobile();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="chat-sidebar-backdrop"
          onClick={onCloseMobile}
        />
      )}

      <aside className={`chat-sidebar ${isMobileOpen ? 'chat-sidebar--open' : ''}`}>
        {/* Brand header */}
        <div className="chat-sidebar-brand">
          <div className="chat-sidebar-brand-icon ai-gradient">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="chat-sidebar-brand-name">Ramadan AI</span>
          <button
            onClick={onCloseMobile}
            className="chat-sidebar-close md:hidden"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat button */}
        <div className="chat-sidebar-actions">
          <button onClick={handleCreate} className="chat-new-btn">
            <Plus className="w-4 h-4" />
            <span>New chat</span>
          </button>
        </div>

        {/* Section label */}
        {sessions?.length > 0 && (
          <p className="chat-sidebar-label">Recent</p>
        )}

        {/* Session list */}
        <div className="chat-sidebar-list">
          {(!sessions || sessions.length === 0) && (
            <div className="chat-sidebar-empty">No previous chats</div>
          )}
          {sessions?.map((session) => (
            <div
              key={session.id}
              className={`chat-session-item ${activeSessionId === session.id ? 'chat-session-item--active' : ''}`}
              onClick={() => handleSelect(session.id)}
            >
              <MessageSquare className="w-4 h-4 chat-session-icon" />
              <span className="chat-session-title">
                {session.title || 'Untitled Chat'}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSession(session.id);
                  if (activeSessionId === session.id) onSelectSession(null);
                }}
                className="chat-session-delete"
                title="Delete"
                aria-label="Delete chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
