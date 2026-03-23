import { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import {
  Plus, X, Dumbbell, Play, Trash2, Check, Edit2,
  ClipboardList, History, Save,
  Calendar as CalendarIcon, TrendingUp, Flame, Target, CheckCircle2, Sparkles,
  AlignJustify, List
} from 'lucide-react';
import db from '../../db/dexie';

const PLAN_TYPES = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body', 'Cardio', 'Custom'];

/**
 * Parse a pasted workout plan text into exercise objects.
 * Supports lines like:
 *   "Bench Press 4x8 @80kg"
 *   "Bench Press 4x8"
 *   "Bench Press"
 */
function parsePlanText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const results = [];
  const rx = /^(.+?)\s+(\d+)\s*[xX×]\s*(\d+)(?:\s*[@＠]\s*([\d.]+))?/;
  for (const line of lines) {
    // Skip obvious header lines (all-caps short words, or lines that are just dashes/bullets)
    if (/^[-–—•#*=]+$/.test(line)) continue;
    const m = rx.exec(line);
    if (m) {
      results.push({
        name: m[1].trim(),
        sets: parseInt(m[2], 10) || 3,
        reps: parseInt(m[3], 10) || 10,
        targetWeight: m[4] ? parseFloat(m[4]) : 0,
      });
    } else if (line.length > 1 && !/^\d+$/.test(line)) {
      // Plain exercise name with no sets/reps — add with defaults
      results.push({ name: line, sets: 3, reps: 10, targetWeight: 0 });
    }
  }
  return results;
}

export default function GymView() {
  const [activeSubTab, setActiveSubTab] = useState('plans');
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  const [simplifiedView, setSimplifiedView] = useState(() => {
    return localStorage.getItem('gym-simplified-view') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('gym-simplified-view', simplifiedView);
  }, [simplifiedView]);

  // Active workout session state
  const [logging, setLogging] = useState(null); // { planId, planName, exercises: [...] }

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
    await db.workoutPlans.delete(id);
  }

  /* ═══════════ Start Logging from a plan ═══════════ */
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
          weight: ex.targetWeight ? String(ex.targetWeight) : '',
          reps: String(ex.reps || ''),
          done: false,
        })),
      })),
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
    const next = Math.max(0, Math.round((cur + delta) * 4) / 4);
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

  function tickAllSets(exIdx) {
    setLogging(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, ei) =>
        ei !== exIdx ? ex : {
          ...ex,
          sets: ex.sets.map(s => ({ ...s, done: true })),
        }
      ),
    }));
  }

  function tickAllWorkoutSets() {
    setLogging(prev => ({
      ...prev,
      exercises: prev.exercises.map(ex => ({
        ...ex,
        sets: ex.sets.map(s => ({ ...s, done: true }))
      }))
    }));
  }

  function addSet(exIdx) {
    setLogging(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, ei) =>
        ei !== exIdx ? ex : { ...ex, sets: [...ex.sets, { weight: '', reps: '', done: false }] }
      ),
    }));
  }

  function removeSet(exIdx, setIdx) {
    if (logging.exercises[exIdx].sets.length <= 1) return;
    setLogging(prev => ({
      ...prev,
      exercises: prev.exercises.map((ex, ei) =>
        ei !== exIdx ? ex : { ...ex, sets: ex.sets.filter((_, si) => si !== setIdx) }
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
      setLogging(null);
      setActiveSubTab('history');
      return;
    }

    await db.workoutLogs.add({
      date: new Date().toISOString(),
      planId: logging.planId,
      planName: logging.planName,
      exercises: completedExercises,
      createdAt: new Date().toISOString(),
    });

    setLogging(null);
    setActiveSubTab('history');
  }

  async function deleteLog(id) {
    await db.workoutLogs.delete(id);
  }

  /* ══════════════════════════════════════ */
  return (
    <div className="gym-view">

      {/* HEADER */}
      <header className="gym-header">
        <div className="gym-header__top">
          <h1 className="gym-header__title">Gym</h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            {activeSubTab === 'plans' && (
              <button
                onClick={() => setSimplifiedView(prev => !prev)}
                className="gym-header__add-btn"
                title={simplifiedView ? "Show details" : "Simplified view"}
                style={simplifiedView ? { background: 'var(--c-accent)', color: 'var(--c-bg)' } : {}}
              >
                {simplifiedView ? <List size={20} /> : <AlignJustify size={20} />}
              </button>
            )}
            <button
              onClick={() => { setEditingPlan(null); setShowAddPlan(true); }}
              className="gym-header__add-btn"
              title="New Program"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        {/* QUICK STATS */}
        <div className="gym-stats-row">
          <div className="gym-stat-card">
            <div className="gym-stat-card__label">
              <ClipboardList size={13} /> Programs
            </div>
            <div className="gym-stat-card__value">{plans.length}</div>
          </div>
          <div className="gym-stat-card">
            <div className="gym-stat-card__label">
              <Flame size={13} /> This Week
            </div>
            <div className="gym-stat-card__value">{thisWeekLogs.length}</div>
          </div>
          <div className="gym-stat-card">
            <div className="gym-stat-card__label">
              <TrendingUp size={13} /> Total
            </div>
            <div className="gym-stat-card__value">{logs.length}</div>
          </div>
        </div>
      </header>

      {/* NAVIGATION TABS */}
      <div className="gym-tabs">
        {[
          { id: 'plans',   label: 'Programs', icon: ClipboardList },
          { id: 'workout', label: 'Active',   icon: Dumbbell },
          { id: 'history', label: 'History',  icon: History },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveSubTab(t.id)}
            className={`gym-tab-btn ${activeSubTab === t.id ? 'gym-tab-btn--active' : ''}`}
          >
            <t.icon size={15} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* VIEWS CONTENT */}
      <div className="gym-content">

        {/* ──── MY PLANS ──── */}
        {activeSubTab === 'plans' && (
          <div className={`gym-plans-list ${simplifiedView ? 'gym-plans-list--grid' : ''}`}>
            {plans.length === 0 ? (
              <div className="gym-empty">
                <Dumbbell size={36} className="gym-empty__icon" />
                <h3 className="gym-empty__title">No programs yet</h3>
                <p className="gym-empty__text">Create your first program to start training.</p>
                <button
                  onClick={() => { setEditingPlan(null); setShowAddPlan(true); }}
                  className="gym-plan-card__action-btn--start gym-empty__cta"
                >
                  <Plus size={16} /> Create Program
                </button>
              </div>
            ) : (
              plans.map(plan => (
                <div key={plan.id} className="gym-plan-card">
                  <div className="gym-plan-card__header">
                    <div>
                      <h3 className="gym-plan-card__name">{plan.name}</h3>
                      <span className="gym-plan-card__type">{plan.type}</span>
                    </div>
                    <div className="gym-plan-card__tools">
                      <button
                        onClick={() => { setEditingPlan(plan); setShowAddPlan(true); }}
                        className="gym-plan-card__action-btn"
                        title="Edit"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => deletePlan(plan.id)}
                        className="gym-plan-card__action-btn gym-plan-card__action-btn--danger"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {!simplifiedView && (
                    <div className="gym-plan-card__exercises">
                      {plan.exercises.slice(0, 4).map((ex, i) => (
                        <div key={i} className="gym-plan-card__exercise">
                          <span className="gym-plan-card__ex-name">{ex.name}</span>
                          <span className="gym-plan-card__ex-meta">
                            {ex.sets}×{ex.reps}{ex.targetWeight ? ` · ${ex.targetWeight}kg` : ''}
                          </span>
                        </div>
                      ))}
                      {plan.exercises.length > 4 && (
                        <div className="gym-plan-card__more">
                          +{plan.exercises.length - 4} more
                        </div>
                      )}
                    </div>
                  )}

                  <div className="gym-plan-card__actions" style={simplifiedView ? { marginTop: '12px' } : undefined}>
                    <button onClick={() => startLogging(plan)} className="gym-plan-card__action-btn gym-plan-card__action-btn--start">
                      <Play size={15} fill="currentColor" /> Start
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ──── ACTIVE WORKOUT ──── */}
        {activeSubTab === 'workout' && (
          <div className="gym-workout-tab">
            {!logging ? (
              // No active session — require picking a plan
              plans.length === 0 ? (
                <div className="gym-empty">
                  <ClipboardList size={36} className="gym-empty__icon" />
                  <h3 className="gym-empty__title">No programs yet</h3>
                  <p className="gym-empty__text">Create a program first, then you can run a workout.</p>
                  <button
                    onClick={() => { setEditingPlan(null); setShowAddPlan(true); setActiveSubTab('plans'); }}
                    className="gym-plan-card__action-btn--start gym-empty__cta"
                  >
                    <Plus size={16} /> Create Program
                  </button>
                </div>
              ) : (
                <div className="gym-pick-plan">
                  <p className="gym-pick-plan__label">Pick a program</p>
                  {plans.map(plan => (
                    <button
                      key={plan.id}
                      onClick={() => startLogging(plan)}
                      className="gym-pick-plan__card"
                    >
                      <div className="gym-pick-plan__info">
                        <span className="gym-pick-plan__name">{plan.name}</span>
                        <span className="gym-pick-plan__meta">
                          {plan.type} · {plan.exercises.length} exercises
                        </span>
                      </div>
                      <div className="gym-pick-plan__play">
                        <Play size={18} fill="currentColor" />
                      </div>
                    </button>
                  ))}
                </div>
              )
            ) : (
              // Active session
              <div className="gym-session">
                {/* Session header */}
                <div className="gym-session-header">
                  <button
                    onClick={() => setLogging(null)}
                    className="gym-cancel-btn"
                  >
                    <X size={14} /> Cancel
                  </button>
                  <span className="gym-session-header__name">{logging.planName}</span>
                  <button onClick={saveWorkout} className="gym-finish-btn--inline">
                    <Save size={14} /> Finish
                  </button>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 16px 8px' }}>
                  <button
                    onClick={tickAllWorkoutSets}
                    className="gym-icon-btn"
                    style={{ fontSize: '0.75rem', gap: '6px', padding: '6px 12px', borderRadius: '20px', background: 'var(--c-surface-elevated)', border: '1px solid var(--c-border)', color: 'var(--c-text-muted)' }}
                  >
                    <CheckCircle2 size={14} /> Tick All Exercises
                  </button>
                </div>

                {/* Exercise list */}
                <div className="gym-exercise-list">
                  {logging.exercises.map((ex, exIdx) => (
                    <div key={exIdx} className="gym-exercise-item">
                      {/* Exercise name row */}
                      <div className="gym-exercise-item__top">
                        <input
                          type="text"
                          value={ex.name}
                          placeholder={`Exercise ${exIdx + 1}`}
                          onChange={e => updateExerciseName(exIdx, e.target.value)}
                          className="gym-exercise-item__name-input"
                        />
                        <button
                          onClick={() => tickAllSets(exIdx)}
                          className="gym-icon-btn"
                          title="Tick all sets"
                          style={{ marginRight: '0.25rem', color: 'var(--c-accent)' }}
                        >
                          <CheckCircle2 size={16} />
                        </button>
                        {logging.exercises.length > 1 && (
                          <button
                            onClick={() => removeExercise(exIdx)}
                            className="gym-icon-btn gym-icon-btn--danger"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {/* Target badge */}
                      {ex.targetSets > 0 && (
                        <div className="gym-target-badge">
                          <Target size={12} />
                          <span>{ex.targetSets}×{ex.targetReps}{ex.targetWeight ? ` @ ${ex.targetWeight}kg` : ''}</span>
                        </div>
                      )}

                      {/* Set rows */}
                      <div className="gym-set-rows">
                        <div className="gym-set-row gym-set-row--header">
                          <span>Set</span>
                          <span>kg</span>
                          <span>Reps</span>
                          <span>✓</span>
                        </div>

                        {ex.sets.map((set, setIdx) => (
                          <div
                            key={setIdx}
                            className={`gym-set-row ${set.done ? 'gym-set-row--done' : ''}`}
                          >
                            <div className="gym-set-row__num">
                              {set.done
                                ? <CheckCircle2 size={16} style={{ color: 'var(--c-accent)' }} />
                                : setIdx + 1}
                            </div>

                            {/* Weight stepper */}
                            <div className="gym-stepper">
                              <button onClick={() => stepWeight(exIdx, setIdx, -2.5)} className="gym-stepper__btn">−</button>
                              <input
                                type="number"
                                inputMode="decimal"
                                placeholder="0"
                                value={set.weight}
                                onChange={e => updateSet(exIdx, setIdx, 'weight', e.target.value)}
                                className="gym-stepper__input"
                              />
                              <button onClick={() => stepWeight(exIdx, setIdx, 2.5)} className="gym-stepper__btn">+</button>
                            </div>

                            {/* Reps stepper */}
                            <div className="gym-stepper gym-stepper--reps">
                              <button onClick={() => stepReps(exIdx, setIdx, -1)} className="gym-stepper__btn">−</button>
                              <input
                                type="number"
                                inputMode="numeric"
                                placeholder={String(ex.targetReps || '0')}
                                value={set.reps}
                                onChange={e => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                                className="gym-stepper__input"
                              />
                              <button onClick={() => stepReps(exIdx, setIdx, 1)} className="gym-stepper__btn">+</button>
                            </div>

                            {/* Done check */}
                            <button
                              onClick={() => toggleSetDone(exIdx, setIdx)}
                              className={`gym-set-check ${set.done ? 'gym-set-check--done' : ''}`}
                              onContextMenu={e => { e.preventDefault(); removeSet(exIdx, setIdx); }}
                              title="Tap to complete · Right-click to remove"
                            >
                              <Check size={14} strokeWidth={set.done ? 4 : 2} />
                            </button>
                          </div>
                        ))}
                      </div>

                      <button onClick={() => addSet(exIdx)} className="gym-add-set-btn">
                        <Plus size={13} /> Add Set
                      </button>
                    </div>
                  ))}
                </div>

                <button onClick={addExercise} className="gym-add-exercise-btn">
                  <Plus size={16} /> Add Exercise
                </button>
              </div>
            )}
          </div>
        )}

        {/* ──── HISTORY ──── */}
        {activeSubTab === 'history' && (
          <div className="gym-history-list">
            {logs.length === 0 ? (
              <div className="gym-empty">
                <History size={36} className="gym-empty__icon" />
                <h3 className="gym-empty__title">No sessions yet</h3>
                <p className="gym-empty__text">Complete a workout and it'll show up here.</p>
              </div>
            ) : (
              logs.map(log => (
                <div key={log.id} className="gym-log-card">
                  <div className="gym-log-card__header">
                    <div className="gym-log-card__date-block">
                      <div className="gym-log-card__icon-wrap">
                        <CalendarIcon size={15} />
                      </div>
                      <div>
                        <div className="gym-log-card__date">
                          {format(new Date(log.date), 'MMM d, yyyy')}
                        </div>
                        {log.planName && (
                          <div className="gym-log-card__plan">{log.planName}</div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteLog(log.id)}
                      className="gym-icon-btn gym-icon-btn--danger"
                      title="Delete log"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="gym-log-card__exercises">
                    {log.exercises?.map((ex, i) => (
                      <span key={i} className="gym-log-card__pill">
                        {ex.name} · {ex.sets?.length}s
                        {ex.sets?.[0]?.weight ? ` · ${ex.sets[0].weight}kg` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ═══ Add/Edit Plan Bottom Tray ═══ */}
      {showAddPlan && (
        <AddPlanTray
          initialPlan={editingPlan}
          onSave={savePlan}
          onClose={() => { setShowAddPlan(false); setEditingPlan(null); }}
        />
      )}
    </div>
  );
}


/* ────── Add/Edit Workout Plan — Bottom Tray ────── */
function AddPlanTray({ onSave, onClose, initialPlan }) {
  const [name, setName] = useState(initialPlan ? initialPlan.name : '');
  const [type, setType] = useState(initialPlan ? initialPlan.type : 'Push');
  const [exercises, setExercises] = useState(
    initialPlan
      ? initialPlan.exercises.map(ex => ({ ...ex }))
      : [{ name: '', sets: 3, reps: 10, targetWeight: '' }]
  );

  // AI paste state (only shown for new plans)
  const [pasteText, setPasteText] = useState('');
  const [showPaste, setShowPaste] = useState(!initialPlan);

  function handleParse() {
    const parsed = parsePlanText(pasteText);
    if (parsed.length === 0) return;
    setExercises(parsed.map(ex => ({
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      targetWeight: ex.targetWeight || '',
    })));
    setPasteText('');
    setShowPaste(false);
  }

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
    <div className="gym-tray-overlay" onClick={onClose}>
      <div className="gym-tray" onClick={e => e.stopPropagation()}>

        {/* Drag handle */}
        <div className="gym-tray__handle" />

        {/* Header */}
        <div className="gym-tray__header">
          <h2 className="gym-tray__title">
            {initialPlan ? 'Edit Program' : 'New Program'}
          </h2>
          <button onClick={onClose} className="gym-icon-btn">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="gym-tray__body">
          <form id="plan-form" onSubmit={handleSubmit}>

            {/* AI Paste — only for new plans */}
            {!initialPlan && showPaste && (
              <div className="gym-ai-paste">
                <p className="gym-ai-paste__label">
                  <Sparkles size={13} /> Paste your plan
                </p>
                <textarea
                  className="gym-ai-paste__textarea"
                  placeholder={"Bench Press 4x8 @80kg\nIncline DB Press 3x10\nCable Fly 3x15 @15kg"}
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                  rows={4}
                />
                <div className="gym-ai-paste__actions">
                  <button
                    type="button"
                    onClick={() => setShowPaste(false)}
                    className="gym-ai-paste__skip"
                  >
                    Skip
                  </button>
                  <button
                    type="button"
                    onClick={handleParse}
                    disabled={!pasteText.trim()}
                    className="gym-ai-parse-btn"
                  >
                    Parse ✨
                  </button>
                </div>
              </div>
            )}

            {!initialPlan && !showPaste && (
              <button
                type="button"
                onClick={() => setShowPaste(true)}
                className="gym-ai-parse-btn"
                style={{ alignSelf: 'flex-start', marginBottom: 4 }}
              >
                <Sparkles size={13} /> Paste plan instead
              </button>
            )}

            {/* Plan name */}
            <div className="gym-field">
              <label className="gym-field__label">Program Name</label>
              <input
                autoFocus
                type="text"
                placeholder="e.g. Push Day A"
                value={name}
                onChange={e => setName(e.target.value)}
                className="gym-field__input"
              />
            </div>

            {/* Focus type */}
            <div className="gym-field">
              <label className="gym-field__label">Focus Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="gym-field__input"
              >
                {PLAN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Exercises */}
            <div className="gym-field">
              <div className="gym-field__row">
                <label className="gym-field__label">Exercises</label>
                <span className="gym-plan-card__type">{exercises.length}</span>
              </div>

              <div className="gym-modal-exercises">
                {exercises.map((ex, idx) => (
                  <div key={idx} className="gym-modal-exercise-row">
                    <div className="gym-modal-exercise-row__top">
                      <span className="gym-modal-exercise-row__num">#{idx + 1}</span>
                      {exercises.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeExercise(idx)}
                          className="gym-modal-remove-btn"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      placeholder="Exercise Name"
                      value={ex.name || ''}
                      onChange={e => updateExercise(idx, 'name', e.target.value)}
                      className="gym-field__input"
                    />

                    <div className="gym-modal-exercise-row__grids">
                      <div className="gym-mini-field">
                        <span className="gym-mini-field__label">Sets</span>
                        <input
                          type="number"
                          placeholder="3"
                          value={ex.sets || ''}
                          onChange={e => updateExercise(idx, 'sets', e.target.value)}
                          className="gym-mini-field__input"
                        />
                      </div>
                      <div className="gym-mini-field">
                        <span className="gym-mini-field__label">Reps</span>
                        <input
                          type="number"
                          placeholder="10"
                          value={ex.reps || ''}
                          onChange={e => updateExercise(idx, 'reps', e.target.value)}
                          className="gym-mini-field__input"
                        />
                      </div>
                      <div className="gym-mini-field">
                        <span className="gym-mini-field__label">kg (opt)</span>
                        <input
                          type="number"
                          placeholder="—"
                          value={ex.targetWeight || ''}
                          onChange={e => updateExercise(idx, 'targetWeight', e.target.value)}
                          className="gym-mini-field__input gym-mini-field__input--accent"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button type="button" onClick={addExercise} className="gym-add-set-btn" style={{ marginTop: 8 }}>
                <Plus size={14} /> Add Exercise
              </button>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="gym-tray__footer">
          <button type="submit" form="plan-form" className="gym-finish-btn">
            {initialPlan ? 'Update Program' : 'Create Program'} <Check size={16} strokeWidth={3} />
          </button>
        </div>

      </div>
    </div>
  );
}
