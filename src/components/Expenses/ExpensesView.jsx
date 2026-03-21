import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, endOfMonth, addMonths, subMonths, startOfYear, endOfYear, eachMonthOfInterval } from 'date-fns';
import {
  Plus, TrendingUp, TrendingDown, Wallet, X, ArrowUpCircle, ArrowDownCircle,
  ShoppingCart, Utensils, Car, Home, Heart, Gamepad2, Smartphone, BookOpen,
  MoreHorizontal, PiggyBank, Briefcase, Gift, DollarSign, Target,
  ChevronLeft, ChevronRight, BarChart3, FileText, Sparkles,
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
 * Expenses View — IQD currency, month/year views, balance overview.
 * All data stored in Dexie — fully offline.
 */
export default function ExpensesView({ onNavigate }) {
  const [showModal, setShowModal]       = useState(null); // 'expense' | 'income' | null
  const [filterMonth, setFilterMonth]   = useState(format(new Date(), 'yyyy-MM'));
  const [viewTab, setViewTab]           = useState('month'); // 'month' | 'year'

  const monthDate  = new Date(filterMonth + '-01');
  const monthStart = filterMonth + '-01';
  const monthEnd   = format(endOfMonth(monthDate), 'yyyy-MM-dd');
  const monthLabel = format(monthDate, 'MMMM yyyy');

  function prevMonth() {
    setFilterMonth(format(subMonths(monthDate, 1), 'yyyy-MM'));
  }
  function nextMonth() {
    setFilterMonth(format(addMonths(monthDate, 1), 'yyyy-MM'));
  }

  const transactions = useLiveQuery(
    () => db.expenses.where('date').between(monthStart, monthEnd, true, true).reverse().toArray(),
    [monthStart, monthEnd]
  ) ?? [];

  const budgets = useLiveQuery(
    () => db.budgets.where('month').equals(filterMonth).toArray(),
    [filterMonth]
  ) ?? [];

  // Aggregations
  const totalExpense = transactions.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  const totalIncome  = transactions.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const balance      = totalIncome - totalExpense;

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

  return (
    <div className="expenses-view">
      {/* ═══ Header ═══ */}
      <header className="expenses-header">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text tracking-tight">Expenses</h1>
          <div className="expenses-header__actions">
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

        {/* Month/Year toggle + Navigation */}
        <div className="expenses-nav-row">
          <div className="expenses-tab-toggle">
            <button
              className={`expenses-tab ${viewTab === 'month' ? 'expenses-tab--active' : ''}`}
              onClick={() => setViewTab('month')}
            >Month</button>
            <button
              className={`expenses-tab ${viewTab === 'year' ? 'expenses-tab--active' : ''}`}
              onClick={() => setViewTab('year')}
            >Year</button>
          </div>
          <div className="expenses-month-nav">
            <button className="expenses-month-nav__arrow" onClick={prevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="expenses-month-nav__label">{monthLabel}</span>
            <button className="expenses-month-nav__arrow" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {viewTab === 'month' ? (
        <>
          {/* ═══ Balance Card ═══ */}
          <div className="expenses-balance-card">
            <div className="expenses-balance-card__top">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-accent" />
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Monthly Balance</span>
              </div>
              <span className={`text-xl font-bold ${balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {balance >= 0 ? '+' : ''}{fmtIQD(balance)}
              </span>
            </div>
            <div className="expenses-balance-card__bar">
              <div className="expenses-balance-card__income-bar"
                style={{ width: totalIncome > 0 ? '100%' : '0' }} />
              <div className="expenses-balance-card__expense-bar"
                style={{ width: totalIncome > 0 ? `${Math.min(100, (totalExpense / totalIncome) * 100)}%` : '0' }} />
            </div>
            <div className="expenses-balance-card__legend">
              <span className="expenses-balance-card__legend-item">
                <span className="expenses-balance-card__legend-dot expenses-balance-card__legend-dot--income" />
                Income: {fmtIQD(totalIncome)}
              </span>
              <span className="expenses-balance-card__legend-item">
                <span className="expenses-balance-card__legend-dot expenses-balance-card__legend-dot--expense" />
                Spent: {fmtIQD(totalExpense)}
              </span>
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

          {/* ═══ Category Breakdown with progress bars ═══ */}
          {Object.keys(byCategory).length > 0 && (
            <div className="expenses-breakdown">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">By Category</h3>
              <div className="flex flex-col gap-1.5">
                {EXPENSE_CATEGORIES.filter(c => byCategory[c.id]).map(cat => {
                  const amount = byCategory[cat.id] || 0;
                  const pct = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
                  const budget = budgets.find(b => b.category === cat.id);
                  const CatIcon = cat.icon;
                  return (
                    <div key={cat.id} className="expense-category-row">
                      <div className="expense-category-row__left">
                        <div className="expense-category-row__icon" style={{ backgroundColor: cat.color + '18' }}>
                          <CatIcon className="w-3.5 h-3.5" style={{ color: cat.color }} />
                        </div>
                        <div className="expense-category-row__info">
                          <span className="expense-category-row__name">{cat.label}</span>
                          <div className="expense-category-row__bar-wrap">
                            <div className="expense-category-row__bar"
                              style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                          </div>
                        </div>
                      </div>
                      <div className="expense-category-row__right">
                        <span className="expense-category-row__amount">{fmtIQD(amount)}</span>
                        <span className="expense-category-row__pct">{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ Monthly Report Button ═══ */}
          <div className="expenses-report-row">
            <button
              className="expenses-report-btn"
              onClick={() => onNavigate?.('chat')}
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Monthly Report</span>
            </button>
          </div>

          {/* ═══ Transaction List ═══ */}
          <div className="expenses-list">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">Transactions</h3>
            {transactions.length === 0 ? (
              <div className="expenses-list-empty">
                <span className="expenses-list-empty__icon">💳</span>
                <p className="expenses-list-empty__title">No transactions this month</p>
                <p className="expenses-list-empty__sub">Tap Income or Expense to get started</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {transactions.map(exp => {
                  const isIncome = exp.type === 'income';
                  const source = isIncome ? INCOME_SOURCES.find(s => s.id === exp.category) : null;
                  const cat = isIncome
                    ? { icon: source?.icon || DollarSign, color: '#10b981', label: source?.label || 'Income' }
                    : EXPENSE_CATEGORIES.find(c => c.id === exp.category) || EXPENSE_CATEGORIES.at(-1);
                  const CatIcon = cat.icon;
                  return (
                    <div key={exp.id} className="expense-item">
                      <div className="expense-item__icon" style={{ backgroundColor: cat.color + '18' }}>
                        <CatIcon className="w-4 h-4" style={{ color: cat.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text truncate">{exp.note || cat.label}</p>
                        <p className="text-[10px] text-text-muted">{format(new Date(exp.date), 'MMM d')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${isIncome ? 'text-emerald-500' : 'text-text'}`}>
                          {isIncome ? '+' : '-'}{fmtIQD(exp.amount)}
                        </span>
                        <button onClick={() => deleteTransaction(exp.id)} className="expense-item__delete">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        /* ═══ Year Overview ═══ */
        <YearOverview year={monthDate.getFullYear()} />
      )}

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

/* ────── Year Overview Chart ────── */
function YearOverview({ year }) {
  const yearStart = `${year}-01-01`;
  const yearEnd   = `${year}-12-31`;

  const allTransactions = useLiveQuery(
    () => db.expenses.where('date').between(yearStart, yearEnd, true, true).toArray(),
    [yearStart, yearEnd]
  ) ?? [];

  const months = eachMonthOfInterval({
    start: new Date(year, 0, 1),
    end: new Date(year, 11, 31),
  });

  const monthlyData = months.map(m => {
    const key = format(m, 'yyyy-MM');
    const monthTxns = allTransactions.filter(t => t.date?.startsWith(key));
    const income  = monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { month: format(m, 'MMM'), income, expense };
  });

  const maxVal = Math.max(1, ...monthlyData.map(d => Math.max(d.income, d.expense)));

  const totalIncome  = monthlyData.reduce((s, d) => s + d.income, 0);
  const totalExpense = monthlyData.reduce((s, d) => s + d.expense, 0);

  return (
    <div className="year-overview">
      <h3 className="year-overview__title">{year} Overview</h3>

      <div className="year-overview__summary">
        <div className="year-overview__stat year-overview__stat--income">
          <span className="year-overview__stat-label">Total Income</span>
          <span className="year-overview__stat-value">{fmtIQD(totalIncome)}</span>
        </div>
        <div className="year-overview__stat year-overview__stat--expense">
          <span className="year-overview__stat-label">Total Expenses</span>
          <span className="year-overview__stat-value">{fmtIQD(totalExpense)}</span>
        </div>
      </div>

      <div className="year-chart">
        {monthlyData.map((d, i) => (
          <div key={i} className="year-chart__col">
            <div className="year-chart__bars">
              <div className="year-chart__bar year-chart__bar--income"
                style={{ height: `${(d.income / maxVal) * 100}%` }}
                title={`Income: ${fmtIQD(d.income)}`} />
              <div className="year-chart__bar year-chart__bar--expense"
                style={{ height: `${(d.expense / maxVal) * 100}%` }}
                title={`Expenses: ${fmtIQD(d.expense)}`} />
            </div>
            <span className="year-chart__label">{d.month}</span>
          </div>
        ))}
      </div>

      <div className="year-chart__legend">
        <span className="year-chart__legend-item">
          <span className="year-chart__legend-dot year-chart__legend-dot--income" />
          Income
        </span>
        <span className="year-chart__legend-item">
          <span className="year-chart__legend-dot year-chart__legend-dot--expense" />
          Expenses
        </span>
      </div>
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
      <div className="modal-content modal-content--wide" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text">💸 Log Expense</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-elevated transition-colors">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="expense-amount-wrap">
            <input
              autoFocus type="number" min="0" placeholder="Amount"
              value={amount} onChange={e => setAmount(e.target.value)}
              className="modal-input modal-input--amount"
            />
            <span className="expense-amount-wrap__currency">IQD</span>
          </div>

          {/* Category grid */}
          <div>
            <label className="text-xs font-semibold text-text-muted mb-1.5 block">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {EXPENSE_CATEGORIES.map(c => {
                const CIcon = c.icon;
                return (
                  <button key={c.id} type="button" onClick={() => setCategory(c.id)}
                    className={`expense-cat-btn ${category === c.id ? 'expense-cat-btn--active' : ''}`}>
                    <CIcon className="w-4 h-4" style={{ color: c.color }} />
                    <span>{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <input type="text" placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} className="modal-input" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="modal-input text-sm" />

          <button type="submit" className="expense-submit-btn expense-submit-btn--expense">
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
      <div className="modal-content modal-content--wide" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text">💰 Log Income</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-elevated transition-colors">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="expense-amount-wrap">
            <input
              autoFocus type="number" min="0" placeholder="Amount"
              value={amount} onChange={e => setAmount(e.target.value)}
              className="modal-input modal-input--amount"
            />
            <span className="expense-amount-wrap__currency">IQD</span>
          </div>

          {/* Source selector */}
          <div>
            <label className="text-xs font-semibold text-text-muted mb-1.5 block">Source</label>
            <div className="grid grid-cols-2 gap-2">
              {INCOME_SOURCES.map(s => {
                const SIcon = s.icon;
                return (
                  <button key={s.id} type="button" onClick={() => setSource(s.id)}
                    className={`expense-source-btn ${source === s.id ? 'expense-source-btn--active' : ''}`}>
                    <SIcon className="w-4 h-4" />
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <input type="text" placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} className="modal-input" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="modal-input text-sm" />

          <button type="submit" className="expense-submit-btn expense-submit-btn--income">
            Log Income
          </button>
        </form>
      </div>
    </div>
  );
}
