import React from 'react';
import { Calendar, Clock, CheckCircle2, Trash2, Edit3 } from 'lucide-react';
import './InChatEventCard.css';

export default function InChatEventCard({ events = [], deletedEvents = [], updatedEvents = [], onConfirmAll, isConfirmed }) {
  const hasAdds = events.length > 0;
  const hasDeletes = deletedEvents.length > 0;
  const hasUpdates = updatedEvents.length > 0;

  if (!hasAdds && !hasDeletes && !hasUpdates) return null;

  // Build confirm button label
  const parts = [];
  if (hasAdds) parts.push(`Add ${events.length}`);
  if (hasDeletes) parts.push(`Delete ${deletedEvents.length}`);
  if (hasUpdates) parts.push(`Update ${updatedEvents.length}`);
  const confirmLabel = isConfirmed ? null : `Confirm (${parts.join(', ')})`;

  return (
    <div className={`inchat-event-card ${isConfirmed ? 'confirmed' : ''}`}>

      {/* ── Deletes (red) ── */}
      {hasDeletes && (
        <>
          <div className="inchat-event-header inchat-event-header--danger">
            <Trash2 size={18} className="inchat-event-icon" />
            <span className="inchat-event-title">
              {deletedEvents.length} Event{deletedEvents.length > 1 ? 's' : ''} to Delete
            </span>
          </div>
          <div className="inchat-event-list inchat-event-list--danger">
            {deletedEvents.map((ev, i) => (
              <div key={i} className="inchat-event-item inchat-event-item--danger">
                <div className="inchat-event-item-main">
                  <strong>{ev.title}</strong>
                </div>
                {ev.start && (
                  <div className="inchat-event-time">
                    <Clock size={12} />
                    <span>{ev.start}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Updates (amber) ── */}
      {hasUpdates && (
        <>
          <div className="inchat-event-header inchat-event-header--warn">
            <Edit3 size={18} className="inchat-event-icon" />
            <span className="inchat-event-title">
              {updatedEvents.length} Event{updatedEvents.length > 1 ? 's' : ''} to Update
            </span>
          </div>
          <div className="inchat-event-list">
            {updatedEvents.map((ev, i) => (
              <div key={i} className="inchat-event-item">
                <div className="inchat-event-item-main">
                  <strong>{ev.title}</strong>
                  <div className="inchat-update-fields">
                    {Object.entries(ev.updates || {}).map(([field, value]) => {
                      let label = field;
                      let display = String(value);
                      if (field === 'start' || field === 'end') {
                        label = field === 'start' ? 'New Start' : 'New End';
                        try { display = new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch {}
                      } else if (field === 'title') {
                        label = 'New Title';
                      } else if (field === 'type') {
                        label = 'Type';
                      } else if (field === 'color') {
                        label = 'Color';
                      }
                      return (
                        <span key={field} className="inchat-update-field">
                          <span className="inchat-update-label">{label}:</span> {display}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Adds (green) ── */}
      {hasAdds && (
        <>
          <div className="inchat-event-header">
            <Calendar size={18} className="inchat-event-icon" />
            <span className="inchat-event-title">
              {events.length} Event{events.length > 1 ? 's' : ''} to Add
            </span>
          </div>
          <div className="inchat-event-list">
            {events.map((ev, i) => (
              <div key={i} className="inchat-event-item">
                <div className="inchat-event-item-main">
                  <strong>{ev.title}</strong>
                  {ev.description && <p className="inchat-event-desc">{ev.description}</p>}
                </div>
                <div className="inchat-event-time">
                  <Clock size={12} />
                  <span>
                    {ev.date} · {ev.startTime} - {ev.endTime}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!isConfirmed ? (
        <button className={`inchat-event-btn ${hasDeletes && !hasAdds ? 'inchat-event-btn--danger' : ''}`} onClick={onConfirmAll}>
          {confirmLabel}
        </button>
      ) : (
        <div className="inchat-event-confirmed">
          <CheckCircle2 size={16} />
          <span>Changes Applied</span>
        </div>
      )}
    </div>
  );
}
