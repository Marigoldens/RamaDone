import React, { useState } from 'react';
import { CheckCircle2, CheckSquare, Wallet, Target, Trash2, RefreshCw, Edit3, Dumbbell, BarChart3, Pencil, X, Check } from 'lucide-react';
import './InChatTaskCard.css';

// ── Tool meta ───────────────────────────────────────────────────────────────────
const TOOL_META = {
  add_task:       { Icon: CheckSquare, color: 'var(--color-success)',  label: 'Add'    },
  update_task:    { Icon: Edit3,       color: 'var(--color-warning)',  label: 'Update' },
  delete_task:    { Icon: Trash2,      color: 'var(--color-danger)',   label: 'Delete' },
  add_expense:    { Icon: Wallet,      color: 'var(--color-success)',  label: 'Log'    },
  update_expense: { Icon: Edit3,       color: 'var(--color-warning)',  label: 'Edit'   },
  delete_expense: { Icon: Trash2,      color: 'var(--color-danger)',   label: 'Delete' },
  add_habit:      { Icon: Target,      color: 'var(--color-success)',  label: 'Add'    },
  update_habit:   { Icon: Edit3,       color: 'var(--color-warning)',  label: 'Edit'   },
  delete_habit:   { Icon: Trash2,      color: 'var(--color-danger)',   label: 'Archive'},
  log_habit:      { Icon: Target,      color: 'var(--color-accent)',   label: 'Habit'  },
  add_workout_plan:    { Icon: Dumbbell, color: 'var(--color-success)',  label: 'Create' },
  update_workout_plan: { Icon: Edit3,    color: 'var(--color-warning)',  label: 'Update' },
  delete_workout_plan: { Icon: Trash2,   color: 'var(--color-danger)',   label: 'Delete' },
  add_workout_log:     { Icon: Dumbbell, color: 'var(--color-success)',  label: 'Log'    },
  delete_workout_log:  { Icon: Trash2,   color: 'var(--color-danger)',   label: 'Delete' },
  generate_monthly_report: { Icon: BarChart3, color: 'var(--color-accent)', label: 'Report' },
};

const EXPENSE_CATEGORIES = ['food','transport','health','utilities','shopping','entertainment','other'];
const TASK_PRIORITIES    = ['low','medium','high'];
const HABIT_FREQUENCIES  = ['daily','weekly','monthly'];

// ── Sub-line renderer ──────────────────────────────────────────────────────────
function ActionSub({ action }) {
  if (action.tool === 'add_workout_plan' || action.tool === 'add_workout_log') {
    const exercises = action.args?.exercises || [];
    const typeLabel = action.tool === 'add_workout_plan'
      ? (action.args?.type || '') + ' · ' + exercises.length + ' exercise' + (exercises.length !== 1 ? 's' : '')
      : action.args?.planName + ' · ' + exercises.length + ' exercise' + (exercises.length !== 1 ? 's' : '');
    if (!exercises.length) return <span className="inchat-task-item-sub">{typeLabel}</span>;
    return (
      <div className="inchat-task-item-sub inchat-task-item-sub--gym">
        <span className="inchat-gym-type">{typeLabel}</span>
        <div className="inchat-ex-chips">
          {exercises.map((ex, i) => (
            <span key={i} className="inchat-ex-chip">
              {ex.name}
              <strong> {ex.sets || 3}×{ex.reps || 10}</strong>
              {(ex.targetWeight ?? ex.sets?.[0]?.weight) ? ` @${ex.targetWeight ?? ex.sets[0].weight}kg` : ''}
            </span>
          ))}
        </div>
      </div>
    );
  }
  if (!action.sub) return null;
  return <span className="inchat-task-item-sub">{action.sub}</span>;
}

// ── Per-tool inline edit forms ─────────────────────────────────────────────
function ExpenseEditForm({ args, onSave, onCancel }) {
  const [draft, setDraft] = useState({ ...args });
  const set = (k, v) => setDraft(p => ({ ...p, [k]: v }));
  return (
    <div className="edit-form">
      <div className="edit-form-row">
        <input type="number" value={draft.amount || ''} onChange={e => set('amount', e.target.value)}
          placeholder="Amount (IQD)" className="edit-input" />
        <select value={(draft.category || 'other').toLowerCase()} onChange={e => set('category', e.target.value)} className="edit-select">
          {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c[0].toUpperCase()+c.slice(1)}</option>)}
        </select>
      </div>
      <div className="edit-form-row">
        <input type="text" value={draft.note || ''} onChange={e => set('note', e.target.value)}
          placeholder="Note (optional)" className="edit-input" />
        <input type="date" value={draft.date || ''} onChange={e => set('date', e.target.value)}
          className="edit-input" />
      </div>
      <EditFormActions onSave={() => onSave(draft)} onCancel={onCancel} />
    </div>
  );
}

function TaskEditForm({ args, onSave, onCancel }) {
  const [draft, setDraft] = useState({ ...args });
  const set = (k, v) => setDraft(p => ({ ...p, [k]: v }));
  return (
    <div className="edit-form">
      <input type="text" value={draft.title || ''} onChange={e => set('title', e.target.value)}
        placeholder="Task title" className="edit-input edit-input--full" />
      <div className="edit-form-row">
        <select value={draft.priority || 'medium'} onChange={e => set('priority', e.target.value)} className="edit-select">
          {TASK_PRIORITIES.map(p => <option key={p} value={p}>{p[0].toUpperCase()+p.slice(1)}</option>)}
        </select>
        <input type="date" value={draft.dueDate || ''} onChange={e => set('dueDate', e.target.value)}
          className="edit-input" placeholder="Due date" />
      </div>
      <EditFormActions onSave={() => onSave(draft)} onCancel={onCancel} />
    </div>
  );
}

function HabitEditForm({ args, onSave, onCancel }) {
  const [draft, setDraft] = useState({ ...args });
  const set = (k, v) => setDraft(p => ({ ...p, [k]: v }));
  return (
    <div className="edit-form">
      <div className="edit-form-row">
        <input type="text" value={draft.emoji || ''} onChange={e => set('emoji', e.target.value)}
          placeholder="🎯" className="edit-input edit-input--emoji" maxLength={4} />
        <input type="text" value={draft.name || ''} onChange={e => set('name', e.target.value)}
          placeholder="Habit name" className="edit-input" />
      </div>
      <select value={draft.frequency || 'daily'} onChange={e => set('frequency', e.target.value)}
        className="edit-select edit-select--full">
        {HABIT_FREQUENCIES.map(f => <option key={f} value={f}>{f[0].toUpperCase()+f.slice(1)}</option>)}
      </select>
      <EditFormActions onSave={() => onSave(draft)} onCancel={onCancel} />
    </div>
  );
}

function WorkoutPlanEditForm({ args, onSave, onCancel }) {
  const [name, setName]   = useState(args.name || '');
  const [type, setType]   = useState(args.type || '');
  const [exList, setExList] = useState([...(args.exercises || [])]);
  const updateEx = (i, key, val) =>
    setExList(prev => prev.map((ex, idx) => idx === i ? { ...ex, [key]: +val || 0 } : ex));
  return (
    <div className="edit-form">
      <div className="edit-form-row">
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder="Plan name" className="edit-input" />
        <input value={type} onChange={e => setType(e.target.value)}
          placeholder="Type" className="edit-input" />
      </div>
      {exList.map((ex, i) => (
        <div key={i} className="edit-form-row edit-form-row--exercise">
          <span className="edit-ex-name">{ex.name}</span>
          <input type="number" value={ex.sets || ''} min={1}
            onChange={e => updateEx(i,'sets',e.target.value)}
            className="edit-input edit-input--tiny" placeholder="Sets" />
          <span className="edit-label">sets</span>
          <input type="number" value={ex.reps || ''} min={1}
            onChange={e => updateEx(i,'reps',e.target.value)}
            className="edit-input edit-input--tiny" placeholder="Reps" />
          <span className="edit-label">reps</span>
        </div>
      ))}
      <EditFormActions onSave={() => onSave({ ...args, name, type, exercises: exList })} onCancel={onCancel} />
    </div>
  );
}

function EditFormActions({ onSave, onCancel }) {
  return (
    <div className="edit-form-actions">
      <button onClick={onCancel} className="edit-btn edit-btn--cancel"><X size={11}/> Cancel</button>
      <button onClick={onSave}   className="edit-btn edit-btn--save"><Check size={11}/> Save</button>
    </div>
  );
}

function EditForm({ tool, args, onSave, onCancel }) {
  if (tool === 'add_expense' || tool === 'update_expense')
    return <ExpenseEditForm args={args} onSave={onSave} onCancel={onCancel} />;
  if (tool === 'add_task')
    return <TaskEditForm args={args} onSave={onSave} onCancel={onCancel} />;
  if (tool === 'add_habit')
    return <HabitEditForm args={args} onSave={onSave} onCancel={onCancel} />;
  if (tool === 'add_workout_plan')
    return <WorkoutPlanEditForm args={args} onSave={onSave} onCancel={onCancel} />;
  return null;
}

const EDITABLE_TOOLS = new Set(['add_expense','update_expense','add_task','add_habit','add_workout_plan']);

// ── Main component ────────────────────────────────────────────────────────────────
export default function InChatTaskCard({ actions = [], isConfirmed, onConfirm }) {
  const [mutableActions, setMutableActions] = useState(() => actions.map(a => ({ ...a })));
  const [editingIdx, setEditingIdx]         = useState(null);
  const [isSubmitting, setIsSubmitting]     = useState(false);

  if (!actions.length) return null;

  const handleEditSave = (idx, newArgs) => {
    setMutableActions(prev => prev.map((a, i) => i === idx ? { ...a, args: newArgs } : a));
    setEditingIdx(null);
  };

  const handleConfirm = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    onConfirm(mutableActions);
  };

  return (
    <div className={`inchat-task-card ${isConfirmed ? 'confirmed' : ''} ${isSubmitting && !isConfirmed ? 'submitting' : ''}`}>
      <div className="inchat-task-header">
        {isConfirmed
          ? <CheckCircle2 size={16} className="inchat-task-header-icon confirmed-icon" />
          : <CheckSquare  size={16} className="inchat-task-header-icon" />
        }
        <span className="inchat-task-header-text">
          {isConfirmed ? 'Saved!' : `${mutableActions.length} action${mutableActions.length > 1 ? 's' : ''} to confirm`}
        </span>
      </div>

      <ul className="inchat-task-list">
        {mutableActions.map((action, i) => {
          const meta      = TOOL_META[action.tool] || { Icon: CheckSquare, color: 'var(--color-accent)' };
          const { Icon }  = meta;
          const isEditing = editingIdx === i;
          const canEdit   = !isConfirmed && !isSubmitting && EDITABLE_TOOLS.has(action.tool);
          return (
            <li key={i} className={`inchat-task-item ${action.danger ? 'danger' : ''} ${isEditing ? 'editing' : ''}`}>
              <Icon size={14} style={{ color: meta.color, flexShrink: 0, marginTop: 3 }} />
              <div className="inchat-task-item-content">
                <div className="inchat-task-item-main-row">
                  <div className="inchat-task-item-text">
                    <span className="inchat-task-item-main">{action.display}</span>
                    {!isEditing && <ActionSub action={action} />}
                  </div>
                  {canEdit && !isEditing && (
                    <button className="inchat-edit-btn" onClick={() => setEditingIdx(i)} title="Edit before confirming">
                      <Pencil size={11} />
                    </button>
                  )}
                  {isEditing && (
                    <button className="inchat-edit-btn inchat-edit-btn--active" onClick={() => setEditingIdx(null)}>
                      <X size={11} />
                    </button>
                  )}
                </div>
                {isEditing && (
                  <EditForm
                    tool={action.tool}
                    args={action.args}
                    onSave={newArgs => handleEditSave(i, newArgs)}
                    onCancel={() => setEditingIdx(null)}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {!isConfirmed && (
        <button
          className={`inchat-task-confirm-btn ${isSubmitting ? 'submitting' : ''}`}
          onClick={handleConfirm}
          disabled={isSubmitting}
        >
          {isSubmitting
            ? <><RefreshCw size={13} className="spin-icon" /> Saving…</>
            : <><CheckCircle2 size={13} /> Confirm {mutableActions.length > 1 ? 'All' : ''}</>
          }
        </button>
      )}
    </div>
  );
}
