/**
 * @fileoverview 24-hour vertical timeline built with CSS Grid.
 *
 * ARCHITECTURE:
 * - 48 rows × 2 columns (time labels | event area)
 * - Each row = 30 minutes
 * - Events placed using grid-row: startRow / endRow
 * - Prayer/iftar blocks span full width with dominant styling
 * - Custom events are inset for visual hierarchy
 * - Empty slots are tappable for adding new events
 *
 * GRID ROW MATH:
 * row = (hour * 2) + (minutes >= 30 ? 1 : 0) + 1
 * CSS Grid is 1-indexed, so midnight (00:00) = row 1
 */
import { timeToGridRow, gridRowToTime } from '../../utils/timeHelpers';
import EventBlock from './EventBlock';

/**
 * @param {{
 *   events: Array<Object>,
 *   timeFormat: '12h' | '24h',
 *   onSlotTap: (startTime: string) => void,
 *   selectedDate: string,
 * }} props
 */
export default function TimelineGrid({ events, timeFormat, onSlotTap, selectedDate }) {
  /** Generate time labels for each hour (24 labels) */
  const timeLabels = Array.from({ length: 24 }, (_, hour) => {
    const row = hour * 2 + 1; // Each hour starts at an even row
    return { row, label: gridRowToTime(row, timeFormat) };
  });

  /**
   * Handle click on an empty area of the grid.
   * Calculates which time slot was clicked from the click position.
   */
  const handleGridClick = (e) => {
    // Only handle clicks on the grid background (not on events)
    if (e.target !== e.currentTarget) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top + e.currentTarget.scrollTop;
    const rowHeight = rect.height / 48;
    const clickedRow = Math.floor(y / rowHeight) + 1;
    const clickedTime = gridRowToTime(clickedRow, '24h');

    onSlotTap(clickedTime);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div
        className="grid relative timeline-grid"
        onClick={handleGridClick}
      >
        {/* ---- TIME LABELS (Left Gutter) ---- */}
        {timeLabels.map(({ row, label }) => (
          <div
            key={row}
            className="text-[10px] text-text-muted pr-4 text-right pt-0.5 select-none font-bold tabular-nums"
            style={{
              gridColumn: '1',
              gridRow: `${row} / ${row + 1}`,
            }}
          >
            {label}
          </div>
        ))}

        {/* ---- HOUR LINES (horizontal guides) ---- */}
        {timeLabels.map(({ row }) => (
          <div
            key={`line-${row}`}
            className="border-t border-border/20"
            style={{
              gridColumn: '2',
              gridRow: `${row} / ${row + 1}`,
              pointerEvents: 'none',
            }}
          />
        ))}

        {/* ---- HALF-HOUR LINES (subtle dots) ---- */}
        {timeLabels.map(({ row }) => (
          <div
            key={`halfline-${row}`}
            className="border-t border-dotted border-border/10"
            style={{
              gridColumn: '2',
              gridRow: `${row + 1} / ${row + 2}`,
              pointerEvents: 'none',
            }}
          />
        ))}

        {/* ---- EVENT BLOCKS ---- */}
        {events.map((event) => {
          const startRow = timeToGridRow(event.start);
          const endRow = timeToGridRow(event.end);
          // Ensure minimum 1-row height
          const effectiveEndRow = Math.max(endRow, startRow + 1);

          return (
            <EventBlock
              key={event.id}
              event={event}
              startRow={startRow}
              endRow={effectiveEndRow}
              timeFormat={timeFormat}
            />
          );
        })}

        {/* ---- CURRENT TIME INDICATOR ---- */}
        <CurrentTimeIndicator selectedDate={selectedDate} />
      </div>
    </div>
  );
}

/**
 * Red line showing the current time on today's calendar.
 * Only renders if the selected date is today.
 */
function CurrentTimeIndicator({ selectedDate }) {
  const today = new Date().toISOString().split('T')[0];
  if (selectedDate !== today) return null;

  const now = new Date();
  const row = now.getHours() * 2 + (now.getMinutes() >= 30 ? 1 : 0) + 1;
  const minuteOffset = (now.getMinutes() % 30) / 30;

  return (
    <div
      className="absolute left-[60px] right-0 flex items-center z-10 pointer-events-none"
      style={{
        gridColumn: '2',
        top: `calc(${(row - 1) * 3}rem + ${minuteOffset * 3}rem)`,
      }}
    >
      <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 shrink-0" />
      <div className="flex-1 h-[2px] bg-red-500/70" />
    </div>
  );
}
