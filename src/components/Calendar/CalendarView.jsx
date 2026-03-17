/**
 * @fileoverview CalendarView — main container with Day/Week/Month/Year view switcher.
 * Coordinates header, navigation, view tabs, and the Add Event modal.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, Cloud,
  RefreshCcw, CheckCircle2,
} from 'lucide-react';
import {
  format, addDays, addWeeks, addMonths, addYears,
  startOfWeek, startOfMonth, startOfYear,
} from 'date-fns';
import { useEvents } from '../../hooks/useEvents';
import { usePreferences } from '../../hooks/usePreferences';
import { useCalendarSync } from '../../hooks/useCalendarSync';
import { getTodayString } from '../../utils/timeHelpers';
import { usePrayerSync } from '../../hooks/usePrayerSync';
import db from '../../db/dexie';
import DayView   from './DayView';
import WeekView  from './WeekView';
import MonthView from './MonthView';
import YearView  from './YearView';
import AddEventModal from './AddEventModal';

const VIEWS = ['Day', 'Week', 'Month', 'Year'];

export default function CalendarView({ accessToken, onSignIn }) {
  const [view, setView]               = useState('Day');
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [showAddModal, setShowAddModal] = useState(false);
  const [prefilledTime, setPrefilledTime] = useState(null);
  const [justSynced, setJustSynced]     = useState(false);

  const { addEvent } = useEvents(selectedDate);
  const { prefs, setPref } = usePreferences();
  const { syncAllEvents, syncing, error: syncError } = useCalendarSync(accessToken);

  /* ── Prayer time sync (background) ─────────── */
  const { syncing: prayerLoading } = usePrayerSync(selectedDate);

  /* ── Navigation (offsets by current view granularity) ── */
  const navigate = (dir) => {
    const d = new Date(selectedDate + 'T12:00:00');
    const map = {
      Day:   () => addDays(d, dir),
      Week:  () => addWeeks(d, dir),
      Month: () => addMonths(d, dir),
      Year:  () => addYears(d, dir),
    };
    setSelectedDate(format(map[view](), 'yyyy-MM-dd'));
  };

  /* ── Header date label ───────────────────────────── */
  const headerLabel = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    if (view === 'Day') {
      const today = getTodayString();
      return selectedDate === today
        ? `${format(d, 'EEE, MMM d')} · Today`
        : format(d, 'EEE, MMM d, yyyy');
    }
    if (view === 'Week') {
      const ws = startOfWeek(d, { weekStartsOn: 1 });
      const we = addDays(ws, 6);
      return `${format(ws, 'MMM d')} – ${format(we, 'MMM d, yyyy')}`;
    }
    if (view === 'Month') return format(d, 'MMMM yyyy');
    return format(d, 'yyyy');
  };

  const handleSlotTap = (time) => {
    setPrefilledTime(time);
    setShowAddModal(true);
  };

  /* Jump from Week/Month/Year to specific Day view */
  const handleDayClick = (ds) => {
    setSelectedDate(ds);
    setView('Day');
  };

  return (
    <div className="cal-root">
      {/* ─── Header ─────────────────────────── */}
      <header className="cal-header">
        <div className="cal-header-left">
          <button className="cal-nav-btn" onClick={() => navigate(-1)} aria-label="Previous">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button className="cal-nav-btn" onClick={() => navigate(1)} aria-label="Next">
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="cal-header-label">{headerLabel()}</span>
          {view === 'Day' && selectedDate === getTodayString() && (
            <span className="cal-today-badge">Today</span>
          )}
          <button
            className="cal-today-btn"
            onClick={() => setSelectedDate(getTodayString())}
          >
            Today
          </button>
        </div>

        {/* View tabs */}
        <div className="cal-view-tabs" role="tablist">
          {VIEWS.map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              className={`cal-view-tab ${view === v ? 'cal-view-tab--active' : ''}`}
              onClick={() => setView(v)}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Sync controls */}
        <div className="cal-header-right">
          {accessToken && (
            <label className="cal-sync-toggle">
              <input
                type="checkbox"
                checked={prefs.syncPrayerTimes || false}
                onChange={(e) => setPref('syncPrayerTimes', e.target.checked)}
                className="sr-only"
              />
              <span className={`cal-sync-track ${prefs.syncPrayerTimes ? 'cal-sync-track--on' : ''}`} />
              <span className="cal-sync-label">Sync Prayers</span>
            </label>
          )}
          <button
            className={`cal-sync-btn ${justSynced ? 'cal-sync-btn--done' : syncing ? 'cal-sync-btn--loading' : ''}`}
            onClick={async () => {
              if (!accessToken) { try { await onSignIn?.(); } catch {} return; }
              await syncAllEvents();
              setJustSynced(true);
              setTimeout(() => setJustSynced(false), 3000);
            }}
            disabled={syncing}
          >
            {syncing   ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
            : justSynced ? <CheckCircle2 className="w-3.5 h-3.5" />
            : <Cloud className="w-3.5 h-3.5" />}
            <span>
              {syncing ? 'Syncing…' : justSynced ? 'Synced' : !accessToken ? 'Sign in to Sync' : 'Sync'}
            </span>
          </button>
        </div>
      </header>

      {/* Prayer loading bar */}
      {prayerLoading && <div className="cal-loading-bar" />}
      {syncError && <p className="cal-sync-error">{syncError}</p>}

      {/* ─── View Content ──────────────────────── */}
      <div className="cal-content">
        {view === 'Day'   && (
          <DayView
            date={selectedDate}
            timeFormat={prefs.timeFormat || '12h'}
            onSlotTap={handleSlotTap}
          />
        )}
        {view === 'Week'  && (
          <WeekView
            date={selectedDate}
            timeFormat={prefs.timeFormat || '12h'}
            onDayClick={handleDayClick}
          />
        )}
        {view === 'Month' && (
          <MonthView date={selectedDate} onDayClick={handleDayClick} />
        )}
        {view === 'Year'  && (
          <YearView date={selectedDate} onDayClick={handleDayClick} />
        )}
      </div>

      {/* FAB */}
      <button
        className="cal-fab"
        onClick={() => { setPrefilledTime(null); setShowAddModal(true); }}
        aria-label="Add event"
      >
        <Plus className="w-7 h-7 text-white" />
      </button>

      {/* Add event modal */}
      {showAddModal && (
        <AddEventModal
          date={selectedDate}
          prefilledTime={prefilledTime}
          onClose={() => setShowAddModal(false)}
          onAdd={addEvent}
          accessToken={accessToken}
          timeFormat={prefs.timeFormat || '12h'}
        />
      )}
    </div>
  );
}
