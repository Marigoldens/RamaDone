import { Trash2 } from 'lucide-react';
import { formatTime } from '../../utils/timeHelpers';
import { EVENT_TYPES } from '../../utils/constants';
import { useEvents } from '../../hooks/useEvents';

/**
 * @param {{
 *   event: Object,
 *   startRow: number,
 *   endRow: number,
 *   timeFormat: '12h' | '24h',
 * }} props
 */
export default function EventBlock({ event, startRow, endRow, timeFormat }) {
  const { deleteEvent } = useEvents(event.date);
  const typeConfig = EVENT_TYPES[event.type] || EVENT_TYPES.custom;
  const isDominant = typeConfig.dominant;

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${event.title}"?`)) {
      deleteEvent(event.id);
    }
  };

  /**
   * Dominant events (prayer/iftar) span the full width of the grid column.
   * Custom events are inset with margins for visual hierarchy.
   */
  return (
    <div
      className={`group rounded-lg px-3 py-2 overflow-hidden cursor-pointer relative
                  transition-all duration-300 hover:opacity-95 hover:scale-[1.02] hover:shadow-premium
                  ${isDominant
                    ? 'mx-1 shadow-md'
                    : 'mx-4 shadow-sm border border-border/50 bg-surface'
                  }
                  ${isDominant
                    ? event.type === 'iftar' ? 'event-iftar-gradient' : 'event-prayer-gradient'
                    : ''
                  }
                  ${typeConfig.colorClass}`}
      style={{
        gridColumn: '2',
        gridRow: `${startRow} / ${endRow}`,
        zIndex: isDominant ? 5 : 3,
      }}
    >
      <div className="flex justify-between items-start gap-2 h-full">
        <div className="flex-1 truncate flex flex-col justify-center">
          <p className={`font-black truncate tracking-tight ${isDominant ? 'text-sm text-white' : 'text-xs text-text'}`}>
            {event.title}
          </p>
          <p className={`font-bold opacity-80 truncate uppercase tracking-widest ${isDominant ? 'text-[9px] text-white' : 'text-[8px] text-text-muted mt-0.5'}`}>
            {formatTime(event.start, timeFormat)} – {formatTime(event.end, timeFormat)}
          </p>
        </div>
        
        <button
          onClick={handleDelete}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-black/10 transition-all cursor-pointer shrink-0"
          title="Delete Event"
        >
          <Trash2 className={`w-3.5 h-3.5 ${isDominant ? 'text-white' : 'text-text-muted hover:text-red-500'}`} />
        </button>
      </div>
    </div>
  );
}
