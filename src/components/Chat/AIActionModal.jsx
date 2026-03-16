import { useState, useEffect } from 'react';
import { X, CalendarPlus, Edit2, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function AIActionModal({ action, events, onCancel, onConfirm }) {
  const { actionName, args } = action;

  // Find the original event if it's an update or delete
  const targetEvent = events.find(e => e.id === args.id) || null;

  // Initialize editable state based on the action
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (actionName === 'add_event') {
      const parsedStart = args.start ? new Date(args.start) : new Date();
      const parsedEnd = args.end ? new Date(args.end) : new Date(parsedStart.getTime() + 60 * 60 * 1000);
      
      setFormData({
        title: args.title || '',
        date: format(parsedStart, 'yyyy-MM-dd'),
        start: format(parsedStart, 'HH:mm'),
        end: format(parsedEnd, 'HH:mm'),
        type: args.type || 'custom',
        color: args.color || 'indigo'
      });
    } else if (actionName === 'update_event') {
      const updates = args.updates || {};
      const baseStart = updates.start ? new Date(updates.start) : (targetEvent?.start ? new Date(targetEvent.start) : new Date());
      const baseEnd = updates.end ? new Date(updates.end) : (targetEvent?.end ? new Date(targetEvent.end) : new Date(baseStart.getTime() + 60 * 60 * 1000));
      
      setFormData({
        title: updates.title !== undefined ? updates.title : (targetEvent?.title || ''),
        date: format(baseStart, 'yyyy-MM-dd'),
        start: format(baseStart, 'HH:mm'),
        end: format(baseEnd, 'HH:mm'),
        type: updates.type !== undefined ? updates.type : (targetEvent?.type || 'custom'),
        color: updates.color !== undefined ? updates.color : (targetEvent?.extendedProps?.color || 'indigo')
      });
    }
  }, [actionName, args, targetEvent]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Construct the confirmed args
    if (actionName === 'add_event') {
      onConfirm({
        title: formData.title,
        start: `${formData.date}T${formData.start}:00`,
        end: `${formData.date}T${formData.end}:00`,
        type: formData.type,
        color: formData.color
      });
    } else if (actionName === 'update_event') {
      onConfirm({
        id: args.id,
        updates: {
          ...args.updates, // preserve any other updates AI intended
          title: formData.title,
          start: `${formData.date}T${formData.start}:00`,
          end: `${formData.date}T${formData.end}:00`,
          type: formData.type,
          color: formData.color
        }
      });
    } else if (actionName === 'delete_event') {
      onConfirm({ id: args.id });
    }
  };

  const renderIcon = () => {
    switch (actionName) {
      case 'add_event': return <CalendarPlus className="w-5 h-5 text-emerald-500" />;
      case 'update_event': return <Edit2 className="w-5 h-5 text-amber-500" />;
      case 'delete_event': return <Trash2 className="w-5 h-5 text-rose-500" />;
      default: return null;
    }
  };

  const renderTitle = () => {
    switch (actionName) {
      case 'add_event': return 'Confirm New Event';
      case 'update_event': return 'Confirm Event Update';
      case 'delete_event': return 'Confirm Deletion';
      default: return 'Confirm Action';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      
      <div className="relative bg-surface-elevated rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-border flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-surface border border-border`}>
              {renderIcon()}
            </div>
            <h2 className="text-lg font-bold text-text">{renderTitle()}</h2>
          </div>
          <button onClick={onCancel} className="p-2 -mr-2 text-text-muted hover:bg-surface rounded-xl transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto">
          {actionName === 'delete_event' ? (
            <div className="space-y-4">
              <p className="text-text">Are you sure you want to delete this event?</p>
              {targetEvent && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4">
                  <p className="font-semibold text-rose-400">{targetEvent.title}</p>
                  <p className="text-sm text-text-muted mt-1">
                    {format(parseISO(targetEvent.start), 'h:mm a')} - {format(parseISO(targetEvent.end), 'h:mm a')}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <form id="ai-action-form" onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1.5">Event Title</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-text placeholder-text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1.5">Date</label>
                <input
                  type="date"
                  value={formData.date || ''}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-text focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all cursor-pointer"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1.5">Start Time</label>
                  <input
                    type="time"
                    value={formData.start || ''}
                    onChange={(e) => setFormData({ ...formData, start: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-text focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1.5">End Time</label>
                  <input
                    type="time"
                    value={formData.end || ''}
                    onChange={(e) => setFormData({ ...formData, end: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-text focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1.5">Event Type</label>
                <select
                  value={formData.type || 'custom'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-text focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all appearance-none"
                >
                  <option value="custom">Custom</option>
                  <option value="prayer">Prayer</option>
                  <option value="iftar">Iftar</option>
                  <option value="suhoor">Suhoor</option>
                </select>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border bg-surface/50 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-xl font-medium text-text-muted hover:text-text hover:bg-surface border border-transparent hover:border-border transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={actionName === 'delete_event' ? handleSubmit : () => document.getElementById('ai-action-form').requestSubmit()}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold text-surface transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
              actionName === 'delete_event' 
                ? 'bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/20' 
                : 'bg-accent hover:bg-accent-light shadow-lg shadow-accent/20'
            }`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
