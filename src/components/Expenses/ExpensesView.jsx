import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, endOfMonth } from 'date-fns';
import {
  Plus, TrendingUp, TrendingDown, Wallet, X, ArrowUpCircle, ArrowDownCircle,
  ShoppingCart, Utensils, Car, Home, Heart, Gamepad2, Smartphone, BookOpen,
  MoreHorizontal, PiggyBank, Briefcase, Gift, DollarSign, Target,
} from 'lucide-react';
import db from '../../db/dexie';

/** Format number as IQD — no decimals, comma-separated */
function fmtIQD(n) {
  return Math.round(n).toLocaleString('en-US') + ' IQD';
}

const EXPENSE_CATEGORIES = [
  { id: 'food',          label: 'Food',          icon: Utensils,      color: '#f97316' },
  { id: 'transport',     label: 'Transport',     icon: Car,           color: '#3b82f6' },
  { id: 'bills',         label: 'Bills',         icon: Home,          color: '#ef4444' },
  { id: 'shopping',      label: 'Shopping',      icon: ShoppingCart,  color: '#a855f7' },
  { id: 'health',        label: 'Health',        icon: Heart,         color: '#ec4899' },
  { id: 'entertainment', label: 'Entertainment', icon: Gamepad2,      color: '#06b6d4' },
  { id: 'tech',          label: 'Tech',          icon: Smartphone,    color: '#6366f1' },
  { id: 'education',     label: 'Education',     icon: BookOpen,      color: '#14b8a6' },
  { id: 'other',         label: 'Other',         icon: MoreHorizontal,color: '#6b7280' },
];

const INCOME_SOURCES = [
  { id: 'salary',    label: 'Salary',    icon: Briefcase },
  { id: 'freelance', label: 'Freelance', icon: DollarSign },
  { id: 'gift',      label: 'Gift',      icon: Gift },
  { id: 'other',     label: 'Other',     icon: MoreHorizontal },
];

/**
 * Expenses View — IQD currency, separate income/expense modals, savings tracker.
 * All data stored in Dexie — fully offline.
 */
export default function ExpensesView() {
  const [showModal, setShowModal]       = useState(null); // 'expense' | 'income' | null
  const [filterMonth, setFilterMonth]   = useState(format(new Date(), 'yyyy-MM'));

  const monthStart = filterMonth + '-01';
  const monthEnd   = format(endOfMonth(new Date(filterMonth + '-01')), 'yyyy-MM-dd');

  const transactions = useLiveQuery(
    () => db.expenses.where('date').between(monthStart, monthEnd, true, true).reverse().toArray(),
    [monthStart, monthEnd]
  ) ?? [];

  const budgets = useLiveQuery(
    () => db.budgets.where('month').equals(filterMonth).toArray(),
    [filterMonth]
  ) ?? [];

  // Find savings goal for this month
  const savingsGoal = budgets.find(b => b.category === '_savings_goal');

  // Aggregations
  const totalExpense = transactions.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  const totalIncome  = transactions.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const savings      = totalIncome - totalExpense;

  const byCategory = useMemo(() => {
    const map = {};
    transactions.filter(e => e.type === 'expense').forEach(e => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return map;
  }, [transactions]);

  async function addTransaction(data) {
    await db.expenses.add({ ...data, createdAt: new Date().toISOString() });
    setShowModal(null);
  }

  async function deleteTransaction(id) {
    await db.expenses.delete(id);
  }

  async function setSavingsGoal(amount) {
    if (savingsGoal) {
      await db.budgets.update(savingsGoal.id, { amount });
    } else {
      await db.budgets.add({ category: '_savings_goal', amount, month: filterMonth });
    }
  }

  return (
    <div className="expenses-view">
      {/* ═══ Header ═══ */}
      <header className="expenses-header">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text tracking-tight">Expenses</h1>
          <div className="flex gap-2">
            <button onClick={() => setShowModal('income')}
              className="expenses-add-btn expenses-add-btn--income">
              <ArrowUpCircle className="w-4 h-4" />
              <span>Income</span>
            </button>
            <button onClick={() => setShowModal('expense')}
              className="expenses-add-btn expenses-add-btn--expense">
              <ArrowDownCircle className="w-4 h-4" />
              <span>Expense</span>
            </button>
          </div>
        </div>

        {/* Month selector */}
        <input
          type="month"
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
          className="modal-input text-sm mt-3 w-full"
        />
      </header>

      {/* ═══ Savings Card ═══ */}
      <div className="expenses-savings-card">
        <div className="expenses-savings-top">
          <div className="flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-accent" />
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Monthly Savings</span>
          </div>
          <span className={`text-xl font-bold ${savings >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {savings >= 0 ? '+' : ''}{fmtIQD(savings)}
          </span>
        </div>
        {/* Savings goal */}
        <div className="expenses-savings-goal">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted font-semibold">
              <Target className="w-3 h-3 inline mr-1" />
              Goal: {savingsGoal ? fmtIQD(savingsGoal.amount) : 'Not set'}
            </span>
            {savingsGoal && (
              <span className={`font-bold ${savings >= savingsGoal.amount ? 'text-emerald-500' : 'text-accent'}`}>
                {Math.min(100, Math.round((savings / savingsGoal.amount) * 100))}%
              </span>
            )}
          </div>
          {savingsGoal && (
            <div className="expenses-savings-bar">
              <div className="expenses-savings-fill"
                style={{ width: `${Math.min(100, Math.max(0, (savings / savingsGoal.amount) * 100))}%` }} />
            </div>
          )}
          <button onClick={() => {
            const val = prompt('Set savings goal (IQD):', savingsGoal?.amount || '');
            const num = parseInt(val);
            if (num > 0) setSavingsGoal(num);
          }} className="text-[10px] text-accent font-semibold mt-1 hover:underline cursor-pointer">
            {savingsGoal ? 'Change Goal' : 'Set Goal'}
          </button>
        </div>
      </div>

      {/* ═══ Summary Cards ═══ */}
      <div className="expenses-summary">
        <div className="expense-summary-card expense-summary-card--expense">
          <ArrowDownCircle className="w-5 h-5 text-red-500" />
          <div>
            <p className="text-xs text-text-muted font-semibold">Expenses</p>
            <p className="text-lg font-bold text-text">{fmtIQD(totalExpense)}</p>
          </div>
        </div>
        <div className="expense-summary-card expense-summary-card--income">
          <ArrowUpCircle className="w-5 h-5 text-emerald-500" />
          <div>
            <p className="text-xs text-text-muted font-semibold">Income</p>
            <p className="text-lg font-bold text-text">{fmtIQD(totalIncome)}</p>
          </div>
        </div>
      </div>

      {/* ═══ Category Breakdown ═══ */}
      {Object.keys(byCategory).length > 0 && (
        <div className="expenses-breakdown">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">By Category</h3>
          <div className="flex flex-col gap-2">
            {EXPENSE_CATEGORIES.filter(c => byCategory[c.id]).map(cat => {
              const amount = byCategory[cat.id] || 0;
              const pct = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
              const budget = budgets.find(b => b.category === cat.id);
              const CatIcon = cat.icon;
              return (
                <div key={cat.id} className="expense-category-row">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                         style={{ backgroundColor: cat.color + '18' }}>
                      <CatIcon className="w-4 h-4" style={{ color: cat.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text truncate">{cat.label}</p>
                      {budget && (
                        <p className="text-[10px] text-text-muted">{fmtIQD(amount)} / {fmtIQD(budget.amount)} budget</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-text">{fmtIQD(amount)}</p>
                    <p className="text-[10px] text-text-muted">{pct.toFixed(0)}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ Transaction List ═══ */}
      <div className="expenses-list">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">Transactions</h3>
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-text-muted/40">
            <Wallet className="w-12 h-12 mb-3" />
            <p className="text-sm font-medium">No transactions this month</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {transactions.map(exp => {
              const isIncome = exp.type === 'income';
              const source = isIncome ? INCOME_SOURCES.find(s => s.id === exp.category) : null;
              const cat = isIncome
                ? { icon: source?.icon || DollarSign, color: '#10b981', label: source?.label || 'Income' }
                : EXPENSE_CATEGORIES.find(c => c.id === exp.category) || EXPENSE_CATEGORIES.at(-1);
              const CatIcon = cat.icon;
              return (
                <div key={exp.id} className="expense-item">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                       style={{ backgroundColor: cat.color + '18' }}>
                    <CatIcon className="w-4 h-4" style={{ color: cat.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text truncate">{exp.note || cat.label}</p>
                    <p className="text-[10px] text-text-muted">{exp.date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${isIncome ? 'text-emerald-500' : 'text-text'}`}>
                      {isIncome ? '+' : '-'}{fmtIQD(exp.amount)}
                    </span>
                    <button onClick={() => deleteTransaction(exp.id)} className="p-1 text-text-muted/30 hover:text-red-500 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ Modals ═══ */}
      {showModal === 'expense' && (
        <AddExpenseModal onSave={addTransaction} onClose={() => setShowModal(null)} />
      )}
      {showModal === 'income' && (
        <AddIncomeModal onSave={addTransaction} onClose={() => setShowModal(null)} />
      )}
    </div>
  );
}

/* ────── Add Expense Modal ────── */
function AddExpenseModal({ onSave, onClose }) {
  const [amount, setAmount]     = useState('');
  const [category, setCategory] = useState('food');
  const [note, setNote]         = useState('');
  const [date, setDate]         = useState(format(new Date(), 'yyyy-MM-dd'));

  function handleSubmit(e) {
    e.preventDefault();
    const numAmount = parseInt(amount);
    if (!numAmount || numAmount <= 0) return;
    onSave({ type: 'expense', amount: numAmount, category, note, date, recurring: false });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text">💸 Log Expense</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-elevated transition-colors">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="relative">
            <input
              autoFocus type="number" min="0" placeholder="Amount"
              value={amount} onChange={e => setAmount(e.target.value)}
              className="modal-input text-2xl font-bold text-center pr-16"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted text-sm font-semibold">IQD</span>
          </div>

          {/* Category grid */}
          <div>
            <label className="text-xs font-semibold text-text-muted mb-1.5 block">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {EXPENSE_CATEGORIES.map(c => {
                const CIcon = c.icon;
                return (
                  <button key={c.id} type="button" onClick={() => setCategory(c.id)}
                    className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-xs font-medium transition-all
                      ${category === c.id ? 'ring-2 ring-accent bg-accent/10' : 'bg-surface hover:bg-surface-elevated'}`}>
                    <CIcon className="w-4 h-4" style={{ color: c.color }} />
                    <span className="text-text truncate text-[10px]">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <input type="text" placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} className="modal-input" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="modal-input text-sm" />

          <button type="submit"
            className="w-full py-3 rounded-xl bg-red-500 text-white font-semibold text-sm hover:opacity-90 transition-all mt-1">
            Log Expense
          </button>
        </form>
      </div>
    </div>
  );
}

/* ────── Add Income Modal ────── */
function AddIncomeModal({ onSave, onClose }) {
  const [amount, setAmount]     = useState('');
  const [source, setSource]     = useState('salary');
  const [note, setNote]         = useState('');
  const [date, setDate]         = useState(format(new Date(), 'yyyy-MM-dd'));

  function handleSubmit(e) {
    e.preventDefault();
    const numAmount = parseInt(amount);
    if (!numAmount || numAmount <= 0) return;
    onSave({ type: 'income', amount: numAmount, category: source, note, date, recurring: false });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text">💰 Log Income</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-elevated transition-colors">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="relative">
            <input
              autoFocus type="number" min="0" placeholder="Amount"
              value={amount} onChange={e => setAmount(e.target.value)}
              className="modal-input text-2xl font-bold text-center pr-16"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted text-sm font-semibold">IQD</span>
          </div>

          {/* Source selector */}
          <div>
            <label className="text-xs font-semibold text-text-muted mb-1.5 block">Source</label>
            <div className="grid grid-cols-2 gap-2">
              {INCOME_SOURCES.map(s => {
                const SIcon = s.icon;
                return (
                  <button key={s.id} type="button" onClick={() => setSource(s.id)}
                    className={`flex items-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-all
                      ${source === s.id ? 'ring-2 ring-emerald-500 bg-emerald-500/10 text-emerald-600' : 'bg-surface hover:bg-surface-elevated text-text'}`}>
                    <SIcon className="w-4 h-4" />
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <input type="text" placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} className="modal-input" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="modal-input text-sm" />

          <button type="submit"
            className="w-full py-3 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:opacity-90 transition-all mt-1">
            Log Income
          </button>
        </form>
      </div>
    </div>
  );
}
