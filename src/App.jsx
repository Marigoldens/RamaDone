/**
 * @fileoverview Root App component — auth gate + routing.
 *
 * ARCHITECTURE:
 * - If user is NOT authenticated → show LandingPage
 * - If user IS authenticated → show AppShell with preloaded data
 * - GlobalAppContext preloads ALL data on startup for instant page renders
 * - On first authenticated load, find/create the "Ramadan Schedule"
 *   Google Calendar so it's ready for event syncing.
 */
import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { usePreferences } from './hooks/usePreferences';
import { useGlobalApp, GlobalAppProvider } from './context/GlobalAppContext';
import { findOrCreateRamadanCalendar } from './services/calendarService';
import { applyTheme } from './config/theme';
import LandingPage from './components/Landing/LandingPage';
import AppShell from './components/Layout/AppShell';

export default function App() {
  return (
    <GlobalAppProvider>
      <AppContent />
    </GlobalAppProvider>
  );
}

/**
 * Inner component that uses the global app context.
 * Waits for both auth and data preload before rendering.
 */
function AppContent() {
  const { user, loading, accessToken, signIn, signOut } = useAuth();
  const { prefs, setPref } = usePreferences();
  const { isPreloaded } = useGlobalApp();
  const [calendarReady, setCalendarReady] = useState(false);

  /**
   * Apply the saved theme on app load.
   * This runs once and ensures the CSS class matches the stored pref.
   */
  useEffect(() => {
    if (prefs.theme) {
      applyTheme(prefs.theme);
    }
  }, [prefs.theme]);

  /**
   * Find or create the "Ramadan Schedule" calendar after sign-in.
   *
   * WHY HERE?
   * This runs as a side-effect when both user and accessToken are available.
   * It ensures the calendar exists before any sync operations happen.
   * The calendar ID is stored in Dexie preferences for later use.
   */
  useEffect(() => {
    async function setupCalendar() {
      if (!user || !accessToken) return;

      try {
        const calendarId = await findOrCreateRamadanCalendar(accessToken);
        await setPref('calendarId', calendarId);
        setCalendarReady(true);
        console.log('[App] Ramadan Schedule calendar ready:', calendarId);
      } catch (err) {
        console.error('[App] Failed to set up calendar:', err);
        // Continue anyway — the app works offline with Dexie
        setCalendarReady(true);
      }
    }

    setupCalendar();
  }, [user, accessToken]);

  // Loading state — wait for auth AND data preload
  if (loading || !isPreloaded) {
    return (
      <div className="min-h-dvh bg-surface flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 animate-pulse-glow"
            style={{ background: 'linear-gradient(135deg, var(--c-accent), var(--c-primary))' }}
          />
          <p className="text-text-muted text-sm">{loading ? 'Signing in...' : 'Preparing your data...'}</p>
        </div>
      </div>
    );
  }

  // Auth gate: show landing if not signed in
  if (!user) {
    return <LandingPage onSignIn={signIn} />;
  }

  // Authenticated — show the app
  return (
    <AppShell
      user={user}
      accessToken={accessToken}
      onSignIn={signIn}
      onSignOut={signOut}
    />
  );
}
