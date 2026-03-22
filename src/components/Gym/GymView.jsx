import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import {
  Plus, X, Dumbbell, Play, Trash2, Check, Edit2,
  ClipboardList, History, Zap, ChevronLeft, Save,
  Timer, Calendar as CalendarIcon, TrendingUp, Flame, User, Activity, Circle, CheckCircle2, Target
} from 'lucide-react';
import db from '../../db/dexie';
import Leaderboard from './Leaderboard';

const PLAN_TYPES = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body', 'Cardio', 'Custom'];

/**
 * Gym Tracker — simple user-driven flow:
 *   1. Create workout plans (templates)
 *   2. Pick a plan → log your weights/reps for each exercise
 *   3. View past logs in history
 */
export default function GymView() {
  const [activeSubTab, setActiveSubTab] = useState('plans');
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  // "Log" mode — user is filling in a workout from a plan
  const [logging, setLogging] = useState(null);         // { planId, planName, exercises: [...] }

  /* ── Data ── */
  const plans = useLiveQuery(() => db.workoutPlans.orderBy('createdAt').reverse().toArray()) ?? [];
  const logs  = useLiveQuery(() => db.workoutLogs.orderBy('date').reverse().toArray()) ?? [];

  /* ── Stats ── */
  const thisWeekLogs = useMemo(() => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return logs.filter(l => new Date(l.date) >= weekAgo);
  }, [logs]);

  /* ═══════════ Plan CRUD ═══════════ */
  async function savePlan(data) {
    if (editingPlan) {
      await db.workoutPlans.update(editingPlan.id, {
        ...data,
        updatedAt: new Date().toISOString(),
      });
    } else {
      await db.workoutPlans.add({
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    setShowAddPlan(false);
    setEditingPlan(null);
  }

  async function deletePlan(id) {
    if (!confirm('Delete this workout plan?')) return;
    await db.workoutPlans.delete(id);
  }

  /* ═══════════ Start Logging ═══════════ */
  function startLogging(plan) {
    setLogging({
      planId: plan.id,
      planName: plan.name,
      exercises: plan.exercises.map(ex => ({
        name: ex.name,
        targetSets: ex.sets,
        targetReps: ex.reps,
        targetWeight: ex.targetWeight || 0,
        sets: Array.from({ length: ex.sets || 3 }, () => ({
          // pre-fill with plan's target weight so user only tweaks
          weight: ex.targetWeight ? String(ex.targetWeight) : '',
          reps: String(ex.reps || ''),
          done: false,
        })),
      })),
      notes: '',
    });
    setActiveSubTab('workout');
  }

  function startQuickLog() {
    setLogging({
      planId: null,
      planName: 'Quick Workout',
      exercises: [{ name: '', targetSets: 3, targetReps: 10, sets: [{ weight: '', reps: '', done: false }] }],
      notes: '',
    });
    setActiveSubTab('workout');
  }

  /* ═══════════ Logging Helpers ═══════════ */
  function updateSet(exIdx, setIdx, field, value) {
    setLogging(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, ei) =>
        ei !== exIdx ? ex : {
          ...ex,
          sets: ex.sets.map((s, si) => si !== setIdx ? s : { ...s, [field]: value }),
        }
      ),
    }));
  }

  function stepWeight(exIdx, setIdx, delta) {
    const cur = Number(logging.exercises[exIdx].sets[setIdx].weight) || 0;
    const next = Math.max(0, Math.round((cur + delta) * 4) / 4); // round to 0.25
    updateSet(exIdx, setIdx, 'weight', next === 0 ? '' : String(next));
  }

  function stepReps(exIdx, setIdx, delta) {
    const cur = Number(logging.exercises[exIdx].sets[setIdx].reps) || 0;
    const next = Math.max(0, cur + delta);
    updateSet(exIdx, setIdx, 'reps', next === 0 ? '' : String(next));
  }

  function toggleSetDone(exIdx, setIdx) {
    updateSet(exIdx, setIdx, 'done', !logging.exercises[exIdx].sets[setIdx].done);
  }

  function addSet(exIdx) {
    setLogging(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, ei) =>
        ei !== exIdx ? ex : { ...ex, sets: [...ex.sets, { weight: '', reps: '', done: false }] }
      ),
    }));
  }

  function addExercise() {
    setLogging(prev => ({
      ...prev,
      exercises: [...prev.exercises, {
        name: '',
        targetSets: 3,
        targetReps: 10,
        sets: [{ weight: '', reps: '', done: false }],
      }],
    }));
  }

  function updateExerciseName(exIdx, name) {
    setLogging(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, i) => i === exIdx ? { ...ex, name } : ex),
    }));
  }

  function removeExercise(exIdx) {
    if (logging.exercises.length <= 1) return;
    setLogging(prev => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== exIdx),
    }));
  }

  /* ═══════════ Save Workout ═══════════ */
  async function saveWorkout() {
    if (!logging) return;
    const completedExercises = logging.exercises
      .filter(ex => ex.name.trim() && ex.sets.some(s => s.done))
      .map(ex => ({
        name: ex.name.trim(),
        sets: ex.sets.filter(s => s.done).map(s => ({
          weight: Number(s.weight) || 0,
          reps: Number(s.reps) || 0,
        })),
      }));

    if (completedExercises.length === 0) {
      alert('Mark at least one set as done before saving!');
      return;
    }

    await db.workoutLogs.add({
      date: new Date().toISOString(),
      planId: logging.planId,
      planName: logging.planName,
      exercises: completedExercises,
      notes: logging.notes,
      createdAt: new Date().toISOString(),
    });

    setLogging(null);
    setActiveSubTab('history');
  }

  async function deleteLog(id) {
    if (!confirm('Delete this workout log?')) return;
    await db.workoutLogs.delete(id);
  }

  /* ══════════════════════════════════════ */
  return (
    <div className="gym-view bg-background min-h-screen text-primary pb-20 overflow-x-hidden">
      
      {/* HEADER SECTION */}
      <header className="px-6 pt-8 pb-6 bg-surface border-b border-border relative z-10 sticky top-0 backdrop-blur-xl bg-opacity-80">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand to-accent p-[2px] shadow-lg shadow-brand/20">
              <div className="w-full h-full bg-surface rounded-full flex items-center justify-center">
                <User size={20} className="text-primary" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">KINETIC VAULT</h1>
              <span className="text-xs font-bold text-brand tracking-wider uppercase">Level 12 Athlete</span>
            </div>
          </div>
          <button onClick={() => { setEditingPlan(null); setShowAddPlan(true); }} className="w-10 h-10 rounded-xl bg-surface-elevated border border-border flex items-center justify-center hover:bg-surface-elevated hover:border-border transition-all">
            <Plus size={20} className="text-primary" />
          </button>
        </div>
        
        {/* QUICK STATS METRICS ROW */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 relative snap-x md:grid md:grid-cols-3">
          <div className="snap-start min-w-[130px] flex-1 bg-surface-elevated border border-border rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand/10 rounded-full blur-xl -mr-10 -mt-10 transition-all"></div>
            <div className="flex items-center gap-2 text-muted">
              <ClipboardList size={14} />
              <span className="text-[10px] font-bold tracking-widest uppercase">Plans</span>
            </div>
            <div className="text-2xl font-black text-primary">{plans.length}</div>
          </div>
          
          <div className="snap-start min-w-[130px] flex-1 bg-surface-elevated border border-border rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/10 rounded-full blur-xl -mr-10 -mt-10 transition-all"></div>
            <div className="flex items-center gap-2 text-muted">
              <Flame size={14} />
              <span className="text-[10px] font-bold tracking-widest uppercase">This Week</span>
            </div>
            <div className="text-2xl font-black text-primary">{thisWeekLogs.length}</div>
          </div>
          
          <div className="snap-start min-w-[130px] flex-1 bg-surface-elevated border border-border rounded-2xl p-4 flex flex-col gap-2 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-xl -mr-10 -mt-10 transition-all"></div>
            <div className="flex items-center gap-2 text-muted">
              <TrendingUp size={14} />
              <span className="text-[10px] font-bold tracking-widest uppercase">Total</span>
            </div>
            <div className="text-2xl font-black text-primary">{logs.length}</div>
          </div>
        </div>
      </header>

      {/* QUICK LOG CTA */}
      <div className="px-6 mt-6 pt-2">
        <button 
          onClick={startQuickLog}
          className="w-full relative overflow-hidden group bg-gradient-to-br from-brand to-accent rounded-2xl p-[1px] shadow-xl shadow-brand/20 shadow-brand/20 active:scale-[0.98] transition-transform"
        >
          <div className="bg-surface rounded-2xl p-4 flex items-center justify-between group-hover:bg-opacity-80 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand/20 to-accent/20 flex items-center justify-center border border-border">
                <Play size={24} className="text-brand ml-1 group-hover:scale-110 transition-transform" fill="currentColor" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-lg text-primary">Start Empty Workout</h3>
                <p className="text-xs text-muted mt-1">Jump right in without a plan</p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-surface-elevated flex items-center justify-center text-muted group-hover:text-primary transition-colors">
              <Activity size={16} />
            </div>
          </div>
        </button>
      </div>

      {/* NAVIGATION TABS */}
      <div className="px-6 mt-8">
        <div className="flex bg-surface p-1.5 rounded-xl border border-border relative shadow-inner">
          {[
            { id: 'plans',   label: 'Programs', icon: ClipboardList },
            { id: 'workout', label: 'Active',   icon: Dumbbell },
            { id: 'history', label: 'History',  icon: History },
            { id: 'leaderboard', label: 'Rankings',  icon: Target },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveSubTab(t.id)}
              className={`flex-1 py-2.5 flex items-center justify-center gap-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all z-10 ${
                activeSubTab === t.id 
                  ? 'bg-surface-elevated text-primary shadow-lg border border-border' 
                  : 'text-muted hover:text-secondary hover:bg-surface-elevated'
              }`}
            >
              <t.icon size={14} className={activeSubTab === t.id ? 'text-brand' : ''} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* VIEWS CONTENT */}
      <div className="px-6 mt-8">
        
        {/* ──── MY PLANS ──── */}
        {activeSubTab === 'plans' && (
          <div className="flex flex-col gap-5">
            {plans.length === 0 ? (
              <div className="bg-surface border border-border rounded-3xl p-10 flex flex-col items-center justify-center text-center shadow-lg">
                <div className="w-20 h-20 rounded-full bg-surface-elevated border border-border flex items-center justify-center mb-5 relative">
                  <div className="absolute inset-0 bg-brand/10 blur-xl rounded-full"></div>
                  <ClipboardList size={32} className="text-muted" />
                </div>
                <h3 className="text-xl font-black text-primary mb-2">No programs yet</h3>
                <p className="text-sm text-muted mb-8 leading-relaxed">Create your first training program to get started on your journey.</p>
                <button onClick={() => { setEditingPlan(null); setShowAddPlan(true); }} className="px-8 py-4 rounded-2xl bg-surface-elevated border border-border text-primary shadow-lg font-bold text-sm tracking-wide active:scale-[0.98] transition-all">
                  Create Program
                </button>
              </div>
            ) : (
              plans.map(plan => (
                <div key={plan.id} className="bg-surface border border-border rounded-3xl overflow-hidden group shadow-lg">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex-1">
                        <h3 className="text-xl font-black text-primary leading-tight break-words pr-2">{plan.name}</h3>
                        <span className="inline-block mt-2 px-3 py-1 rounded-md bg-brand/10 text-brand text-[10px] font-bold tracking-widest uppercase">
                          {plan.type}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingPlan(plan); setShowAddPlan(true); }} className="w-10 h-10 rounded-xl bg-surface-elevated flex items-center justify-center text-muted border border-border hover:bg-surface-elevated hover:text-primary transition-all">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => deletePlan(plan.id)} className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-all">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-3 mb-6 bg-background rounded-2xl p-4 border border-border">
                      {plan.exercises.slice(0, 3).map((ex, i) => (
                        <div key={i} className="flex justify-between items-center text-sm">
                          <span className="text-secondary font-bold truncate pr-3">{ex.name}</span>
                          <span className="text-muted font-mono text-xs whitespace-nowrap bg-surface-elevated px-2 py-1 rounded-md">
                            {ex.sets}×{ex.reps} {ex.targetWeight ? `@ ${ex.targetWeight}kg` : ''}
                          </span>
                        </div>
                      ))}
                      {plan.exercises.length > 3 && (
                        <div className="text-[10px] text-muted font-bold font-mono tracking-wider uppercase text-center mt-1 border-t border-border pt-3">
                          + {plan.exercises.length - 3} more movement{plan.exercises.length - 3 !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                    
                    <button onClick={() => startLogging(plan)} className="w-full py-4 rounded-2xl bg-surface-elevated text-primary font-black text-sm tracking-wide border border-border flex items-center justify-center gap-2 hover:bg-surface-elevated transition-all group-hover:bg-gradient-to-r group-hover:from-brand group-hover:to-accent group-hover:border-transparent group-hover:shadow-xl shadow-brand/20">
                      <Play size={16} className="fill-current" /> INITIALIZE ROUTINE
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ──── LOG WORKOUT ──── */}
        {activeSubTab === 'workout' && (
          <div className="w-full">
            {!logging ? (
              <div className="flex flex-col gap-4">
                {plans.length > 0 && (
                  <>
                    <p className="text-[10px] font-bold tracking-widest uppercase text-muted mb-2 ml-1">Select Program to Run</p>
                    {plans.map(plan => (
                      <button
                        key={plan.id}
                        onClick={() => startLogging(plan)}
                        className="bg-surface border border-border rounded-3xl p-5 text-left hover:border-border hover:bg-surface-elevated active:scale-[0.98] transition-all w-full flex justify-between items-center group shadow-lg"
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <h3 className="font-black text-primary text-lg truncate">{plan.name}</h3>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted bg-background px-2 py-1 rounded-md">{plan.exercises.length} Exercises</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-brand bg-brand/10 px-2 py-1 rounded-md">{plan.type}</span>
                          </div>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-background border border-border flex items-center justify-center group-hover:bg-gradient-to-tr group-hover:from-brand group-hover:to-accent group-hover:border-transparent group-hover:text-primary transition-all shadow-inner group-hover:shadow-lg shadow-brand/20">
                          <Play size={20} className="ml-1 fill-current" />
                        </div>
                      </button>
                    ))}
                    <div className="flex items-center gap-4 my-4">
                      <div className="flex-1 h-px bg-surface-elevated"></div>
                      <span className="text-[10px] font-black text-muted uppercase tracking-widest">or</span>
                      <div className="flex-1 h-px bg-surface-elevated"></div>
                    </div>
                  </>
                )}
                <button onClick={startQuickLog} className="w-full py-5 rounded-3xl bg-surface border-2 border-dashed border-border text-secondary font-black text-xs tracking-widest uppercase flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-surface-elevated hover:text-primary hover:border-border">
                  <Zap size={18} className="text-brand" /> Freestyle Session
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-8 -mx-6 px-6">
                {/* Active Session Sticky Header */}
                <div className="flex items-center justify-between sticky top-[90px] bg-background/90 backdrop-blur-xl z-20 py-4 border-b border-border -mt-8 shadow-sm">
                  <button
                    onClick={() => { if (confirm('Discard this log?')) setLogging(null); }}
                    className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-muted hover:text-red-500 transition-colors bg-surface-elevated hover:bg-red-500/20 px-3 py-2 rounded-xl"
                  >
                    <X size={14} /> Cancel
                  </button>
                  <span className="font-black text-primary text-sm truncate max-w-[150px] uppercase tracking-wider">{logging.planName}</span>
                  <button onClick={saveWorkout} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary transition-colors bg-gradient-to-r from-brand to-accent hover:opacity-90 px-4 py-2 rounded-xl shadow-[0_0_10px_rgba(168,85,247,0.4)]">
                    <Save size={14} /> Finish
                  </button>
                </div>

                <div className="flex flex-col gap-6 pb-24">
                  {logging.exercises.map((ex, exIdx) => (
                    <div key={exIdx} className="bg-surface border border-border rounded-3xl p-5 w-full overflow-hidden shadow-lg relative">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-surface-elevated rounded-bl-full -z-0 opacity-50 blur-2xl pointer-events-none"></div>
                      
                      <div className="flex items-start justify-between mb-4 relative z-10">
                        <input
                          type="text"
                          value={ex.name}
                          placeholder={`Exercise ${exIdx + 1}`}
                          onChange={e => updateExerciseName(exIdx, e.target.value)}
                          className="bg-transparent border-none outline-none font-black tracking-tight text-xl text-primary w-full placeholder:text-muted focus:text-brand transition-colors"
                        />
                        {logging.exercises.length > 1 && (
                          <button onClick={() => removeExercise(exIdx)} className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center text-muted hover:bg-red-500/20 hover:border-red-500/20 hover:text-red-500 transition-all ml-3 shrink-0">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      {ex.targetSets && (ex.targetSets > 0) && (
                        <div className="flex items-center gap-2 mb-6 mt-1 bg-background py-2 px-3 rounded-xl w-max border border-border relative z-10 shadow-inner">
                          <Target size={14} className="text-brand" />
                          <p className="text-xs font-bold font-mono text-muted tracking-wide">
                            {ex.targetSets} sets × {ex.targetReps} reps
                            {ex.targetWeight ? ` @ ${ex.targetWeight}kg` : ''}
                          </p>
                        </div>
                      )}

                      {/* Sets container */}
                      <div className="flex flex-col gap-2 relative z-10">
                        {/* Header */}
                        <div className="flex items-center px-1 pb-2 text-[9px] font-black tracking-widest uppercase text-muted">
                          <div className="w-8 text-center">Set</div>
                          <div className="flex-1 text-center">Weight kg</div>
                          <div className="flex-1 text-center">Reps</div>
                          <div className="w-12 text-center">Done</div>
                        </div>
                        
                        {ex.sets.map((set, setIdx) => (
                          <div key={setIdx} className={`flex items-center gap-2 px-2 py-2.5 rounded-2xl transition-all border ${set.done ? 'bg-brand/10 border-brand/20 shadow-inner' : 'bg-background border-border'}`}>
                            {/* Num */}
                            <div className="w-8 flex justify-center font-black text-muted text-sm font-mono">
                              {set.done ? <CheckCircle2 size={18} className="text-brand" /> : (setIdx + 1)}
                            </div>

                            {/* Weight */}
                            <div className="flex-1 flex bg-surface-elevated rounded-xl items-center overflow-hidden h-11 border border-border">
                              <button onClick={() => stepWeight(exIdx, setIdx, -2.5)} className="w-10 h-full flex items-center justify-center text-muted font-black active:bg-surface-elevated hover:text-primary transition-colors">-</button>
                              <input
                                type="number"
                                inputMode="decimal"
                                placeholder="0"
                                value={set.weight}
                                onChange={e => updateSet(exIdx, setIdx, 'weight', e.target.value)}
                                className="flex-1 bg-transparent border-none text-center font-black !text-primary text-base h-full w-full outline-none focus:bg-surface-elevated transition-colors p-0 font-mono shadow-inner"
                              />
                              <button onClick={() => stepWeight(exIdx, setIdx, 2.5)} className="w-10 h-full flex items-center justify-center text-muted font-black active:bg-surface-elevated hover:text-primary transition-colors">+</button>
                            </div>

                            {/* Reps */}
                            <div className="flex-1 flex bg-surface-elevated rounded-xl items-center overflow-hidden h-11 border border-border">
                              <button onClick={() => stepReps(exIdx, setIdx, -1)} className="w-10 h-full flex items-center justify-center text-muted font-black active:bg-surface-elevated hover:text-primary transition-colors">-</button>
                              <input
                                type="number"
                                inputMode="numeric"
                                placeholder={String(ex.targetReps || '0')}
                                value={set.reps}
                                onChange={e => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                                className="flex-1 bg-transparent border-none text-center font-black !text-primary text-base h-full w-full outline-none focus:bg-surface-elevated transition-colors p-0 font-mono shadow-inner"
                              />
                              <button onClick={() => stepReps(exIdx, setIdx, 1)} className="w-10 h-full flex items-center justify-center text-muted font-black active:bg-surface-elevated hover:text-primary transition-colors">+</button>
                            </div>

                            {/* Check */}
                            <button
                              onClick={() => toggleSetDone(exIdx, setIdx)}
                              className={`w-12 h-11 rounded-xl flex items-center justify-center border transition-all ${
                                set.done 
                                  ? 'bg-brand border-brand text-primary shadow-lg shadow-brand/20' 
                                  : 'bg-surface-elevated border-border text-muted hover:border-border hover:bg-surface-elevated'
                              }`}
                            >
                              <Check size={20} strokeWidth={set.done ? 4 : 2.5} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => addSet(exIdx)} className="w-full mt-4 py-3 rounded-xl bg-background border border-dashed border-border text-muted font-bold text-[10px] uppercase tracking-widest hover:bg-surface-elevated transition-colors flex items-center justify-center gap-1 active:scale-[0.98]">
                        <Plus size={14} /> Add Set
                      </button>
                    </div>
                  ))}

                  <button onClick={addExercise} className="w-full py-5 rounded-3xl bg-transparent border-2 border-dashed border-border text-muted font-black text-xs tracking-widest uppercase hover:bg-surface-elevated hover:text-primary hover:border-border active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                    <Plus size={18} /> ADD MOVEMENT
                  </button>

                  <div className="bg-surface rounded-3xl p-5 border border-border shadow-lg">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted mb-3 ml-1">Session Data</h4>
                    <textarea
                      placeholder="How did the workout feel? Any PRs?"
                      value={logging.notes}
                      onChange={e => setLogging(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full min-h-[120px] bg-background rounded-2xl border border-border p-4 text-sm font-medium text-primary placeholder:text-muted focus:outline-none focus:border-brand/50 resize-y transition-colors shadow-inner"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ──── HISTORY ──── */}
        {activeSubTab === 'history' && (
          <div className="flex flex-col gap-4">
            {logs.length === 0 ? (
              <div className="bg-surface border border-border rounded-3xl p-10 flex flex-col items-center justify-center text-center shadow-lg">
                <div className="w-20 h-20 rounded-full bg-surface-elevated border border-border flex items-center justify-center mb-5 relative">
                  <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full"></div>
                  <History size={32} className="text-muted" />
                </div>
                <h3 className="text-xl font-black text-primary mb-2">The Vault is empty</h3>
                <p className="text-sm font-medium text-muted leading-relaxed max-w-[200px]">Complete a workout and your data will be securely stored here.</p>
              </div>
            ) : (
              logs.map(log => (
                <div key={log.id} className="bg-surface border border-border rounded-3xl p-5 overflow-hidden relative group shadow-lg">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-surface-elevated rounded-bl-full -z-0 opacity-0 group-hover:opacity-50 transition-opacity blur-2xl pointer-events-none"></div>
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center shadow-inner">
                        <CalendarIcon size={16} className="text-muted" />
                      </div>
                      <div>
                        <span className="text-base font-black text-primary block tracking-tight">
                          {format(new Date(log.date), 'MMMM d, yyyy')}
                        </span>
                        {log.planName && (
                          <span className="text-[10px] font-bold tracking-widest uppercase text-brand block mt-0.5">{log.planName}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteLog(log.id)}
                      className="text-muted hover:text-red-500 w-10 h-10 flex items-center justify-center rounded-xl bg-surface-elevated hover:bg-red-500/20 transition-colors"
                      title="Delete log"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-2 mt-5 relative z-10 bg-background rounded-2xl p-4 border border-border">
                    {log.exercises?.map((ex, i) => (
                      <div key={i} className="flex justify-between items-center py-1">
                        <span className="text-secondary font-bold text-sm tracking-tight truncate pr-2">{ex.name}</span>
                        <div className="flex text-xs font-mono font-bold bg-surface-elevated px-2 py-1 rounded-md shrink-0">
                          <span className="text-muted">{ex.sets?.length || 0} sets</span>
                          {ex.sets?.[0]?.weight && (
                            <>
                              <span className="text-muted px-2">•</span>
                              <span className="text-brand">{ex.sets[0].weight}kg</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {log.notes && (
                    <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-brand/10 to-transparent border-l-4 border-l-purple-500 flex gap-3 text-sm relative z-10">
                      <p className="text-secondary italic leading-relaxed font-serif font-medium">"{log.notes}"</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ──── LEADERBOARD ──── */}
        {activeSubTab === 'leaderboard' && (
          <Leaderboard />
        )}
      </div>

      {/* ═══ Add/Edit Plan Modal ═══ */}
      {showAddPlan && (
        <AddPlanModal 
          initialPlan={editingPlan}
          onSave={savePlan} 
          onClose={() => { setShowAddPlan(false); setEditingPlan(null); }} 
        />
      )}
    </div>
  );
}


/* ────── Add/Edit Workout Plan Modal ────── */
function AddPlanModal({ onSave, onClose, initialPlan }) {
  const [name, setName] = useState(initialPlan ? initialPlan.name : '');
  const [type, setType] = useState(initialPlan ? initialPlan.type : 'Push');
  const [exercises, setExercises] = useState(
    initialPlan 
      ? initialPlan.exercises.map(ex => ({ ...ex })) 
      : [{ name: '', sets: 3, reps: 10, targetWeight: '' }]
  );

  function addExercise() {
    setExercises(prev => [...prev, { name: '', sets: 3, reps: 10, targetWeight: '' }]);
  }

  function removeExercise(idx) {
    setExercises(prev => prev.filter((_, i) => i !== idx));
  }

  function updateExercise(idx, field, value) {
    setExercises(prev => prev.map((ex, i) => i === idx ? { ...ex, [field]: value } : ex));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    const validExercises = exercises.filter(ex => ex.name.trim());
    if (validExercises.length === 0) return;
    onSave({
      name: name.trim(),
      type,
      exercises: validExercises.map(ex => ({
        name: ex.name.trim(),
        sets: Number(ex.sets) || 3,
        reps: Number(ex.reps) || 10,
        targetWeight: Number(ex.targetWeight) || 0,
      })),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={onClose}>
      <div 
        className="w-full max-w-md bg-background border border-border rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" 
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-border flex items-center justify-between sticky top-0 bg-background/90 backdrop-blur-md z-10">
          <h2 className="text-xl font-black tracking-tight text-primary uppercase">
            {initialPlan ? 'Edit Program' : 'New Program'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-surface-elevated border border-border text-muted hover:bg-surface-elevated hover:text-primary transition-colors active:scale-95">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <form id="plan-form" onSubmit={handleSubmit} className="flex flex-col gap-8">
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-muted mb-2 ml-1">Program Name</label>
                <input
                  autoFocus type="text"
                  placeholder="e.g., Push Day A, Leg Crusher"
                  value={name} onChange={e => setName(e.target.value)}
                  className="w-full bg-surface border border-border rounded-2xl px-5 py-4 text-primary font-bold placeholder:text-muted focus:outline-none focus:border-brand/50 focus:bg-surface-elevated transition-colors shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-muted mb-2 ml-1">Focus Type</label>
                <div className="relative">
                  <select 
                    value={type} 
                    onChange={e => setType(e.target.value)} 
                    className="w-full appearance-none bg-surface border border-border rounded-2xl px-5 py-4 text-primary font-bold focus:outline-none focus:border-brand/50 focus:bg-surface-elevated transition-colors shadow-inner"
                  >
                    {PLAN_TYPES.map(t => <option key={t} value={t} className="font-bold bg-surface">{t}</option>)}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <ChevronLeft size={18} className="-rotate-90 text-muted" />
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px w-full bg-surface-elevated my-1"></div>

            <div>
              <div className="flex items-center justify-between mb-4 mt-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-muted ml-1">Movements Matrix</label>
                <div className="text-[10px] font-black tracking-widest text-brand bg-brand/10 px-2 py-1 rounded-md uppercase">
                  {exercises.length} Total
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {exercises.map((ex, idx) => (
                  <div key={idx} className="bg-surface border border-border shadow-inner rounded-3xl p-4 flex flex-col gap-4 relative group">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-black tracking-widest text-muted uppercase bg-surface-elevated px-2 py-1 rounded-md">Exercise {idx + 1}</div>
                      {exercises.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => removeExercise(idx)} 
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-muted hover:text-red-500 hover:bg-red-500/20 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    
                    <input 
                      type="text" 
                      placeholder={`Movement Name`} 
                      value={ex.name || ''}
                      onChange={e => updateExercise(idx, 'name', e.target.value)}
                      className="w-full bg-background border border-transparent focus:border-border rounded-xl px-4 py-3 text-base font-bold text-primary placeholder:text-muted outline-none transition-colors" 
                    />
                    
                    <div className="flex gap-2">
                      <div className="flex-1 bg-background border border-transparent focus-within:border-border rounded-xl px-3 py-2 flex flex-col transition-colors">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted mb-1">Sets</span>
                        <input 
                          type="number" 
                          placeholder="3" 
                          value={ex.sets || ''} 
                          onChange={e => updateExercise(idx, 'sets', e.target.value)}
                          className="w-full bg-transparent text-sm font-bold font-mono text-primary placeholder:text-muted outline-none text-left" 
                        />
                      </div>
                      
                      <div className="flex-1 bg-background border border-transparent focus-within:border-border rounded-xl px-3 py-2 flex flex-col transition-colors">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted mb-1">Reps</span>
                        <input 
                          type="number" 
                          placeholder="10" 
                          value={ex.reps || ''} 
                          onChange={e => updateExercise(idx, 'reps', e.target.value)}
                          className="w-full bg-transparent text-sm font-bold font-mono text-primary placeholder:text-muted outline-none text-left" 
                        />
                      </div>
                      
                      <div className="flex-1 bg-background border border-transparent focus-within:border-border rounded-xl px-3 py-2 flex flex-col transition-colors">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted mb-1">Wt (kg)</span>
                        <input 
                          type="number" 
                          placeholder="Opt" 
                          value={ex.targetWeight || ''}
                          onChange={e => updateExercise(idx, 'targetWeight', e.target.value)}
                          className="w-full bg-transparent text-sm font-bold font-mono text-brand placeholder:text-brand/30 outline-none text-left" 
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button 
                type="button" 
                onClick={addExercise} 
                className="w-full mt-4 py-4 rounded-3xl border-2 border-dashed border-border text-muted font-black text-[10px] tracking-widest uppercase hover:bg-surface-elevated hover:text-primary hover:border-border transition-colors flex items-center justify-center gap-2 active:scale-95"
              >
                <Plus size={16} /> Add Another Movement
              </button>
            </div>
          </form>
        </div>
        
        <div className="p-5 border-t border-border bg-background/90 backdrop-blur-md sticky bottom-0 z-10">
          <button 
            type="submit" 
            form="plan-form"
            className="w-full py-5 rounded-2xl bg-gradient-to-br from-brand to-accent text-primary font-black text-sm tracking-widest uppercase shadow-xl shadow-brand/20 active:scale-[0.98] transition-all transform flex justify-center items-center gap-2 hover:from-brand hover:to-accent"
          >
            {initialPlan ? 'Update Program' : 'Create Program'} <Check size={18} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
}
