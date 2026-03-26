import { MessageSquare, Plus, X, Star, Trash2 } from 'lucide-react';
import { useChatSessions } from '../../hooks/useMessages';
import { CHAT_MODES } from './ChatModeBar';

/**
 * Chat sidebar — shows session history colour-coded by mode.
 *
 * KEY BEHAVIOURS:
 * - When activeChatMode is 'all'  → shows ALL sessions
 * - When activeChatMode is 'gym'  → shows only gym sessions
 * - Star toggle always visible via pure CSS (no Tailwind group hack)
 * - Mode accent stripe on the left of each session item
 * - Delete button appears on hover
 */

// Map mode id → readable label
const MODE_LABELS = Object.fromEntries(CHAT_MODES.map(m => [m.id, m.label]));

export default function ChatSidebar({
  activeSessionId,
  onSelectSession,
  isMobileOpen,
  onCloseMobile,
  activeChatMode,
  onNewChat,
}) {
  const { sessions, createSession, deleteSession, toggleStar } = useChatSessions();

  // ── Filter sessions by mode ──
  const filtered = (activeChatMode && activeChatMode !== 'all')
    ? (sessions || []).filter(s => s.mode === activeChatMode)
    : (sessions || []);

  // Separate starred from normal
  const starred = filtered.filter(s => s.starred);
  const normal = filtered.filter(s => !s.starred);

  const handleNewChat = async () => {
    if (onNewChat) {
      onNewChat();
    } else {
      const id = await createSession('New Chat', activeChatMode || 'all');
      onSelectSession(id);
    }
    onCloseMobile?.();
  };

  const handleSelect = (id) => {
    onSelectSession(id);
    onCloseMobile?.();
  };

  // ── Render a single session row ──
  const renderSession = (session) => {
    const isActive = session.id === activeSessionId;
    const modeColor = `var(--color-mode-${session.mode || 'all'})`;
    const modeLabel = MODE_LABELS[session.mode] || 'All';

    return (
      <div
        key={session.id}
        className={`chat-session-item ${isActive ? 'chat-session-item--active' : ''}`}
        onClick={() => handleSelect(session.id)}
      >
        {/* Mode accent stripe */}
        <span className="chat-session-stripe" style={{ backgroundColor: modeColor }} />

        {/* Icon coloured by mode */}
        <MessageSquare size={15} className="chat-session-icon" style={{ color: modeColor }} />

        {/* Title + mode badge */}
        <div className="chat-session-info">
          <span className="chat-session-title">{session.title || 'Untitled'}</span>
          <span className="chat-session-mode-badge" style={{ color: modeColor }}>
            {modeLabel}
          </span>
        </div>

        {/* Actions: star + delete */}
        <div className="chat-session-actions">
          <button
            className={`chat-session-star ${session.starred ? 'chat-session-star--active' : ''}`}
            onClick={(e) => { e.stopPropagation(); toggleStar(session.id); }}
            aria-label={session.starred ? 'Unstar chat' : 'Star chat'}
          >
            <Star size={13} fill={session.starred ? 'currentColor' : 'none'} />
          </button>
          <button
            className="chat-session-delete"
            onClick={(e) => {
              e.stopPropagation();
              if (activeSessionId === session.id) onSelectSession(null);
              deleteSession(session.id);
            }}
            aria-label="Delete chat"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div className="chat-sidebar-backdrop" onClick={onCloseMobile} />
      )}

      <aside className={`chat-sidebar ${isMobileOpen ? 'chat-sidebar--open' : ''}`}>
        {/* Brand header - hidden on md+ because there is a unified header above */}
        <div className="chat-sidebar-brand md:hidden">
          <div
            className="chat-sidebar-brand-icon ai-gradient"
            style={{ color: '#fff' }}
          >
            <MessageSquare size={16} />
          </div>
          <span className="chat-sidebar-brand-name">RamaDone AI</span>
          <button className="chat-sidebar-close" onClick={onCloseMobile} aria-label="Close sidebar">
            <X size={16} />
          </button>
        </div>

        {/* New Chat button */}
        <div className="chat-sidebar-actions">
          <button className="chat-new-btn" onClick={handleNewChat}>
            <Plus size={16} />
            <span>New Chat</span>
          </button>
        </div>

        {/* Session list */}
        <div className="chat-sidebar-list">
          {/* Starred section */}
          {starred.length > 0 && (
            <>
              <div className="chat-sidebar-label">
                <Star size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} />
                Starred
              </div>
              {starred.map(renderSession)}
            </>
          )}

          {/* Recent section */}
          <div className="chat-sidebar-label">Recent</div>
          {normal.length > 0 ? (
            normal.map(renderSession)
          ) : (
            <div className="chat-sidebar-empty">
              {activeChatMode !== 'all'
                ? `No ${MODE_LABELS[activeChatMode] || ''} chats yet`
                : 'No chats yet. Start a conversation!'}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
