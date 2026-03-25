import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, Calendar, CheckSquare, Wallet,
  Target, Clock, MessageCircle, Settings, Dumbbell
} from 'lucide-react';
import { usePreferences } from '../../hooks/usePreferences';

const ALL_TABS_BASE = [
  { id: 'tasks',     label: 'Tasks',    icon: CheckSquare, prefKey: 'showTasks' },
  { id: 'expenses',  label: 'Expenses', icon: Wallet,      prefKey: 'showExpenses' },
  { id: 'chat',      label: 'Chat',     icon: MessageCircle },
  { id: 'dashboard', label: 'Home',     icon: LayoutDashboard, isFab: true },
  { id: 'calendar',  label: 'Calendar', icon: Calendar,    prefKey: 'showCalendar' },
  { id: 'habits',    label: 'Habits',   icon: Target,      prefKey: 'showHabits' },
  { id: 'gym',       label: 'Gym',      icon: Dumbbell,    prefKey: 'showGym' },
  { id: 'prayers',   label: 'Prayers',  icon: Clock, prayerOnly: true },
];

/**
 * Slim bottom nav — shows all icons, no More button.
 * Hides on scroll-down, reappears on scroll-up.
 */
export default function BottomNav({ activeTab, onTabChange }) {
  const { prefs } = usePreferences();
  const [visible, setVisible] = useState(true);
  const lastDeltaRef = useRef(0);

  const TABS = ALL_TABS_BASE.filter(t => {
    if (t.prayerOnly && !prefs.prayerMode) return false;
    if (t.prefKey && prefs[t.prefKey] === false) return false;
    return true;
  });

  // ── Scroll-hide: listen to wheel (desktop) + touch (mobile) ──
  useEffect(() => {
    // Wheel (desktop + trackpad)
    function onWheel(e) {
      if (e.deltaY > 4)       setVisible(false); // scrolling down → hide
      else if (e.deltaY < -4) setVisible(true);  // scrolling up   → show
    }

    // Touch (mobile swipe)
    let touchStartY = 0;
    function onTouchStart(e) { touchStartY = e.touches[0].clientY; }
    function onTouchMove(e) {
      const diff = touchStartY - e.touches[0].clientY;
      if (diff > 8)       setVisible(false);
      else if (diff < -8) setVisible(true);
    }

    window.addEventListener('wheel',      onWheel,      { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove',  onTouchMove,  { passive: true });

    return () => {
      window.removeEventListener('wheel',      onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove',  onTouchMove);
    };
  }, []);

  return (
    <nav className={`app-nav ${visible ? 'app-nav--visible' : 'app-nav--hidden'}`}>
      {TABS.map(({ id, label, icon: Icon, isFab }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => { onTabChange(id); setVisible(true); }}
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
