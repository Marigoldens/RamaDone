/**
 * @fileoverview Add Event Modal — bottom-sheet style modal for creating events.
 *
 * Opens when a user taps an empty timeline slot or the FAB.
 * Pre-fills the start time if opened from a slot tap.
 */
import { useState } from 'react';
import { X } from 'lucide-react';

/**
 * @param {{
 *   date: string,
 *   prefilledTime: string | null,
 *   onClose: () => void,
 *   onAdd: (event: Object) => Promise<void>,
 *   accessToken: string | null,
 *   timeFormat: '12h' | '24h',
 * }} props
 */
export default function AddEventModal({ date, prefilledTime, onClose, onAdd, accessToken, timeFormat }) {
  const defaultStart = prefilledTime || '09:00';
  const [title, setTitle] = useState('');
  const [type, setType] = useState('custom');
  const [startTime, setStartTime] = useState(defaultStart);
  const [endTime, setEndTime] = useState(() => {
    const [h, m] = defaultStart.split(':').map(Number);
    const newH = h + 1;
    return `${newH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      const startISO = new Date(`${date}T${startTime}:00`).toISOString();
      const endISO = new Date(`${date}T${endTime}:00`).toISOString();

      await onAdd({
        title: title.trim(),
        start: startISO,
        end: endISO,
        type: type,
        date,
        googleId: null,
      });

      onClose();
    } catch (err) {
      console.error('[AddEventModal] Failed to add event:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text">New Event</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface-elevated transition-colors"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-text-muted mb-1 block">Event Name</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Quran Study, Workout..."
              className="modal-input modal-input--lg"
              autoFocus
            />
          </div>

          {/* Type Dropdown */}
          <div>
            <label className="text-xs font-semibold text-text-muted mb-1 block">Category</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="modal-input text-sm"
            >
              <option value="custom">Custom</option>
              <option value="prayer">Prayer</option>
              <option value="iftar">Iftar</option>
              <option value="suhoor">Suhoor</option>
            </select>
          </div>

          {/* Time inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-text-muted mb-1 block">Start</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="modal-input text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-muted mb-1 block">End</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="modal-input text-sm"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="w-full py-4 rounded-xl font-bold text-base
                       transition-all duration-200 cursor-pointer
                       hover:scale-[1.01] active:scale-[0.99]
                       disabled:opacity-50 disabled:cursor-not-allowed
                       btn-gradient-accent mt-2"
          >
            {saving ? 'Adding...' : 'Add Event'}
          </button>
        </form>
      </div>
    </div>
  );
}
