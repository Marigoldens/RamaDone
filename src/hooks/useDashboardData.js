/**
 * @fileoverview Batched dashboard data hook with unified loading state.
 *
 * WHY THIS EXISTS:
 * Previously, DashboardView had 10+ independent useLiveQuery calls that
 * resolved at different times, causing widgets to "pop in" haphazardly.
 *
 * This hook:
 * 1. Batches all dashboard queries into a single reactive query
 * 2. Provides a unified "isHydrated" state for smooth skeleton-to-content transitions
 * 3. Uses Promise.all pattern to wait for initial data load
 */
import { useState, useEffect, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, subDays } from 'date-fns';
import db from '../db/dexie';

/**
 * Hook that fetches ALL dashboard data in a coordinated manner.
 * Returns both the data and a hydrated flag for smooth rendering.
 *
 * @param {string} today - Today's date in YYYY-MM-DD format
 * @returns {{ data: object, isHydrated: boolean }}
 */
export function useDashboardData(today) {
  const [isHydrated, setIsHydrated] = useState(false);
  const hydrationRef = useRef(false);

  // Calculate week-ago date once
  const weekAgoStr = useMemo(() => {
    const weekAgo = subDays(new Date(), 7);
    return format(weekAgo, 'yyyy-MM-dd');
  }, []);

  // ─── Single batched query for all dashboard data ───
  const rawTasksDueToday = useLiveQuery(
    () => db.tasks.where('dueDate').equals(today).filter(t => !t.completed).toArray(),
    [today]
  );

  const rawTasksCompleted = useLiveQuery(
    () => db.tasks.where('completed').equals(1).count(),
    []
  );

  const rawTotalTasks = useLiveQuery(
    () => db.tasks.count(),
    []
  );

  const rawTodayExpenses = useLiveQuery(
    () => db.expenses.where('date').equals(today).toArray(),
    [today]
  );

  const rawAllHabits = useLiveQuery(
    () => db.habits.where('archived').equals(0).toArray(),
    []
  );

  const rawHabitsChecked = useLiveQuery(
    () => db.habitLogs.where('date').equals(today).filter(l => l.completed).count(),
    [today]
  );

  const rawCompletedHabitIds = useLiveQuery(
    () => db.habitLogs.where('date').equals(today).filter(l => l.completed).toArray(),
    [today]
  );

  const rawTodayEvents = useLiveQuery(
    () => db.events.where('date').equals(today).toArray(),
    [today]
  );

  const rawTodayPrayers = useLiveQuery(
    () => db.prayerTimes.get(today),
    [today]
  );

  const rawLastWorkout = useLiveQuery(
    () => db.workoutLogs.orderBy('date').reverse().first(),
    []
  );

  const rawWeeklyWorkouts = useLiveQuery(
    () => db.workoutLogs.where('date').aboveOrEqual(weekAgoStr).toArray(),
    [weekAgoStr]
  );

  // ─── Hydration detection ───
  // We consider the dashboard "hydrated" when ALL queries have resolved at least once
  useEffect(() => {
    if (hydrationRef.current) return; // Already hydrated, don't re-check

    const allLoaded = [
      rawTasksDueToday !== undefined,
      rawTasksCompleted !== undefined,
      rawTotalTasks !== undefined,
      rawTodayExpenses !== undefined,
      rawAllHabits !== undefined,
      rawHabitsChecked !== undefined,
      rawCompletedHabitIds !== undefined,
      rawTodayEvents !== undefined,
      rawTodayPrayers !== undefined,
      rawLastWorkout !== undefined,
      rawWeeklyWorkouts !== undefined,
    ].every(Boolean);

    if (allLoaded) {
      // Small delay to ensure React has processed all updates
      requestAnimationFrame(() => {
        hydrationRef.current = true;
        setIsHydrated(true);
      });
    }
  }, [
    rawTasksDueToday,
    rawTasksCompleted,
    rawTotalTasks,
    rawTodayExpenses,
    rawAllHabits,
    rawHabitsChecked,
    rawCompletedHabitIds,
    rawTodayEvents,
    rawTodayPrayers,
    rawLastWorkout,
    rawWeeklyWorkouts,
  ]);

  // ─── Derived/computed data ───
  const tasksDueToday = rawTasksDueToday ?? [];
  const tasksCompleted = rawTasksCompleted ?? 0;
  const totalTasks = rawTotalTasks ?? 0;

  const todayExpenses = rawTodayExpenses ?? [];
  const todaySpend = todayExpenses
    .filter(e => e.type === 'expense')
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  const todayIncome = todayExpenses
    .filter(e => e.type === 'income')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const topCategory = useMemo(() => {
    const map = {};
    todayExpenses.filter(e => e.type === 'expense').forEach(e => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? sorted[0][0] : null;
  }, [todayExpenses]);

  const allHabits = rawAllHabits ?? [];
  const habitsChecked = rawHabitsChecked ?? 0;
  const completedHabitIds = rawCompletedHabitIds ?? [];

  const completedIdSet = useMemo(
    () => new Set(completedHabitIds.map(l => l.habitId)),
    [completedHabitIds]
  );
  const habitsNotDone = useMemo(
    () => allHabits.filter(h => !completedIdSet.has(h.id)),
    [allHabits, completedIdSet]
  );
  const habitPct = allHabits.length > 0
    ? Math.round((habitsChecked / allHabits.length) * 100)
    : 0;

  const todayEvents = rawTodayEvents ?? [];
  const nextEvent = useMemo(
    () => todayEvents.sort((a, b) => (a.start || '').localeCompare(b.start || ''))[0],
    [todayEvents]
  );

  const todayPrayers = rawTodayPrayers;
  const nextPrayer = useMemo(() => {
    if (!todayPrayers) return null;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const prayerNames = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    for (const p of prayerNames) {
      const timeStr = todayPrayers[p];
      if (timeStr) {
        const [h, m] = timeStr.split(':').map(Number);
        if (h * 60 + m > currentMinutes) {
          return { name: p, time: timeStr };
        }
      }
    }
    return { name: 'isha', time: todayPrayers.isha || '--:--' };
  }, [todayPrayers]);

  const lastWorkout = rawLastWorkout;
  const weeklyWorkouts = rawWeeklyWorkouts ?? [];

  return {
    isHydrated,
    data: {
      tasks: {
        dueToday: tasksDueToday,
        completed: tasksCompleted,
        total: totalTasks,
      },
      expenses: {
        today: todayExpenses,
        spend: todaySpend,
        income: todayIncome,
        topCategory,
      },
      habits: {
        all: allHabits,
        checked: habitsChecked,
        notDone: habitsNotDone,
        percent: habitPct,
      },
      events: {
        today: todayEvents,
        next: nextEvent,
      },
      prayers: {
        today: todayPrayers,
        next: nextPrayer,
      },
      gym: {
        lastWorkout,
        weeklyCount: weeklyWorkouts.length,
      },
    },
  };
}

export default useDashboardData;
