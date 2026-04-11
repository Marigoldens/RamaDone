import {
  LayoutDashboard, Calendar, CheckSquare, Wallet,
  Target, Clock, MessageCircle, Settings, Dumbbell, Shield
} from 'lucide-react';
import { usePreferences } from '../../hooks/usePreferences';
import { isAdmin } from '../../config/admin';

const ALL_TABS_BASE = [
  { id: 'dashboard', label: 'Home',     icon: LayoutDashboard, isFab: true },
  { id: 'tasks',     label: 'Tasks',    icon: CheckSquare, prefKey: 'showTasks' },
  { id: 'expenses',  label: 'Expenses', icon: Wallet,      prefKey: 'showExpenses' },
  { id: 'chat',      label: 'Chat',     icon: MessageCircle },
  { id: 'calendar',  label: 'Calendar', icon: Calendar,    prefKey: 'showCalendar' },
  { id: 'habits',    label: 'Habits',   icon: Target,      prefKey: 'showHabits' },
  { id: 'gym',       label: 'Gym',      icon: Dumbbell,    prefKey: 'showGym' },
  { id: 'prayers',   label: 'Prayers',  icon: Clock, prayerOnly: true },
  { id: 'admin',     label: 'Admin',    icon: Shield,    adminOnly: true },
];

/**
 * Slim bottom nav — always visible, compact design.
 * Icons only on mobile, labels on desktop sidebar.
 * No auto-hide — the bar is thin enough to never be in the way.
 */
export default function BottomNav({ activeTab, onTabChange, user }) {
  const { prefs, getPref } = usePreferences();
  const handedness = getPref('handedness');

  const TABS = ALL_TABS_BASE.filter(t => {
    if (t.prayerOnly && !prefs.prayerMode) return false;
    if (t.prefKey && prefs[t.prefKey] === false) return false;
    if (t.adminOnly && !isAdmin(user)) return false;
    return true;
  });

  return (
    <nav className={`app-nav app-nav--${handedness}`}>
      {TABS.map(({ id, label, icon: Icon, isFab }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`nav-tab ${active ? 'nav-tab--active' : 'nav-tab--inactive'} ${isFab ? 'nav-tab--fab' : ''}`}
            title={label}
          >
            <div className={`nav-tab__icon-wrap ${active ? 'nav-tab__icon-wrap--active' : ''}`}>
              <Icon
                className="nav-tab__icon"
                style={{ strokeWidth: active ? 2.5 : 1.75 }}
              />
            </div>
            <span className={`nav-tab__label ${active ? 'nav-tab__label--active' : 'nav-tab__label--inactive'}`}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
