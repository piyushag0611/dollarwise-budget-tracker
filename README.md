# DollarWise — Budget Tracker

A personal budgeting app built with React + TypeScript, targeting both web and Android (via Capacitor). No account required, no backend, no subscriptions.

## Philosophy

- **Local-first** — your data lives on your device, not a server
- **No login required** — open the app and start tracking immediately
- **No backend costs** — zero server infrastructure to maintain or pay for
- **Google Drive backup** — optional, user-initiated; sign in with Google only when you want to back up or restore

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| State | TanStack React Query |
| Forms | React Hook Form + Zod |
| Routing | React Router v6 |
| Charts | Recharts |
| Database (Android) | SQLite via `@capacitor-community/sqlite` |
| Database (Web) | SQLite WASM + Origin Private File System (OPFS) |
| Backup / Restore | Google Drive API (optional, user-triggered) |
| Mobile | Capacitor (Android) |
| Testing | Vitest + Playwright |

## Data Storage

On **Android**, data is stored as a real `.db` file in the app's private storage on the device.

On **Web**, data is stored in the browser's Origin Private File System (OPFS) — a sandboxed, fast, persistent storage area managed by the browser per domain. It is not accessible via the regular file system.

Neither platform requires a network connection to read or write data.

## Google Drive Backup

Signing in with Google is entirely optional and only needed for the backup/restore feature. When triggered:

1. The local SQLite database is exported and uploaded to the user's own Google Drive
2. On a new device, the user signs in and restores from their Drive backup

This means user data is always under the user's control and never passes through any third-party server.

## Running Locally

```bash
npm install
npm run dev        # starts at http://localhost:8080
```

## Running on Android

```bash
npm run build
npx cap sync android
# Then open android/ in Android Studio and run on device/emulator
```

## Testing

```bash
npm test           # run all unit tests once
npm run test:watch # watch mode during development
```

## Project Structure

```
src/
├── components/     # UI components (shadcn/ui based)
├── contexts/       # React context providers
├── hooks/          # Data access hooks (useExpenses, useCategories, useAnalytics)
├── integrations/   # Database and external service clients
├── lib/            # Utility functions
├── pages/          # Route-level page components
└── test/           # Test setup, mocks, and utilities
supabase/
└── migrations/     # Original SQL schema (reference for SQLite migration)
android/            # Capacitor Android project
```
