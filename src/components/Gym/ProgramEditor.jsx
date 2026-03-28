import { useState, useEffect, useRef } from 'react';
import {
  X, Plus, Sparkles, Dumbbell, Save, ChevronLeft,
  GripVertical, Trash2, ArrowUp, ArrowDown, MessageCircle
} from 'lucide-react';

const PLAN_TYPES = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body', 'Cardio', 'Custom'];

/**
 * Parse pasted workout text into exercises
 * Supports: "Bench Press 4x8 @80kg" or "Bench Press 4x8" or just "Bench Press"
 */
function parsePlanText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const results = [];
  const rx = /^(.+?)\s+(\d+)\s*[xX×]\s*(\d+)(?:\s*[@＠]\s*([\d.]+))?/;

  for (const line of lines) {
    if (/^[-–—•#*=]+$/.test(line)) continue;
    const m = rx.exec(line);
    if (m) {
      results.push({
        name: m[1].trim(),
        sets: parseInt(m[2], 10) || 3,
        reps: parseInt(m[3], 10) || 10,
        targetWeight: m[4] ? parseFloat(m[4]) : '',
      });
    } else if (line.length > 1 && !/^\d+$/.test(line)) {
      results.push({ name: line, sets: 3, reps: 10, targetWeight: '' });
    }
  }
  return results;
}

/**
 * Full-screen Program Editor - Optimized for desktop and mobile
 */
export default function ProgramEditor({ initialPlan, onSave, onClose }) {
  const [name, setName] = useState(initialPlan?.name || '');
  const [type, setType] = useState(initialPlan?.type || 'Custom');
  const [exercises, setExercises] = useState(
    initialPlan?.exercises?.map(ex => ({
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      targetWeight: ex.targetWeight || '',
    })) || [{ name: '', sets: 3, reps: 10, targetWeight: '' }]
  );
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [activeSection, setActiveSection] = useState('details'); // 'details' | 'exercises'

  const isEditing = !!initialPlan;
  const exerciseListRef = useRef(null);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && !showPasteModal) {
        onClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [name, type, exercises, showPasteModal]);

  function handleAddExercise() {
    setExercises(prev => [...prev, { name: '', sets: 3, reps: 10, targetWeight: '' }]);
    // Scroll to bottom on mobile
    setTimeout(() => {
      exerciseListRef.current?.scrollTo({
        top: exerciseListRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }, 50);
  }

  function handleRemoveExercise(idx) {
    if (exercises.length <= 1) return;
    setExercises(prev => prev.filter((_, i) => i !== idx));
  }

  function handleMoveExercise(idx, direction) {
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === exercises.length - 1) return;
    
    setExercises(prev => {
      const newExercises = [...prev];
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      [newExercises[idx], newExercises[targetIdx]] = [newExercises[targetIdx], newExercises[idx]];
      return newExercises;
    });
  }

  function updateExercise(idx, field, value) {
    setExercises(prev => prev.map((ex, i) => 
      i === idx ? { ...ex, [field]: value } : ex
    ));
  }

  function handleParsePaste() {
    const parsed = parsePlanText(pasteText);
    if (parsed.length > 0) {
      setExercises(parsed.map(ex => ({ ...ex, targetWeight: ex.targetWeight || '' })));
      setShowPasteModal(false);
      setPasteText('');
    }
  }

  function handleSave() {
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

  const canSave = name.trim() && exercises.some(ex => ex.name.trim());

  return (
    <div className="program-editor-overlay">
      <div className="program-editor">
        {/* Header */}
        <header className="program-editor__header">
          <button onClick={onClose} className="program-editor__back-btn">
            <ChevronLeft size={20} />
            <span>Back</span>
          </button>
          <h1 className="program-editor__title">
            <Dumbbell size={22} />
            {isEditing ? 'Edit Program' : 'New Program'}
          </h1>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className={`program-editor__save-btn ${!canSave ? 'program-editor__save-btn--disabled' : ''}`}
          >
            <Save size={18} />
            <span>Save</span>
          </button>
        </header>

        {/* Mobile Navigation Tabs */}
        <div className="program-editor__mobile-tabs">
          <button
            onClick={() => setActiveSection('details')}
            className={activeSection === 'details' ? 'program-editor__mobile-tab--active' : ''}
          >
            Details
          </button>
          <button
            onClick={() => setActiveSection('exercises')}
            className={activeSection === 'exercises' ? 'program-editor__mobile-tab--active' : ''}
          >
            Exercises ({exercises.length})
          </button>
        </div>

        {/* Main Content */}
        <div className="program-editor__content">
          {/* Left Panel - Details */}
          <div className={`program-editor__panel ${activeSection === 'details' ? 'program-editor__panel--active' : ''}`}>
            <div className="program-editor__section">
              <h2 className="program-editor__section-title">Program Details</h2>
              
              {/* Name Input */}
              <div className="program-editor__field">
                <label className="program-editor__label">Program Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g., Upper Body Strength"
                  className="program-editor__input program-editor__input--large"
                  autoFocus
                />
              </div>

              {/* Type Select */}
              <div className="program-editor__field">
                <label className="program-editor__label">Focus Type</label>
                <div className="program-editor__type-grid">
                  {PLAN_TYPES.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`program-editor__type-btn ${type === t ? 'program-editor__type-btn--active' : ''}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Assistant Promo */}
              <div className="program-editor__ai-section">
                <div className="program-editor__ai-header">
                  <Sparkles size={18} />
                  <span>AI Assistant</span>
                </div>
                <p className="program-editor__ai-desc">
                  Too lazy to type? Just tell our AI what you want and it&apos;ll create the perfect program for you automatically!
                </p>
                <button
                  onClick={() => onClose()}
                  className="program-editor__ai-btn"
                >
                  <MessageCircle size={16} />
                  Ask AI to Create Program
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel - Exercises */}
          <div className={`program-editor__panel ${activeSection === 'exercises' ? 'program-editor__panel--active' : ''}`}>
            <div className="program-editor__section">
              <div className="program-editor__section-header">
                <h2 className="program-editor__section-title">Exercises</h2>
                <span className="program-editor__count">{exercises.length}</span>
              </div>

              <div className="program-editor__exercise-list" ref={exerciseListRef}>
                {exercises.map((ex, idx) => (
                  <div key={idx} className="program-editor__exercise-card">
                    {/* Exercise Number & Drag Handle */}
                    <div className="program-editor__exercise-header">
                      <div className="program-editor__exercise-num">
                        <GripVertical size={16} />
                        <span>#{idx + 1}</span>
                      </div>
                      <div className="program-editor__exercise-actions">
                        <button
                          onClick={() => handleMoveExercise(idx, 'up')}
                          disabled={idx === 0}
                          className="program-editor__icon-btn"
                          title="Move up"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          onClick={() => handleMoveExercise(idx, 'down')}
                          disabled={idx === exercises.length - 1}
                          className="program-editor__icon-btn"
                          title="Move down"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          onClick={() => handleRemoveExercise(idx)}
                          disabled={exercises.length <= 1}
                          className="program-editor__icon-btn program-editor__icon-btn--danger"
                          title="Remove"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Exercise Name */}
                    <input
                      type="text"
                      value={ex.name}
                      onChange={e => updateExercise(idx, 'name', e.target.value)}
                      placeholder="Exercise name..."
                      className="program-editor__input program-editor__exercise-name"
                    />

                    {/* Sets/Reps/Weight Grid */}
                    <div className="program-editor__exercise-params">
                      <div className="program-editor__param">
                        <label className="program-editor__param-label">Sets</label>
                        <input
                          type="number"
                          value={ex.sets}
                          onChange={e => updateExercise(idx, 'sets', e.target.value)}
                          min="1"
                          max="20"
                          className="program-editor__param-input"
                        />
                      </div>
                      <div className="program-editor__param">
                        <label className="program-editor__param-label">Reps</label>
                        <input
                          type="number"
                          value={ex.reps}
                          onChange={e => updateExercise(idx, 'reps', e.target.value)}
                          min="1"
                          max="100"
                          className="program-editor__param-input"
                        />
                      </div>
                      <div className="program-editor__param">
                        <label className="program-editor__param-label">Weight (kg)</label>
                        <input
                          type="number"
                          value={ex.targetWeight}
                          onChange={e => updateExercise(idx, 'targetWeight', e.target.value)}
                          placeholder="—"
                          min="0"
                          step="0.5"
                          className="program-editor__param-input program-editor__param-input--optional"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Exercise Button */}
              <button
                onClick={handleAddExercise}
                className="program-editor__add-exercise-btn"
              >
                <Plus size={18} />
                Add Exercise
              </button>
            </div>
          </div>
        </div>

        {/* Paste Modal */}
        {false && (
          <div className="program-editor__paste-modal-overlay">
            <div className="program-editor__paste-modal">
              <div className="program-editor__paste-modal-header">
                <h3><Sparkles size={18} /> Import from Text</h3>
                <button onClick={() => setShowPasteModal(false)} className="program-editor__icon-btn">
                  <X size={18} />
                </button>
              </div>
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                placeholder={`Paste your workout plan here:

Bench Press 4x8 @80kg
Incline DB Press 3x10
Cable Fly 3x15 @15kg
Tricep Pushdown 3x12

Or just exercise names:
Squats
Deadlifts
Lunges`}
                className="program-editor__paste-textarea"
              />
              <div className="program-editor__paste-actions">
                <button onClick={() => setShowPasteModal(false)} className="program-editor__btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={handleParsePaste}
                  disabled={!pasteText.trim()}
                  className="program-editor__btn-primary"
                >
                  <Sparkles size={16} />
                  Parse & Import
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
