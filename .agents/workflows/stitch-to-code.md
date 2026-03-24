---
description: Convert a Google Stitch UI design into production-ready code using the project's CSS variables and tech stack
---

# Stitch-to-Code Workflow

This workflow converts any Google Stitch UI design into code that uses the project's existing CSS variable system and Tailwind v4 utility classes.

## Prerequisites
- A Stitch project with screens already generated (use `mcp_StitchMCP_list_projects` to find it)
- The project's `src/index.css` file with CSS custom properties (`--c-*` variables)

---

## Steps

### 1. Retrieve the Stitch Design
// turbo
- List screens: `mcp_StitchMCP_list_screens` with the project ID
- Download the HTML source from the `htmlCode.downloadUrl` for each screen
- Take note of the **content structure** (sections, headings, features) and **visual style** (colors, spacing, layout)

### 2. Map Stitch Colors to CSS Variables
Read `src/index.css` and create a mapping table. Never use hardcoded hex values — always map to existing variables:

| Stitch Color | CSS Variable | Tailwind Class |
|---|---|---|
| Dark navy background (`#0f172a`) | `--c-surface` | `bg-surface` |
| White/light text (`#f1f5f9`) | `--c-text` | `text-text` |
| Muted/gray text (`#94a3b8`) | `--c-text-muted` | `text-text-muted` |
| Gold/amber accent (`#f59e0b`) | `--c-accent` | `text-accent`, `bg-accent` |
| Accent glow | `--c-accent-glow` | `shadow-accent-glow` |
| Card backgrounds (`#1e293b`) | `--c-surface-elevated` | `bg-surface-elevated` |
| Borders (`#334155`) | `--c-border` | `border-border` |
| Primary blue (`#60a5fa`) | `--c-primary` | `text-primary`, `bg-primary` |

### 3. Reuse Existing Utility Classes
Check `src/styles/components/landing.css` and `src/index.css` for existing utilities:

- **`.glass-card`** — Glassmorphic card with backdrop blur
- **`.premium-gradient`** — Primary-to-primary-light gradient
- **`.accent-gradient`** — Accent color gradient
- **`.cta-gradient`** — Primary-to-accent CTA button gradient
- **`.orb-accent`**, **`.orb-primary`**, **`.orb-center`** — Decorative background orbs
- **`.feature-icon-gradient`** — Feature card icon background
- **`.animate-fade-in-up`** — Entrance animation
- **`.animate-float`** — Floating animation
- **`.animate-pulse-glow`** — Pulsing glow effect
- **`.animate-shimmer`** — Shimmer loading effect
- **`.landing-card-delay-N`** — Staggered animation delays (1-4)
- **`.landing-cta-delay`** — CTA button animation delay

### 4. Convert Structure to JSX
- Extract the **section hierarchy** from the Stitch HTML (hero, features, pricing, CTA, footer)
- Convert to React JSX using:
  - Tailwind v4 utility classes (e.g., `bg-surface`, `text-accent`, `rounded-[--radius-lg]`)
  - CSS variable references for custom values (e.g., `var(--c-accent-glow)`)
  - Lucide React icons (already in project: `lucide-react`)
  - Existing component CSS classes from step 3

### 5. Responsive Strategy
- **Mobile-first** approach using Tailwind breakpoints:
  - Default styles = mobile
  - `md:` prefix = tablet/desktop (≥768px)
  - `lg:` prefix = large desktop (≥1024px)
- Use the Stitch mobile screen for default styles
- Use the Stitch desktop screen for `md:` and `lg:` overrides

### 6. Theme Compatibility
All components must look good in ALL 3 themes:
- **Light** (`:root`): Warm cream surface, gold accent
- **Dark** (`.theme-dark`): Deep navy surface, amber accent
- **Desert** (`.theme-desert`): Sand surface, orange accent

Use CSS variables (`var(--c-*)`) and Tailwind theme classes (`bg-surface`, `text-text`) instead of hardcoded colors. The theme classes automatically switch based on the `<html>` class.

### 7. Add New CSS Classes If Needed
If the Stitch design requires styles not covered by existing utilities:
- Add them to `src/styles/components/landing.css`
- Use CSS custom properties for colors
- Keep them theme-aware (add `.theme-dark` and `.theme-desert` overrides if needed)

### 8. Final Checklist
- [ ] No hardcoded hex colors — all using `var(--c-*)` or Tailwind theme classes
- [ ] All icons from `lucide-react`
- [ ] Responsive: mobile-first with `md:` / `lg:` breakpoints
- [ ] Animations use existing utility classes from `index.css`
- [ ] Glass cards use `.glass-card` class
- [ ] CTA buttons use `.cta-gradient` class
- [ ] Works in all 3 themes (light, dark, desert)
- [ ] Follows JSDoc comment conventions

---

## Stitch Project Reference
- **Project ID:** `14584919922993854461`
- **Project Title:** "RamaDone Landing Page"
- **Design System:** "Celestial Focus" (deep navy, gold accents, glassmorphism)
