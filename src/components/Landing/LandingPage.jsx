/**
 * @fileoverview Landing Page — RamaDone pre-auth welcome.
 *
 * LAYOUT: All structural layout uses plain CSS classes from landing.css
 * (NOT Tailwind utilities for layout) to match the rest of the project.
 * Colors use the project's --c-* CSS variable system from index.css.
 *
 * SECTIONS:
 *   1. Navbar — sticky, glass-blur
 *   2. Hero — two-column: text left, phone mockup right (stacks on mobile)
 *   3. Features — 4-column grid (2-col tablet, 1-col mobile)
 *   4. Pricing — single centered card
 *   5. CTA — centered sign-in prompt
 *   6. Footer
 */
import { useState } from 'react';
import {
  Moon, LayoutDashboard, Calendar, CheckSquare, Wallet,
  Target, Dumbbell, Clock, MessageCircle, Sparkles,
  Check, Star, Shield, Zap, ChevronRight, Menu, X
} from 'lucide-react';

/* ───────── Data ───────── */
const FEATURES = [
  { icon: LayoutDashboard, title: 'Dashboard', desc: 'Unified home screen with real-time productivity stats, daily goals, and spiritual reminders.' },
  { icon: Calendar, title: 'Smart Calendar', desc: 'Full Day/Week/Month views with seamless Google Calendar sync and event management.' },
  { icon: CheckSquare, title: 'Task Manager', desc: 'Kanban boards and list views with priority levels and deep focus mode.' },
  { icon: Wallet, title: 'Expense Tracker', desc: 'Local-first income and spending logs with AI-generated visual reports.' },
  { icon: Target, title: 'Habit Tracker', desc: 'Cultivate consistency with streak counters, daily check-ins, and progress tracking.' },
  { icon: Dumbbell, title: 'Gym Tracker', desc: 'Program-first workout management with AI parsing of workout notes.' },
  { icon: Clock, title: 'Prayer Times', desc: 'Automatic GPS-based prayer times using the AlAdhan API with notifications.' },
  { icon: MessageCircle, title: 'AI Chat', desc: '31 specialized AI tools powered by DeepSeek across productivity and spiritual growth.' },
];

const PRICING_FEATURES = [
  'All productivity modules',
  'AI chatbot (100 messages/month)',
  'Google Calendar sync',
  '3 beautiful themes',
  'Offline-first & Local storage',
  'Future lifetime updates',
];

/* ───────── Component ───────── */
export default function LandingPage({ onSignIn }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="landing">

      {/* Background orbs */}
      <div className="landing__bg">
        <div className="landing__orb landing__orb--accent" />
        <div className="landing__orb landing__orb--primary" />
        {[...Array(10)].map((_, i) => (
          <div key={i} className="landing__star"
            style={{
              width: `${2 + Math.random() * 2}px`,
              height: `${2 + Math.random() * 2}px`,
              top: `${5 + Math.random() * 90}%`,
              left: `${5 + Math.random() * 90}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      {/* Page content — sits above background */}
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ═══ NAVBAR ═══ */}
        <nav className="landing__nav">
          <div className="landing__container landing__nav-inner">
            <div className="landing__brand">
              <div className="landing__brand-icon">
                <Moon style={{ width: 16, height: 16 }} fill="currentColor" />
              </div>
              <span className="landing__brand-name">RamaDone</span>
            </div>

            <div className="landing__nav-links">
              <a href="#features" className="landing__nav-link">Features</a>
              <a href="#pricing" className="landing__nav-link">Pricing</a>
              <button onClick={onSignIn} className="landing__nav-cta">Get Started</button>
            </div>

            <button onClick={() => setMenuOpen(!menuOpen)} className="landing__menu-btn">
              {menuOpen
                ? <X style={{ width: 20, height: 20 }} />
                : <Menu style={{ width: 20, height: 20 }} />}
            </button>
          </div>

          {menuOpen && (
            <div className="landing__mobile-menu">
              <a href="#features" className="landing__mobile-link" onClick={() => setMenuOpen(false)}>Features</a>
              <a href="#pricing" className="landing__mobile-link" onClick={() => setMenuOpen(false)}>Pricing</a>
              <button onClick={onSignIn} className="landing__mobile-cta">Get Started</button>
            </div>
          )}
        </nav>

        {/* ═══ HERO ═══ */}
        <section className="landing__hero">
          <div className="landing__container">
            <div className="landing__hero-grid">

              {/* Left — text */}
              <div className="landing__hero-text landing-animate">
                <p className="landing__hero-badge">
                  <Sparkles style={{ width: 14, height: 14 }} />
                  AI-Powered Productivity
                </p>

                <h1 className="landing__hero-title">
                  Focus on the<br />
                  <span>Divine.</span><br />
                  We'll Handle the Rest.
                </h1>

                <p className="landing__hero-desc">
                  The all-in-one AI companion designed for the modern Ummah.
                  Seamlessly balance your worldly tasks with your spiritual goals.
                </p>

                <div className="landing__hero-actions">
                  <button onClick={onSignIn} className="landing__btn-primary">
                    <GoogleIcon /> Sign in with Google
                  </button>
                  <a href="#features" className="landing__btn-secondary">
                    Learn More <ChevronRight style={{ width: 14, height: 14 }} />
                  </a>
                </div>

                <p className="landing__hero-note">
                  <Shield style={{ width: 12, height: 12, color: 'var(--c-accent)' }} />
                  100% local storage — your data never leaves your device
                </p>
              </div>

              {/* Right — phone mockup with real UI */}
              <div className="landing__hero-mockup landing-animate" style={{ animationDelay: '0.2s' }}>
                <div className="landing__phone">
                  {/* Notch */}
                  <div className="landing__phone-notch">
                    <div className="landing__phone-notch-bar" />
                  </div>

                  {/* Screen content — mini dashboard */}
                  <div className="landing__phone-screen">
                    {/* Header */}
                    <div className="landing__phone-header">
                      <span className="landing__phone-header-title">Dashboard</span>
                      <span className="landing__phone-header-badge">Day 15</span>
                    </div>

                    {/* Stats */}
                    <div className="landing__phone-stats">
                      <div className="landing__phone-stat landing__phone-stat--accent">
                        <div className="landing__phone-stat-value">5</div>
                        <div className="landing__phone-stat-label">Tasks Today</div>
                      </div>
                      <div className="landing__phone-stat landing__phone-stat--primary">
                        <div className="landing__phone-stat-value">87%</div>
                        <div className="landing__phone-stat-label">Habits Done</div>
                      </div>
                    </div>

                    {/* Tasks */}
                    <div className="landing__phone-tasks">
                      <div className="landing__phone-task landing__phone-task--done">
                        <div className="landing__phone-task-check" />
                        <span>Fajr prayer ✓</span>
                      </div>
                      <div className="landing__phone-task">
                        <div className="landing__phone-task-check" />
                        <span>Review lecture notes</span>
                      </div>
                      <div className="landing__phone-task">
                        <div className="landing__phone-task-check" />
                        <span>Gym — Push day</span>
                      </div>
                      <div className="landing__phone-task">
                        <div className="landing__phone-task-check" />
                        <span>Read 10 pages Quran</span>
                      </div>
                    </div>

                    {/* Prayer time bar */}
                    <div className="landing__phone-header" style={{ marginTop: 'auto' }}>
                      <span className="landing__phone-header-title">🕌 Maghrib</span>
                      <span className="landing__phone-header-badge">6:42 PM</span>
                    </div>
                  </div>

                  {/* Bottom nav */}
                  <div className="landing__phone-nav">
                    <LayoutDashboard className="landing__phone-nav-dot landing__phone-nav-dot--active" />
                    <Calendar className="landing__phone-nav-dot" />
                    <CheckSquare className="landing__phone-nav-dot" />
                    <MessageCircle className="landing__phone-nav-dot" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ FEATURES ═══ */}
        <section id="features" className="landing__features">
          <div className="landing__container">
            <div className="landing__section-header landing-animate">
              <h2 className="landing__section-title">Everything You Need, In One App</h2>
              <p className="landing__section-desc">
                Designed to bridge the gap between high-performance productivity and spiritual mindfulness.
              </p>
            </div>

            <div className="landing__features-grid">
              {FEATURES.map(({ icon: Icon, title, desc }, idx) => (
                <div key={title}
                  className={`landing__feature-card landing-animate--stagger landing-animate--delay-${idx + 1}`}>
                  <div className="landing__feature-icon">
                    <Icon />
                  </div>
                  <h3 className="landing__feature-title">{title}</h3>
                  <p className="landing__feature-desc">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ PRICING ═══ */}
        <section id="pricing" className="landing__pricing">
          <div className="landing__container">
            <div className="landing__section-header landing-animate">
              <h2 className="landing__section-title">Simple, Affordable Pricing</h2>
              <p className="landing__section-desc">
                One plan. Everything local. No subscriptions needed during Ramadan.
              </p>
            </div>

            <div className="landing__pricing-card-wrap landing-animate">
              <div className="landing__pricing-card">
                <div className="landing__pricing-badge">Best Value</div>

                <div className="landing__pricing-body">
                  {/* Header */}
                  <div className="landing__pricing-header">
                    <div className="landing__pricing-icon">
                      <Star fill="currentColor" />
                    </div>
                    <div>
                      <div className="landing__pricing-name">RamaDone Bundle</div>
                      <div className="landing__pricing-subtitle">Access the complete productivity suite</div>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="landing__pricing-price">
                    <span className="landing__pricing-amount">$2.99</span>
                    <span className="landing__pricing-period"> /month</span>
                    <div className="landing__pricing-free">
                      <Zap style={{ width: 12, height: 12 }} />
                      Free during Ramadan 2026 🌙
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="landing__pricing-features">
                    {PRICING_FEATURES.map((f) => (
                      <li key={f} className="landing__pricing-feature">
                        <div className="landing__pricing-check">
                          <Check />
                        </div>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Button */}
                  <button onClick={onSignIn} className="landing__btn-primary" style={{ width: '100%' }}>
                    <GoogleIcon /> Start Free During Ramadan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ CTA ═══ */}
        <section className="landing__cta landing-animate">
          <div className="landing__container">
            <h2 className="landing__cta-title">Ready for a better productivity experience?</h2>
            <p className="landing__cta-desc">
              Join the new era of intentional living. No cloud trackers, no data harvesting —
              just you and your goals.
            </p>
            <div className="landing__cta-btn">
              <button onClick={onSignIn} className="landing__btn-primary">
                <GoogleIcon /> Sign in with Google
              </button>
            </div>
          </div>
        </section>

        {/* ═══ FOOTER ═══ */}
        <footer className="landing__footer">
          <div className="landing__container landing__footer-inner">
            <div className="landing__footer-powered">
              <Sparkles style={{ width: 12, height: 12, color: 'var(--c-accent)' }} />
              Powered by DeepSeek AI
            </div>
            <p className="landing__footer-copy">
              RamaDone © 2026 — Built for productivity. Optionally blessed. 🌙
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* ───────── Google "G" Icon ───────── */
function GoogleIcon() {
  return (
    <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24">
      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
