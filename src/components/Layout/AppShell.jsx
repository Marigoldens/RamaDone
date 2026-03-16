import { useState } from 'react';
import BottomNav from './BottomNav';
import CalendarView from '../Calendar/CalendarView';
import ChatView from '../Chat/ChatView';
import SettingsView from '../Settings/SettingsView';

/**
 * Authenticated app shell with persistent navigation.
 * Mobile: bottom nav bar. Desktop: left sidebar nav.
 *
 * @param {{
 *   user: import('firebase/auth').User,
 *   accessToken: string | null,
 *   onSignOut: () => Promise<void>,
 * }} props
 */
export default function AppShell({ user, accessToken, onSignIn, onSignOut }) {
  const [activeTab, setActiveTab] = useState('calendar');

  return (
    <div className="app-shell">
      {/* Navigation — bottom bar on mobile, left sidebar on desktop */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Active tab content */}
      <main className="app-main">
        {activeTab === 'settings' && (
          <SettingsView user={user} onSignOut={onSignOut} />
        )}
        {activeTab === 'chat' && (
          <ChatView user={user} accessToken={accessToken} />
        )}
        {activeTab === 'calendar' && (
          <CalendarView accessToken={accessToken} onSignIn={onSignIn} />
        )}
      </main>
    </div>
  );
}
