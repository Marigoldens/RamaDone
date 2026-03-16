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
    <div className="fixed inset-0 z-50 animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Bottom sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-surface-elevated rounded-t-3xl p-6 pb-8
                   border-t border-border shadow-2xl animate-fade-in-up modal-sheet"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-text">New Event</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-surface transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">
              Event Name
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Quran Study, Workout..."
              className="w-full px-4 py-3 rounded-xl bg-surface border border-border
                         text-text placeholder-text-muted/50 text-sm
                         focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
                         transition-all"
              autoFocus
            />
          </div>

          {/* Type Dropdown */}
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">
              Category
            </label>
            <div className="relative">
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-surface border border-border
                           text-text text-sm appearance-none
                           focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
                           transition-all"
              >
                <option value="custom">Custom</option>
                <option value="prayer">Prayer</option>
                <option value="iftar">Iftar</option>
                <option value="suhoor">Suhoor</option>
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Time inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1.5">Start</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-surface border border-border
                           text-text text-sm focus:outline-none focus:ring-2
                           focus:ring-accent/50 focus:border-accent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1.5">End</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-surface border border-border
                           text-text text-sm focus:outline-none focus:ring-2
                           focus:ring-accent/50 focus:border-accent transition-all"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="w-full py-3.5 rounded-xl font-semibold text-sm
                       transition-all duration-200 cursor-pointer
                       hover:scale-[1.01] active:scale-[0.99]
                       disabled:opacity-50 disabled:cursor-not-allowed
                       btn-gradient-accent"
          >
            {saving ? 'Adding...' : 'Add Event'}
          </button>
        </form>
      </div>
    </div>
  );
}
