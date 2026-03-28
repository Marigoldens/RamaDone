# RamaDone Project Changelog

## March 28, 2026 - UI Polish & UX Improvements

### Overview
Major visual and UX improvements: enhanced PWA icons, improved sidebar icon visibility, new expense view modes, session-persistent AI streaming, and better text contrast across all themes.

### Changes

#### PWA & Branding
- **Neutral PWA Icon** - Changed from dynamic theme-based icons to a neutral black SVG icon that works consistently across all themes and platforms
- **New icon path**: `public/icons/icon-app.svg` - Black background with white geometric design
- Updated `manifest.json`, `vite.config.js`, and `index.html` to use the neutral icon

#### Sidebar Improvements
- **Vibrant icon colors** - Updated all 11 themes with more saturated `--c-mode-*` colors for better visibility
- **Removed opacity fade** - Sidebar icons now display at full opacity (`opacity: 1`)
- **Hover effects** - Added scale transform on hover (`transform: scale(1.1)`)
- **Increased icon sizes** - Mode icons: 15px → 18px, Action icons (star/delete): 12px → 14px

#### Expense Tracker - New View Modes
- **Combined duplicate category sections** into single "Transactions" section
- **3-tab navigation**:
  - **Timeline** - Transactions grouped by date (original view)
  - **By Category** - Transactions grouped by category with expandable sections
  - **Chart** - Visual horizontal bar chart showing spending by category with percentages
- Added summary cards in Chart view showing Income, Spent, and Balance

#### AI Chat - Session Persistence Fix
- **Fixed streaming interruption** when switching chat sessions
- Added `sessionLoading` state map to track AI loading per session
- AI continues processing in background even when user switches to another chat
- Returning to a session shows correct loading state

#### Accessibility & Contrast
- **Improved text contrast** across all 11 themes
- **Light themes**: Muted text colors darkened for better readability
- **Dark themes**: Muted text colors lightened for better readability
- Affects all secondary text, labels, meta information, and timestamps

### Files Modified
- `src/index.css` - Theme color updates, improved contrast
- `src/components/Chat/ChatView.jsx` - Session-persistent loading state
- `src/components/Chat/ChatSidebar.jsx` - Larger icon sizes
- `src/components/Expenses/ExpensesView.jsx` - Tabbed view modes
- `src/styles/components/chat.css` - Icon styles, hover effects
- `src/styles/components/expenses.css` - Chart styles, tab styles
- `public/icons/icon-app.svg` - New neutral PWA icon
- `public/manifest.json` - Updated icon references
- `vite.config.js` - Updated PWA manifest
- `index.html` - Updated apple-touch-icon

---

**Date:** March 26, 2026
**Commit:** Production Release - Firebase Integration & Admin Dashboard

## Overview
This release transforms RamaDone from a local-only app to a full Firebase-powered application with user authentication, admin controls, AI usage tracking, and PWA support.

---

## Major Features Added

### 1. Firebase Backend Integration

#### New Files:
- **`functions/index.js`** - Firebase Cloud Functions (10+ functions)
  - `onUserCreated` - Auto-creates user docs on sign-up
  - `updateUserProfile` - Updates profile & syncs admin claims
  - `trackAiUsage` - Tracks AI usage (HTTP endpoint with CORS)
  - `checkApiAccess` - Verifies API access permissions
  - `grantApiAccess` - Admin grants API access (HTTP endpoint)
  - `revokeApiAccess` - Admin revokes API access (HTTP endpoint)
  - `getAllUsers` - Admin fetches all users (HTTP endpoint)
  - `upgradeToPro` - Manual Pro upgrade
  - `getSubscription` - Get subscription status
  - `requestProUpgrade` - Request Pro upgrade

- **`functions/package.json`** - Node.js 22 functions dependencies

- **`firebase.json`** - Firebase project configuration
- **`.firebaserc`** - Firebase project aliases
- **`firestore.rules`** - Firestore security rules
- **`firestore.indexes.json`** - Firestore indexes

#### Configuration:
- **`.env.example`** - Environment variables template
- **`src/config/firebase.js`** - Firebase SDK initialization
- **`src/config/admin.js`** - Admin utilities and HTTP API wrappers

### 2. Admin Dashboard

#### New Components:
- **`src/components/Admin/AdminDashboard.jsx`** - Full admin panel
  - User management table
  - API access grant/revoke controls
  - User statistics (messages, tokens, last active)
  - Search and filter functionality

- **`src/styles/components/admin.css`** - Admin dashboard styling

#### Features:
- View all registered users
- Grant/revoke API access per user
- See AI usage statistics per user
- Admin-only visibility (via custom claims)

### 3. Authentication System

#### New Files:
- **`src/context/GlobalAppContext.jsx`** - Global auth state management
- **`src/services/authService.js`** - Authentication service layer
- **`src/hooks/useAuth.js`** - Auth hook for components

#### Features:
- Google OAuth sign-in
- Email-based admin detection
- UID-based admin fallback
- Custom claims support (admin, apiAccess, pro)

### 4. API Access Control

#### Security Model:
- **New users**: No API access by default
- **Admin approval required**: Admin must grant API access
- **AI usage tracking**: Every AI request tracked per user
- **Custom claims**: Firebase Auth tokens carry permissions

#### User Flow:
1. User signs up → `apiAccess: false`
2. User requests AI → Blocked with message
3. Admin grants access → `apiAccess: true` in Firestore + custom claim
4. User can now use AI → Usage tracked in Firestore

### 5. AI Integration

#### Updates to Existing Files:
- **`src/components/Chat/ChatView.jsx`**
  - Added API access check before AI calls
  - Integrated `trackAiUsageSecure` for usage tracking
  - Blocks AI usage if no API access

- **`src/services/aiTools.js`**
  - AI chat functionality with context

#### Usage Tracking:
- Tracks message count per user
- Tracks token usage per user
- Tracks last AI request timestamp

### 6. PWA (Progressive Web App) Support

#### New Files:
- **`public/icons/icon-192.svg`** - PWA icon
- **`vite.config.js`** - Updated with PWA plugin configuration

#### Features:
- Installable app
- Offline support via service worker
- Caches static assets
- App manifest with theme colors

### 7. Expenses System (Major Update)

#### Updated Files:
- **`src/styles/components/expenses.css`** - Complete redesign
  - Transaction history with categories
  - Budget tracking
  - Expense analytics
  - Responsive layout

### 8. Dashboard Updates

#### Updated Files:
- **`src/styles/components/dashboard.css`** - Enhanced styling
- **`src/hooks/useDashboardData.js`** - New data fetching hook
- **`src/hooks/usePreferences.js`** - Enhanced preferences system

---

## Files Modified (25 files)

### Configuration:
- `package.json` - Added Firebase dependencies
- `vite.config.js` - Added PWA plugin

### Components:
- `src/App.jsx` - Integrated Firebase auth and routing
- `src/components/Layout/BottomNav.jsx` - Added admin tab visibility
- `src/components/Settings/SettingsView.jsx` - Added admin controls
- `src/components/Chat/ChatView.jsx` - Added API access check

### Services:
- `src/services/aiTools.js` - AI integration
- `src/services/authService.js` - NEW - Auth service

### Hooks:
- `src/hooks/usePreferences.js` - Enhanced
- `src/hooks/useDashboardData.js` - NEW
- `src/hooks/useAuth.js` - NEW

### Styling:
- `src/index.css` - Global updates
- `src/styles/components/admin.css` - NEW
- `src/styles/components/chat.css` - Enhanced
- `src/styles/components/dashboard.css` - Enhanced
- `src/styles/components/expenses.css` - Enhanced
- `src/styles/components/layout.css` - Enhanced
- `src/styles/components/settings.css` - Enhanced

---

## Files Added (18 files)

### Firebase:
1. `functions/index.js` - Cloud Functions
2. `functions/package.json` - Functions deps
3. `firebase.json` - Firebase config
4. `.firebaserc` - Project aliases
5. `firestore.rules` - Security rules
6. `firestore.indexes.json` - Indexes

### Config:
7. `.env.example` - Env template
8. `src/config/firebase.js` - Firebase init
9. `src/config/admin.js` - Admin utilities
10. `src/config/theme.js` - Theme config

### Components:
11. `src/components/Admin/AdminDashboard.jsx` - Admin panel
12. `src/context/GlobalAppContext.jsx` - Global state

### Hooks:
13. `src/hooks/useAuth.js` - Auth hook
14. `src/hooks/useDashboardData.js` - Data hook

### Assets:
15. `public/icons/icon-192.svg` - PWA icon

### Documentation:
16. `docs/CORS_FIX.md` - CORS issue documentation
17. `docs/AI_CHATBOT.md` - AI chatbot docs
18. `docs/PROJECT_CONTEXT.md` - Project overview

---

## Technical Decisions

### CORS Fix Strategy
**Problem:** Firebase Callable Functions had inconsistent CORS behavior when errors occurred.

**Solution:** Converted to HTTP functions with explicit CORS headers.

**Functions Converted:**
- `getAllUsers` → HTTP with CORS
- `trackAiUsage` → HTTP with CORS  
- `grantApiAccess` → HTTP with CORS
- `revokeApiAccess` → HTTP with CORS

**Pattern:**
```javascript
res.set('Access-Control-Allow-Origin', '*');
res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
```

### Admin Detection
**Multi-layer approach:**
1. Check Firebase custom claim: `token.admin === true`
2. Check hardcoded UID list: `ADMIN_UIDS.includes(uid)`
3. Check hardcoded email list: `ADMIN_EMAILS.includes(email)`

**Admin UID:** `fEykvZFFpYS4x67hs1Zv89092uH2`
**Admin Email:** `anosy.arbic@gmail.com`

### Security Model
- **Client-side:** UI controls visibility
- **Server-side:** Cloud Functions enforce permissions
- **Database:** Firestore rules restrict access
- **Auth:** Firebase Auth with custom claims

---

## Deployment

**Firebase Project:** `ramadone-f28bb`
**Hosting URL:** https://ramadone-f28bb.web.app

**Services Deployed:**
- Firebase Hosting
- Firebase Functions (10 functions)
- Firebase Firestore
- Firebase Authentication

---

## Known Issues & Limitations

1. **Google OAuth Warning:** App not verified by Google (users can still proceed)
2. **Pro/Subscription:** Currently auto-approved in dev mode (not Stripe integrated)
3. **Firestore Indexes:** May need manual index creation for complex queries
4. **CORS:** All admin functions now use HTTP with explicit CORS headers

---

## Next Steps / Future Work

1. **Stripe Integration** - Real payment processing for Pro tier
2. **Google Verification** - Submit for OAuth verification to remove warning
3. **Email/Password Auth** - Alternative to Google sign-in
4. **Data Export** - Allow users to export their data
5. **Offline Support** - Enhanced PWA offline capabilities
6. **Push Notifications** - Prayer time reminders

---

## Credits

**Built by:** RamaDone Team
**Firebase Project:** ramadone-f28bb
**Stack:** React + Vite + Firebase + Node.js 22

---

**Commit Message:**
```
feat: Production release - Firebase integration, admin dashboard, PWA

- Add Firebase backend with 10 Cloud Functions
- Implement admin dashboard with user management
- Add API access control system
- Convert callable functions to HTTP for CORS reliability
- Add PWA support with service worker
- Integrate AI usage tracking per user
- Add Firebase Authentication with Google OAuth
- Create comprehensive admin controls
- Add security rules and custom claims

Breaking: None
Closes: Admin dashboard feature, API access control
```
