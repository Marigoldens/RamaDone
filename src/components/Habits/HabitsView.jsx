import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import {
  Plus, X, Flame, Trophy, Target, Check,
} from 'lucide-react';
import db from '../../db/dexie';



/**
 * Habits View — daily check-off grid, streak tracking, weekly heatmap.
 * All data stored in Dexie — fully offline.
 */
export default function HabitsView() {
  const [showAddModal, setShowAddModal] = useState(false);
  const today = format(new Date(), 'yyyy-MM-dd');

  const habits = useLiveQuery(
    () => db.habits.where('archived').equals(0).toArray()
  ) ?? [];

  const todayLogs = useLiveQuery(
    () => db.habitLogs.where('date').equals(today).toArray(), [today]
  ) ?? [];

  // Last 7 days for the mini heatmap
  const last7 = useMemo(() => {
    const end = new Date();
    const start = subDays(end, 6);
    return eachDayOfInterval({ start, end }).map(d => format(d, 'yyyy-MM-dd'));
  }, []);

  const weekLogs = useLiveQuery(
    () => db.habitLogs.where('date').between(last7[0], last7[6], true, true).toArray(),
    [last7[0], last7[6]]
  ) ?? [];

  async function addHabit(data) {
    await db.habits.add({
      ...data,
      archived: 0,
      createdAt: new Date().toISOString(),
    });
    setShowAddModal(false);
  }

  async function toggleHabit(habitId) {
    const existing = todayLogs.find(l => l.habitId === habitId);
    if (existing) {
      await db.habitLogs.update(existing.id, { completed: !existing.completed });
    } else {
      await db.habitLogs.add({
        habitId,
        date: today,
        completed: true,
        count: 1,
        note: '',
      });
    }
  }

  async function deleteHabit(id) {
    await db.habits.update(id, { archived: 1 });
  }

  // Calculate streak for each habit
  function getStreak(habitId) {
    const logs = weekLogs.filter(l => l.habitId === habitId && l.completed);
    // Simple: count consecutive days from today backwards
    let streak = 0;
    for (let i = last7.length - 1; i >= 0; i--) {
      if (logs.some(l => l.date === last7[i])) {
        streak++;
      } else break;
    }
    return streak;
  }

  const completedToday = habits.filter(h => todayLogs.some(l => l.habitId === h.id && l.completed)).length;

  return (
    <div className="habits-view">
      {/* ═══ Header ═══ */}
      <header className="habits-header">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text tracking-tight">Habits</h1>
          <button onClick={() => setShowAddModal(true)}
            className="p-2 rounded-xl bg-accent text-white hover:opacity-90 transition-all">
            <Plus className="w-5 h-5" />
          </button>
        </div>
        {/* Daily progress */}
        {habits.length > 0 && (
          <div className="habits-daily-progress">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted font-semibold">Today's Progress</span>
              <span className="text-accent font-bold">{completedToday}/{habits.length}</span>
            </div>
            <div className="habits-progress-bar">
              <div className="habits-progress-fill"
                style={{ width: `${habits.length > 0 ? (completedToday / habits.length) * 100 : 0}%` }} />
            </div>
          </div>
        )}
      </header>

      {/* ═══ Habit Cards ═══ */}
      <div className="habits-grid">
        {habits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-muted/40">
            <Target className="w-12 h-12 mb-3" />
            <p className="text-sm font-medium">No habits yet — add one to start tracking!</p>
          </div>
        ) : (
          habits.map(habit => {
            const isChecked = todayLogs.some(l => l.habitId === habit.id && l.completed);
            const streak = getStreak(habit.id);
            return (
              <div key={habit.id} className={`habit-card ${isChecked ? 'habit-card--checked' : ''}`}>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleHabit(habit.id)}
                    className={`habit-check ${isChecked ? 'habit-check--done' : ''}`}
                  >
                    {isChecked ? <Check className="w-4 h-4 text-white" /> : null}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{habit.emoji}</span>
                      <span className={`text-sm font-semibold ${isChecked ? 'text-text-muted line-through' : 'text-text'}`}>
                        {habit.name}
                      </span>
                    </div>
                    {habit.category && (
                      <span className="text-[10px] text-text-muted">{habit.category}</span>
                    )}
                  </div>
                  {/* Streak badge */}
                  {streak > 0 && (
                    <div className="habit-streak">
                      <Flame className="w-3.5 h-3.5 text-orange-500" />
                      <span className="text-xs font-bold text-orange-500">{streak}</span>
                    </div>
                  )}
                  <button onClick={() => deleteHabit(habit.id)}
                    className="p-1 text-text-muted/30 hover:text-red-500 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Mini 7-day heatmap */}
                <div className="habit-mini-heatmap">
                  {last7.map(day => {
                    const done = weekLogs.some(l => l.habitId === habit.id && l.date === day && l.completed);
                    const isToday = day === today;
                    return (
                      <div key={day} className={`habit-heatmap-cell ${done ? 'habit-heatmap-cell--done' : ''} ${isToday ? 'habit-heatmap-cell--today' : ''}`}
                        title={day}>
                        <span className="text-[8px]">{format(new Date(day + 'T12:00:00'), 'EEE').charAt(0)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ═══ Add Modal ═══ */}
      {showAddModal && (
        <AddHabitModal onSave={addHabit} onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}

/* ────── Add Habit Modal ────── */
function AddHabitModal({ onSave, onClose }) {
  const [name, setName]         = useState('');
  const [emoji, setEmoji]       = useState('🎯');
  const [category, setCategory] = useState('');
  const [frequency, setFreq]    = useState('daily');

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), emoji: emoji || '🎯', category: category || null, frequency, targetCount: 1 });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text">New Habit</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-elevated transition-colors">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input autoFocus type="text" placeholder="Habit name..."
            value={name} onChange={e => setName(e.target.value)} className="modal-input" />

          {/* Free emoji input */}
          <div>
            <label className="text-xs font-semibold text-text-muted mb-1.5 block">Pick an emoji</label>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 ring-2 ring-accent/30 flex items-center justify-center text-3xl shrink-0">
                {emoji || '🎯'}
              </div>
              <input
                type="text"
                value={emoji}
                onChange={e => {
                  // Take last character/emoji entered
                  const val = e.target.value;
                  const chars = [...val];
                  setEmoji(chars.length > 0 ? chars[chars.length - 1] : '');
                }}
                placeholder="Type or paste emoji"
                className="modal-input text-center text-xl flex-1"
              />
            </div>
            <p className="text-[10px] text-text-muted mt-1">Tap the field to open your emoji keyboard</p>
          </div>

          <select value={frequency} onChange={e => setFreq(e.target.value)} className="modal-input text-sm">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>

          <input type="text" placeholder="Category (e.g., Health, Spiritual)"
            value={category} onChange={e => setCategory(e.target.value)} className="modal-input" />

          <button type="submit"
            className="w-full py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:opacity-90 transition-all mt-1">
            Add Habit
          </button>
        </form>
      </div>
    </div>
  );
}
