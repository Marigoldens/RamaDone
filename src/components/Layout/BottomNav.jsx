import { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard, Calendar, CheckSquare, Wallet, Menu,
  Target, Clock, MessageCircle, Settings, Moon, X, Bell,
} from 'lucide-react';
import { usePreferences } from '../../hooks/usePreferences';

/** @typedef {'dashboard' | 'calendar' | 'tasks' | 'expenses' | 'habits' | 'prayers' | 'chat' | 'settings'} TabId */

const PRIMARY_TABS = [
  { id: 'dashboard', label: 'Home',     icon: LayoutDashboard },
  { id: 'calendar',  label: 'Calendar', icon: Calendar },
  { id: 'tasks',     label: 'Tasks',    icon: CheckSquare },
  { id: 'expenses',  label: 'Expenses', icon: Wallet },
];

const MORE_ITEMS_BASE = [
  { id: 'habits',   label: 'Habits',   icon: Target },
  { id: 'prayers',  label: 'Prayers',  icon: Clock, prayerOnly: true },
  { id: 'chat',     label: 'AI Chat',  icon: MessageCircle },
  { id: 'settings', label: 'Settings', icon: Settings },
];

/**
 * Navigation bar — 5 tabs on mobile (4 primary + More), full sidebar on desktop.
 *
 * The "More" button opens a slide-up sheet on mobile with Habits, Prayers, Chat, Settings.
 * On desktop, everything shows in the left sidebar — no "More" button needed.
 */
export default function BottomNav({ activeTab, onTabChange }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const sheetRef = useRef(null);
  const { prefs } = usePreferences();

  // Filter prayer-only items based on the prayerMode preference
  const MORE_ITEMS = MORE_ITEMS_BASE.filter(item => !item.prayerOnly || prefs.prayerMode);
  const ALL_SIDEBAR_TABS = [...PRIMARY_TABS, ...MORE_ITEMS];

  // Close "More" sheet when clicking outside
  useEffect(() => {
    if (!moreOpen) return;
    function handleClick(e) {
      if (sheetRef.current && !sheetRef.current.contains(e.target)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [moreOpen]);

  // If user picks a "More" item, close the sheet
  function handleMoreItem(id) {
    setMoreOpen(false);
    onTabChange(id);
  }

  const isMoreActive = MORE_ITEMS.some(m => m.id === activeTab);

  return (
    <>
      {/* ——— Mobile: bottom bar (5 items) ——— */}
      <nav className="app-nav md:hidden">
        {PRIMARY_TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`nav-tab ${isActive ? 'nav-tab--active' : 'nav-tab--inactive'}`}
              title={label}
            >
              <div className={`nav-tab__icon-wrap ${isActive ? 'nav-tab__icon-wrap--active' : ''}`}>
                <Icon className={`w-5 h-5 transition-all duration-300 ${isActive ? 'stroke-[2.5px] scale-110' : 'stroke-[1.5px]'}`} />
              </div>
              <span className={`nav-tab__label ${isActive ? 'nav-tab__label--active' : 'nav-tab__label--inactive'}`}>
                {label}
              </span>
            </button>
          );
        })}

        {/* "More" button */}
        <button
          onClick={() => setMoreOpen(v => !v)}
          className={`nav-tab ${isMoreActive ? 'nav-tab--active' : 'nav-tab--inactive'}`}
          title="More"
        >
          <div className={`nav-tab__icon-wrap ${isMoreActive ? 'nav-tab__icon-wrap--active' : ''}`}>
            <Menu className={`w-5 h-5 transition-all duration-300 ${isMoreActive ? 'stroke-[2.5px] scale-110' : 'stroke-[1.5px]'}`} />
          </div>
          <span className={`nav-tab__label ${isMoreActive ? 'nav-tab__label--active' : 'nav-tab__label--inactive'}`}>
            More
          </span>
        </button>
      </nav>

      {/* ——— Mobile: "More" slide-up sheet ——— */}
      {moreOpen && (
        <div className="more-sheet-overlay md:hidden">
          <div ref={sheetRef} className="more-sheet">
            <div className="more-sheet__header">
              <span className="text-sm font-bold text-text uppercase tracking-wider">More</span>
              <button onClick={() => setMoreOpen(false)} className="p-1 rounded-lg hover:bg-surface-elevated transition-colors">
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>
            <div className="more-sheet__grid">
              {MORE_ITEMS.map(({ id, label, icon: Icon }) => {
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => handleMoreItem(id)}
                    className={`more-sheet__item ${isActive ? 'more-sheet__item--active' : ''}`}
                  >
                    <div className={`more-sheet__icon ${isActive ? 'more-sheet__icon--active' : ''}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-semibold mt-1.5">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ——— Desktop: full sidebar ——— */}
      <nav className="app-nav hidden md:flex">
        <div className="nav-brand">
          <Moon className="w-5 h-5 text-white" fill="currentColor" />
        </div>

        {ALL_SIDEBAR_TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`nav-tab ${isActive ? 'nav-tab--active' : 'nav-tab--inactive'}`}
              title={label}
            >
              <div className={`nav-tab__icon-wrap ${isActive ? 'nav-tab__icon-wrap--active' : ''}`}>
                <Icon className={`w-[22px] h-[22px] transition-all duration-300 ${isActive ? 'stroke-[2.5px] scale-110' : 'stroke-[1.5px]'}`} />
              </div>
              <span className={`nav-tab__label ${isActive ? 'nav-tab__label--active' : 'nav-tab__label--inactive'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
