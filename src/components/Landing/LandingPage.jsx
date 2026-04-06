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
import { useState, useEffect, useRef } from 'react';
import { animate, createTimeline, stagger } from 'animejs';
import {
  Moon, LayoutDashboard, Calendar, CheckSquare, Wallet,
  Target, Dumbbell, Clock, MessageCircle, Sparkles,
  Check, Star, Shield, Zap, ChevronRight, Menu, X
} from 'lucide-react';

// Stable random star positions (generated once, not on every render)
const STARS = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  size: 2 + (((i * 37 + 13) % 10) / 10) * 2.5,
  top:  5  + (((i * 53 + 7)  % 90)),
  left: 5  + (((i * 71 + 19) % 90)),
  delay: (i * 0.28) % 3,
}));

/* ───────── Data ───────── */
const FEATURES = [
  { icon: LayoutDashboard, title: 'Dashboard', desc: 'Unified home — live stats for tasks, expenses, habits, and workouts at a glance with today’s prayer times.' },
  { icon: Calendar, title: 'Smart Calendar', desc: 'Day/Week/Month views with Google Calendar two-way sync, conflict detection, and free-slot finder.' },
  { icon: CheckSquare, title: 'Task Manager', desc: 'Create, prioritize and track to-dos with status (todo/in-progress/done) and due dates.' },
  { icon: Wallet, title: 'Expense Tracker', desc: 'Log income and expenses in IQD, view category breakdowns, and generate AI monthly reports.' },
  { icon: Target, title: 'Habit Tracker', desc: 'Build daily and weekly habits with streak tracking, completion logs, and progress history.' },
  { icon: Dumbbell, title: 'Gym Tracker', desc: 'Save named workout plans (PPL, Upper/Lower, etc.), log sessions, and track exercise progression.' },
  { icon: Clock, title: 'Prayer Times', desc: 'GPS-based prayer times via AlAdhan API. Ramadan Mode adds Iftar, Suhoor, and Tarawih scheduling.' },
  { icon: MessageCircle, title: 'AI Assistant', desc: '30+ specialized tools powered by DeepSeek — add events, log expenses, update tasks, and more — all in plain language.' },
];

const PRICING_FEATURES = [
  'All 7 productivity modules',
  'AI assistant — 100 messages / month',
  '30+ AI tools (calendar, tasks, expenses, habits, gym)',
  'Google Calendar two-way sync',
  'GPS prayer times + Ramadan Mode',
  '3 themes · PWA · 100% offline & local storage',
];

/* ───────── Component ───────── */
export default function LandingPage({ onSignIn }) {
  const [menuOpen, setMenuOpen] = useState(false);

  // ── Refs for anime.js targets ─────────────────────────────────────────
  const navRef         = useRef(null);
  const badgeRef       = useRef(null);
  const titleRef       = useRef(null);
  const descRef        = useRef(null);
  const actionsRef     = useRef(null);
  const noteRef        = useRef(null);
  const mockupRef      = useRef(null);
  const phoneRef       = useRef(null);
  const habitStatRef   = useRef(null);   // "87%" counter
  const featGridRef    = useRef(null);   // feature cards container
  const featHeadRef    = useRef(null);   // features section header
  const pricingWrapRef = useRef(null);   // pricing card
  const pricingHeadRef = useRef(null);   // pricing section header
  const ctaSectionRef  = useRef(null);   // bottom CTA
  const heroRef        = useRef(null);   // hero section (mouse parallax)

  // ── Entry timeline + continuous animations ────────────────────────────
  useEffect(() => {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });

    tl
      // Navbar slides down
      .add(navRef.current, { translateY: [-32, 0], opacity: [0, 1], duration: 680 })
      // Badge fades up
      .add(badgeRef.current, { translateY: [22, 0], opacity: [0, 1], duration: 560 }, '-=380')
      // Title lines stagger in
      .add(titleRef.current?.querySelectorAll('.lp-title-line'),
        { translateY: [42, 0], opacity: [0, 1], duration: 680, delay: stagger(90) }, '-=380')
      // Description
      .add(descRef.current, { translateY: [16, 0], opacity: [0, 1], duration: 540 }, '-=340')
      // CTA buttons stagger
      .add(actionsRef.current?.querySelectorAll('button, a'),
        { translateY: [16, 0], opacity: [0, 1], duration: 460, delay: stagger(80) }, '-=280')
      // Privacy note
      .add(noteRef.current, { opacity: [0, 1], duration: 420 }, '-=180')
      // Phone mockup slides in from right
      .add(mockupRef.current,
        { translateX: [72, 0], opacity: [0, 1], scale: [0.88, 1], duration: 900, ease: 'outElastic(1, .52)' }, '-=920');

    // Phone gentle float loop
    animate(phoneRef.current, {
      translateY: [-10, 10],
      direction: 'alternate',
      loop: true,
      duration: 3400,
      ease: 'inOutSine',
    });

    // Habit stat counter: 0 → 87%
    const counterObj = { value: 0 };
    animate(counterObj, {
      value: [0, 87],
      duration: 1800,
      delay: 860,
      ease: 'outCubic',
      onUpdate: () => {
        if (habitStatRef.current)
          habitStatRef.current.textContent = Math.round(counterObj.value) + '%';
      },
    });

    // Orbs slow drift
    animate('.landing__orb--accent', {
      translateX: [-28, 28], translateY: [-18, 18],
      direction: 'alternate', loop: true, duration: 9500, ease: 'inOutSine',
    });
    animate('.landing__orb--primary', {
      translateX: [22, -22], translateY: [14, -14],
      direction: 'alternate', loop: true, duration: 12000, ease: 'inOutSine',
    });

    // Stars pulse
    animate('.lp-star', {
      opacity: [0.06, 0.32], scale: [0.65, 1.35],
      direction: 'alternate', loop: true, duration: 2600,
      delay: stagger(320), ease: 'inOutSine',
    });
  }, []);

  // ── Scroll-triggered animations (IntersectionObserver) ────────────────────
  useEffect(() => {
    const observe = (el, cb, threshold = 0.12) => {
      if (!el) return null;
      const obs = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) { cb(); obs.disconnect(); }
      }, { threshold });
      obs.observe(el);
      return obs;
    };

    const featHeadObs = observe(featHeadRef.current, () =>
      animate(featHeadRef.current, { translateY: [28, 0], opacity: [0, 1], duration: 600, ease: 'outExpo' })
    );
    const featObs = observe(featGridRef.current, () =>
      animate(featGridRef.current?.querySelectorAll('.lp-feat'), {
        translateY: [40, 0], opacity: [0, 1], scale: [0.96, 1],
        duration: 640, delay: stagger(55), ease: 'outExpo',
      })
    );
    const pricingHeadObs = observe(pricingHeadRef.current, () =>
      animate(pricingHeadRef.current, { translateY: [28, 0], opacity: [0, 1], duration: 600, ease: 'outExpo' })
    );
    const pricingObs = observe(pricingWrapRef.current, () =>
      animate(pricingWrapRef.current, {
        translateY: [44, 0], opacity: [0, 1], scale: [0.94, 1], duration: 760, ease: 'outExpo',
      }), 0.15
    );
    const ctaObs = observe(ctaSectionRef.current, () =>
      animate(ctaSectionRef.current, { translateY: [32, 0], opacity: [0, 1], duration: 620, ease: 'outExpo' }), 0.15
    );

    return () => [featHeadObs, featObs, pricingHeadObs, pricingObs, ctaObs].forEach(o => o?.disconnect());
  }, []);

  // ── 3D mouse parallax on phone (desktop only) ─────────────────────────
  useEffect(() => {
    const hero  = heroRef.current;
    const phone = phoneRef.current;
    if (!hero || !phone) return;

    const onMove = (e) => {
      const r  = hero.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width  / 2)) / r.width;
      const dy = (e.clientY - (r.top  + r.height / 2)) / r.height;
      animate(phone, { rotateY: dx * 20, rotateX: -dy * 14, duration: 480, ease: 'outQuad' });
    };
    const onLeave = () =>
      animate(phone, { rotateY: 0, rotateX: 0, duration: 900, ease: 'outElastic(1, .5)' });

    hero.addEventListener('mousemove', onMove);
    hero.addEventListener('mouseleave', onLeave);
    return () => { hero.removeEventListener('mousemove', onMove); hero.removeEventListener('mouseleave', onLeave); };
  }, []);

  return (
    <div className="landing">

      {/* Background orbs + stars */}
      <div className="landing__bg">
        <div className="landing__orb landing__orb--accent" />
        <div className="landing__orb landing__orb--primary" />
        {STARS.map(s => (
          <div key={s.id} className="lp-star landing__star"
            style={{ width: s.size, height: s.size, top: `${s.top}%`, left: `${s.left}%`, opacity: 0 }}
          />
        ))}
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ═══ NAVBAR ═══ */}
        <nav ref={navRef} className="landing__nav" style={{ opacity: 0 }}>
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
              {menuOpen ? <X style={{ width: 20, height: 20 }} /> : <Menu style={{ width: 20, height: 20 }} />}
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
        <section ref={heroRef} className="landing__hero">
          <div className="landing__container">
            <div className="landing__hero-grid">

              {/* Left — text */}
              <div className="landing__hero-text">
                <p ref={badgeRef} className="landing__hero-badge" style={{ opacity: 0 }}>
                  <Sparkles style={{ width: 14, height: 14 }} />
                  AI-Powered Productivity
                </p>

                <h1 ref={titleRef} className="landing__hero-title">
                  <span className="lp-title-line" style={{ display: 'block', opacity: 0 }}>Focus on the</span>
                  <span className="lp-title-line" style={{ display: 'block', opacity: 0, color: 'var(--landing-accent)' }}>Divine.</span>
                  <span className="lp-title-line" style={{ display: 'block', opacity: 0 }}>We'll Handle the Rest.</span>
                </h1>

                <p ref={descRef} className="landing__hero-desc" style={{ opacity: 0 }}>
                  The all-in-one AI companion designed for the modern Ummah.
                  Seamlessly balance your worldly tasks with your spiritual goals.
                </p>

                <div ref={actionsRef} className="landing__hero-actions">
                  <button onClick={onSignIn} className="landing__btn-primary" style={{ opacity: 0 }}>
                    <GoogleIcon /> Sign in with Google
                  </button>
                  <a href="#features" className="landing__btn-secondary" style={{ opacity: 0 }}>
                    Learn More <ChevronRight style={{ width: 14, height: 14 }} />
                  </a>
                </div>

                <p ref={noteRef} className="landing__hero-note" style={{ opacity: 0 }}>
                  <Shield style={{ width: 12, height: 12, color: 'var(--c-accent)' }} />
                  100% local storage — your data never leaves your device
                </p>
              </div>

              {/* Right — phone mockup */}
              <div ref={mockupRef} className="landing__hero-mockup" style={{ opacity: 0 }}>
                <div ref={phoneRef} className="landing__phone lp-phone-3d">
                  <div className="landing__phone-notch">
                    <div className="landing__phone-notch-bar" />
                  </div>

                  <div className="landing__phone-screen">
                    <div className="landing__phone-header">
                      <span className="landing__phone-header-title">Dashboard</span>
                      <span className="landing__phone-header-badge">Day 15</span>
                    </div>

                    <div className="landing__phone-stats">
                      <div className="landing__phone-stat landing__phone-stat--accent">
                        <div className="landing__phone-stat-value">5</div>
                        <div className="landing__phone-stat-label">Tasks Today</div>
                      </div>
                      <div className="landing__phone-stat landing__phone-stat--primary">
                        <div ref={habitStatRef} className="landing__phone-stat-value">0%</div>
                        <div className="landing__phone-stat-label">Habits Done</div>
                      </div>
                    </div>

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

                    <div className="landing__phone-header" style={{ marginTop: 'auto' }}>
                      <span className="landing__phone-header-title">🕌 Maghrib</span>
                      <span className="landing__phone-header-badge">6:42 PM</span>
                    </div>
                  </div>

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
            <div ref={featHeadRef} className="landing__section-header" style={{ opacity: 0 }}>
              <h2 className="landing__section-title">Everything You Need, In One App</h2>
              <p className="landing__section-desc">
                Designed to bridge the gap between high-performance productivity and spiritual mindfulness.
              </p>
            </div>

            <div ref={featGridRef} className="landing__features-grid">
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="landing__feature-card lp-feat" style={{ opacity: 0 }}>
                  <div className="landing__feature-icon"><Icon /></div>
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
            <div ref={pricingHeadRef} className="landing__section-header" style={{ opacity: 0 }}>
              <h2 className="landing__section-title">Simple, Affordable Pricing</h2>
              <p className="landing__section-desc">
                One plan. Everything local. No subscriptions needed during Ramadan.
              </p>
            </div>

            <div ref={pricingWrapRef} className="landing__pricing-card-wrap" style={{ opacity: 0 }}>
              <div className="landing__pricing-card">
                <div className="landing__pricing-badge">Best Value</div>
                <div className="landing__pricing-body">
                  <div className="landing__pricing-header">
                    <div className="landing__pricing-icon"><Star fill="currentColor" /></div>
                    <div>
                      <div className="landing__pricing-name">RamaDone Bundle</div>
                      <div className="landing__pricing-subtitle">Access the complete productivity suite</div>
                    </div>
                  </div>
                  <div className="landing__pricing-price">
                    <span className="landing__pricing-amount">$2.99</span>
                    <span className="landing__pricing-period"> /month</span>
                    <div className="landing__pricing-free">
                      <Zap style={{ width: 12, height: 12 }} />
                      Free during Ramadan 2026 🌙
                    </div>
                  </div>
                  <ul className="landing__pricing-features">
                    {PRICING_FEATURES.map((f) => (
                      <li key={f} className="landing__pricing-feature">
                        <div className="landing__pricing-check"><Check /></div>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button onClick={onSignIn} className="landing__btn-primary" style={{ width: '100%' }}>
                    <GoogleIcon /> Start Free During Ramadan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ CTA ═══ */}
        <section ref={ctaSectionRef} className="landing__cta" style={{ opacity: 0 }}>
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
