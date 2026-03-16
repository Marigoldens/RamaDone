# 🌙 RamaDone - Your AI-Powered Ramadan Companion & Daily Planner

**RamaDone** is a progressive web application (PWA) designed to help Muslims make the most of Ramadan. It provides a comprehensive daily schedule, prayer times, Quran tracking, habitual goal adherence, and an AI chat assistant to help manage the holy month effortlessly.

Built with performance, offline capability, and a beautiful UI in mind.

---

## 🌟 Core Features

*   **📅 Daily Master Schedule & Calendar**: An interactive daily timeline with prayer times (Fajr, Dhuhr, Asr, Maghrib, Isha), Suhoor, and Iftar pre-populated. Easily drag and drop to add custom events and keep track of your day.
*   **🔄 Google Calendar Sync**: Seamlessly synchronize your Ramadan schedule with Google Calendar.
    *   **Delta Sync**: Only modified or new events are pushed, ensuring fast updates.
    *   **Soft Deletions**: Deleting an event in the app automatically removes it from Google Calendar.
    *   **Dedicated Calendar**: Automatically creates a beautiful "Ramadan Schedule" calendar to keep your main calendar clean.
*   **🤖 Gemini AI Chat Assistant**: Chat with your personalized AI assistant, powered by Google's Gemini models. The AI understands your schedule context and can autonomously book, update, or delete calendar events based on your conversation (using tool-use and strict API Fallback handling).
*   **📖 Quran Reading Tracker**: Track your daily Surahs, Juzz, and reading goals throughout the month to make sure you finish the Quran by Eid.
*   **✅ Habit Building**: Simple and effective habit tracking.
*   **📱 Offline Ready PWA**: RamaDone installs natively on your mobile device or desktop. All app logic and data live locally through IndexedDB, so the app remains perfectly snappy and usable even when you have poor or no internet connection.

---

## 🛠️ Technology Stack

RamaDone uses a modern, fast, and local-first architecture:

*   **Frontend**: React (v18), Vite, Tailwind CSS (for styling and custom gradients)
*   **Icons & UI**: Lucide React
*   **State & Data**: [Dexie.js](https://dexie.org/) (a brilliant wrapper for IndexedDB) providing real-time reactivity without needing complex state managers setup.
*   **Date Formatting**: `date-fns` for robust and lightweight date manipulation.
*   **AI Integration**: `@google/genai` (Google Gemini API with multi-model fallback failover).
*   **PWA Setup**: `vite-plugin-pwa` for manifest generation and service worker caching.

---

## 🚀 Getting Started

To run the application locally on your machine, follow these steps:

### Prerequisites
Make sure you have Node.js and `npm` installed.

### Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/your-username/ramadone.git
    cd RamaDone
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Environment Variables**
    You need a Google Gemini API Key for the AI assistant to work.
    *   Create a `.env` file in the root directory.
    *   Add your key:
        ```env
        VITE_GEMINI_API_KEY=your_gemini_api_key_here
        ```

4.  **Run in Development**
    ```bash
    npm run dev
    ```
    The app will start at `http://localhost:5173`.

5.  **Build for Production**
    ```bash
    npm run build
    npm run preview
    ```

---

## 📂 Project Structure

```text
RamaDone/
├── src/
│   ├── components/         # Reusable React UI components
│   │   ├── Application/    # Global layout headers and navigation
│   │   ├── Calendar/       # Daily interactive timeline and event scheduling
│   │   ├── Chat/           # Gemini AI Chat components and Action Modals
│   │   ├── Habits/         # Habit trackers
│   │   ├── Layout/         # Core structural layouts (AppShell, BottomNav)
│   │   └── Quran/          # Quran progress tracking
│   ├── db/                 # Dexie.js database schema and configuration
│   ├── hooks/              # Custom React hooks containing the business logic (useEvents, useMessages)
│   ├── services/           # External API controllers (aiService for Gemini interaction)
│   ├── App.jsx             # Main routing and app compilation entry
│   ├── index.css           # Global Tailwind and custom theme styles
│   └── main.jsx            # React DOM rendering Mount
├── public/                 # PWA icons and static assets
├── .env                    # Environment variables (Gemini API keys)
├── tailwind.config.js      # Custom theming and plugin configurations
└── vite.config.js          # Vite build configurations & PWA setup
```

---

## 🗄️ Local-First Data (IndexedDB)

The app prioritizes user privacy. All calendar events, habits, Quran progress, and your AI chat session history are saved entirely on your local device (in the browser's IndexedDB via `Dexie.js`). No personal tracking data is sent to external backend databases.

---

## ⚡ Synchronized Performance

RamaDone uses a high-performance synchronization logic for its Google Calendar integration:
- **Parallel Processing**: Multiple events are synced concurrently to maximize throughput.
- **Future-Only Sync**: The app intelligently filters out past events to keep your calendar cluttered-free.
- **Offline Resilience**: Changes made offline are tracked in IndexedDB and synchronized as soon as you are back online and hit the sync button.

---

## 🤖 AI Fallback System

Because the free tier of the new `gemini-3-flash` models has strict daily rate limits, RamaDone incorporates a fallback mechanism inside `aiService.js`. If a quota error occurs, the system smoothly falls back to stable models like `gemini-2.5-flash` or `gemini-1.5-flash` so that your AI scheduling capabilities remain uninterrupted.

---
*Built for a productive and blessed Ramadan.* 🌙
