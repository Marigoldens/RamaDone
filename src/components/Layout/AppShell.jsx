import { useState, useEffect, useRef } from 'react';
import BottomNav from './BottomNav';
import CalendarView from '../Calendar/CalendarView';
import ChatView from '../Chat/ChatView';
import SettingsView from '../Settings/SettingsView';
import PrayersView from '../Prayers/PrayersView';
import DashboardView from '../Dashboard/DashboardView';
import TasksView from '../Tasks/TasksView';
import ExpensesView from '../Expenses/ExpensesView';
import HabitsView from '../Habits/HabitsView';
import GymView from '../Gym/GymView';
import AdminDashboard from '../Admin/AdminDashboard';

/**
 * Authenticated app shell with persistent navigation.
 * Mobile: bottom nav bar. Desktop: left sidebar nav.
 *
 * Routes 8 tabs: dashboard, calendar, tasks, expenses, habits, prayers, chat, settings.
 */
export default function AppShell({ user, accessToken, onSignIn, onSignOut }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [prefilledTaskDate, setPrefilledTaskDate] = useState(null);
  const prevTabRef = useRef(null);
  const isFirstRender = useRef(true);

  // Track tab changes for animations
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
    }
    prevTabRef.current = activeTab;
  }, [activeTab]);

  // Get animation class based on whether this is first render or tab change
  const getPageClass = () => {
    if (isFirstRender.current) return 'page-view page-instant';
    return 'page-view page-enter';
  };

  return (
    <div className="app-shell">
      {/* Navigation — bottom bar on mobile, left sidebar on desktop */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} user={user} />

      {/* Active tab content with transitions */}
      <main className="app-main">
        {activeTab === 'dashboard' && (
          <div key="dashboard" className={getPageClass()}>
            <DashboardView onNavigate={setActiveTab} />
          </div>
        )}
        {activeTab === 'calendar' && (
          <div key="calendar" className={getPageClass()}>
            <CalendarView
              accessToken={accessToken}
              onSignIn={onSignIn}
              onNavigate={setActiveTab}
              onAddTaskForDate={(date) => {
                setPrefilledTaskDate(date);
                setActiveTab('tasks');
              }}
            />
          </div>
        )}
        {activeTab === 'tasks' && (
          <div key="tasks" className={getPageClass()}>
            <TasksView
              prefilledDate={prefilledTaskDate}
              onPrefilledDateUsed={() => setPrefilledTaskDate(null)}
            />
          </div>
        )}
        {activeTab === 'expenses' && (
          <div key="expenses" className={getPageClass()}>
            <ExpensesView onNavigate={setActiveTab} />
          </div>
        )}
        {activeTab === 'habits' && (
          <div key="habits" className={getPageClass()}>
            <HabitsView />
          </div>
        )}
        {activeTab === 'gym' && (
          <div key="gym" className={getPageClass()}>
            <GymView onNavigate={setActiveTab} />
          </div>
        )}
        {activeTab === 'prayers' && (
          <div key="prayers" className={getPageClass()}>
            <PrayersView />
          </div>
        )}
        {activeTab === 'chat' && (
          <div key="chat" className={getPageClass()}>
            <ChatView user={user} accessToken={accessToken} />
          </div>
        )}
        {activeTab === 'settings' && (
          <div key="settings" className={getPageClass()}>
            <SettingsView user={user} onSignOut={onSignOut} />
          </div>
        )}
        {activeTab === 'admin' && (
          <div key="admin" className={getPageClass()}>
            <AdminDashboard user={user} />
          </div>
        )}
      </main>
    </div>
  );
}
