import { useState } from 'react';
import BottomNav from './BottomNav';
import CalendarView from '../Calendar/CalendarView';
import ChatView from '../Chat/ChatView';
import SettingsView from '../Settings/SettingsView';
import PrayersView from '../Prayers/PrayersView';
import DashboardView from '../Dashboard/DashboardView';
import TasksView from '../Tasks/TasksView';
import ExpensesView from '../Expenses/ExpensesView';
import HabitsView from '../Habits/HabitsView';

/**
 * Authenticated app shell with persistent navigation.
 * Mobile: bottom nav bar. Desktop: left sidebar nav.
 *
 * Routes 8 tabs: dashboard, calendar, tasks, expenses, habits, prayers, chat, settings.
 */
export default function AppShell({ user, accessToken, onSignIn, onSignOut }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [prefilledTaskDate, setPrefilledTaskDate] = useState(null);

  return (
    <div className="app-shell">
      {/* Navigation — bottom bar on mobile, left sidebar on desktop */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Active tab content */}
      <main className="app-main">
        {activeTab === 'dashboard' && (
          <DashboardView onNavigate={setActiveTab} />
        )}
        {activeTab === 'calendar' && (
          <CalendarView
            accessToken={accessToken}
            onSignIn={onSignIn}
            onNavigate={setActiveTab}
            onAddTaskForDate={(date) => {
              setPrefilledTaskDate(date);
              setActiveTab('tasks');
            }}
          />
        )}
        {activeTab === 'tasks' && (
          <TasksView
            prefilledDate={prefilledTaskDate}
            onPrefilledDateUsed={() => setPrefilledTaskDate(null)}
          />
        )}
        {activeTab === 'expenses' && (
          <ExpensesView />
        )}
        {activeTab === 'habits' && (
          <HabitsView />
        )}
        {activeTab === 'prayers' && (
          <PrayersView />
        )}
        {activeTab === 'chat' && (
          <ChatView user={user} accessToken={accessToken} />
        )}
        {activeTab === 'settings' && (
          <SettingsView user={user} onSignOut={onSignOut} />
        )}
      </main>
    </div>
  );
}
