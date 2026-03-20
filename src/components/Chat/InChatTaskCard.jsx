import React from 'react';
import { CheckCircle2, CheckSquare, Wallet, Target, Trash2, RefreshCw, Edit3 } from 'lucide-react';
import './InChatTaskCard.css';

// Maps tool name → icon + label colour
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
};

/**
 * InChatTaskCard — confirmation card for productivity tool calls
 * (tasks, expenses, habits).
 *
 * actions: Array<{ tool, args, display, sub, danger? }>
 */
export default function InChatTaskCard({ actions = [], isConfirmed, onConfirm }) {
  if (!actions.length) return null;

  return (
    <div className={`inchat-task-card ${isConfirmed ? 'confirmed' : ''}`}>
      <div className="inchat-task-header">
        {isConfirmed
          ? <CheckCircle2 size={16} className="inchat-task-header-icon confirmed-icon" />
          : <CheckSquare  size={16} className="inchat-task-header-icon" />
        }
        <span className="inchat-task-header-text">
          {isConfirmed ? 'Done!' : `${actions.length} action${actions.length > 1 ? 's' : ''} to confirm`}
        </span>
      </div>

      <ul className="inchat-task-list">
        {actions.map((action, i) => {
          const meta = TOOL_META[action.tool] || { Icon: CheckSquare, color: 'var(--color-accent)' };
          const { Icon } = meta;
          return (
            <li key={i} className={`inchat-task-item ${action.danger ? 'danger' : ''}`}>
              <Icon size={14} style={{ color: meta.color, flexShrink: 0 }} />
              <div className="inchat-task-item-text">
                <span className="inchat-task-item-main">{action.display}</span>
                {action.sub && <span className="inchat-task-item-sub">{action.sub}</span>}
              </div>
            </li>
          );
        })}
      </ul>

      {!isConfirmed && (
        <button className="inchat-task-confirm-btn" onClick={onConfirm}>
          <CheckCircle2 size={14} />
          Confirm {actions.length > 1 ? 'All' : ''}
        </button>
      )}
    </div>
  );
}
