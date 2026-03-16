/**
 * @fileoverview Authentication service wrapping Firebase Google Sign-In.
 *
 * KEY DESIGN DECISION:
 * After Google sign-in, we extract the OAuth access token from the
 * OAuthCredential. This token is what we use to call the Google
 * Calendar API directly (no Firebase Cloud Function needed for CRUD).
 *
 * The access token is stored in-memory (not persisted) because:
 * 1. It expires in ~1 hour anyway.
 * 2. Firebase re-authenticates silently on page reload, so we can
 *    re-extract the token if needed (or prompt re-sign-in).
 *
 * LIMITATION: The token from signInWithPopup is only available at the
 * moment of sign-in. After a page refresh, Firebase restores the
 * user session but NOT the OAuth token. For a production app, you'd
 * use a server-side flow. For this MVP, we re-prompt on token expiry.
 */
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';

/** In-memory store for the Google OAuth access token */
let cachedAccessToken = null;

/**
 * Sign in with Google using popup.
 */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || null;
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
