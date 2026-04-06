/**
 * @fileoverview Authentication service wrapping Firebase Google Sign-In.
 *
 * KEY DESIGN DECISION:
 * After Google sign-in, we extract the OAuth access token from the
 * OAuthCredential. This token is what we use to call the Google
 * Calendar API directly (no Firebase Cloud Function needed for CRUD).
 *
 * TOKEN PERSISTENCE:
 * The access token is persisted to IndexedDB (via Dexie) so users stay
 * authorized across page reloads. Tokens expire in ~1 hour, so we also
 * store the expiry time. On restore, we check if the token is still valid.
 *
 * LIMITATION: The token from signInWithPopup expires after ~1 hour.
 * For expired tokens, we re-prompt sign-in (MVP behavior).
 */
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';

/** In-memory store for the Google OAuth access token */
let cachedAccessToken = null;

const TOKEN_KEY = 'google_oauth';

/**
 * Save token to persistent storage (IndexedDB via Dexie)
 * @param {string} token
 * @param {number} expiresInSeconds - typically 3600 (1 hour)
 */
async function persistToken(token, expiresInSeconds = 3600) {
  try {
    const { db } = await import('../db/dexie');
    const expiresAt = Date.now() + (expiresInSeconds * 1000);
    await db.authTokens.put({
      id: TOKEN_KEY,
      accessToken: token,
      expiresAt,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[authService] Failed to persist token:', err);
  }
}

/**
 * Load token from persistent storage
 * @returns {Promise<{accessToken: string, expiresAt: number} | null>}
 */
async function loadPersistedToken() {
  try {
    const { db } = await import('../db/dexie');
    const record = await db.authTokens.get(TOKEN_KEY);
    if (!record) return null;
    
    // Check if token is expired (with 5min buffer)
    if (Date.now() > record.expiresAt - 5 * 60 * 1000) {
      await db.authTokens.delete(TOKEN_KEY);
      return null;
    }
    
    return record;
  } catch (err) {
    console.warn('[authService] Failed to load persisted token:', err);
    return null;
  }
}

/**
 * Clear persisted token
 */
async function clearPersistedToken() {
  try {
    const { db } = await import('../db/dexie');
    await db.authTokens.delete(TOKEN_KEY);
  } catch (err) {
    console.warn('[authService] Failed to clear persisted token:', err);
  }
}

/**
 * Restore token from storage on app startup
 * @returns {Promise<string | null>}
 */
export async function restoreTokenFromStorage() {
  const record = await loadPersistedToken();
  if (record) {
    cachedAccessToken = record.accessToken;
    return record.accessToken;
  }
  return null;
}

/**
 * Sign in with Google using popup.
 */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || null;
    
    // Persist token (expires in ~1 hour)
    if (cachedAccessToken) {
      await persistToken(cachedAccessToken, 3600);
    }
    
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

/**
 * Sign out the current user and clear the cached token.
 * @returns {Promise<void>}
 */
export async function signOutUser() {
  cachedAccessToken = null;
  await clearPersistedToken();
  await firebaseSignOut(auth);
}

/**
 * Get the cached Google OAuth access token.
 *
 * Returns null if the user hasn't signed in yet this session.
 * In that case, the UI should prompt re-sign-in.
 *
 * @returns {string | null}
 */
export function getAccessToken() {
  return cachedAccessToken;
}

/**
 * Set the access token manually (used when restoring from hooks).
 * @param {string | null} token
 */
export function setAccessToken(token) {
  cachedAccessToken = token;
}

/**
 * Track user in local database for admin dashboard.
 * Called after successful sign-in.
 * @param {import('firebase/auth').User} user
 */
export async function trackUser(user) {
  if (!user) return;
  
  const { db } = await import('../db/dexie');
  
  const userData = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    lastLogin: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    totalMessages: 0,
    totalTokens: 0,
    lastAiRequest: null,
  };
  
  // Upsert user - update if exists, insert if new
  const existing = await db.users.where('uid').equals(user.uid).first();
  if (existing) {
    await db.users.update(existing.id, {
      lastLogin: userData.lastLogin,
      displayName: userData.displayName,
      photoURL: userData.photoURL,
    });
  } else {
    await db.users.add(userData);
  }
}

/**
 * Track AI usage for a user (call after each AI request).
 * @param {string} uid - Firebase user UID
 * @param {number} tokens - Approximate tokens used
 */
export async function trackAiUsage(uid, tokens = 0) {
  if (!uid) return;
  
  const { db } = await import('../db/dexie');
  
  const existing = await db.users.where('uid').equals(uid).first();
  if (existing) {
    await db.users.update(existing.id, {
      totalMessages: (existing.totalMessages || 0) + 1,
      totalTokens: (existing.totalTokens || 0) + tokens,
      lastAiRequest: new Date().toISOString(),
    });
  }
}
