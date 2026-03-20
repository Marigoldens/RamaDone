import React from 'react';
import {
  LogOut, MapPin, Clock, AlertTriangle, User,
  Palette, Globe, Brain, Database, Settings as SettingsIcon,
  ChevronRight, ShieldCheck, Check, Moon
} from 'lucide-react';
import { usePreferences } from '../../hooks/usePreferences';
import { THEMES } from '../../config/theme';
import db from '../../db/dexie';

export default function SettingsView({ user, onSignOut }) {
  const { prefs, setPref } = usePreferences();

  const handleResetData = async () => {
    if (window.confirm('Are you sure? This will delete all local history and settings.')) {
      await db.delete();
      window.location.reload();
    }
  };

  return (
    <div className="settings-page">

      {/* ── HEADER ─────────────────────────────────── */}
      <header className="settings-header">
        <div className="settings-header__title">
          <div className="settings-header__icon">
            <SettingsIcon size={18} />
          </div>
          <h1>Account &amp; Settings</h1>
        </div>
        <div className="settings-header__badge">
          <span className="settings-header__dot" />
          v1.0 Pro
        </div>
      </header>

      {/* ── SCROLLABLE BODY ────────────────────────── */}
      <div className="settings-body">
        <div className="settings-grid">

          {/* ════ LEFT COLUMN ════ */}
          <aside className="settings-left">

            {/* Profile card */}
            <div className="settings-profile-card">
              <div className="settings-avatar-wrap">
                <div className="settings-avatar">
                  {user?.photoURL
                    ? <img src={user.photoURL} alt="avatar" />
                    : <User size={32} />}
                </div>
                <div className="settings-avatar-badge">
                  <ShieldCheck size={14} />
                </div>
              </div>
              <h2 className="settings-profile-name">{user?.displayName || 'Faithful Member'}</h2>
              <p className="settings-profile-email">{user?.email}</p>
              <div className="settings-profile-tags">
                <span className="settings-tag settings-tag--muted">Free Plan</span>
                <span className="settings-tag settings-tag--green">Active</span>
              </div>
            </div>


          </aside>

          {/* ════ RIGHT COLUMN ════ */}
          <div className="settings-right">

            {/* ── APPEARANCE ─── */}
            <section className="settings-card">
              <div className="settings-section-header">
                <div className="settings-section-icon settings-section-icon--accent">
                  <Palette size={18} />
                </div>
                <div>
                  <h2 className="settings-section-title">Appearance</h2>
                  <p className="settings-section-subtitle">Customize interface theme</p>
                </div>
              </div>

              <div className="settings-theme-grid">
                {THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setPref('theme', theme.id)}
                    className={`settings-theme-card ${prefs.theme === theme.id ? 'settings-theme-card--active' : ''}`}
                  >
                    <div className="settings-theme-card__top">
                      <span className="settings-theme-card__emoji">{theme.emoji}</span>
                      {prefs.theme === theme.id && (
                        <div className="settings-theme-card__check">
                          <Check size={12} />
                        </div>
                      )}
                    </div>
                    <span className="settings-theme-card__name">{theme.name}</span>
                    <span className="settings-theme-card__sub">Visual style</span>
                  </button>
                ))}
              </div>
            </section>

            {/* ── PREFERENCES ROW ─── */}
            <div className="settings-prefs-row">

              {/* Time Format */}
              <section className="settings-card">
                <div className="settings-section-header">
                  <div className="settings-section-icon settings-section-icon--blue">
                    <Clock size={18} />
                  </div>
                  <h2 className="settings-section-title">Time Format</h2>
                </div>
                <div className="settings-toggle-row">
                  {['12h', '24h'].map(fmt => (
                    <button
                      key={fmt}
                      onClick={() => setPref('timeFormat', fmt)}
                      className={`settings-toggle-btn ${prefs.timeFormat === fmt ? 'settings-toggle-btn--active' : ''}`}
                    >
                      {fmt} Format
                    </button>
                  ))}
                </div>
              </section>

              {/* Location */}
              <section className="settings-card">
                <div className="settings-section-header">
                  <div className="settings-section-icon settings-section-icon--red">
                    <MapPin size={18} />
                  </div>
                  <h2 className="settings-section-title">Location</h2>
                </div>
                <button
                  onClick={async () => {
                    const pos = await new Promise((res, rej) =>
                      navigator.geolocation.getCurrentPosition(res, rej));
                    await setPref('latitude', pos.coords.latitude);
                    await setPref('longitude', pos.coords.longitude);
                    
                    // Clear cached prayer times so they regenerate with new coordinates
                    await db.table('prayerTimes').clear().catch(() => {
                      // Table might not exist yet if migration hasn't run
                      return db.events.where('type').anyOf('prayer', 'iftar').delete();
                    });
                    
                    alert('Location synced! Prayer times will adapt to your new location.');
                  }}
                  className="settings-location-btn"
                >
                  <Globe size={15} />
                  Sync Location
                </button>
                {prefs.latitude && (
                  <p className="settings-location-coords">
                    {prefs.latitude?.toFixed(2)}°N &nbsp;·&nbsp; {prefs.longitude?.toFixed(2)}°E
                  </p>
                )}
              </section>
            </div>

            {/* ── RAMADAN & PRAYER MODES ─── */}
            <section className="settings-card">
              <div className="settings-section-header">
                <div className="settings-section-icon settings-section-icon--green" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                  <Moon size={18} />
                </div>
                <div>
                  <h2 className="settings-section-title">Ramadan Mode</h2>
                  <p className="settings-section-subtitle">Enables Ramadan-specific language, greetings, Iftar/Suhoor context, and the Ramadan day counter in the AI</p>
                </div>
              </div>
              <div className="settings-toggle-row">
                <button
                  onClick={() => setPref('ramadanMode', !prefs.ramadanMode)}
                  className={`settings-toggle-btn ${prefs.ramadanMode ? 'settings-toggle-btn--active' : ''}`}
                  style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
                >
                  {prefs.ramadanMode ? '🌙 Ramadan Mode: On' : '🗓️ Ramadan Mode: Off (General Planner)'}
                </button>
              </div>
            </section>

            {/* ── PRAYER MODE ─── */}
            <section className="settings-card">
              <div className="settings-section-header">
                <div className="settings-section-icon" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                  <Clock size={18} />
                </div>
                <div>
                  <h2 className="settings-section-title">Prayer Mode</h2>
                  <p className="settings-section-subtitle">Shows the Prayers tab and injects today's prayer times into the AI. For Muslim users.</p>
                </div>
              </div>
              <div className="settings-toggle-row">
                <button
                  onClick={() => setPref('prayerMode', !prefs.prayerMode)}
                  className={`settings-toggle-btn ${prefs.prayerMode ? 'settings-toggle-btn--active' : ''}`}
                  style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
                >
                  {prefs.prayerMode ? '🕌 Prayer Times: On' : '⏰ Prayer Times: Off'}
                </button>
              </div>
            </section>

            {/* ── AI MODEL ─── */}
            <section className="settings-card">
              <div className="settings-section-header">
                <div className="settings-section-icon" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                  <Brain size={18} />
                </div>
                <div>
                  <h2 className="settings-section-title">AI Model</h2>
                  <p className="settings-section-subtitle">Choose how the assistant responds</p>
                </div>
              </div>
              <div className="settings-toggle-row" style={{ marginTop: '0.5rem' }}>
                {[
                  { id: 'deepseek-chat', label: 'Standard', sub: 'Fast & efficient' },
                  { id: 'deepseek-reasoner', label: 'Thinking', sub: 'Deeper reasoning' },
                ].map(model => (
                  <button
                    key={model.id}
                    onClick={() => setPref('deepseekModel', model.id)}
                    className={`settings-toggle-btn ${prefs.deepseekModel === model.id || (!prefs.deepseekModel && model.id === 'deepseek-chat') ? 'settings-toggle-btn--active' : ''}`}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.125rem' }}
                  >
                    <span>{model.label}</span>
                    <span style={{ fontSize: '0.6875rem', opacity: 0.6 }}>{model.sub}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* ── SYSTEM & DATA ─── */}
            <section className="settings-card">
              <div className="settings-section-header">
                <div className="settings-section-icon settings-section-icon--orange">
                  <Database size={18} />
                </div>
                <h2 className="settings-section-title">System &amp; Data</h2>
              </div>

              <button onClick={handleResetData} className="settings-danger-row">
                <div className="settings-danger-row__icon">
                  <AlertTriangle size={16} />
                </div>
                <div className="settings-danger-row__text">
                  <span>Clear Application Cache</span>
                  <span className="settings-danger-row__sub">Destructive action</span>
                </div>
                <ChevronRight size={16} className="settings-danger-row__arrow" />
              </button>

              <div className="settings-divider" />

              <button onClick={onSignOut} className="settings-logout-btn">
                <LogOut size={16} />
                Logout Account
              </button>
            </section>

            {/* Footer */}
            <p className="settings-footer">Ramadan Rhythm v1.0 · Crafting Serenity</p>
          </div>

        </div>
      </div>
    </div>
  );
}
