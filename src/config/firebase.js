/**
 * @fileoverview Firebase configuration and initialization.
 *
 * WHY: Firebase provides Google Authentication with OAuth scopes,
 * which we need to get a Google access token for the Calendar API.
 * We request the full 'calendar' scope because we need to CREATE
 * new calendars (not just events), which requires full access.
 *
 * SETUP: Replace the placeholder config below with your Firebase
 * project's web app configuration. You can find this in the
 * Firebase Console → Project Settings → General → Your Apps → Web App.
 */
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getAnalytics } from 'firebase/analytics';

/** Firebase project configuration — using the keys provided */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'YOUR_API_KEY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'YOUR_PROJECT.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'YOUR_PROJECT_ID',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'YOUR_PROJECT.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:000000000000:web:0000000000000000',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-0000000000',
};

/** Initialize the Firebase app singleton */
const app = initializeApp(firebaseConfig);

/** Initialize Analytics */
let analytics = null;
if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  analytics = getAnalytics(app);
}

/** Firebase Auth instance — used across the app for auth state */
export const auth = getAuth(app);

/** Firestore instance — for server-side user tracking */
export const firestore = getFirestore(app);

/** Cloud Functions instance — for secure server operations */
export const functions = getFunctions(app);

/**
 * Google Auth Provider configured with the Calendar API scope.
 *
 * SCOPE EXPLANATION:
 * - 'https://www.googleapis.com/auth/calendar' gives FULL read/write
 *   access to the user's Google Calendar. This is necessary because
 *   we create a NEW calendar named "Ramadan Schedule", which the
 *   more restrictive 'calendar.events' scope doesn't allow.
 *
 * - 'profile' and 'email' are added by default by Firebase.
 */
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/calendar');
// Force account selection and consent every time (ensures the scopes are requested!)
googleProvider.setCustomParameters({ 
  prompt: 'consent select_account' 
});

export default app;
