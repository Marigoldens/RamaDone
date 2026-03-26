/**
 * @fileoverview React hook for Firebase authentication state.
 *
 * Provides reactive auth state (user, loading, accessToken) and
 * wraps sign-in/sign-out actions for easy component consumption.
 *
 * DESIGN:
 * - Uses Firebase's onAuthStateChanged for real-time auth monitoring
 * - Stores the Google OAuth access token in-memory (via authService)
 * - Exposes a clean API: { user, loading, accessToken, signIn, signOut }
 */
import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import {
  signInWithGoogle,
  signOutUser,
  getAccessToken,
  trackUser
} from '../services/authService';

/**
 * Hook that provides authentication state and actions.
 *
 * @returns {{
 *   user: import('firebase/auth').User | null,
 *   loading: boolean,
 *   accessToken: string | null,
 *   signIn: () => Promise<void>,
 *   signOut: () => Promise<void>,
 * }}
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(null);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      // If we already have a cached token (from the current session), use it
      if (firebaseUser) {
        const cached = getAccessToken();
        if (cached) setAccessToken(cached);
      } else {
        setAccessToken(null);
      }
    });

    return unsubscribe;
  }, []);

  /**
   * Sign in with Google (Popup)
   */
  const signIn = useCallback(async () => {
    try {
      setLoading(true);
      const { user, accessToken } = await signInWithGoogle();
      setUser(user);
      setAccessToken(accessToken);
      // Track user for admin dashboard
      await trackUser(user);
    } catch (error) {
      console.error('[useAuth] Sign-in failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Sign out and clear all auth state.
   */
  const signOut = useCallback(async () => {
    try {
      await signOutUser();
      setUser(null);
      setAccessToken(null);
    } catch (error) {
      console.error('[useAuth] Sign-out failed:', error);
    }
  }, []);

  return { user, loading, accessToken, signIn, signOut };
}
