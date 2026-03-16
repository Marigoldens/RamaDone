/**
 * @fileoverview Calendar Week View — 7-day horizontal timeline.
 * Shows Mon–Sun columns with hourly rows and event pills.
 */
import { startOfWeek, addDays, format, isSameDay, isToday } from 'date-fns';
import { useEventsRange } from '../../hooks/useEventsRange';
import { useEvents } from '../../hooks/useEvents';
import { timeToGridRow, formatTime } from '../../utils/timeHelpers';
import { EVENT_TYPES } from '../../utils/constants';
import { Trash2 } from 'lucide-react';

export default function WeekView({ date, timeFormat, onDayClick }) {
  const weekStart = startOfWeek(new Date(date + 'T12:00:00'), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const startStr = format(days[0], 'yyyy-MM-dd');
  const endStr   = format(days[6], 'yyyy-MM-dd');
  const events   = useEventsRange(startStr, endStr);
  const hours    = Array.from({ length: 24 }, (_, i) => i);

  const eventsByDay = {};
  days.forEach((d) => { eventsByDay[format(d, 'yyyy-MM-dd')] = []; });
  (events || []).forEach((ev) => {
    if (eventsByDay[ev.date]) eventsByDay[ev.date].push(ev);
  });

  return (
    <div className="cal-week-root">
      {/* Day header row */}
      <div className="cal-week-header">
        <div className="cal-week-gutter" />
        {days.map((d) => {
          const isT = isToday(d);
          return (
            <button
              key={d.toString()}
              className={`cal-week-day-label ${isT ? 'cal-week-day-label--today' : ''}`}
              onClick={() => onDayClick && onDayClick(format(d, 'yyyy-MM-dd'))}
            >
              <span className="cal-week-day-name">{format(d, 'EEE')}</span>
              <span className={`cal-week-day-num ${isT ? 'cal-week-day-num--today' : ''}`}>
                {format(d, 'd')}
              </span>
            </button>
          );
        })}
      </div>

      {/* Scrollable grid */}
      <div className="cal-week-scroll">
        <div className="cal-week-grid">
          {/* Time gutter */}
          <div className="cal-week-times">
            {hours.map((h) => (
              <div key={h} className="cal-week-time-cell">
                {h > 0
                  ? timeFormat === '12h'
                    ? h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`
                    : `${String(h).padStart(2, '0')}:00`
                  : ''}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d) => {
            const dateStr = format(d, 'yyyy-MM-dd');
            const dayEvents = eventsByDay[dateStr] || [];
            return (
              <div key={dateStr} className="cal-week-col">
                {/* Hour lines */}
                {hours.map((h) => (
                  <div
                    key={h}
                    className="cal-week-hour-line"
                    style={{ top: `${(h / 24) * 100}%` }}
                  />
                ))}
                {/* Events */}
                {dayEvents.map((ev) => (
                  <WeekEventPill key={ev.id} event={ev} timeFormat={timeFormat} />
                ))}
                {/* Today line */}
                {isToday(d) && <WeekNowLine />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WeekEventPill({ event, timeFormat }) {
  const { deleteEvent } = useEvents(event.date);
  const typeConfig = EVENT_TYPES[event.type] || EVENT_TYPES.custom;

  const startMins = (() => {
    const d = new Date(event.start);
    return d.getHours() * 60 + d.getMinutes();
  })();
  const endMins = (() => {
    const d = new Date(event.end);
    return d.getHours() * 60 + d.getMinutes();
  })();
  const top  = (startMins / (24 * 60)) * 100;
  const height = Math.max(((endMins - startMins) / (24 * 60)) * 100, 1.5);

  return (
    <div
      className={`cal-week-event ${typeConfig.pillClass || 'cal-event-pill--custom'}`}
      style={{ top: `${top}%`, height: `${height}%` }}
    >
      <span className="cal-week-event-title">{event.title}</span>
      <button
        className="cal-event-delete"
        onClick={(e) => {
          e.stopPropagation();
          if (window.confirm(`Delete "${event.title}"?`)) deleteEvent(event.id);
        }}
      >
        <Trash2 className="w-2.5 h-2.5" />
      </button>
    </div>
  );
}

function WeekNowLine() {
  const now = new Date();
  const pct = ((now.getHours() * 60 + now.getMinutes()) / (24 * 60)) * 100;
  return (
    <div className="cal-now-line" style={{ top: `${pct}%` }}>
      <span className="cal-now-dot" />
      <span className="cal-now-bar" />
    </div>
  );
}
