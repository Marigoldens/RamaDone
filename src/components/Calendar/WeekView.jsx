/**
 * @fileoverview Calendar Week View — 7-day horizontal timeline.
 * Shows Mon–Sun columns with hourly rows, event pills, and task pills.
 */
import { startOfWeek, addDays, format, isSameDay, isToday } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEventsRange } from '../../hooks/useEventsRange';
import { useEvents } from '../../hooks/useEvents';
import { timeToGridRow, formatTime } from '../../utils/timeHelpers';
import { EVENT_TYPES } from '../../utils/constants';
import { Trash2, CheckSquare } from 'lucide-react';
import db from '../../db/dexie';

export default function WeekView({ date, timeFormat, onDayClick }) {
  const weekStart = startOfWeek(new Date(date + 'T12:00:00'), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const startStr = format(days[0], 'yyyy-MM-dd');
  const endStr   = format(days[6], 'yyyy-MM-dd');
  const events   = useEventsRange(startStr, endStr);
  const hours    = Array.from({ length: 24 }, (_, i) => i);

  // Query tasks for the entire week
  const weekTasks = useLiveQuery(
    () => db.tasks.where('dueDate').between(startStr, endStr, true, true).toArray(),
    [startStr, endStr]
  ) ?? [];

  const eventsByDay = {};
  const tasksByDay = {};
  days.forEach((d) => {
    const ds = format(d, 'yyyy-MM-dd');
    eventsByDay[ds] = [];
    tasksByDay[ds] = [];
  });
  (events || []).forEach((ev) => {
    if (eventsByDay[ev.date]) eventsByDay[ev.date].push(ev);
  });
  weekTasks.forEach((t) => {
    if (tasksByDay[t.dueDate]) tasksByDay[t.dueDate].push(t);
  });

  return (
    <div className="cal-week-root">
      {/* Day header row */}
      <div className="cal-week-header">
        <div className="cal-week-gutter" />
        {days.map((d) => {
          const isT = isToday(d);
          const ds = format(d, 'yyyy-MM-dd');
          const taskCount = (tasksByDay[ds] || []).length;
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
              {taskCount > 0 && (
                <span className="cal-week-task-badge">
                  <CheckSquare className="w-2.5 h-2.5" />
                  {taskCount}
                </span>
              )}
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
            const dayTasks = tasksByDay[dateStr] || [];
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
                {/* Task indicators at bottom of day column */}
                {dayTasks.length > 0 && (
                  <div className="cal-week-tasks-bottom">
                    {dayTasks.slice(0, 3).map(t => (
                      <div key={t.id} className={`cal-week-task-chip ${t.status === 'done' ? 'cal-week-task-chip--done' : ''}`}>
                        <span className="cal-week-task-chip__dot" />
                        <span className="cal-week-task-chip__title">{t.title}</span>
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <span className="cal-week-task-more">+{dayTasks.length - 3}</span>
                    )}
                  </div>
                )}
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
