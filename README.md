# ORBIT v1.0.0

> **"Your Local-First Personal OS. Zero Cloud. Zero Subscriptions."**

- **Live Product Website:** [https://orbit-os-bjh.pages.dev](https://orbit-os-bjh.pages.dev)
- **Live Browser App (Zero-Install Offline PWA):** [https://orbit-app-2fa.pages.dev](https://orbit-app-2fa.pages.dev)
- **Website Source Repository:** [https://github.com/Prithvikatkar17/orbit-website](https://github.com/Prithvikatkar17/orbit-website)
- **Windows Desktop Releases (`.exe`):** [https://github.com/Prithvikatkar17/orbit/releases/latest](https://github.com/Prithvikatkar17/orbit/releases/latest)

ORBIT is a local-first personal workspace uniting **Inbox Triage**, **Tasks**, **Habit Heatmaps**, **Daily Expenses (`₹` INR)**, **Calendar & Reminders**, **Personal Library**, and **Insights & Telemetry** inside a single private, keyboard-driven application.

---

## Core Philosophy

- **0ms Optimistic UI:** Every read and write executes instantaneously against **Dexie.js (IndexedDB)** in the browser, while mutations synchronize asynchronously in the background to **SQLite** via an offline-resilient FIFO queue.
- **Zero GPU Blur Tax:** Strictly `backdrop-filter: none` across all surfaces, modals, and navigation bars—relying on crisp `1px solid` hairline borders, solid semantic surfaces, and tactile elevation for 60fps performance on desktop and mobile.
- **100% Private & Portable:** No accounts, no telemetry, no cloud lock-in. Export your entire vault anytime as an atomic WAL-safe `.sqlite` snapshot, `.zip` archive, `.json` dump, or monthly `.csv` expense ledger.

---

## Core Modules

| Module | Route | Capabilities |
| :--- | :--- | :--- |
| **Dashboard** | `/` | Unified daily command center with Today's Focus, active tasks, habit streaks, and schedule overview. |
| **Inbox & Triage** | `/inbox` | Rapid capture buffer with one-click conversion into **Tasks**, **Calendar**, or **Library** (with instant Undo). |
| **Tasks** | `/tasks` | Priorities, due dates, custom drag-and-drop `sortOrder`, and bidirectional Calendar & Reminder sync. |
| **Habit Heatmaps** | `/habits` | Click-to-backfill contribution heatmap grid (blocking future dates), cadence rules, and live streaks. |
| **Daily Expenses** | `/expenses` | Integer-paise storage with `en-IN` (`₹`) formatting, 7 categories, `UPI`/`Cash`/`Card` modes, monthly budget pacing bar (80%/100% alerts), and `.csv` export. |
| **Calendar & Reminders** | `/calendar` | Month, Week, and Day views with 08:00 auto-scroll, live current-time indicator line, recurrence, and smart snooze presets (`15m`, `1h`, `Tomorrow 9am`). |
| **Personal Library** | `/library` | Collections, bookmarks, markdown notes, favorites, and lazy-loaded binary file attachments (up to 20 MB). |
| **Insights & Telemetry** | `/insights` | Daily expense burn-rate chart, category & payment-mode spending breakdown, and habit consistency analytics. |
| **Settings & Vault** | `/settings` | Theme personality studio, notification permissions, WAL-safe `orbit.sqlite` export, `.zip`/`.json` backup & restore, and confirmed database reset. |
| **Welcome Landing** | `/welcome` | Standalone chrome-free landing page with live 7-theme switcher and native PWA install (`beforeinstallprompt`). |

---

## Keyboard-First Workflows

| Shortcut / Chord | Action |
| :--- | :--- |
| `⌘K` / `Ctrl+K` | Open **Universal Search** & **Command Palette** (`>` prefix for workspace actions like `> Log Expense`, themes, and vault export) |
| `⌘⇧K` / `Ctrl+Shift+K` | Open **Quick Capture** (Inbox, Task, Habit, **Expense**, Note, Resource, Goal) |
| `g` then `d` | Jump to **Dashboard** (`/`) |
| `g` then `i` | Jump to **Inbox** (`/inbox`) |
| `g` then `t` | Jump to **Tasks** (`/tasks`) |
| `g` then `h` | Jump to **Habits** (`/habits`) |
| `g` then `c` | Jump to **Calendar** (`/calendar`) |
| `g` then `e` | Jump to **Expenses** (`/expenses`) |
| `g` then `l` | Jump to **Library** (`/library`) |

> All navigation chords use a 700ms window and automatically ignore inputs, textareas, `contentEditable` elements, and open modals.

---

## 7 Tactile Theme Personalities

Each theme personality pairs with independent **Light**, **Dark**, and **System** appearance modes via semantic CSS tokens (`--orbit-bg`, `--orbit-surface`, `--orbit-border`, `--orbit-accent`):

1. **Archivist** — *Bodleian Rare Book Folio & Card Catalog* (Cotton rag paper, Oxford hunter green, oxblood wax seals, warm brass)
2. **Futuristic** — *Linear & Hardware Sequencer Console* (Anodized titanium, OLED telemetry panels, electric cyan, amber)
3. **Aesthetic** — *Kinfolk & Museum Editorial Spread* (Warm alabaster paper, double-hairline rules, terracotta, espresso ink)
4. **Artistic** — *Chromatic Watercolor & Gouache Atelier* (Cold-pressed wash, studio gesso, ultramarine, vermilion coral)
5. **Minimalist** — *Dieter Rams & Vignelli Architectural Ledger* (Matte alabaster, carbon ink, Swiss typography, signal orange)
6. **Naturalist** — *Living Biophilic Sanctuary & Terraced Landscape* (Sunlit limestone, canopy evergreen, terracotta clay)
7. **Midnight** — *Celestial Observatory & Horological Astrolabe* (Cosmic obsidian, astrolabe brass, celestial indigo, starlight vectors)

---

## Architecture & Dual-Vault Storage Engine

### Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js 16 (App Router), React 19, TypeScript |
| **Styling & UI** | Tailwind CSS v4, Lucide Icons, `@dnd-kit`, custom semantic UI primitives |
| **Client State & Validation** | Zustand, Zod |
| **Client Storage** | Dexie.js (IndexedDB, v5 schema) |
| **Server Storage** | Drizzle ORM + SQLite (`better-sqlite3` in WAL mode) |
| **PWA & Packaging** | `@serwist/next` Service Worker, `fflate` (`.zip` archive export/restore) |

### 11-Table SQLite Schema (`orbit.sqlite`)

Defined in [`src/lib/db/schema.ts`](src/lib/db/schema.ts):

- `inbox` — Pending capture items with soft-delete tombstones
- `tasks` — Prioritized tasks, `sortOrder`, due dates/times, and `sourceItemId` links
- `habits` — Habit definitions, cadence rules, and targets
- `habitLogs` — Per-day completion records with unique `(habitId, date)` index
- `expenses` — Integer-paise (`amountPaise`) transactions, category, and payment mode
- `calendarEvents` — Single and recurring schedule blocks
- `reminders` — Event alert offsets, snooze timestamps (`snoozedUntil`), and acknowledgements
- `libraryCollections` — Custom user collections with ordering and icons
- `libraryEntries` — Bookmarks, notes, articles, and file metadata
- `libraryFiles` — Dedicated binary attachment storage (`dataBase64`), fetched lazily via `/api/library/files?id=...`
- `settings` — JSON-serialized `user_settings` with `updatedAt` LWW guard

### Sync, Resilience & Security Hardening

- **Idempotent Upserts & LWW Reconciliation:** All `POST` endpoints use SQLite `.onConflictDoUpdate(...)`; `DELETE` handlers record `deletedAt` soft-delete tombstones so multi-device hydration reconciles cleanly via Last-Write-Wins (`updatedAt`) without ghost resurrection.
- **Offline FIFO Hotspot Queue:** Failed or offline mutations enqueue into Dexie `syncQueue` (`src/lib/services/sync-queue-service.ts`) and flush in strict FIFO order on reconnect or before hydration/backup.
- **CSRF Reset Protection:** `DELETE / POST /api/reset` requires both `X-Orbit-Confirm: reset` and same-origin `Origin`/`Host` validation.
- **XSS & Timezone Safety:** Strict `http:`/`https:` URL normalization blocks `javascript:`/`data:`/`vbscript:` injections, and local-calendar date utilities prevent UTC midnight rollover drift.
- **Portable Data Vault (`/settings`):** Atomic WAL-safe SQLite checkpoint export (`GET /api/backup/sqlite`), `.zip`/`.json` full backup & restore (re-syncing SQLite after replace restores), and monthly `.csv` expense export.

---

## Getting Started & Scripts

### Prerequisites

- **Node.js 20+** and **npm**

### Local Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Push Drizzle schema to local orbit.sqlite
npx drizzle-kit push

# 3. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start Next.js development server (`--webpack`) |
| `npm run build` | Build full Node + SQLite production server (`orbit.sqlite`) |
| `npm run start` | Serve production Node + SQLite build |
| `npm run build:static` | Export 100% offline IndexedDB PWA bundle into `./out` |
| `npm test` | Run all 488 unit & integration tests (`node --test tests/*.test.mjs`) |
| `npm run lint` | Run ESLint across the codebase |
| `npx tsc --noEmit` | Run strict TypeScript typechecking |

### Dual Build Pipeline

1. **Full Local / Hotspot SQLite Server (`npm run build` / `npm run start`):**
   Runs Next.js with all `/api/*` routes backed by physical `orbit.sqlite` on disk for multi-device hotspot sync and WAL-safe `.sqlite` vault exports.
2. **Static Offline PWA Export (`npm run build:static`):**
   Runs [`scripts/build-static.mjs`](scripts/build-static.mjs) with `ORBIT_STATIC_EXPORT=1` and `NEXT_PUBLIC_STATIC_MODE=true`. It temporarily moves `src/app/api` aside during static compilation, outputs a pure static PWA into `./out` (ready for Cloudflare Pages or any static host), and guarantees `src/app/api` restoration afterward. In static mode, `isStaticPwaMode()` short-circuits all `/api/*` calls so Dexie (IndexedDB) serves as the sole local vault.

---

## Companion Ecosystem & Author

- **Product Website:** Companion static showcase site in `orbit-website`
- **Author:** **Prithviraj Katkar** ([@Prithvikatkar17](https://github.com/Prithvikatkar17))
