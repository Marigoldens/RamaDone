/**
 * @fileoverview Calendar Month View — classic grid with event chips.
 */
import {
  startOfMonth, endOfMonth, startOfWeek, addDays,
  format, isSameMonth, isToday, isSameDay,
} from 'date-fns';
import { useEventsRange } from '../../hooks/useEventsRange';
import { EVENT_TYPES } from '../../utils/constants';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function MonthView({ date, onDayClick }) {
  const base      = new Date(date + 'T12:00:00');
  const monthStart = startOfMonth(base);
  const monthEnd   = endOfMonth(base);
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 1 });

  // Build 6×7 grid
  const cells = [];
  let cur = gridStart;
  for (let i = 0; i < 42; i++) {
    cells.push(cur);
    cur = addDays(cur, 1);
  }

  const startStr = format(gridStart, 'yyyy-MM-dd');
  const endStr   = format(addDays(gridStart, 41), 'yyyy-MM-dd');
  const events   = useEventsRange(startStr, endStr);

  const eventsByDay = {};
  (events || []).forEach((ev) => {
    if (!eventsByDay[ev.date]) eventsByDay[ev.date] = [];
    eventsByDay[ev.date].push(ev);
  });

  return (
    <div className="cal-month-root">
      {/* Day name headers */}
      <div className="cal-month-dow-row">
        {DAY_NAMES.map((n) => (
          <div key={n} className="cal-month-dow">{n}</div>
        ))}
      </div>

      {/* Date cells */}
      <div className="cal-month-grid">
        {cells.map((d) => {
          const ds = format(d, 'yyyy-MM-dd');
          const inMonth = isSameMonth(d, base);
          const today   = isToday(d);
          const dayEvs  = eventsByDay[ds] || [];

          return (
            <button
              key={ds}
              onClick={() => onDayClick(ds)}
              className={`cal-month-cell
                ${inMonth ? '' : 'cal-month-cell--outside'}
                ${today ? 'cal-month-cell--today' : ''}`}
            >
              <span className={`cal-month-date-num ${today ? 'cal-month-date-num--today' : ''}`}>
                {format(d, 'd')}
              </span>

              {/* Event dots / chips */}
              <div className="cal-month-events">
                {dayEvs.slice(0, 3).map((ev) => {
                  const tc = EVENT_TYPES[ev.type] || EVENT_TYPES.custom;
                  return (
                    <div
                      key={ev.id}
                      className={`cal-month-event-chip ${tc.chipClass || 'cal-chip--custom'}`}
                      title={ev.title}
                    >
                      <span className="cal-month-event-chip-text">{ev.title}</span>
                    </div>
                  );
                })}
                {dayEvs.length > 3 && (
                  <div className="cal-month-more">+{dayEvs.length - 3}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
