import { useState, useMemo, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { MapPin, Settings as SettingsIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import db from '../../db/dexie';
import { usePreferences } from '../../hooks/usePreferences';
import { usePrayerSync } from '../../hooks/usePrayerSync';
import { getTodayString } from '../../utils/timeHelpers';

export default function PrayersView() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { prefs } = usePreferences();
  const tableContainerRef = useRef(null);
  
  // Use day string for the hook to trigger syncs if needed
  const monthStartStr = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const { loading } = usePrayerSync(monthStartStr);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // Get all prayer events for the visible month
  const events = useLiveQuery(
    () => db.events
      .where('date')
      .between(format(monthStart, 'yyyy-MM-dd'), format(monthEnd, 'yyyy-MM-dd'), true, true)
      .and(e => e.type === 'prayer' || e.type === 'iftar')
      .toArray(),
    [currentMonth]
  );

  const days = useMemo(() => {
    const interval = eachDayOfInterval({ start: monthStart, end: monthEnd });
    return interval.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayEvents = (events || []).filter(e => e.date === dateStr);
      
      return {
        date,
        isToday: isSameDay(date, new Date()),
        fajr: dayEvents.find(e => e.title.includes('Fajr'))?.start,
        dhuhr: dayEvents.find(e => e.title.includes('Dhuhr'))?.start,
        asr: dayEvents.find(e => e.title.includes('Asr'))?.start,
        maghrib: dayEvents.find(e => e.title.includes('Maghrib'))?.start,
        isha: dayEvents.find(e => e.title.includes('Isha'))?.start,
      };
    });
  }, [events, monthStart, monthEnd]);

  useEffect(() => {
    // Scroll to today's row if it exists
    const timer = setTimeout(() => {
      if (tableContainerRef.current) {
        const todayRow = tableContainerRef.current.querySelector('.row-today');
        if (todayRow) {
          todayRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [currentMonth, days]);

  const formatTime = (isoStr) => {
    if (!isoStr) return '--:--';
    const date = new Date(isoStr);
    return format(date, prefs.timeFormat === '24h' ? 'HH:mm' : 'h:mm a');
  };

  const navigateMonth = (offset) => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + offset);
    setCurrentMonth(next);
  };

  return (
    <div className="prayers-root">
      <header className="prayers-header">
        <div className="prayers-header__titles">
          <h1 className="prayers-title">{format(currentMonth, 'MMMM yyyy')}</h1>
          <div className="prayers-location-pill">
            <MapPin className="w-3.5 h-3.5" />
            <span>{prefs.latitude.toFixed(2)}, {prefs.longitude.toFixed(2)}</span>
          </div>
        </div>

        <div className="prayers-nav">
          <button className="prayers-nav-btn" onClick={() => navigateMonth(-1)}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button className="prayers-nav-btn" onClick={() => navigateMonth(1)}>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </header>

      {loading && <div className="prayers-loading-bar" />}

      <div className="prayers-table-container" ref={tableContainerRef}>
        <table className="prayers-table">
          <thead>
            <tr>
              <th className="sticky-col">Date</th>
              <th>Fajr</th>
              <th>Dhuhr</th>
              <th>Asr</th>
              <th>Maghrib</th>
              <th>Isha</th>
            </tr>
          </thead>
          <tbody>
            {days.map(day => (
              <tr key={day.date.toISOString()} className={day.isToday ? 'row-today' : ''}>
                <td className="sticky-col">
                  <div className="day-cell">
                    <span className="day-num">{format(day.date, 'd')}</span>
                    <span className="day-name">{format(day.date, 'EEE')}</span>
                  </div>
                </td>
                <td>{formatTime(day.fajr)}</td>
                <td>{formatTime(day.dhuhr)}</td>
                <td>{formatTime(day.asr)}</td>
                <td className="highlight-maghrib">{formatTime(day.maghrib)}</td>
                <td>{formatTime(day.isha)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
