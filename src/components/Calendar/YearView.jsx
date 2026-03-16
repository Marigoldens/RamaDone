/**
 * @fileoverview Calendar Year View — 12 mini month grids.
 * Shows event density dots beneath each day number.
 */
import {
  startOfYear, addMonths, startOfMonth, endOfMonth,
  startOfWeek, addDays, format, isSameMonth, isToday,
} from 'date-fns';
import { useEventsRange } from '../../hooks/useEventsRange';

export default function YearView({ date, onDayClick }) {
  const base      = new Date(date + 'T12:00:00');
  const yearStart = startOfYear(base);
  const yearEnd   = new Date(base.getFullYear(), 11, 31);

  const startStr  = format(startOfWeek(startOfMonth(yearStart), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const endStr    = format(yearEnd, 'yyyy-MM-dd');
  const events    = useEventsRange(startStr, endStr);

  const countByDay = {};
  (events || []).forEach((ev) => {
    countByDay[ev.date] = (countByDay[ev.date] || 0) + 1;
  });

  const months = Array.from({ length: 12 }, (_, i) => addMonths(yearStart, i));

  return (
    <div className="cal-year-root">
      {months.map((monthDate) => (
        <MiniMonth
          key={monthDate.toString()}
          month={monthDate}
          countByDay={countByDay}
          onDayClick={onDayClick}
        />
      ))}
    </div>
  );
}

function MiniMonth({ month, countByDay, onDayClick }) {
  const ms    = startOfMonth(month);
  const gs    = startOfWeek(ms, { weekStartsOn: 1 });
  const cells = Array.from({ length: 35 }, (_, i) => addDays(gs, i));

  return (
    <div className="cal-mini-month">
      <p className="cal-mini-month-name">{format(month, 'MMMM')}</p>
      <div className="cal-mini-dow-row">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={i} className="cal-mini-dow">{d}</div>
        ))}
      </div>
      <div className="cal-mini-grid">
        {cells.map((d) => {
          const ds       = format(d, 'yyyy-MM-dd');
          const inMonth  = isSameMonth(d, month);
          const today    = isToday(d);
          const hasEvs   = (countByDay[ds] || 0) > 0;
          return (
            <button
              key={ds}
              onClick={() => inMonth && onDayClick(ds)}
              className={`cal-mini-cell
                ${inMonth ? '' : 'cal-mini-cell--outside'}
                ${today ? 'cal-mini-cell--today' : ''}
                ${hasEvs && inMonth ? 'cal-mini-cell--has-events' : ''}`}
              disabled={!inMonth}
            >
              {format(d, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}
