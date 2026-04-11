import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, Plus, X, Star, Trash2, ChevronDown, ChevronRight, ListChecks, CheckSquare, Square, RotateCcw } from 'lucide-react';
import { useChatSessions } from '../../hooks/useMessages';
import { useGlobalApp } from '../../context/GlobalAppContext';
import db from '../../db/dexie';
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
 * - Date grouping (Today, Yesterday, This Week, Older)
 * - Keyboard navigation (arrows, Delete, S)
 * - Collapsible sections
 * - Bulk selection mode
 * - Toast with undo for delete
 */

// Map mode id → icon component
const MODE_ICONS = Object.fromEntries(CHAT_MODES.map(m => [m.id, m.Icon]));

// Format relative time
function formatTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days === 1) return '1d';
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  return `${Math.floor(days / 30)}mo`;
}

// Get date group label
function getDateGroup(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const thisWeekStart = new Date(today.getTime() - today.getDay() * 86400000);
  const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 86400000);

  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (dateDay.getTime() === today.getTime()) return 'Today';
  if (dateDay.getTime() === yesterday.getTime()) return 'Yesterday';
  if (dateDay >= thisWeekStart) return 'This Week';
  if (dateDay >= lastWeekStart) return 'Last Week';
  if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) return 'This Month';
  return 'Older';
}

// Toast Component
function Toast({ message, onUndo, onClose, duration = 4000 }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        onClose();
      }
    }, 50);
    return () => clearInterval(interval);
  }, [duration, onClose]);

  return (
    <div className="chat-toast">
      <span className="chat-toast-message">{message}</span>
      <button className="chat-toast-undo" onClick={onUndo}>
        <RotateCcw size={14} />
        Undo
      </button>
      <div className="chat-toast-progress" style={{ width: `${progress}%` }} />
    </div>
  );
}

export default function ChatSidebar({
  activeSessionId,
  onSelectSession,
  isMobileOpen,
  onCloseMobile,
  activeChatMode,
  onNewChat,
}) {
  const { sessions, createSession, deleteSession, restoreSession, toggleStar } = useChatSessions();
  const { starredCollapsed, setStarredCollapsed } = useGlobalApp();
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [toast, setToast] = useState(null);
  const itemRefs = useRef([]);
  const listRef = useRef(null);

  // ── Filter sessions by mode ──
  const filtered = (activeChatMode && activeChatMode !== 'all')
    ? (sessions || []).filter(s => s.mode === activeChatMode)
    : (sessions || []);

  // Separate starred from normal and sort by updatedAt desc
  const starred = filtered.filter(s => s.starred).sort((a, b) => b.updatedAt - a.updatedAt);
  const normal = filtered.filter(s => !s.starred).sort((a, b) => b.updatedAt - a.updatedAt);

  // Group normal sessions by date
  const groupedNormal = normal.reduce((acc, session) => {
    const group = getDateGroup(session.updatedAt);
    if (!acc[group]) acc[group] = [];
    acc[group].push(session);
    return acc;
  }, {});

  const groupOrder = ['Today', 'Yesterday', 'This Week', 'Last Week', 'This Month', 'Older'];
  const sortedGroups = groupOrder.filter(g => groupedNormal[g]);

  // Combine all sessions for keyboard navigation
  const allSessions = [...starred, ...normal];

  const handleNewChat = async () => {
    if (onNewChat) {
      onNewChat();
    } else {
      const id = await createSession('New Chat', activeChatMode || 'all');
      onSelectSession(id);
    }
    onCloseMobile?.();
    setBulkMode(false);
    setSelectedIds(new Set());
  };

  const handleSelect = (id) => {
    if (bulkMode) {
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        return newSet;
      });
    } else {
      onSelectSession(id);
      onCloseMobile?.();
    }
  };

  const handleDelete = async (session) => {
    if (activeSessionId === session.id) onSelectSession(null);
    
    // Store session data and messages before deleting for undo
    const messages = await db.messages.where({ sessionId: session.id }).toArray();
    const sessionData = { ...session };
    
    deleteSession(session.id);
    setToast({
      message: 'Chat deleted',
      onUndo: async () => {
        await restoreSession(sessionData, messages);
        setToast(null);
      }
    });
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    
    // Store all sessions and their messages before deleting
    const deletedData = [];
    for (const id of ids) {
      const session = allSessions.find(s => s.id === id);
      const messages = await db.messages.where({ sessionId: id }).toArray();
      if (session) {
        deletedData.push({ session: { ...session }, messages });
      }
      if (activeSessionId === id) onSelectSession(null);
      deleteSession(id);
    }
    
    setToast({
      message: `${ids.length} chat${ids.length > 1 ? 's' : ''} deleted`,
      onUndo: async () => {
        for (const { session, messages } of deletedData) {
          await restoreSession(session, messages);
        }
        setToast(null);
      }
    });
    setSelectedIds(new Set());
    setBulkMode(false);
  };

  // ── Keyboard Navigation ──
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!listRef.current?.contains(document.activeElement)) return;
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = prev < allSessions.length - 1 ? prev + 1 : prev;
          itemRefs.current[next]?.focus();
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = prev > 0 ? prev - 1 : 0;
          itemRefs.current[next]?.focus();
          return next;
        });
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (focusedIndex >= 0 && !bulkMode) {
          const session = allSessions[focusedIndex];
          if (session) handleDelete(session);
        }
      } else if (e.key === 's' || e.key === 'S') {
        if (focusedIndex >= 0 && !bulkMode) {
          const session = allSessions[focusedIndex];
          if (session) toggleStar(session.id);
        }
      } else if (e.key === 'Escape') {
        if (bulkMode) {
          setBulkMode(false);
          setSelectedIds(new Set());
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allSessions, focusedIndex, bulkMode, activeSessionId]);

  // ── Swipe-to-delete state for session rows ──
  const sessionSwipeRef = useRef({ id: null, startX: 0, startY: 0 });
  const [swipingId, setSwipingId] = useState(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const handleSessionTouchStart = (e, sessionId) => {
    if (bulkMode) return;
    const touch = e.touches[0];
    sessionSwipeRef.current = { id: sessionId, startX: touch.clientX, startY: touch.clientY };
  };

  const handleSessionTouchMove = (e) => {
    const { id, startX, startY } = sessionSwipeRef.current;
    if (!id) return;
    const touch = e.touches[0];
    const dy = Math.abs(touch.clientY - startY);
    const dx = touch.clientX - startX;
    // If vertical movement is dominant, cancel swipe (user is scrolling)
    if (dy > 30 && Math.abs(dx) < dy) {
      sessionSwipeRef.current.id = null;
      setSwipingId(null);
      setSwipeOffset(0);
      return;
    }
    // Only allow left swipe (negative dx)
    if (dx < -10) {
      setSwipingId(id);
      setSwipeOffset(Math.min(0, dx));
    }
  };

  const handleSessionTouchEnd = (session) => {
    const { id } = sessionSwipeRef.current;
    if (!id) return;
    sessionSwipeRef.current.id = null;
    // If swiped past threshold, delete
    if (swipeOffset < -100) {
      handleDelete(session);
    }
    // Reset
    setSwipingId(null);
    setSwipeOffset(0);
  };

  // ── Render a single session row ──
  const renderSession = (session) => {
    const isActive = session.id === activeSessionId;
    const isSelected = selectedIds.has(session.id);
    const modeColor = `var(--c-mode-${session.mode || 'all'})`;
    const ModeIcon = MODE_ICONS[session.mode] || MODE_ICONS.all;
    const refIndex = allSessions.findIndex(s => s.id === session.id);
    const isSwiping = swipingId === session.id;
    const offset = isSwiping ? swipeOffset : 0;

    return (
      <div key={session.id} className="chat-session-swipe-wrapper">
        {/* Red delete zone behind */}
        <div
          className="chat-session-swipe-delete"
          style={{ opacity: isSwiping ? Math.min(1, Math.abs(offset) / 100) : 0 }}
        >
          <Trash2 size={16} />
          <span>Delete</span>
        </div>
        <div
          className={`chat-session-item ${isActive ? 'chat-session-item--active' : ''} ${isSelected ? 'chat-session-item--selected' : ''} ${bulkMode ? 'chat-session-item--bulk' : ''}`}
          onClick={() => handleSelect(session.id)}
          onTouchStart={(e) => handleSessionTouchStart(e, session.id)}
          onTouchMove={handleSessionTouchMove}
          onTouchEnd={() => handleSessionTouchEnd(session)}
          ref={el => itemRefs.current[refIndex] = el}
          tabIndex={refIndex === focusedIndex ? 0 : -1}
          onFocus={() => setFocusedIndex(refIndex)}
          role="button"
          aria-selected={isSelected}
          style={{
            transform: isSwiping ? `translateX(${offset}px)` : 'translateX(0)',
            transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* Mode accent stripe */}
          <span className="chat-session-stripe" style={{ backgroundColor: modeColor }} />

          {/* Checkbox in bulk mode */}
          {bulkMode && (
            <div className="chat-session-checkbox">
              {isSelected ? (
                <CheckSquare size={14} style={{ color: modeColor }} />
              ) : (
                <Square size={14} className="chat-session-checkbox-empty" />
              )}
            </div>
          )}

          {/* Icon coloured by mode */}
          <ModeIcon size={18} className="chat-session-icon" style={{ color: modeColor }} />

          {/* Title row */}
          <div className="chat-session-info">
            <span className="chat-session-title">{session.title || 'Untitled'}</span>
          </div>

          {/* Time + Actions at the end */}
          <div className="chat-session-meta">
            {!bulkMode && (
              <div className="chat-session-actions-inline">
                <button
                  className={`chat-session-star ${session.starred ? 'chat-session-star--active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); toggleStar(session.id); }}
                  aria-label={session.starred ? 'Unstar chat' : 'Star chat'}
                >
                  <Star size={14} fill={session.starred ? 'currentColor' : 'none'} />
                </button>
                <button
                  className="chat-session-delete"
                  onClick={(e) => { e.stopPropagation(); handleDelete(session); }}
                  aria-label="Delete chat"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
            <span className="chat-session-time">{formatTimeAgo(session.updatedAt)}</span>
          </div>
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
        {/* Brand header - hidden on md+ */}
        <div className="chat-sidebar-brand md:hidden">
          <div className="chat-sidebar-brand-icon ai-gradient" style={{ color: '#fff' }}>
            <MessageSquare size={16} />
          </div>
          <span className="chat-sidebar-brand-name">RamaDone AI</span>
          <button className="chat-sidebar-close" onClick={onCloseMobile} aria-label="Close sidebar">
            <X size={16} />
          </button>
        </div>

        {/* New Chat button + Bulk controls */}
        <div className="chat-sidebar-actions">
          {!bulkMode ? (
            <>
              <button className="chat-new-btn" onClick={handleNewChat}>
                <Plus size={16} />
                <span>New Chat</span>
              </button>
              {filtered.length > 0 && (
                <button 
                className="chat-bulk-toggle"
                onClick={() => setBulkMode(true)}
                aria-label="Select multiple"
              >
                <ListChecks size={16} />
              </button>
              )}
            </>
          ) : (
            <div className="chat-bulk-bar">
              <span className="chat-bulk-count">{selectedIds.size} selected</span>
              <div className="chat-bulk-actions">
                <button 
                  className="chat-bulk-btn chat-bulk-delete"
                  onClick={handleBulkDelete}
                  disabled={selectedIds.size === 0}
                >
                  <Trash2 size={14} />
                </button>
                <button 
                  className="chat-bulk-btn chat-bulk-cancel"
                  onClick={() => { setBulkMode(false); setSelectedIds(new Set()); }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Session list */}
        <div className="chat-sidebar-list" ref={listRef}>
          {/* Starred section */}
          {starred.length > 0 && (
            <div className="chat-section">
              <button 
                className="chat-sidebar-label chat-sidebar-label--collapsible"
                onClick={() => setStarredCollapsed(!starredCollapsed)}
              >
                <Star size={11} />
                <span>Starred</span>
                {starredCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              </button>
              {!starredCollapsed && starred.map(s => renderSession(s))}
            </div>
          )}

          {/* Grouped normal sessions */}
          {sortedGroups.length > 0 ? (
            sortedGroups.map(group => (
              <div key={group} className="chat-section">
                <div className="chat-sidebar-label">{group}</div>
                {groupedNormal[group].map(session => renderSession(session))}
              </div>
            ))
          ) : (
            <div className="chat-sidebar-empty">
              {activeChatMode !== 'all'
                ? `No ${activeChatMode} chats yet`
                : 'No chats yet. Start a conversation!'}
            </div>
          )}
        </div>
      </aside>

      {/* Toast */}
      {toast && (
        <Toast 
          message={toast.message} 
          onUndo={toast.onUndo}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
