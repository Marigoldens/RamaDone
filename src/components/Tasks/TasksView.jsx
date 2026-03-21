import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import {
  Plus, Search, LayoutGrid, List, CheckCircle2, Circle,
  Clock, AlertTriangle, Flag, Trash2, Edit3, X,
} from 'lucide-react';
import db from '../../db/dexie';

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', color: 'text-red-500', bg: 'bg-red-500/10', icon: AlertTriangle },
  high:   { label: 'High',   color: 'text-orange-500', bg: 'bg-orange-500/10', icon: Flag },
  medium: { label: 'Medium', color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: Flag },
  low:    { label: 'Low',    color: 'text-blue-400', bg: 'bg-blue-400/10', icon: Flag },
};

const STATUSES = ['todo', 'in-progress', 'done'];
const STATUS_LABELS = { todo: 'To Do', 'in-progress': 'In Progress', done: 'Done' };
const STATUS_COLORS = {
  todo:          'border-text-muted/20',
  'in-progress': 'border-accent/40',
  done:          'border-emerald-500/40',
};

/**
 * Tasks view — Kanban board (columns by status) and List view toggle.
 * Full CRUD with Dexie, local-only, reactive via useLiveQuery.
 */
export default function TasksView({ prefilledDate, onPrefilledDateUsed }) {
  const [viewMode, setViewMode] = useState('kanban');
  const [showAddModal, setShowAddModal]   = useState(false);
  const [editingTask, setEditingTask]     = useState(null);
  const [searchQuery, setSearchQuery]     = useState('');
  const [initialDate, setInitialDate]     = useState('');

  // Auto-open modal when navigated from calendar with a prefilled date
  useEffect(() => {
    if (prefilledDate) {
      setInitialDate(prefilledDate);
      setShowAddModal(true);
      onPrefilledDateUsed?.();
    }
  }, [prefilledDate, onPrefilledDateUsed]);

  const allTasks = useLiveQuery(() => db.tasks.orderBy('createdAt').reverse().toArray()) ?? [];

  const filtered = searchQuery
    ? allTasks.filter(t => t.title?.toLowerCase().includes(searchQuery.toLowerCase()))
    : allTasks;

  async function addTask(task) {
    const now = new Date().toISOString();
    await db.tasks.add({
      ...task,
      status: 'todo',
      completed: 0,
      createdAt: now,
      updatedAt: now,
    });
    setShowAddModal(false);
  }

  async function updateTask(id, updates) {
    await db.tasks.update(id, { ...updates, updatedAt: new Date().toISOString() });
    setEditingTask(null);
  }

  async function deleteTask(id) {
    await db.tasks.delete(id);
  }

  async function toggleStatus(task) {
    const nextStatus = task.status === 'done' ? 'todo' : task.status === 'todo' ? 'in-progress' : 'done';
    await db.tasks.update(task.id, {
      status: nextStatus,
      completed: nextStatus === 'done' ? 1 : 0,
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <div className="tasks-view">
      {/* ═══ Header ═══ */}
      <header className="tasks-header">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text tracking-tight">Tasks</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(v => v === 'kanban' ? 'list' : 'kanban')}
              className="p-2 rounded-xl border border-border/50 text-text-muted hover:text-text hover:bg-surface-elevated transition-all"
              title={viewMode === 'kanban' ? 'Switch to List' : 'Switch to Kanban'}
            >
              {viewMode === 'kanban' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="p-2 rounded-xl bg-accent text-white hover:opacity-90 transition-all"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="tasks-search">
          <Search className="w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-text placeholder:text-text-muted/50 outline-none"
          />
        </div>
      </header>

      {/* ═══ Content ═══ */}
      {viewMode === 'kanban' ? (
        <KanbanBoard
          tasks={filtered}
          onToggle={toggleStatus}
          onEdit={setEditingTask}
          onDelete={deleteTask}
        />
      ) : (
        <TaskListView
          tasks={filtered}
          onToggle={toggleStatus}
          onEdit={setEditingTask}
          onDelete={deleteTask}
        />
      )}

      {/* ═══ Add / Edit Modal ═══ */}
      {(showAddModal || editingTask) && (
        <AddTaskModal
          task={editingTask}
          initialDate={initialDate}
          onSave={editingTask ? (data) => updateTask(editingTask.id, data) : addTask}
          onClose={() => { setShowAddModal(false); setEditingTask(null); setInitialDate(''); }}
        />
      )}
    </div>
  );
}

/* ────── Kanban Board ────── */
function KanbanBoard({ tasks, onToggle, onEdit, onDelete }) {
  const EMPTY_MESSAGES = {
    todo: 'All clear! Add a task to get started.',
    'in-progress': 'Nothing in progress right now.',
    done: 'Complete a task to see it here! ✨',
  };

  return (
    <div className="kanban-board">
      {STATUSES.map(status => {
        const columnTasks = tasks.filter(t => t.status === status);
        return (
          <div key={status} className="kanban-column">
            <div className={`kanban-column__header ${STATUS_COLORS[status]}`}>
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                {STATUS_LABELS[status]}
              </span>
              <span className="kanban-column__count">{columnTasks.length}</span>
            </div>
            <div className="kanban-column__body">
              {columnTasks.map(task => (
                <TaskCard key={task.id} task={task} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
              ))}
              {columnTasks.length === 0 && (
                <div className="kanban-empty">
                  <div className="kanban-empty__icon">
                    {status === 'done' ? '🎉' : status === 'in-progress' ? '⏳' : '📋'}
                  </div>
                  <p className="kanban-empty__text">{EMPTY_MESSAGES[status]}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ────── Task Card ────── */
function TaskCard({ task, onToggle, onEdit, onDelete }) {
  const pri = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const PriIcon = pri.icon;
  const isOverdue = task.dueDate && task.dueDate < format(new Date(), 'yyyy-MM-dd') && task.status !== 'done';

  return (
    <div className={`task-card ${isOverdue ? 'task-card--overdue' : ''}`}>
      <div className="flex items-start gap-3">
        <button onClick={() => onToggle(task)} className="mt-0.5 shrink-0">
          {task.status === 'done'
            ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            : <Circle className="w-5 h-5 text-text-muted/40 hover:text-accent transition-colors" />
          }
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${task.status === 'done' ? 'line-through text-text-muted' : 'text-text'}`}>
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-text-muted mt-1 line-clamp-2">{task.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${pri.bg} ${pri.color}`}>
              <PriIcon className="w-3 h-3" />
              {pri.label}
            </span>
            {task.dueDate && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${isOverdue ? 'bg-red-500/10 text-red-500' : 'bg-surface text-text-muted'}`}>
                <Clock className="w-3 h-3" />
                {task.dueDate}
              </span>
            )}
            {task.category && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                {task.category}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="task-card__actions">
        <button onClick={() => onEdit(task)} className="p-1 text-text-muted hover:text-text transition-colors">
          <Edit3 className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onDelete(task.id)} className="p-1 text-text-muted hover:text-red-500 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ────── List View ────── */
function TaskListView({ tasks, onToggle, onEdit, onDelete }) {
  return (
    <div className="task-list">
      {tasks.length === 0 ? (
        <div className="task-list-empty">
          <span className="task-list-empty__icon">📋</span>
          <p className="task-list-empty__title">No tasks yet</p>
          <p className="task-list-empty__sub">Tap + to create your first task</p>
        </div>
      ) : (
        tasks.map(task => (
          <TaskCard key={task.id} task={task} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
        ))
      )}
    </div>
  );
}

/* ────── Add / Edit Modal ────── */
function AddTaskModal({ task, initialDate, onSave, onClose }) {
  const [title, setTitle]       = useState(task?.title ?? '');
  const [description, setDesc]  = useState(task?.description ?? '');
  const [priority, setPriority] = useState(task?.priority ?? 'medium');
  const [dueDate, setDueDate]   = useState(task?.dueDate ?? initialDate ?? '');
  const [category, setCategory] = useState(task?.category ?? '');

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({ title: title.trim(), description, priority, dueDate: dueDate || null, category: category || null });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--wide" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text">{task ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-elevated transition-colors">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            autoFocus
            type="text"
            placeholder="Task title..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="modal-input modal-input--lg"
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={e => setDesc(e.target.value)}
            rows={3}
            className="modal-input resize-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-text-muted mb-1 block">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} className="modal-input text-sm">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-text-muted mb-1 block">Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="modal-input text-sm" />
            </div>
          </div>
          <input
            type="text"
            placeholder="Category (e.g., Work, Personal)"
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="modal-input"
          />
          <button
            type="submit"
            className="task-submit-btn"
          >
            {task ? 'Save Changes' : 'Add Task'}
          </button>
        </form>
      </div>
    </div>
  );
}
