import { Settings, MessageCircle, Calendar } from 'lucide-react';
import { Moon } from 'lucide-react';

/** @typedef {'settings' | 'chat' | 'calendar'} TabId */

const TABS = [
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'chat',     label: 'Chat',     icon: MessageCircle },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
];

/**
 * Navigation bar — horizontal on mobile, vertical left sidebar on desktop.
 *
 * @param {{
 *   activeTab: TabId,
 *   onTabChange: (tab: TabId) => void,
 * }} props
 */
export default function BottomNav({ activeTab, onTabChange }) {
  return (
    <nav className="app-nav">
      {/* Brand mark — visible only in desktop sidebar */}
      <div className="nav-brand">
        <Moon className="w-5 h-5 text-white" fill="currentColor" />
      </div>

      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`nav-tab ${isActive ? 'nav-tab--active' : 'nav-tab--inactive'}`}
            title={label}
          >
            <div className={`nav-tab__icon-wrap ${isActive ? 'nav-tab__icon-wrap--active' : ''}`}>
              <Icon
                className={`w-5 h-5 md:w-[22px] md:h-[22px] transition-all duration-300
                            ${isActive ? 'stroke-[2.5px] scale-110' : 'stroke-[1.5px]'}`}
              />
            </div>
            <span className={`nav-tab__label ${isActive ? 'nav-tab__label--active' : 'nav-tab__label--inactive'}`}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
