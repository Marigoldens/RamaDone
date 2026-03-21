/**
 * @fileoverview Calendar Day View — 24-hour vertical timeline.
 * Shows calendar events AND tasks due on this date.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { timeToGridRow, gridRowToTime, formatTime } from '../../utils/timeHelpers';
import { EVENT_TYPES } from '../../utils/constants';
import { useEvents } from '../../hooks/useEvents';
import { Trash2, CheckSquare } from 'lucide-react';
import db from '../../db/dexie';

export default function DayView({ date, timeFormat, onSlotTap }) {
  const { events } = useEvents(date);

  // Query tasks due on this date
  const tasks = useLiveQuery(
    () => db.tasks.where('dueDate').equals(date).toArray(),
    [date]
  ) ?? [];

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const handleGridClick = (e) => {
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const rowH = rect.height / 48;
    const row = Math.max(1, Math.floor(y / rowH) + 1);
    onSlotTap(gridRowToTime(row, '24h'));
  };

  return (
    <div className="cal-day-root">
      {/* Task strip at top if there are tasks */}
      {tasks.length > 0 && (
        <div className="cal-day-tasks-strip">
          <div className="cal-day-tasks-strip__header">
            <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
            <span>Tasks due today</span>
          </div>
          <div className="cal-day-tasks-strip__list">
            {tasks.map(t => (
              <div key={t.id} className={`cal-task-pill ${t.status === 'done' ? 'cal-task-pill--done' : ''}`}>
                <span className="cal-task-pill__dot" />
                <span className="cal-task-pill__title">{t.title}</span>
                {t.priority && (
                  <span className={`cal-task-pill__priority cal-task-pill__priority--${t.priority}`}>
                    {t.priority}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="cal-day-grid" onClick={handleGridClick}>
        {/* Time labels */}
        {hours.map((h) => (
          <div
            key={h}
            className="cal-time-label"
            style={{ gridRow: `${h * 2 + 1} / ${h * 2 + 3}` }}
          >
            {h === 0
              ? null
              : timeFormat === '12h'
              ? h < 12
                ? `${h} AM`
                : h === 12
                ? '12 PM'
                : `${h - 12} PM`
              : `${String(h).padStart(2, '0')}:00`}
          </div>
        ))}

        {/* Hour separator lines */}
        {hours.map((h) => (
          <div
            key={`sep-${h}`}
            className="cal-hour-line"
            style={{ gridRow: `${h * 2 + 1}` }}
          />
        ))}

        {/* Half-hour lines */}
        {hours.map((h) => (
          <div
            key={`half-${h}`}
            className="cal-halfhour-line"
            style={{ gridRow: `${h * 2 + 2}` }}
          />
        ))}

        {/* Events */}
        {events.map((ev) => (
          <EventPill key={ev.id} event={ev} timeFormat={timeFormat} />
        ))}

        {/* Current time indicator */}
        <CurrentTimeLine date={date} />
      </div>
    </div>
  );
}

function EventPill({ event, timeFormat }) {
  const { deleteEvent } = useEvents(event.date);
  const typeConfig = EVENT_TYPES[event.type] || EVENT_TYPES.custom;
  const startRow = timeToGridRow(event.start);
  const endRow   = Math.max(timeToGridRow(event.end), startRow + 1);

  return (
    <div
      className={`cal-event-pill ${typeConfig.pillClass || 'cal-event-pill--custom'}`}
      style={{ gridRow: `${startRow} / ${endRow}` }}
    >
      <div className="cal-event-pill-inner">
        <span className="cal-event-title">{event.title}</span>
        <span className="cal-event-time">
          {formatTime(event.start, timeFormat)} – {formatTime(event.end, timeFormat)}
        </span>
      </div>
      <button
        className="cal-event-delete"
        onClick={(e) => {
          e.stopPropagation();
          if (window.confirm(`Delete "${event.title}"?`)) deleteEvent(event.id);
        }}
        title="Delete"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

function CurrentTimeLine({ date }) {
  const today = new Date().toISOString().split('T')[0];
  if (date !== today) return null;

  const now = new Date();
  const pct = ((now.getHours() * 60 + now.getMinutes()) / (24 * 60)) * 100;

  return (
    <div
      className="cal-now-line"
      style={{ top: `${pct}%` }}
    >
      <span className="cal-now-dot" />
      <span className="cal-now-bar" />
    </div>
  );
}
