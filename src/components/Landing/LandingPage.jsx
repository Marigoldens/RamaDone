/**
 * @fileoverview Landing Page — mobile-first with desktop responsive layout.
 *
 * RESPONSIVE STRATEGY:
 * - Mobile (<768px): Single column, stacked vertically (current)
 * - Desktop (≥768px): Two-column split — hero left, features right
 * - Large desktop (≥1024px): Extra spacing, larger typography
 */
import { Moon, Calendar, MessageCircle, Sparkles, Clock, Palette } from 'lucide-react';

const FEATURES = [
  {
    icon: Clock,
    title: 'Auto Prayer Times',
    desc: 'Fajr, Maghrib, Isha — synced to your exact location',
    delay: '0.1s',
  },
  {
    icon: Calendar,
    title: 'Smart Calendar',
    desc: 'Beautiful 24-hour timeline with Google Calendar sync',
    delay: '0.2s',
  },
  {
    icon: MessageCircle,
    title: 'AI Schedule Assistant',
    desc: 'Ask Gemini to plan your day around prayers & iftar',
    delay: '0.3s',
  },
  {
    icon: Palette,
    title: 'Custom Themes',
    desc: 'Dark mode, desert sand, and more — your Ramadan, your style',
    delay: '0.4s',
  },
];

/**
 * @param {{ onSignIn: () => void }} props
 */
export default function LandingPage({ onSignIn }) {
  return (
    <div className="min-h-dvh bg-surface overflow-hidden relative">
      {/* ============ BACKGROUND DECORATIONS ============ */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 md:w-[500px] md:h-[500px] rounded-full opacity-20 orb-accent" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 md:w-96 md:h-96 rounded-full opacity-15 orb-primary" />
        {/* Extra desktop orb */}
        <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                     w-[600px] h-[600px] rounded-full opacity-[0.07] orb-center" />
        {/* Floating stars */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-accent opacity-30"
            style={{
              width: `${2 + Math.random() * 3}px`,
              height: `${2 + Math.random() * 3}px`,
              top: `${5 + Math.random() * 90}%`,
              left: `${5 + Math.random() * 90}%`,
              animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* ============ MAIN CONTENT ============ */}
      {/*
        MOBILE: single centered column
        DESKTOP: two-column layout with hero left, features right
      */}
      <div className="relative z-10 min-h-dvh flex flex-col">
        <div className="flex-1 flex flex-col md:flex-row md:items-center
                        max-w-6xl mx-auto w-full px-6 py-12 md:py-0 md:gap-12 lg:gap-20">

          {/* ====== LEFT COLUMN — Hero ====== */}
          <div className="flex flex-col items-center md:items-start md:flex-1 md:max-w-md lg:max-w-lg">
            {/* Crescent Moon Icon */}
            <div className="mb-6 md:mb-8 animate-fade-in-up">
              <div
                className="w-24 h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 rounded-full
                           flex items-center justify-center animate-pulse-glow cta-gradient"
              >
                <Moon className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 text-surface" fill="currentColor" />
              </div>
            </div>

            <div className="text-center md:text-left animate-fade-in-up">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-text tracking-tight mb-3 leading-tight">
                Ramadan Rhythm
                <span className="block text-accent text-2xl md:text-3xl lg:text-4xl font-medium mt-1 md:mt-2">
                  Scheduler
                </span>
              </h1>

              <p className="text-text-muted text-lg md:text-xl max-w-sm md:max-w-md leading-relaxed mt-2">
                Your AI-powered companion for a perfectly organized Ramadan.
                Prayer times, smart scheduling, and Google Calendar sync.
              </p>
            </div>

            {/* CTA — on mobile under features, on desktop under hero text */}
            <div
              className="hidden md:block w-full max-w-sm mt-8 lg:mt-10 animate-fade-in-up opacity-0 landing-cta-delay"
            >
              <button
                onClick={onSignIn}
                className="w-full py-4 px-6 rounded-2xl font-semibold text-base
                           flex items-center justify-center gap-3
                           transition-all duration-300 cursor-pointer
                           hover:scale-[1.02] active:scale-[0.98]
                           animate-pulse-glow cta-gradient"
              >
                <GoogleIcon />
                Sign in with Google
              </button>
              <p className="text-text-muted text-xs mt-3 opacity-70">
                We'll sync your Ramadan schedule to a dedicated Google Calendar
              </p>
            </div>
          </div>

          {/* ====== RIGHT COLUMN — Features ====== */}
          <div className="flex-1 md:max-w-md lg:max-w-lg mt-10 md:mt-0">
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-10 md:mb-0">
              {FEATURES.map(({ icon: Icon, title, desc, delay }) => (
                <div
                  key={title}
                  className={`animate-fade-in-up opacity-0 bg-surface rounded-2xl p-6
                             border border-border/50 flex items-start gap-4 transition-all duration-300
                             hover:border-accent/40 hover:shadow-premium
                             md:flex-col md:items-center md:text-center
                             landing-card-delay-${delay.replace('.', '').replace('0s', '').slice(0,1)}`}
                >
                  <div
                    className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl
                               flex items-center justify-center shrink-0 shadow-lg shadow-accent-glow/20 feature-icon-gradient"
                  >
                    <Icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-text text-sm md:text-base tracking-tight">{title}</h3>
                    <p className="text-text-muted text-xs md:text-sm mt-1 leading-relaxed font-medium">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA — mobile only (appears below feature cards) */}
        <div
          className="md:hidden w-full px-6 pb-4 animate-fade-in-up opacity-0 landing-cta-delay"
        >
          <button
            onClick={onSignIn}
            className="w-full max-w-lg mx-auto py-4 px-6 rounded-2xl font-semibold text-base
                       flex items-center justify-center gap-3
                       transition-all duration-300 cursor-pointer
                       hover:scale-[1.02] active:scale-[0.98]
                       animate-pulse-glow cta-gradient"
          >
            <GoogleIcon />
            Sign in with Google
          </button>
          <p className="text-text-muted text-xs text-center mt-3 opacity-70">
            We'll sync your Ramadan schedule to a dedicated Google Calendar
          </p>
        </div>

        {/* Footer */}
        <footer className="py-4 md:py-6 text-center">
          <div className="flex items-center justify-center gap-2 text-text-muted text-xs">
            <Sparkles className="w-3 h-3 text-accent" />
            <span>Powered by Gemini AI</span>
          </div>
          <p className="text-text-muted/50 text-[10px] mt-1">
            Ramadan Rhythm Scheduler © 2026
          </p>
        </footer>
      </div>
    </div>
  );
}

/** Google "G" logo SVG */
function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
