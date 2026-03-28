import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, endOfMonth, addMonths, subMonths, startOfYear, endOfYear, eachMonthOfInterval, eachDayOfInterval, startOfMonth, isToday, isYesterday, isSameDay, subDays } from 'date-fns';
import {
  Plus, TrendingUp, TrendingDown, Wallet, X, ArrowUpCircle, ArrowDownCircle,
  ShoppingCart, Utensils, Car, Home, Heart, Gamepad2, Smartphone, BookOpen,
  MoreHorizontal, PiggyBank, Briefcase, Gift, DollarSign, Target,
  ChevronLeft, ChevronRight, BarChart3, FileText, Sparkles, Calendar, Zap, AlertCircle,
} from 'lucide-react';
import db from '../../db/dexie';

/** Format number as IQD — no decimals, comma-separated */
function fmtIQD(n) {
  return Math.round(n).toLocaleString('en-US') + ' IQD';
}

/** Format compact number for stats */
function fmtCompact(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return n.toString();
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
 * Expenses View — Redesigned with Financial Editorial aesthetic.
 * Data-forward, typographic hierarchy, insight-rich sections.
 */
export default function ExpensesView({ onNavigate }) {
  const [showModal, setShowModal]       = useState(null); // 'expense' | 'income' | null
  const [filterMonth, setFilterMonth]   = useState(format(new Date(), 'yyyy-MM'));
  const [viewTab, setViewTab]           = useState('month'); // 'month' | 'year'
  const [transactionTab, setTransactionTab] = useState('timeline'); // 'timeline' | 'category' | 'chart'
  const [selectedReport, setSelectedReport] = useState(null); // For report detail modal
  const [selectedYearMonth, setSelectedYearMonth] = useState(null); // For yearly drill-down
  const [generatingReport, setGeneratingReport] = useState(false); // Loading state for report generation

  // Generate monthly report with AI analysis
  async function generateMonthlyReport() {
    if (generatingReport) return;
    setGeneratingReport(true);
    try {
      // Calculate totals by category
      const categoryTotals = {};
      let totalExpenses = 0;
      let totalIncome = 0;
      
      transactions.forEach(e => {
        const cat = (e.category || 'other').toLowerCase();
        if (e.type === 'expense') {
          categoryTotals[cat] = (categoryTotals[cat] || 0) + (e.amount || 0);
          totalExpenses += e.amount || 0;
        } else {
          totalIncome += e.amount || 0;
        }
      });
      
      // Build data for AI prompt
      const categoryBreakdown = Object.entries(categoryTotals)
        .map(([category, amount]) => ({ 
          category, 
          amount, 
          percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0 
        }))
        .sort((a, b) => b.amount - a.amount);
      
      // Call DeepSeek API for AI insights
      const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY;
      let aiInsights = [];
      let aiRecommendations = [];
      let aiSummary = '';
      
      if (DEEPSEEK_API_KEY) {
        try {
          const prompt = `You are a financial advisor. Analyze this monthly expense data and provide insights.

Month: ${monthLabel}
Total Income: ${fmtIQD(totalIncome)}
Total Expenses: ${fmtIQD(totalExpenses)}
Net Savings: ${fmtIQD(totalIncome - totalExpenses)} (${savingsRate}% savings rate)
Daily Average Spending: ${fmtIQD(dailyAverage)}
Transactions: ${transactions.length}

Category Breakdown:
${categoryBreakdown.map(c => `- ${c.category}: ${fmtIQD(c.amount)} (${c.percentage}%)`).join('\n')}

Top Spending: ${topCategoryInfo ? `${topCategoryInfo.label} at ${Math.round((topCategory[1] / totalExpense) * 100)}%` : 'N/A'}

Provide:
1. A brief 2-3 sentence summary of the month's financial health
2. 3 specific insights about spending patterns (each as a bullet point)
3. 2-3 actionable recommendations to improve finances (each as a bullet point)

Format your response as JSON:
{
  "summary": "your summary text",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "recommendations": ["rec 1", "rec 2", "rec 3"]
}`;

          const res = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
            },
            body: JSON.stringify({
              model: 'deepseek-chat',
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 1024,
            }),
          });
          
          if (res.ok) {
            const data = await res.json();
            const content = data.choices?.[0]?.message?.content || '';
            // Try to parse JSON from response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              aiSummary = parsed.summary || '';
              aiInsights = parsed.insights || [];
              aiRecommendations = parsed.recommendations || [];
            }
          }
        } catch (aiErr) {
          console.warn('AI analysis failed, using fallback', aiErr);
        }
      }
      
      // Fallback insights if AI didn't work
      if (aiInsights.length === 0) {
        aiInsights = [
          totalExpenses > totalIncome 
            ? `You spent ${fmtIQD(totalExpenses - totalIncome)} more than you earned this month.`
            : `Great job! You saved ${fmtIQD(totalIncome - totalExpenses)} this month (${savingsRate}% savings rate).`,
          `Your daily average spending was ${fmtIQD(dailyAverage)}.`,
          topCategoryInfo 
            ? `${topCategoryInfo.label} was your top spending category at ${Math.round((topCategory[1] / totalExpense) * 100)}% of total expenses.`
            : 'Your spending is distributed across multiple categories.',
        ];
      }
      
      if (aiRecommendations.length === 0) {
        aiRecommendations = [
          savingsRate < 20 && savingsRate >= 0 ? 'Try to increase your savings rate to at least 20%.' : 'Keep maintaining your good savings habits!',
          totalExpenses > totalIncome ? 'Consider reviewing your discretionary spending to balance your budget.' : 'Continue tracking your expenses to maintain financial awareness.',
        ].filter(Boolean);
      }
      
      // Build report
      const report = {
        month: filterMonth,
        title: `AI Report - ${monthLabel}`,
        summary: {
          totalExpenses,
          totalIncome,
          netSavings: totalIncome - totalExpenses,
          transactionCount: transactions.length,
          aiSummary,
        },
        categoryBreakdown,
        topSpendingCategories: categoryBreakdown.slice(0, 3).map(c => ({ category: c.category, amount: c.amount })),
        insights: aiInsights,
        recommendations: aiRecommendations,
        createdAt: Date.now(),
      };
      
      // Check if report exists for this month and update instead of creating duplicate
      const existingReport = monthlyReports.find(r => r.month === filterMonth);
      if (existingReport) {
        await db.monthlyReports.update(existingReport.id, report);
        console.log('[generateMonthlyReport] Updated existing report for', filterMonth);
      } else {
        await db.monthlyReports.add(report);
        console.log('[generateMonthlyReport] Created new report for', filterMonth);
      }
    } catch (err) {
      console.error('Failed to generate report', err);
    } finally {
      setGeneratingReport(false);
    }
  }

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

  // Use live query for real-time expense data
  const expenses = useLiveQuery(
    () => db.expenses.toArray(),
    []
  ) ?? [];
  
  // Filter from live data
  const transactions = useMemo(() => {
    return expenses
      .filter(e => e.date >= monthStart && e.date <= monthEnd)
      .sort((a, b) => {
        const dateCmp = b.date.localeCompare(a.date);
        if (dateCmp !== 0) return dateCmp;
        // Handle createdAt which could be Date, string, number, or undefined
        const toStr = (v) => {
          if (!v) return '';
          if (typeof v === 'string') return v;
          if (v instanceof Date) return v.toISOString();
          if (typeof v === 'number') return new Date(v).toISOString();
          return String(v);
        };
        return toStr(b.createdAt).localeCompare(toStr(a.createdAt));
      });
  }, [expenses, monthStart, monthEnd]);

  const budgets = useLiveQuery(
    () => db.budgets.where('month').equals(filterMonth).toArray(),
    [filterMonth]
  ) ?? [];

  // Monthly reports for this month
  const monthlyReports = useLiveQuery(
    () => db.monthlyReports.where('month').equals(filterMonth).toArray(),
    [filterMonth]
  ) ?? [];

  // ─── Core Aggregations ───
  const totalExpense = transactions.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  const totalIncome  = transactions.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const balance      = totalIncome - totalExpense;
  
  // ─── Derived Insights ───
  const daysInMonth = eachDayOfInterval({ start: new Date(monthStart), end: new Date(monthEnd) }).length;
  const daysPassed = eachDayOfInterval({ start: new Date(monthStart), end: new Date() }).length;
  const dailyAverage = daysPassed > 0 ? Math.round(totalExpense / daysPassed) : 0;
  const savingsRate = totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0;
  const transactionCount = transactions.length;
  
  // Top spending category
  const byCategory = useMemo(() => {
    const map = {};
    transactions.filter(e => e.type === 'expense').forEach(e => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return map;
  }, [transactions]);
  
  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
  const topCategoryInfo = topCategory ? EXPENSE_CATEGORIES.find(c => c.id === topCategory[0]) : null;
  
  // Highest spending day
  const spendingByDay = useMemo(() => {
    const map = {};
    transactions.filter(e => e.type === 'expense').forEach(e => {
      map[e.date] = (map[e.date] || 0) + e.amount;
    });
    return map;
  }, [transactions]);
  
  const highestSpendingDay = Object.entries(spendingByDay).sort((a, b) => b[1] - a[1])[0];
  
  // ─── Group transactions by date ───
  const transactionsByDate = useMemo(() => {
    const groups = {};
    transactions.forEach(t => {
      if (!groups[t.date]) groups[t.date] = [];
      groups[t.date].push(t);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [transactions]);

  async function addTransaction(data) {
    const sanitizedData = {
      ...data,
      category: (data.category || 'other').toLowerCase(),
      createdAt: new Date().toISOString()
    };
    await db.expenses.add(sanitizedData);
    setShowModal(null);
  }

  async function deleteTransaction(id) {
    await db.expenses.delete(id);
  }

  async function deleteReport(id) {
    await db.monthlyReports.delete(id);
  }

  // ─── Insight Cards Data ───
  const insights = useMemo(() => {
    const cards = [];
    
    if (savingsRate < 0) {
      cards.push({
        type: 'warning',
        icon: AlertCircle,
        title: 'Overspending',
        message: `You've spent ${fmtIQD(Math.abs(balance))} more than your income this month.`,
        color: '#ef4444'
      });
    } else if (savingsRate > 30) {
      cards.push({
        type: 'success',
        icon: TrendingUp,
        title: 'Great Savings',
        message: `${savingsRate}% savings rate — you're building wealth!`,
        color: '#10b981'
      });
    }
    
    if (topCategoryInfo && topCategory[1] > totalExpense * 0.4) {
      cards.push({
        type: 'info',
        icon: topCategoryInfo.icon,
        title: `${topCategoryInfo.label} Dominant`,
        message: `${Math.round((topCategory[1] / totalExpense) * 100)}% of spending in one category.`,
        color: topCategoryInfo.color
      });
    }
    
    if (dailyAverage > 0) {
      const projected = dailyAverage * daysInMonth;
      if (projected > totalIncome * 0.9 && totalIncome > 0) {
        cards.push({
          type: 'warning',
          icon: Calendar,
          title: 'Budget Alert',
          message: `At this pace, you'll spend ${fmtIQD(projected)} by month end.`,
          color: '#f97316'
        });
      }
    }
    
    return cards.slice(0, 2); // Max 2 insights
  }, [savingsRate, balance, topCategory, topCategoryInfo, totalExpense, dailyAverage, daysInMonth, totalIncome]);

  return (
    <div className="expenses-view">
      {/* ═══ Hero Header ═══ */}
      <header className="expenses-hero">
        <div className="expenses-hero__top">
          <div className="expenses-hero__title-row">
            <h1 className="expenses-hero__title">Expenses</h1>
            <div className="expenses-hero__actions">
              <button onClick={() => setShowModal('income')}
                className="expenses-action-btn expenses-action-btn--income">
                <ArrowUpCircle className="w-4 h-4" />
                <span>Income</span>
              </button>
              <button onClick={() => setShowModal('expense')}
                className="expenses-action-btn expenses-action-btn--expense">
                <ArrowDownCircle className="w-4 h-4" />
                <span>Expense</span>
              </button>
            </div>
          </div>
          
          {/* Month Navigation */}
          <div className="expenses-hero__nav">
            <div className="expenses-tab-group">
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
              <button className="expenses-month-arrow" onClick={prevMonth}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="expenses-month-label">{monthLabel}</span>
              <button className="expenses-month-arrow" onClick={nextMonth}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {viewTab === 'month' ? (
        <>
          {/* ═══ Balance Hero Card ═══ */}
          <div className="expenses-balance-hero">
            <div className="balance-hero__main">
              <div className="balance-hero__label">
                <Wallet className="w-4 h-4" />
                <span>Monthly Balance</span>
              </div>
              <div className={`balance-hero__amount ${balance >= 0 ? 'balance-hero__amount--positive' : 'balance-hero__amount--negative'}`}>
                {balance >= 0 ? '+' : ''}{fmtIQD(balance)}
              </div>
            </div>
            
            <div className="balance-hero__flow">
              <div className="balance-flow__item balance-flow__item--income">
                <div className="balance-flow__icon">
                  <ArrowUpCircle className="w-3.5 h-3.5" />
                </div>
                <div className="balance-flow__content">
                  <span className="balance-flow__label">Income</span>
                  <span className="balance-flow__value">{fmtIQD(totalIncome)}</span>
                </div>
              </div>
              <div className="balance-flow__divider" />
              <div className="balance-flow__item balance-flow__item--expense">
                <div className="balance-flow__icon">
                  <ArrowDownCircle className="w-3.5 h-3.5" />
                </div>
                <div className="balance-flow__content">
                  <span className="balance-flow__label">Spent</span>
                  <span className="balance-flow__value">{fmtIQD(totalExpense)}</span>
                </div>
              </div>
            </div>
            
            {/* Progress bar showing spending ratio */}
            <div className="balance-hero__progress">
              <div className="balance-progress__track">
                <div 
                  className="balance-progress__fill"
                  style={{ width: totalIncome > 0 ? `${Math.min(100, (totalExpense / totalIncome) * 100)}%` : '0%' }}
                />
              </div>
              <div className="balance-progress__labels">
                <span>{totalIncome > 0 ? Math.round((totalExpense / totalIncome) * 100) : 0}% of income spent</span>
                <span>{savingsRate >= 0 ? `${savingsRate}% saved` : '0% saved'}</span>
              </div>
            </div>
          </div>

          {/* ═══ Quick Stats Grid ═══ */}
          <div className="expenses-stats-grid">
            <div className="expense-stat-card">
              <div className="expense-stat-card__icon">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="expense-stat-card__content">
                <span className="expense-stat-card__value">{fmtIQD(dailyAverage)}</span>
                <span className="expense-stat-card__label">Daily Avg</span>
              </div>
            </div>
            <div className="expense-stat-card">
              <div className="expense-stat-card__icon expense-stat-card__icon--accent">
                <PiggyBank className="w-4 h-4" />
              </div>
              <div className="expense-stat-card__content">
                <span className="expense-stat-card__value">{savingsRate}%</span>
                <span className="expense-stat-card__label">Savings Rate</span>
              </div>
            </div>
            <div className="expense-stat-card">
              <div className="expense-stat-card__icon">
                {topCategoryInfo ? (
                  <topCategoryInfo.icon className="w-4 h-4" style={{ color: topCategoryInfo.color }} />
                ) : (
                  <Target className="w-4 h-4" />
                )}
              </div>
              <div className="expense-stat-card__content">
                <span className="expense-stat-card__value">{topCategoryInfo?.label || '—'}</span>
                <span className="expense-stat-card__label">Top Category</span>
              </div>
            </div>
            <div className="expense-stat-card">
              <div className="expense-stat-card__icon">
                <FileText className="w-4 h-4" />
              </div>
              <div className="expense-stat-card__content">
                <span className="expense-stat-card__value">{transactionCount}</span>
                <span className="expense-stat-card__label">Transactions</span>
              </div>
            </div>
          </div>

          {/* ═══ Insights Section ═══ */}
          {insights.length > 0 && (
            <div className="expenses-insights">
              {insights.map((insight, i) => {
                const Icon = insight.icon;
                return (
                  <div key={i} className="expense-insight-card" style={{ borderLeftColor: insight.color }}>
                    <Icon className="w-4 h-4" style={{ color: insight.color }} />
                    <div className="expense-insight-card__content">
                      <span className="expense-insight-card__title">{insight.title}</span>
                      <span className="expense-insight-card__message">{insight.message}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ═══ AI Monthly Reports ═══ */}
          <section className="expenses-section">
            <div className="expenses-section__header">
              <h2 className="expenses-section__title">
                <Sparkles className="w-4 h-4 inline mr-2" />
                AI Monthly Reports
              </h2>
              <span className="expenses-section__meta">{monthlyReports.length} report{monthlyReports.length > 1 ? 's' : ''}</span>
            </div>
            
            {/* Generate Report Button - at top of section */}
            <div className="expenses-ai-report expenses-ai-report--top">
              <button 
                className="expenses-ai-btn" 
                onClick={generateMonthlyReport}
                disabled={generatingReport || transactions.length === 0}
              >
                <Sparkles className="w-4 h-4" />
                <span>{generatingReport ? 'Generating AI Report...' : monthlyReports.length > 0 ? 'Regenerate Report' : 'Generate AI Report'}</span>
                {!generatingReport && <Zap className="w-3.5 h-3.5 expenses-ai-btn__spark" />}
              </button>
              {transactions.length === 0 && (
                <p className="expenses-ai-report__hint">Add transactions first to generate a report</p>
              )}
            </div>
            
            {monthlyReports.length > 0 && (
              <div className="expenses-reports-grid">
                {monthlyReports.map(report => (
                  <div key={report.id} className="expense-report-card expense-report-card--clickable" onClick={() => setSelectedReport(report)}>
                    <div className="expense-report-card__header">
                      <h3 className="expense-report-card__title">{report.title}</h3>
                      <div className="expense-report-card__header-actions">
                        <span className="expense-report-card__date">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </span>
                        <button 
                          className="expense-report-card__delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteReport(report.id);
                          }}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="expense-report-card__summary">
                      <div className="expense-report-stat">
                        <span className="expense-report-stat__value">{fmtIQD(report.summary?.totalExpenses || 0)}</span>
                        <span className="expense-report-stat__label">Total Spent</span>
                      </div>
                      <div className="expense-report-stat">
                        <span className="expense-report-stat__value">{fmtIQD(report.summary?.totalIncome || 0)}</span>
                        <span className="expense-report-stat__label">Income</span>
                      </div>
                      <div className="expense-report-stat">
                        <span className={`expense-report-stat__value ${(report.summary?.netSavings || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {fmtIQD(report.summary?.netSavings || 0)}
                        </span>
                        <span className="expense-report-stat__label">Net Savings</span>
                      </div>
                    </div>
                    {report.categoryBreakdown && report.categoryBreakdown.length > 0 && (
                      <div className="expense-report-card__categories">
                        <span className="expense-report-card__label">Top Categories:</span>
                        <div className="expense-report-categories">
                          {report.categoryBreakdown.slice(0, 4).map((cat, i) => (
                            <span key={i} className="expense-report-category-tag">
                              {cat.category}: {fmtIQD(cat.amount)} ({cat.percentage}%)
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="expense-report-card__action">
                      <span>Click to view full report →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ═══ Transaction Timeline ═══ */}
          <section className="expenses-section expenses-section--transactions">
            <div className="expenses-section__header">
              <h2 className="expenses-section__title">Transactions</h2>
              <span className="expenses-section__meta">{transactionCount} total</span>
            </div>
            
            {/* Tab Navigation */}
            <div className="expenses-txn-tabs">
              <button 
                className={`expenses-txn-tab ${transactionTab === 'timeline' ? 'expenses-txn-tab--active' : ''}`}
                onClick={() => setTransactionTab('timeline')}
              >
                <FileText className="w-3.5 h-3.5" />
                Timeline
              </button>
              <button 
                className={`expenses-txn-tab ${transactionTab === 'category' ? 'expenses-txn-tab--active' : ''}`}
                onClick={() => setTransactionTab('category')}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                By Category
              </button>
              <button 
                className={`expenses-txn-tab ${transactionTab === 'chart' ? 'expenses-txn-tab--active' : ''}`}
                onClick={() => setTransactionTab('chart')}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Chart
              </button>
            </div>
            
            {transactions.length === 0 ? (
              <div className="expenses-empty-state">
                <div className="expenses-empty-state__icon">💳</div>
                <p className="expenses-empty-state__title">No transactions yet</p>
                <p className="expenses-empty-state__subtitle">Add your first income or expense to get started</p>
              </div>
            ) : transactionTab === 'timeline' ? (
              /* Timeline View - by date */
              <div className="expenses-timeline">
                {transactionsByDate.map(([date, dayTxns]) => {
                  const dateObj = new Date(date);
                  const isTodayDate = isToday(dateObj);
                  const isYesterdayDate = isYesterday(dateObj);
                  const dayTotal = dayTxns.reduce((s, t) => s + (t.type === 'expense' ? -t.amount : t.amount), 0);
                  
                  return (
                    <div key={date} className="expenses-timeline__day">
                      <div className="expenses-timeline__header">
                        <div className="expenses-timeline__date">
                          <span className="expenses-timeline__day-num">{format(dateObj, 'd')}</span>
                          <div className="expenses-timeline__day-info">
                            <span className="expenses-timeline__day-name">
                              {isTodayDate ? 'Today' : isYesterdayDate ? 'Yesterday' : format(dateObj, 'EEEE')}
                            </span>
                            <span className="expenses-timeline__month">{format(dateObj, 'MMM')}</span>
                          </div>
                        </div>
                        <div className={`expenses-timeline__day-total ${dayTotal >= 0 ? 'expenses-timeline__day-total--positive' : ''}`}>
                          {dayTotal >= 0 ? '+' : ''}{fmtCompact(Math.abs(dayTotal))} IQD
                        </div>
                      </div>
                      <div className="expenses-timeline__items">
                        {dayTxns.map(txn => {
                          const isIncome = txn.type === 'income';
                          const source = isIncome ? INCOME_SOURCES.find(s => s.id === txn.category) : null;
                          const cat = isIncome
                            ? { icon: source?.icon || DollarSign, color: '#10b981', label: source?.label || 'Income' }
                            : EXPENSE_CATEGORIES.find(c => c.id === txn.category) || EXPENSE_CATEGORIES.at(-1);
                          const CatIcon = cat.icon;
                          
                          return (
                            <div key={txn.id} className="expense-txn-item">
                              <div className="expense-txn-item__icon" style={{ backgroundColor: cat.color + '15' }}>
                                <CatIcon className="w-4 h-4" style={{ color: cat.color }} />
                              </div>
                              <div className="expense-txn-item__content">
                                <span className="expense-txn-item__note">{txn.note || cat.label}</span>
                              </div>
                              <div className="expense-txn-item__right">
                                <span className={`expense-txn-item__amount ${isIncome ? 'expense-txn-item__amount--income' : ''}`}>
                                  {isIncome ? '+' : '-'}{fmtIQD(txn.amount)}
                                </span>
                                <button 
                                  onClick={() => deleteTransaction(txn.id)} 
                                  className="expense-txn-item__delete"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : transactionTab === 'category' ? (
              /* By Category List View */
              <div className="expenses-category-groups">
                {EXPENSE_CATEGORIES
                  .filter(cat => transactions.some(t => t.category === cat.id && t.type === 'expense'))
                  .sort((a, b) => (byCategory[b.id] || 0) - (byCategory[a.id] || 0))
                  .map(cat => {
                    const catTxns = transactions.filter(t => t.category === cat.id && t.type === 'expense');
                    const catTotal = byCategory[cat.id] || 0;
                    const CatIcon = cat.icon;
                    
                    return (
                      <div key={cat.id} className="expenses-category-group">
                        <div className="expenses-category-group__header" style={{ borderLeftColor: cat.color }}>
                          <div className="expenses-category-group__icon" style={{ backgroundColor: cat.color + '15' }}>
                            <CatIcon className="w-4 h-4" style={{ color: cat.color }} />
                          </div>
                          <div className="expenses-category-group__info">
                            <span className="expenses-category-group__name">{cat.label}</span>
                            <span className="expenses-category-group__count">{catTxns.length} transaction{catTxns.length > 1 ? 's' : ''}</span>
                          </div>
                          <span className="expenses-category-group__total">{fmtIQD(catTotal)}</span>
                        </div>
                        <div className="expenses-category-group__items">
                          {catTxns.map(txn => (
                            <div key={txn.id} className="expense-txn-item expense-txn-item--compact">
                              <div className="expense-txn-item__content">
                                <span className="expense-txn-item__note">{txn.note || cat.label}</span>
                                <span className="expense-txn-item__date">{format(new Date(txn.date), 'MMM d')}</span>
                              </div>
                              <div className="expense-txn-item__right">
                                <span className="expense-txn-item__amount">-{fmtIQD(txn.amount)}</span>
                                <button 
                                  onClick={() => deleteTransaction(txn.id)} 
                                  className="expense-txn-item__delete"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                
                {/* Income Section */}
                {transactions.some(t => t.type === 'income') && (
                  <div className="expenses-category-group">
                    <div className="expenses-category-group__header" style={{ borderLeftColor: '#10b981' }}>
                      <div className="expenses-category-group__icon" style={{ backgroundColor: '#10b98115' }}>
                        <ArrowUpCircle className="w-4 h-4" style={{ color: '#10b981' }} />
                      </div>
                      <div className="expenses-category-group__info">
                        <span className="expenses-category-group__name">Income</span>
                        <span className="expenses-category-group__count">
                          {transactions.filter(t => t.type === 'income').length} transaction{transactions.filter(t => t.type === 'income').length > 1 ? 's' : ''}
                        </span>
                      </div>
                      <span className="expenses-category-group__total expenses-category-group__total--income">
                        +{fmtIQD(totalIncome)}
                      </span>
                    </div>
                    <div className="expenses-category-group__items">
                      {transactions.filter(t => t.type === 'income').map(txn => {
                        const source = INCOME_SOURCES.find(s => s.id === txn.category);
                        return (
                          <div key={txn.id} className="expense-txn-item expense-txn-item--compact">
                            <div className="expense-txn-item__content">
                              <span className="expense-txn-item__note">{txn.note || source?.label || 'Income'}</span>
                              <span className="expense-txn-item__date">{format(new Date(txn.date), 'MMM d')}</span>
                            </div>
                            <div className="expense-txn-item__right">
                              <span className="expense-txn-item__amount expense-txn-item__amount--income">+{fmtIQD(txn.amount)}</span>
                              <button 
                                onClick={() => deleteTransaction(txn.id)} 
                                className="expense-txn-item__delete"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Chart View - visual bars */
              <div className="expenses-chart-view">
                <div className="expenses-chart-bars">
                  {EXPENSE_CATEGORIES
                    .filter(cat => byCategory[cat.id])
                    .sort((a, b) => (byCategory[b.id] || 0) - (byCategory[a.id] || 0))
                    .map(cat => {
                      const amount = byCategory[cat.id] || 0;
                      const pct = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
                      const CatIcon = cat.icon;
                      
                      return (
                        <div key={cat.id} className="expenses-chart-bar">
                          <div className="expenses-chart-bar__header">
                            <div className="expenses-chart-bar__icon" style={{ backgroundColor: cat.color + '20' }}>
                              <CatIcon className="w-4 h-4" style={{ color: cat.color }} />
                            </div>
                            <div className="expenses-chart-bar__info">
                              <span className="expenses-chart-bar__label">{cat.label}</span>
                              <span className="expenses-chart-bar__amount">{fmtIQD(amount)}</span>
                            </div>
                            <span className="expenses-chart-bar__pct">{pct.toFixed(0)}%</span>
                          </div>
                          <div className="expenses-chart-bar__track">
                            <div 
                              className="expenses-chart-bar__fill"
                              style={{ width: `${pct}%`, backgroundColor: cat.color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
                
                {/* Income Summary */}
                {totalIncome > 0 && (
                  <div className="expenses-chart-summary">
                    <div className="expenses-chart-summary__item expenses-chart-summary__item--income">
                      <ArrowUpCircle className="w-4 h-4" />
                      <span className="expenses-chart-summary__label">Total Income</span>
                      <span className="expenses-chart-summary__value">+{fmtIQD(totalIncome)}</span>
                    </div>
                    <div className="expenses-chart-summary__item expenses-chart-summary__item--expense">
                      <ArrowDownCircle className="w-4 h-4" />
                      <span className="expenses-chart-summary__label">Total Spent</span>
                      <span className="expenses-chart-summary__value">-{fmtIQD(totalExpense)}</span>
                    </div>
                    <div className={`expenses-chart-summary__item ${balance >= 0 ? 'expenses-chart-summary__item--positive' : 'expenses-chart-summary__item--negative'}`}>
                      <Wallet className="w-4 h-4" />
                      <span className="expenses-chart-summary__label">Balance</span>
                      <span className="expenses-chart-summary__value">{balance >= 0 ? '+' : ''}{fmtIQD(balance)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </>
      ) : (
        <YearOverview year={monthDate.getFullYear()} onMonthClick={(month) => {
          setFilterMonth(month);
          setViewTab('month');
        }} />
      )}

      {/* ═══ Modals ═══ */}
      {showModal === 'expense' && (
        <AddExpenseModal onSave={addTransaction} onClose={() => setShowModal(null)} />
      )}
      {showModal === 'income' && (
        <AddIncomeModal onSave={addTransaction} onClose={() => setShowModal(null)} />
      )}
      {selectedReport && (
        <ReportDetailModal report={selectedReport} onClose={() => setSelectedReport(null)} />
      )}
    </div>
  );
}

/* ────── Year Overview Chart ────── */
function YearOverview({ year, onMonthClick }) {
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
    return { month: format(m, 'MMM'), key, income, expense };
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
          <div key={i} className="year-chart__col year-chart__col--clickable" onClick={() => onMonthClick?.(d.key)}>
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
      
      <p className="year-chart__hint">Click any month to see details</p>
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

/* ────── Report Detail Modal ────── */
function ReportDetailModal({ report, onClose }) {
  if (!report) return null;
  
  const summary = report.summary || {};
  const categories = report.categoryBreakdown || [];
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--report" onClick={e => e.stopPropagation()}>
        <div className="report-modal__header">
          <div>
            <h2 className="report-modal__title">{report.title}</h2>
            <span className="report-modal__date">{report.month}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-elevated transition-colors">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>
        
        {/* Summary Stats */}
        <div className="report-modal__section">
          <h3 className="report-modal__section-title">📊 Summary</h3>
          {summary.aiSummary && (
            <p className="report-modal__ai-summary">{summary.aiSummary}</p>
          )}
          <div className="report-modal__stats-grid">
            <div className="report-modal__stat">
              <span className="report-modal__stat-value">{fmtIQD(summary.totalExpenses || 0)}</span>
              <span className="report-modal__stat-label">Total Expenses</span>
            </div>
            <div className="report-modal__stat">
              <span className="report-modal__stat-value">{fmtIQD(summary.totalIncome || 0)}</span>
              <span className="report-modal__stat-label">Total Income</span>
            </div>
            <div className="report-modal__stat">
              <span className={`report-modal__stat-value ${(summary.netSavings || 0) >= 0 ? 'report-modal__stat-value--positive' : 'report-modal__stat-value--negative'}`}>
                {fmtIQD(summary.netSavings || 0)}
              </span>
              <span className="report-modal__stat-label">Net Savings</span>
            </div>
            <div className="report-modal__stat">
              <span className="report-modal__stat-value">{summary.transactionCount || 0}</span>
              <span className="report-modal__stat-label">Transactions</span>
            </div>
          </div>
        </div>
        
        {/* Category Breakdown */}
        {categories.length > 0 && (
          <div className="report-modal__section">
            <h3 className="report-modal__section-title">🏷️ Category Breakdown</h3>
            <div className="report-modal__categories">
              {categories.map((cat, i) => {
                const catInfo = EXPENSE_CATEGORIES.find(c => c.id === cat.category);
                const Icon = catInfo?.icon || MoreHorizontal;
                return (
                  <div key={i} className="report-modal__category-row">
                    <div className="report-modal__category-info">
                      <Icon className="w-4 h-4" style={{ color: catInfo?.color || '#6b7280' }} />
                      <span className="report-modal__category-name">{catInfo?.label || cat.category}</span>
                    </div>
                    <div className="report-modal__category-bar">
                      <div 
                        className="report-modal__category-fill" 
                        style={{ width: `${cat.percentage}%`, backgroundColor: catInfo?.color || '#6b7280' }}
                      />
                    </div>
                    <div className="report-modal__category-amounts">
                      <span className="report-modal__category-amount">{fmtIQD(cat.amount)}</span>
                      <span className="report-modal__category-pct">{cat.percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Top Spending */}
        {report.topSpendingCategories && report.topSpendingCategories.length > 0 && (
          <div className="report-modal__section">
            <h3 className="report-modal__section-title">🔥 Top Spending</h3>
            <div className="report-modal__top-list">
              {report.topSpendingCategories.map((cat, i) => (
                <div key={i} className="report-modal__top-item">
                  <span className="report-modal__top-rank">#{i + 1}</span>
                  <span className="report-modal__top-name">{cat.category}</span>
                  <span className="report-modal__top-amount">{fmtIQD(cat.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Insights */}
        {report.insights && report.insights.length > 0 && (
          <div className="report-modal__section">
            <h3 className="report-modal__section-title">💡 Insights</h3>
            <ul className="report-modal__insights">
              {report.insights.map((insight, i) => (
                <li key={i} className="report-modal__insight-item">
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Recommendations */}
        {report.recommendations && report.recommendations.length > 0 && (
          <div className="report-modal__section">
            <h3 className="report-modal__section-title">✨ Recommendations</h3>
            <ul className="report-modal__recommendations">
              {report.recommendations.map((rec, i) => (
                <li key={i} className="report-modal__rec-item">
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
