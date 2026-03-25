/**
 * @fileoverview React hooks for Dexie messages store (AI chat) supporting multi-session.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../db/dexie';

/**
 * Hook for chat sessions management.
 */
export function useChatSessions() {
  const sessions = useLiveQuery(
    () => db.chatSessions.orderBy('updatedAt').reverse().toArray(),
    [],
    []
  );

  async function createSession(title = 'New Chat', mode = null) {
    return await db.chatSessions.add({
      title,
      updatedAt: Date.now(),
      starred: 0,
      mode: mode || null,
    });
  }

  async function deleteSession(id) {
    await db.transaction('rw', db.chatSessions, db.messages, async () => {
      await db.chatSessions.delete(id);
      await db.messages.where({ sessionId: id }).delete();
    });
  }

  async function updateSessionTitle(id, title) {
    await db.chatSessions.update(id, { title });
  }

  async function toggleStar(id) {
    const session = await db.chatSessions.get(id);
    if (session) {
      await db.chatSessions.update(id, { starred: session.starred ? 0 : 1 });
    }
  }

  async function updateSessionMode(id, mode) {
    await db.chatSessions.update(id, { mode });
  }

  return { sessions, createSession, deleteSession, updateSessionTitle, toggleStar, updateSessionMode };
}

/**
 * Hook for chat message management within a session.
 * @param {number} sessionId 
 */
export function useMessages(sessionId) {
  const messages = useLiveQuery(
    () => sessionId ? db.messages.where({ sessionId }).sortBy('timestamp') : Promise.resolve([]),
    [sessionId],
    []
  );

  /**
   * Add a new message to the current session (or a specific session).
   * @param {'user' | 'assistant' | 'system'} role
   * @param {string} content
   * @param {Object} [meta] — Optional metadata
   * @param {number} [overrideSessionId] — Used if creating a session and sending immediately
   */
  async function sendMessage(role, content, meta = {}, overrideSessionId = null) {
    const sid = overrideSessionId || sessionId;
    if (!sid) throw new Error("No active session");
    
    return await db.transaction('rw', db.chatSessions, db.messages, async () => {
      await db.chatSessions.update(sid, { updatedAt: Date.now() });
      return await db.messages.add({
        sessionId: sid,
        role,
        content,
        timestamp: Date.now(),
        ...meta,
      });
    });
  }

  async function updateMessageData(messageId, newData) {
    if (!sessionId) return;
    await db.messages.update(messageId, newData);
  }

  return { messages, sendMessage, updateMessageData };
}

