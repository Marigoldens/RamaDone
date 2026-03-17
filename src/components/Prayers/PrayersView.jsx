import { useState, useMemo, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import db from '../../db/dexie';
import { usePreferences } from '../../hooks/usePreferences';
import { usePrayerSync } from '../../hooks/usePrayerSync';

export default function PrayersView() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { prefs } = usePreferences();
  const tableContainerRef = useRef(null);

  // Trigger prayer sync for the selected month
  const monthStartStr = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const { loading } = usePrayerSync(monthStartStr);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // Query the dedicated prayerTimes table (NOT the events table)
  const prayerRows = useLiveQuery(
    () => db.prayerTimes
      .where('date')
      .between(format(monthStart, 'yyyy-MM-dd'), format(monthEnd, 'yyyy-MM-dd'), true, true)
      .toArray(),
    [currentMonth]
  );

  // Build a Map for fast lookup: date → prayer times object
  const prayerMap = useMemo(() => {
    const map = new Map();
    (prayerRows || []).forEach(r => map.set(r.date, r));
    return map;
  }, [prayerRows]);

  const days = useMemo(() => {
    const interval = eachDayOfInterval({ start: monthStart, end: monthEnd });
    return interval.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const prayers = prayerMap.get(dateStr);

      return {
        date,
        isToday: isSameDay(date, new Date()),
        fajr:    prayers?.fajr    || null,
        dhuhr:   prayers?.dhuhr   || null,
        asr:     prayers?.asr     || null,
        maghrib: prayers?.maghrib || null,
        isha:    prayers?.isha    || null,
      };
    });
  }, [prayerMap, monthStart, monthEnd]);

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

  /**
   * Format a prayer time string (e.g. "04:32") for display.
   * Respects the user's 12h/24h preference.
   */
  const formatTime = (timeStr) => {
    if (!timeStr) return '--:--';

    if (prefs.timeFormat === '24h') return timeStr;

    // Convert "HH:MM" to 12h format
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
  };

  const navigateMonth = (offset) => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + offset);
    setCurrentMonth(next);
  };

  // Safe lat/lon display (avoid crash if undefined)
  const latDisplay = prefs.latitude != null ? Number(prefs.latitude).toFixed(2) : '—';
  const lonDisplay = prefs.longitude != null ? Number(prefs.longitude).toFixed(2) : '—';

  return (
    <div className="prayers-root">
      <header className="prayers-header">
        <div className="prayers-header__titles">
          <h1 className="prayers-title">{format(currentMonth, 'MMMM yyyy')}</h1>
          <div className="prayers-location-pill">
            <MapPin className="w-3.5 h-3.5" />
            <span>{latDisplay}, {lonDisplay}</span>
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
