import React from 'react';
import { Calendar, Clock, CheckCircle2 } from 'lucide-react';
import './InChatEventCard.css';

export default function InChatEventCard({ events, onConfirmAll, isConfirmed }) {
  if (!events || events.length === 0) return null;

  return (
    <div className={`inchat-event-card ${isConfirmed ? 'confirmed' : ''}`}>
      <div className="inchat-event-header">
        <Calendar size={18} className="inchat-event-icon" />
        <span className="inchat-event-title">
          {events.length} Proposed Event{events.length > 1 ? 's' : ''}
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

      {!isConfirmed ? (
        <button className="inchat-event-btn" onClick={onConfirmAll}>
          Accept & Add to Calendar
        </button>
      ) : (
        <div className="inchat-event-confirmed">
          <CheckCircle2 size={16} />
          <span>Added to Calendar</span>
        </div>
      )}
    </div>
  );
}
