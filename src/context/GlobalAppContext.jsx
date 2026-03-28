/**
 * @fileoverview Global App Context - Preloads ALL app data upfront.
 *
 * HOW IT WORKS:
 * 1. On app mount, fetch ALL data from IndexedDB into memory
 * 2. Store in React context for instant access
 * 3. All views read from context (no loading states per page)
 * 4. Dexie live queries keep context synced in background
 * 5. Prayer times are pre-synced for entire month with delta updates
 *
 * RESULT: Zero loading time on every page - everything is pre-cached.
 */
import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, subDays, startOfMonth, endOfMonth, addMonths, isSameMonth, startOfWeek, endOfWeek } from 'date-fns';
import db from '../db/dexie';
import { fetchMonthPrayerTimes, parsePrayerTime } from '../services/prayerService';

const GlobalAppContext = createContext(null);

/**
 * Hook to access globally cached app data.
 * Returns instantly - no loading states needed.
 */
export function useGlobalApp() {
  const context = useContext(GlobalAppContext);
  if (!context) {
    throw new Error('useGlobalApp must be used within GlobalAppProvider');
  }
  return context;
}

/**
 * Provider that preloads all app data on startup.
 * Shows loading splash only once, then everything is instant.
 */
export function GlobalAppProvider({ children }) {
  const [isPreloaded, setIsPreloaded] = useState(false);
  
  // ─── Cached Data State ───
  const [tasks, setTasks] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [habits, setHabits] = useState([]);
  const [habitLogs, setHabitLogs] = useState([]);
  const [events, setEvents] = useState([]);
  const [prayerTimes, setPrayerTimes] = useState([]);
  const [workoutLogs, setWorkoutLogs] = useState([]);
  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [preferences, setPreferences] = useState({});
  const [chatSessions, setChatSessions] = useState([]);
  
  // ─── Sidebar UI State ───
  const [starredCollapsed, setStarredCollapsed] = useState(() => {
    const saved = localStorage.getItem('chat-sidebar-starred-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  
  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem('chat-sidebar-starred-collapsed', JSON.stringify(starredCollapsed));
  }, [starredCollapsed]);
  
  // Track last synced prayer month/method to avoid redundant API calls
  const lastPrayerSyncRef = useRef({ month: null, year: null, method: null, lat: null, lon: null });

  // ─── Preload ALL data on mount ───
  useEffect(() => {
    async function preloadAllData() {
      try {
        const now = new Date();
        const currentMonth = startOfMonth(now);
        const currentMonthStr = format(currentMonth, 'yyyy-MM');
        const monthStart = format(currentMonth, 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
        
        // Fetch everything in parallel
        const [
          allTasks,
          allExpenses,
          allHabits,
          allHabitLogs,
          allEvents,
          allPrayerTimes,
          allWorkoutLogs,
          allWorkoutPlans,
          allPrefs,
          allChatSessions,
        ] = await Promise.all([
          db.tasks.toArray(),
          db.expenses.toArray(),
          db.habits.where('archived').equals(0).toArray(),
          db.habitLogs.toArray(),
          db.events.toArray(),
          // Preload current + next month prayer times
          db.prayerTimes.where('date').between(monthStart, monthEnd, true, true).toArray(),
          db.workoutLogs.toArray(),
          db.workoutPlans.toArray(),
          db.preferences.toArray(),
          db.chatSessions.orderBy('updatedAt').reverse().toArray(),
        ]);

        setTasks(allTasks);
        setExpenses(allExpenses);
        setHabits(allHabits);
        setHabitLogs(allHabitLogs);
        setEvents(allEvents);
        setPrayerTimes(allPrayerTimes);
        setWorkoutLogs(allWorkoutLogs);
        setWorkoutPlans(allWorkoutPlans);
        
        // Convert prefs array to object
        const prefsObj = {};
        allPrefs.forEach(({ key, value }) => {
          prefsObj[key] = value;
        });
        setPreferences(prefsObj);
        setChatSessions(allChatSessions);

        // ─── Sync prayer times for current month if needed ───
        const lat = prefsObj.latitude;
        const lon = prefsObj.longitude;
        const method = prefsObj.calcMethod ?? 2;
        
        if (lat && lon && prefsObj.prayerMode) {
          // Check if we need to sync (missing data or settings changed)
          const needSync = allPrayerTimes.length === 0 ||
            lastPrayerSyncRef.current.month !== currentMonthStr ||
            lastPrayerSyncRef.current.method !== method ||
            lastPrayerSyncRef.current.lat !== lat ||
            lastPrayerSyncRef.current.lon !== lon;
          
          if (needSync) {
            // Sync in background - don't block preload
            syncPrayerMonth(currentMonth, lat, lon, method).then(() => {
              lastPrayerSyncRef.current = {
                month: currentMonthStr,
                year: now.getFullYear(),
                method,
                lat,
                lon
              };
            }).catch(err => {
              console.warn('[GlobalAppContext] Prayer sync failed:', err);
            });
          }
        }

        setIsPreloaded(true);
      } catch (err) {
        console.error('[GlobalAppContext] Preload failed:', err);
        setIsPreloaded(true); // Continue anyway
      }
    }

    preloadAllData();
  }, []);

  // ─── Live Queries: Keep data synced after initial preload ───
  const liveWorkoutPlans = useLiveQuery(() => db.workoutPlans.toArray(), []) ?? [];
  const liveHabits = useLiveQuery(() => db.habits.where('archived').equals(0).toArray(), []) ?? [];
  const liveHabitLogs = useLiveQuery(() => db.habitLogs.toArray(), []) ?? [];
  const liveTasks = useLiveQuery(() => db.tasks.toArray(), []) ?? [];
  const liveExpenses = useLiveQuery(() => db.expenses.toArray(), []) ?? [];
  const liveEvents = useLiveQuery(() => db.events.toArray(), []) ?? [];
  const liveWorkoutLogs = useLiveQuery(() => db.workoutLogs.toArray(), []) ?? [];
  const liveChatSessions = useLiveQuery(() => db.chatSessions.orderBy('updatedAt').reverse().toArray(), []) ?? [];
  
  // Sync live data into state
  useEffect(() => {
    setWorkoutPlans(liveWorkoutPlans);
  }, [liveWorkoutPlans]);
  
  useEffect(() => {
    setHabits(liveHabits);
  }, [liveHabits]);
  
  useEffect(() => {
    setHabitLogs(liveHabitLogs);
  }, [liveHabitLogs]);
  
  useEffect(() => {
    setTasks(liveTasks);
  }, [liveTasks]);
  
  useEffect(() => {
    setExpenses(liveExpenses);
  }, [liveExpenses]);
  
  useEffect(() => {
    setEvents(liveEvents);
  }, [liveEvents]);
  
  useEffect(() => {
    setWorkoutLogs(liveWorkoutLogs);
  }, [liveWorkoutLogs]);
  
  useEffect(() => {
    setChatSessions(liveChatSessions);
  }, [liveChatSessions]);
  
  // ─── Helper: Sync prayer times for a month ───
  const syncPrayerMonth = useCallback(async (monthDate, lat, lon, method) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth() + 1;
    
    // Check which dates we already have
    const startDate = format(startOfMonth(monthDate), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(monthDate), 'yyyy-MM-dd');
    const existingRows = await db.prayerTimes
      .where('date').between(startDate, endDate, true, true)
      .toArray();
    const existingDates = new Set(existingRows.map(r => r.date));
    
    // Fetch from AlAdhan
    const monthData = await fetchMonthPrayerTimes(lat, lon, month, year, method);
    
    const batch = [];
    for (const dayData of monthData) {
      const [dayStr, monthStr, yearStr] = dayData.date.gregorian.date.split('-');
      const ds = `${yearStr}-${monthStr}-${dayStr}`;
      
      if (existingDates.has(ds)) continue;
      
      const timings = dayData.timings;
      const fajr = parsePrayerTime(timings.Fajr);
      const dhuhr = parsePrayerTime(timings.Dhuhr);
      const asr = parsePrayerTime(timings.Asr);
      const maghrib = parsePrayerTime(timings.Maghrib);
      const isha = parsePrayerTime(timings.Isha);
      
      batch.push({
        date: ds,
        fajr: `${String(fajr.hours).padStart(2, '0')}:${String(fajr.minutes).padStart(2, '0')}`,
        dhuhr: `${String(dhuhr.hours).padStart(2, '0')}:${String(dhuhr.minutes).padStart(2, '0')}`,
        asr: `${String(asr.hours).padStart(2, '0')}:${String(asr.minutes).padStart(2, '0')}`,
        maghrib: `${String(maghrib.hours).padStart(2, '0')}:${String(maghrib.minutes).padStart(2, '0')}`,
        isha: `${String(isha.hours).padStart(2, '0')}:${String(isha.minutes).padStart(2, '0')}`,
        method,
      });
    }
    
    if (batch.length > 0) {
      await db.prayerTimes.bulkPut(batch);
      // Refresh local state
      const updated = await db.prayerTimes.toArray();
      setPrayerTimes(updated);
    }
  }, []);

  // ─── Subscribe to live updates (keeps cache fresh) ───
  // NOTE: Dexie hooks were causing DataCloneError issues.
  // Using useLiveQuery in components instead for reactivity.
  // The global cache provides instant initial render, and components
  // can use useLiveQuery for real-time updates on their specific data.
  useEffect(() => {
    if (!isPreloaded) return;
    // No hooks - rely on useLiveQuery in components for live updates
  }, [isPreloaded]);

  // ─── Computed/Derived Data (updates instantly when cache changes) ───
  const today = format(new Date(), 'yyyy-MM-dd');
  const weekAgoStr = format(subDays(new Date(), 7), 'yyyy-MM-dd');

  // Tasks helpers
  const tasksDueToday = useMemo(
    () => tasks.filter(t => t.dueDate === today && t.status !== 'done' && !t.completed),
    [tasks, today]
  );
  const tasksCompleted = useMemo(
    () => tasks.filter(t => t.completed === 1 || t.status === 'done').length,
    [tasks]
  );

  // Expenses helpers
  const expensesToday = useMemo(
    () => expenses.filter(e => e.date === today),
    [expenses, today]
  );
  const todaySpend = useMemo(
    () => expensesToday.filter(e => e.type === 'expense').reduce((sum, e) => sum + (e.amount || 0), 0),
    [expensesToday]
  );
  const todayIncome = useMemo(
    () => expensesToday.filter(e => e.type === 'income').reduce((sum, e) => sum + (e.amount || 0), 0),
    [expensesToday]
  );

  // Habits helpers - properly handle daily vs weekly habits
  const habitsCheckedToday = useMemo(() => {
    const todayLogs = habitLogs.filter(l => l.date === today && l.completed);
    const todayCompletedIds = new Set(todayLogs.map(l => l.habitId));
    
    // Count daily habits done today
    const dailyDone = habits.filter(h => h.frequency !== 'weekly' && todayCompletedIds.has(h.id)).length;
    
    // Count weekly habits done this week
    const now = new Date();
    const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weekLogs = habitLogs.filter(l => l.date >= weekStart && l.date <= weekEnd && l.completed);
    const weekCompletedIds = new Set(weekLogs.map(l => l.habitId));
    const weeklyDone = habits.filter(h => h.frequency === 'weekly' && weekCompletedIds.has(h.id)).length;
    
    return dailyDone + weeklyDone;
  }, [habits, habitLogs, today]);
  
  const habitsNotDoneToday = useMemo(() => {
    const todayLogs = habitLogs.filter(l => l.date === today && l.completed);
    const todayCompletedIds = new Set(todayLogs.map(l => l.habitId));
    
    // Get weekly logs for this week
    const now = new Date();
    const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weekLogs = habitLogs.filter(l => l.date >= weekStart && l.date <= weekEnd && l.completed);
    const weekCompletedIds = new Set(weekLogs.map(l => l.habitId));
    
    // Return habits not done (daily not done today, weekly not done this week)
    return habits.filter(h => {
      if (h.frequency === 'weekly') {
        return !weekCompletedIds.has(h.id);
      }
      return !todayCompletedIds.has(h.id);
    });
  }, [habits, habitLogs, today]);
  
  const habitsPercent = useMemo(
    () => habits.length > 0 ? Math.round((habitsCheckedToday / habits.length) * 100) : 0,
    [habitsCheckedToday, habits]
  );

  // Events helpers
  const eventsToday = useMemo(
    () => events.filter(e => e.date === today),
    [events, today]
  );

  // Prayers helpers
  const todayPrayers = useMemo(
    () => prayerTimes.find(p => p.date === today),
    [prayerTimes, today]
  );

  // Gym helpers
  const weeklyWorkouts = useMemo(
    () => workoutLogs.filter(w => w.date >= weekAgoStr),
    [workoutLogs, weekAgoStr]
  );
  const lastWorkout = useMemo(
    () => workoutLogs.sort((a, b) => b.date.localeCompare(a.date))[0],
    [workoutLogs]
  );

  // ─── Action: Refresh all data manually ───
  const refreshAll = useCallback(async () => {
    const [allTasks, allExpenses, allHabits, allHabitLogs, allEvents, allPrayerTimes, allWorkoutLogs] = await Promise.all([
      db.tasks.toArray(),
      db.expenses.toArray(),
      db.habits.where('archived').equals(0).toArray(),
      db.habitLogs.toArray(),
      db.events.toArray(),
      db.prayerTimes.toArray(),
      db.workoutLogs.toArray(),
    ]);
    setTasks(allTasks);
    setExpenses(allExpenses);
    setHabits(allHabits);
    setHabitLogs(allHabitLogs);
    setEvents(allEvents);
    setPrayerTimes(allPrayerTimes);
    setWorkoutLogs(allWorkoutLogs);
  }, []);

  const value = useMemo(() => ({
    isPreloaded,
    // Raw cached data
    tasks,
    expenses,
    habits,
    habitLogs,
    events,
    prayerTimes,
    workoutLogs,
    workoutPlans,
    preferences,
    chatSessions,
    // Sidebar state
    starredCollapsed,
    setStarredCollapsed,
    // Computed helpers
    today,
    tasksDueToday,
    tasksCompleted,
    expensesToday,
    todaySpend,
    todayIncome,
    habitsCheckedToday,
    habitsNotDoneToday,
    habitsPercent,
    eventsToday,
    todayPrayers,
    weeklyWorkouts,
    lastWorkout,
    // Actions
    refreshAll,
    syncPrayerMonth,
  }), [
    isPreloaded,
    tasks, expenses, habits, habitLogs, events, prayerTimes, workoutLogs, workoutPlans, preferences, chatSessions,
    starredCollapsed,
    today, tasksDueToday, tasksCompleted, expensesToday, todaySpend, todayIncome,
    habitsCheckedToday, habitsNotDoneToday, habitsPercent, eventsToday, todayPrayers, weeklyWorkouts, lastWorkout,
    refreshAll, syncPrayerMonth,
  ]);

  return (
    <GlobalAppContext.Provider value={value}>
      {children}
    </GlobalAppContext.Provider>
  );
}

export default GlobalAppContext;
