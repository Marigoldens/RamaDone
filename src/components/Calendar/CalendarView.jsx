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
import { fetchPrayerTimes, parsePrayerTime } from '../../services/prayerService';
import { toAlAdhanDate, buildISODateTime } from '../../utils/timeHelpers';
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
  const [prayerLoading, setPrayerLoading] = useState(false);
  const [justSynced, setJustSynced]     = useState(false);

  const { addEvent } = useEvents(selectedDate);
  const { prefs, setPref } = usePreferences();
  const { syncAllEvents, syncing, error: syncError } = useCalendarSync(accessToken);

  /* ── Prayer time loader ─────────────────────────── */
  const loadPrayerTimes = useCallback(async () => {
    setPrayerLoading(true);
    try {
      const [y, m, d] = selectedDate.split('-');
      const baseDate = new Date(y, m - 1, d, 12, 0, 0); // stable midday local
      const fetchPromises = [];

      for (let i = 0; i < 7; i++) {
        const target = addDays(baseDate, i);
        const ds = format(target, 'yyyy-MM-dd');

        fetchPromises.push(
          (async () => {
            const existing = await db.events
              .where('date').equals(ds)
              .and((e) => e.type === 'prayer' || e.type === 'iftar')
              .count();

            if (existing === 0) {
              const timings = await fetchPrayerTimes(
                prefs.latitude, prefs.longitude, toAlAdhanDate(ds)
              );
              const prayers = [
                { name: 'Fajr',            type: 'prayer', dur: 30, t: timings.Fajr    },
                { name: 'Dhuhr',           type: 'prayer', dur: 20, t: timings.Dhuhr   },
                { name: 'Asr',             type: 'prayer', dur: 20, t: timings.Asr     },
                { name: 'Maghrib (Iftar)', type: 'iftar',  dur: 60, t: timings.Maghrib },
                { name: 'Isha',            type: 'prayer', dur: 30, t: timings.Isha    },
              ];
              
              const dayBatch = [];
              for (const p of prayers) {
                const { hours, minutes } = parsePrayerTime(p.t);
                const start = buildISODateTime(ds, hours, minutes);
                const end   = new Date(start);
                end.setMinutes(end.getMinutes() + p.dur);
                dayBatch.push({
                  title: p.name, start, end: end.toISOString(),
                  type: p.type, date: ds,
                  googleId: null, synced: 0, updatedAt: Date.now(), deleted: 0,
                });
              }
              return dayBatch;
            }
            return [];
          })()
        );
      }
      
      const results = await Promise.all(fetchPromises);
      const batch = results.flat();
      
      if (batch.length > 0) await db.events.bulkAdd(batch);
    } catch (err) {
      console.error('[CalendarView] Prayer time load failed:', err);
    } finally {
      setPrayerLoading(false);
    }
  }, [selectedDate, prefs.latitude, prefs.longitude]);

  useEffect(() => { loadPrayerTimes(); }, [loadPrayerTimes]);

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
