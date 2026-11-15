# ORBIT: COMPLETE PROJECT HANDOFF DOCUMENTATION

> **Document Version:** 1.0.0  
> **Date:** November 15, 2026  
> **Author:** Antigravity (Google DeepMind Agent Architecture)  
> **Role:** Senior Software Architect, Technical Documentation Engineer & Project Historian  
> **Target Audience:** Successor AI Development Agents & Human Maintainers  
> **Repository:** `d:\orbit` (`https://github.com/Prithvikatkar17/orbit.git`)  
> **Branch:** `main` | **Head Commit:** `42eae85`  

---

## TABLE OF CONTENTS

1. [Part 1 — Project Identity and Vision](#part-1--project-identity-and-vision)
2. [Part 2 — Complete Technical Architecture](#part-2--complete-technical-architecture)
3. [Part 3 — Complete Development History (Phases 1 through 10C.2)](#part-3--complete-development-history)
4. [Part 4 — The Seven Theme Personalities](#part-4--the-seven-theme-personalities)
5. [Part 5 — Futuristic Personality: Complete Evolution](#part-5--futuristic-personality-complete-evolution)
6. [Part 6 — Current Application Features](#part-6--current-application-features)
7. [Part 7 — Design Principles and User Preferences](#part-7--design-principles-and-user-preferences)
8. [Part 8 — Git and Repository Status](#part-8--git-and-repository-status)
9. [Part 9 — Testing and Quality Assurance](#part-9--testing-and-quality-assurance)
10. [Part 10 — Current Project Status and Next Steps](#part-10--current-project-status-and-next-steps)
11. [Part 11 — Important Decisions and Rejected Approaches](#part-11--important-decisions-and-rejected-approaches)
12. [Part 12 — Environment and How to Run ORBIT](#part-12--environment-and-how-to-run-orbit)
13. [Part 13 — Instructions for the Next AI Agent](#part-13--instructions-for-the-next-ai-agent)

---

## PART 1 — PROJECT IDENTITY AND VISION

### 1.1 What ORBIT Is
ORBIT is a **high-craft, privacy-first, offline-capable personal productivity and life operating system** built on Next.js 16, React 19, Tailwind CSS v4, and Dexie (IndexedDB). It unifies task management, habit tracking, daily scheduling/calendar events, unstructured inbox triage, personal knowledge capture (Library), and self-reflection analytics (Insights) into a cohesive, client-side application.

### 1.2 The Problem It Solves
Modern productivity software suffers from three structural pathologies:
1. **Cloud Surveillance and Enclosure:** Most tools hold personal journals, habits, thoughts, and schedules hostage on remote cloud databases, requiring account creation, constant internet access, and subscription fees while exposing intimate life data to corporate telemetry and potential data leaks.
2. **Generic, Monolithic "AI-Slop" Aesthetics:** Contemporary SaaS dashboards converge on identical, generic design systems (flat, uninspired slate/gray cards, purple gradients, generic iconography, and formulaic spacing). They feel like interchangeable enterprise software rather than an intimate personal tool.
3. **Fragmented Workflows:** Users are forced to juggle separate tools for tasks (Todoist/Things), habits (Streaks/Habitica), notes/bookmarks (Notion/Pocket), and calendars (Google Calendar), causing context-switching fatigue and fragmented personal records.

### 1.3 Target Users
- Knowledge workers, software engineers, designers, writers, and students who demand total data privacy and zero vendor lock-in.
- Users who value craft, tactile interface aesthetics, typography, and responsive micro-interactions.
- People who work in disconnected environments (air travel, transit, offline retreats) and need their personal operating system to function flawlessly with zero latency.

### 1.4 Core Philosophy and Product Vision
- **Zero Cloud Requirement:** The core application must never fail because an external API or remote database is unreachable. All database reads and writes execute locally in IndexedDB.
- **Data Sovereignty:** The user owns their data entirely. Full JSON export and point-in-time backup/restore exist in user space.
- **Intentional Art Direction (The Seven Personalities):** Productivity is cognitive; visual atmosphere alters mental focus. Rather than a superficial accent-color picker, ORBIT provides seven comprehensively distinct *personalities* (Archivist, Futuristic, Aesthetic, Artistic, Minimalist, Naturalist, Midnight) that alter typography, surface geometry, elevation, border weights, texture, and component layouts.
- **Respect for User Cognitive Load:** No unsolicited notifications, no gamified streaks that trigger anxiety, no fake telemetry, no artificial metrics.

### 1.5 Local-First, Privacy-First, Offline-Capable Approach
- **Storage Engine:** Dexie.js (v4.4.7) wrapping browser IndexedDB (`orbit-db`).
- **Network Independence:** Zero external API calls for application lifecycle. Fonts are bundled or statically cached; zero analytics trackers; zero remote error monitoring pinging 3rd-party servers.
- **Multi-Tab Synchronization:** Cross-tab state propagation is coordinated using native `BroadcastChannel("orbit-search-sync")` and Dexie database transaction hooks.
- **Data Isolation:** All operations run strictly on client hardware.

### 1.6 Key Modules
- **Dashboard:** At-a-glance command center showing today's focus, habit cadence, agenda, and quick actions.
- **Inbox:** Rapid capture container for transient ideas, unclassified links, and raw thoughts with single-click conversion to Tasks, Habits, or Library entries.
- **Tasks:** Indexed task management supporting priorities (P1-P4), due dates, recurrence, tags, search filtering, and inline completion.
- **Habits:** Daily cadence tracking with 7-day completion matrices, streak calculation, and multi-status logging.
- **Calendar:** Unified day/week chronological agenda combining scheduled tasks and dedicated events.
- **Library:** Knowledge and resource archive supporting collections, rich notes, URLs, read/unread states, and tag indexing.
- **Insights:** Visual analytics dashboard tracking weekly completion throughput, habit consistency rates, and category distribution.
- **Universal Search (Cmd/Ctrl+K):** Sub-millisecond in-memory indexed search across all six database tables with token normalization and relevance scoring.
- **Settings & Onboarding:** Personality switcher with live mini-window previews, appearance mode (Light/Dark/System), and data backup/restore.

### 1.7 What Makes ORBIT Different From a Generic Dashboard
- **Personality-Scoped Information Architecture:** Personalities are not merely CSS variables. For instance, `Archivist` utilizes tactile paper grain, deckle edges, and serif editorial pacing, whereas `Futuristic` employs an industrial avionics layout with mono telemetry and a dominant task execution stream.
- **Architectural Discipline:** Zod validation on every single entity before entering the database; zero `any` types; strictly enforced semantic token system (`orbit-*`) preventing raw Tailwind color leakage.

---

## PART 2 — COMPLETE TECHNICAL ARCHITECTURE

### 2.1 Technology Stack & Exact Versions
Verified from [package.json](file:///d:/orbit/package.json):
- **Framework:** Next.js `16.4.3` (App Router, Webpack build engine)
- **UI Library:** React `19.3.0` & React DOM `19.3.0`
- **Styling:** Tailwind CSS `v4.3.4` via `@tailwindcss/postcss`
- **Database Engine:** `dexie` `4.4.7` (IndexedDB abstraction)
- **Validation Engine:** `zod` `4.6.7` (TypeScript-first schema validation)
- **State Management:** `zustand` `5.0.16` (client state stores)
- **Iconography:** `lucide-react` `1.16.0`
- **Testing:** Native Node.js Test Runner (`node:test`, `node:assert/strict`)
- **Linting & Types:** ESLint `9.x`, TypeScript `5.x`
- **Runtime Environment:** Node.js `v24.14.1`, npm `11.11.0` on Windows 11

### 2.2 Repository Directory Layout
```text
D:\orbit
├── public/                     # Static assets, icons, manifest
├── src/
│   ├── app/                    # Next.js App Router routes & layouts
│   │   ├── calendar/page.tsx   # Calendar & agenda view
│   │   ├── habits/page.tsx     # Habit cadence tracking
│   │   ├── inbox/page.tsx      # Quick-capture inbox triage
│   │   ├── insights/page.tsx   # Bento grid analytics & reports
│   │   ├── library/page.tsx    # Knowledge & collection archive
│   │   ├── settings/page.tsx   # Personality & appearance settings
│   │   ├── tasks/page.tsx      # Priority task management
│   │   ├── globals.css         # Token design system for 7 personalities
│   │   ├── layout.tsx          # RootLayout with theme injector & shell
│   │   ├── not-found.tsx       # Custom 404 page
│   │   └── page.tsx            # Main dashboard route (personality router)
│   ├── components/             # Reusable UI primitives & feature modules
│   │   ├── calendar/           # Event modals, day/week grids
│   │   ├── dashboard/          # Default & personality-scoped dashboards
│   │   │   └── futuristic/     # Minimalist Industrial avionics dashboard
│   │   │       ├── futuristic-dashboard.tsx
│   │   │       ├── habit-cadence.tsx
│   │   │       ├── todays-focus.tsx
│   │   │       └── upcoming-agenda.tsx
│   │   ├── habits/             # Habit cards, heatmaps, habit modals
│   │   ├── inbox/              # Item rows, quick capture, conversion modals
│   │   ├── insights/           # Bento analytics cards, throughput charts
│   │   ├── layout/             # App shell, responsive sidebar, navigation
│   │   ├── library/            # Entry cards, collection drawers, modals
│   │   ├── onboarding/         # 3-step first-time onboarding wizard
│   │   ├── search/             # Universal Search modal (Cmd/Ctrl+K)
│   │   ├── tasks/              # Task lists, filters, creation modals
│   │   └── ui/                 # Core design primitives (button, card, dialog)
│   └── lib/                    # Data layer, services, schemas, stores
│       ├── db/                 # Dexie database class & table definitions
│       ├── hooks/              # Custom React hooks (theme, search, db)
│       ├── schemas/            # Zod validation schemas (task, habit, etc.)
│       ├── services/           # Business logic (search, analytics, backup)
│       ├── stores/             # Zustand stores (UI state, modal states)
│       └── utils/              # Date formatters, math utilities, helpers
├── tests/                      # 34 automated Node.js test suites
├── next.config.ts              # Next.js configuration (Webpack, fonts)
├── package.json                # Project dependencies and script declarations
└── tsconfig.json               # TypeScript compiler configuration
```

### 2.3 Dexie / IndexedDB Database Architecture
Defined in [src/lib/db/index.ts](file:///d:/orbit/src/lib/db/index.ts):
- **Database Name:** `orbit-db`
- **Current Version:** `1`
- **Object Stores and Indexes:**
  ```typescript
  this.version(1).stores({
    tasks: "id, title, status, priority, dueDate, completedAt, createdAt, updatedAt, *tags",
    habits: "id, title, frequency, archived, createdAt, updatedAt",
    events: "id, title, startDate, endDate, allDay, createdAt, updatedAt",
    inboxItems: "id, title, status, createdAt, updatedAt",
    libraryEntries: "id, title, type, collectionId, isFavorite, isArchived, createdAt, updatedAt, *tags",
    collections: "id, name, parentId, createdAt, updatedAt",
  });
  ```
- **Transaction Safety & Mutex:** All bulk updates, writes, and deletes execute within transactional boundaries. Dexie table hooks (`creating`, `updating`, `deleting`) are utilized by `SearchService` to keep search caches perpetually consistent.

### 2.4 Zod Schema Validation
Located in `src/lib/schemas/`:
- `task.ts`: `TaskSchema` (id, title, notes, status [`todo`, `in_progress`, `done`, `cancelled`], priority [`p1`, `p2`, `p3`, `p4`], dueDate, reminderTime, recurrence, tags, completedAt, timestamps).
- `habit.ts`: `HabitSchema` (id, title, description, frequency [`daily`, `weekly`], targetDays, streakCount, bestStreak, completionLogs [Record<string, boolean>], archived).
- `event.ts`: `EventSchema` (id, title, notes, startDate, endDate, allDay, recurrence).
- `inbox.ts`: `InboxItemSchema` (id, title, content, status [`unprocessed`, `processed`, `archived`]).
- `library.ts`: `LibraryEntrySchema` & `CollectionSchema` (type [`note`, `link`, `book`, `article`, `document`], url, body, isFavorite, collectionId).
- `settings.ts`: `SettingsSchema` (appearance [`light`, `dark`, `system`], themePersonality [`archivist`, `futuristic`, `aesthetic`, `artistic`, `minimalist`, `naturalist`, `midnight`], weekStartsOn, onboardingCompleted).

### 2.5 State Management Strategy
- **Persistent Data:** Stored directly in IndexedDB via Dexie. Accessed in React components using `dexie-react-hooks` (`useLiveQuery`) or dedicated service hooks, guaranteeing zero stale caches.
- **Ephemeral UI State:** Managed via Zustand stores (`src/lib/stores/`):
  - `useUIStore`: Active sidebar collapse state, active modals (QuickCapture, Search, TaskModal, EventModal).
  - `useThemePersonality`: Synced between IndexedDB settings and document root `[data-theme-personality]` attribute.
- **Search Query State:** Managed within `SearchService` with an internal LRU cache (bounded to 50 entries) and BroadcastChannel synchronization.

### 2.6 Routing and Shell Composition
- **App Router:** Next.js App Router in `src/app/`. All primary routes are statically rendered at build time:
  - `/` (Home Dashboard)
  - `/tasks` (Task Management)
  - `/habits` (Habit Cadence)
  - `/calendar` (Agenda & Events)
  - `/inbox` (Triage & Capture)
  - `/library` (Knowledge Base)
  - `/insights` (Bento Analytics)
  - `/settings` (Preferences)
- **Pre-Hydration Anti-Flash Script:** Embedded inline in [src/app/layout.tsx](file:///d:/orbit/src/app/layout.tsx). Reads `localStorage` or defaults to `archivist` + `system`, immediately injecting `data-theme-personality` and `dark`/`light` classes onto `<html>` before React hydrates, eliminating white-flash glitches.

---

## PART 3 — COMPLETE DEVELOPMENT HISTORY

```
[Phase 1-6: Foundation & Core Modules] 
     ↓
[Phase 7-8: Advanced Features, Search & Insights]
     ↓
[Phase 9A-9D: Seven Theme Personalities Architecture]
     ↓
[Phase 10A: High-Throughput Search Invalidation]
     ↓
[Phase 10B.1-10B.3: Primitives, Bento Grids & Onboarding]
     ↓
[Phase 10C.1: Archivist Theme Redesign (Approved)]
     ↓
[Phase 10C.2: Futuristic Redesign (v1 & v2 Rejected -> v3 Built)]
```

### 3.1 Phase 1 through Phase 8: Core Platform Inception
- **Phase 1 — Project Scaffolding & Setup:** Initial Next.js, TypeScript, Tailwind setup, directory hierarchy, Git repository initialization.
- **Phase 2 — Database Layer:** Implementation of `orbit-db` with Dexie v4, Zod schema validation layer, seed data generator, and mock generators for development.
- **Phase 3 — UI Primitives & Application Shell:** Development of responsive sidebar navigation, mobile drawer, button primitives, modal base system, and toast notifications.
- **Phase 4 — Task Management Engine:** Priority filtering (P1-P4), tag assignment, inline checkbox completion, date picker integration, and recurrence handlers.
- **Phase 5 — Habit Tracking System:** 7-day sparkline grids, completion heatmaps, streak calculation logic, and habit log persistence.
- **Phase 6 — Inbox Triage & Quick Capture:** Rapid floating modal (global shortcut), parsing into tasks, habits, or notes, and unprocessed badge counts.
- **Phase 7 — Calendar & Library Modules:** Day/Week chronological agenda combining tasks and events; Library collection drawers, URL bookmarking, markdown notes.
- **Phase 8 — Insights Analytics & Data Services:** Visual metrics engine, throughput calculation, JSON export/import backup service, and unit test suites across all stores.

### 3.2 Phase 9: The Seven Theme Personalities Architecture
- **Phase 9A — Design Tokens & Architecture:** Definition of semantic CSS variables in `globals.css` covering 7 personalities in both Light and Dark modes. Introduction of `ThemePersonalityProvider`.
- **Phase 9B — Semantic Token Migration & Component Alignment:** Migration of all shared UI primitives (buttons, inputs, cards, dialogs, charts) away from raw Tailwind color utilities to semantic `orbit-*` variables.
- **Phase 9C — Interactive Components Refinement:** Hover elevation, active state transitions, tactile press effects, and modal backdrops standardized across personalities.
- **Phase 9D — Settings Preview & App-Wide Audit:** Live interactive preview cards in `/settings` rendering live scoped mini-UIs for all 7 personalities; end-to-end audit eliminating hardcoded styles.

### 3.3 Phase 10A: High-Throughput Search & Invalidation Engine
- **Commit:** `7fe3052`
- **Objective:** Architect sub-millisecond universal search across all 6 Dexie tables with instantaneous cache invalidation.
- **Implementation:**
  - Tokenized inverted index in `src/lib/services/search-service.ts`.
  - Mutex locking to prevent redundant concurrent index rebuilds.
  - 50-item bounded LRU query result cache.
  - Dexie table hooks (`creating`, `updating`, `deleting`) triggering granular cache evictions.
  - Native `BroadcastChannel("orbit-search-sync")` keeping multi-window sessions synchronized without database polling.

### 3.4 Phase 10B: Primitives, Bento Grids & Onboarding
- **Phase 10B.1 — Core Primitives Refinement:** Enhanced `.orbit-button` and `.orbit-surface-card` styling, spring micro-interactions, touch-friendly 44px minimum targets, and strict `prefers-reduced-motion` suppression.
- **Phase 10B.2 — Responsive Bento Grids (`162cf4d`):** Redesigned `/` (Dashboard) and `/insights` into responsive Bento Grid layouts with visual hierarchy, asymmetric priority cards, and mobile-friendly stacking.
- **Phase 10B.3 — Personalized Onboarding Wizard (`265a778`):** 3-step modal wizard on first launch (Welcome -> Personality Selection -> Workflow Preference). Detects first-time launch and stores completion in IndexedDB settings.

### 3.5 Phase 10C.1: Archivist Theme Redesign
- **Commit:** `73ffccf` (`feat(themes): refine archivist with organic paper and frosted glass`)
- **Objective:** Elevate `Archivist` into a museum-grade personal research library and tactile stationery workspace.
- **Implementation:**
  - Light mode authentic paper background featuring CSS laid lines and fractal pulp fibers (`radial-gradient` + SVG fractal noise).
  - Translucent frosted-glass card surfaces (`backdrop-filter: blur(8px)`), refined botanical accents (`#1b4332`), and ink slate typography.
  - Dark mode charcoal bound-paper atmosphere with warm candlelit borders.
  - Fully verified and approved.

### 3.6 Phase 10C.2: Futuristic Personality Evolution
*(See Section 5 for the exhaustive breakdown of the three iterations and current status).*

---

## PART 4 — THE SEVEN THEME PERSONALITIES

ORBIT features seven distinct visual personalities, each maintaining independent Light and Dark modes.

```
       ┌────────────────────────────────────────────────────────┐
       │             ORBIT THEME PERSONALITIES                  │
       ├─────────────────┬───────────────────┬──────────────────┤
       │   HISTORICAL    │    MODERN / TECH  │  NATURE / ART    │
       ├─────────────────┼───────────────────┼──────────────────┤
       │ 1. Archivist    │ 2. Futuristic     │ 3. Aesthetic     │
       │    (Tactile     │    (Minimalist    │    (Editorial    │
       │     Paper)      │     Avionics)     │     Warmth)      │
       │                 │                   │ 4. Artistic      │
       │                 │ 5. Minimalist     │    (Creative)    │
       │                 │    (Monochrome)   │ 6. Naturalist    │
       │                 │                   │    (Organic)     │
       │                 │ 7. Midnight       │                  │
       │                 │    (Obsidian)     │                  │
       └─────────────────┴───────────────────┴──────────────────┘
```

### 4.1 Personality Matrix

| Personality | Primary Atmosphere | Typography Pairing | Surface & Geometry | Accent Colors | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Archivist** | Tactile organic laid paper (Light) / Charcoal bound leather (Dark) | Newsreader (Serif) + Geist Sans | Frosted glass over laid paper lines, deckle borders, 4px radius | Forest botanical green (`#1b4332`), wax amber | **Production Approved** |
| **2. Futuristic** | Matte titanium & graphite avionics workspace | Geist Sans + Geist Mono (Tabular) | Precision matte panels, mechanical dividers, 0px–2px radius | Signal cyan (`#00f0ff`), amber (`#ffb000`), emerald (`#00e5a3`) | **Implemented (Awaiting Visual QA Review)** |
| **3. Aesthetic** | Warm editorial, soft morning light, museum catalog | Newsreader + Inter | Generous 16px radius, soft diffuse ambient shadows, warm cream cards | Terracotta, dusty peach, warm ochre | Core Implemented (Target for Phase 10C.3) |
| **4. Artistic** | Dynamic atelier, sketchbook canvas, gallery energy | Sans-Serif Display + System | Asymmetric padding, expressive borders, tactile shadows | Cobalt blue, cadmium yellow, vermilion | Core Implemented |
| **5. Minimalist** | Ultra-pure Swiss modernist, Bauhaus discipline | Strict Sans-Serif (Inter/Geist) | Sharp 0px borders, stark 1px solid lines, zero blur, zero shadows | Pure monochrome, single high-contrast red accent | Core Implemented |
| **6. Naturalist** | Earthy botanical garden, sunlit studio | Rounded Sans-Serif | Gentle 8px organic curves, pebble contours, matte clay cards | Olive moss, warm terracotta clay, bark brown | Core Implemented |
| **7. Midnight** | Deep cosmic obsidian, celestial observatory | Clean technical Sans | Translucent deep obsidian glass, subtle violet glow | Electric violet, cyan starlight, deep indigo | Core Implemented |

### 4.2 Semantic Design Token Architecture in `src/app/globals.css`
All components must consume the semantic token variables defined in `globals.css`. Direct Tailwind colors (e.g., `bg-blue-500`, `text-neutral-900`) are strictly forbidden in shared components.

Essential semantic variables:
- `--orbit-bg`: Main page background canvas.
- `--orbit-surface`: Default card and surface panel background.
- `--orbit-surface-hover`: Hover state for surface cards.
- `--orbit-border`: Default border and divider color.
- `--orbit-border-hover`: Highlighted border state.
- `--orbit-text`: Primary headline and body typography color.
- `--orbit-text-muted`: Secondary captions, metadata, and labels.
- `--orbit-accent`: Primary personality signal color.
- `--orbit-accent-hover`: Interactive hover state for accent controls.
- `--orbit-radius`: Border radius variable applied to buttons, cards, and dialogs.
- `--orbit-font-sans` / `--orbit-font-serif` / `--orbit-font-mono`: Font family variables.

---

## PART 5 — FUTURISTIC PERSONALITY: COMPLETE EVOLUTION

The Futuristic personality underwent three distinct architectural iterations during Phase 10C.2. Understanding this evolution is critical for any successor engineer.

### 5.1 Iteration 1: The Holographic Command Deck (REJECTED)
- **Concept:** Translucent glassmorphic panels, 16px backdrop blur, cyan/violet glowing border gradients, radial dot grid backgrounds.
- **Why It Was Rejected:** The user conducted a critical visual review and stated:
  > *"The result still feels generic, inexpensive, AI-generated and largely like the original application with CSS modifications... What I don't want: Generic AI-generated dashboard aesthetics. Neon effects everywhere. Glassmorphism applied to every card. Decorative grids that add no functional value. Excessive gradients and glowing borders."*

### 5.2 Iteration 2: Monolithic Avionics Console (REJECTED AS OVERCROWDED)
- **Concept:** Inspired by aerospace avionics and mission control displays. High density, matte graphite surfaces, 5-cell horizontal telemetry ribbon at the top, 3-column asymmetric layout, storage diagnostics panel, weekly throughput matrix.
- **Why It Was Rejected:** When implemented, the interface became cluttered and overwhelming:
  > *"The dashboard has become too complicated, crowded and card-heavy. It looks like a control room rather than a thoughtfully designed personal productivity workspace... Dramatically reduce visual complexity. Create a minimalist industrial productivity dashboard."*

### 5.3 Iteration 3: Minimalist Industrial Productivity Workspace (CURRENT IMPLEMENTATION)
- **Concept:** Preserves the matte titanium and graphite avionics material language, Geist Sans and Geist Mono typography, and mechanical dividers, but strips away all decorative clutter in favor of an elegant, focused 2-column layout.
- **Component Breakdown:**
  1. **Minimal Header:**
     - Restrained date display: `SUNDAY, NOVEMBER 15, 2026`.
     - Clean digital time: `08:58`.
     - Compact inline text status ribbon: `4 open tasks · 1 due today · 1 overdue · 2/3 habits completed` (no large boxed cards).
     - Dedicated `[+ QUICK CAPTURE]` action button.
  2. **Today's Focus (Primary Section — 8 Desktop Columns):**
     - Dominates the visual field.
     - Section marker: `// 01 · PRIMARY TASK STREAM`.
     - Filter toggle: `ALL OPEN (4)` vs `DUE TODAY (1)`.
     - Interactive task rows with mono index (`01`, `02`), priority pills (`P1 CRITICAL`, `P2 HIGH`), due times, and real-time checkbox completion.
  3. **Sidebar Rail (4 Desktop Columns):**
     - **Habit Cadence (`habit-cadence.tsx`):** Compact rows showing habit title, streak count, 7-day spark-blocks (filled cyan squares for completed days), and an interactive toggle for today.
     - **Upcoming Agenda (`upcoming-agenda.tsx`):** Chronological horizon showing today's schedule and scheduled tasks with mono timestamps (`09:00`, `14:00`).
- **Files Implementing This Workspace:**
  - `src/components/dashboard/futuristic/futuristic-dashboard.tsx`
  - `src/components/dashboard/futuristic/todays-focus.tsx`
  - `src/components/dashboard/futuristic/habit-cadence.tsx`
  - `src/components/dashboard/futuristic/upcoming-agenda.tsx`
  - Scoped into `src/app/page.tsx` via `themePersonality === "futuristic"`.

---

## PART 6 — CURRENT APPLICATION FEATURES

### 6.1 Dashboard (`/`)
- Dynamic personality routing: If `themePersonality === "futuristic"`, renders the custom `FuturisticDashboard`. For all other personalities, renders the responsive Bento Grid layout.
- Aggregates live data from Tasks, Habits, and Events tables via `useLiveQuery`.

### 6.2 Inbox (`/inbox`)
- Capture buffer for unfiltered thoughts and fleeting notes.
- Quick capture input with instant keyboard submission.
- Convert Modal: Allows one-click transformation of an inbox item into a formal Task, Habit, or Library entry, automatically prefilling metadata and deleting the source inbox item.

### 6.3 Tasks (`/tasks`)
- Filterable by Status (`todo`, `in_progress`, `done`) and Priority (`p1`, `p2`, `p3`, `p4`).
- Supports tags, due dates, reminder timestamps, and recurrence intervals.
- Optimistic in-place completion toggle with undo toast.

### 6.4 Habits (`/habits`)
- Daily and weekly habit definitions with target frequencies.
- Interactive 7-day cadence completion blocks.
- Real streak calculation (`calculateStreak`) and historical completion rate tracking.

### 6.5 Calendar (`/calendar`)
- Integrated day, week, and month agenda views.
- Unifies scheduled tasks (tasks with `dueDate`) and native calendar events (`orbit-db.events`).
- Event creation modal supporting start/end times, descriptions, and recurrence.

### 6.6 Library & Collections (`/library`)
- Personal knowledge base organizing bookmarks, notes, book summaries, and documents.
- Nested collection drawers with hierarchical categorization.
- Read/Unread status tracking, favorite flagging, and tag filtering.

### 6.7 Insights (`/insights`)
- Responsive Bento Grid analytics workspace.
- Metric summary cards: Task completion rate, habit consistency index, active library count.
- Weekly Throughput Matrix: Graphical bar chart visualizing tasks completed day-by-day.
- Habit consistency breakdown by habit category.

### 6.8 Universal Search (Cmd/Ctrl + K)
- In-memory tokenized search engine (`SearchService`).
- Queries across all 6 Dexie tables simultaneously in `< 2ms`.
- Module filtering tabs (`All`, `Tasks`, `Habits`, `Events`, `Library`).
- Instant keyboard navigation (Up/Down arrow keys, Enter to open/jump, Esc to close).

### 6.9 Settings & Theme Personalities (`/settings`)
- Theme Personality Selector: 7 interactive cards featuring live scoped mini-UIs demonstrating actual typography, buttons, and badges.
- Appearance Mode Toggle: Light, Dark, or System mode (independent of personality).
- Data Backup & Restore: Single-click export of complete `orbit-db` database to JSON file; validated import/restore with schema verification.

### 6.10 First-Time Onboarding Wizard
- Automatically detected on first launch if `settings.onboardingCompleted === false`.
- 3-step modal flow: Welcome & Product Vision -> Personality Selection -> Workflow Preference.
- Completing the wizard seeds starter templates (welcome tasks, daily habits) and updates `settings`.

---

## PART 7 — DESIGN PRINCIPLES AND USER PREFERENCES

Any agent modifying ORBIT must rigorously adhere to these non-negotiable user principles:

1. **No "Generic AI-Slop" Aesthetics:**
   - Never apply generic purple gradients, gratuitous glassmorphic backdrop blurs, or pulsing neon halos.
   - Design must look art-directed, intentional, tactile, and restrained.
2. **Information Architecture First:**
   - Real distinctiveness comes from layout composition, spacing, hierarchy, and data presentation—not cosmetic CSS tweaks.
3. **Strict Personality Scoping:**
   - When modifying one personality (e.g., Futuristic), NEVER alter or degrade the other six personalities.
   - Use personality-scoped components (e.g., `src/components/dashboard/futuristic/`) or CSS selectors scoped to `[data-theme-personality="..."]`.
4. **Data Integrity & Honesty:**
   - Never display fake telemetry, synthetic CPU/memory percentages, simulated ping times, or fabricated metrics.
   - Every metric on screen must correspond to real data in the user's IndexedDB database.
5. **No Premature Commits or Pushes:**
   - Never commit or push changes to Git without explicit user approval.
   - Always verify visual quality via Playwright screenshots across viewports before requesting approval.
6. **Accessibility & Usability:**
   - Minimum touch target: 44px for primary mobile controls.
   - Respect `prefers-reduced-motion` across all micro-interactions and transitions.
   - Strict contrast ratios for all text against its surface in both Light and Dark modes.

---

## PART 8 — GIT AND REPOSITORY STATUS

### 8.1 Repository Metadata
- **Remote URL:** `https://github.com/Prithvikatkar17/orbit.git`
- **Current Branch:** `main`
- **Head Remote Commit:** `42eae85` (`feat(themes): evolve futuristic into holographic command deck`)

### 8.2 Current Working Tree State
Verified via `git status`:
```text
On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
	modified:   src/app/globals.css
	modified:   src/app/page.tsx
	modified:   tests/phase10c2-futuristic.test.mjs

Untracked files:
	src/components/dashboard/futuristic/
```

### 8.3 Detailed Explanation of Uncommitted Files
1. `src/app/globals.css`:
   - Contains the updated matte graphite and titanium design tokens for `[data-theme-personality="futuristic"]`.
   - Stripped of excessive blurs, glowing halos, and high-frequency dot grids.
2. `src/app/page.tsx`:
   - Imports `FuturisticDashboard` and conditionally mounts it when `themePersonality === "futuristic"`, ensuring all other 6 personalities continue using the standard Bento Grid dashboard.
3. `src/components/dashboard/futuristic/`:
   - Untracked directory containing the four core components of the Minimalist Industrial Workspace:
     - `futuristic-dashboard.tsx`
     - `todays-focus.tsx`
     - `habit-cadence.tsx`
     - `upcoming-agenda.tsx`
4. `tests/phase10c2-futuristic.test.mjs`:
   - Automated unit test suite verifying the structure, data binding, and clean rendering of the Minimalist Industrial dashboard components.

---

## PART 9 — TESTING AND QUALITY ASSURANCE

ORBIT maintains a rigorous QA standard. Code must pass all four verification gates before presentation.

### 9.1 The Four Verification Gates

```text
Gate 1: TypeScript Check ───► Gate 2: ESLint Check ───► Gate 3: Unit Tests ───► Gate 4: Production Build
(npx tsc --noEmit)            (npm run lint)            (npm test - 286 tests)    (npm run build)
```

1. **Gate 1: TypeScript Compilation**
   - Command: `npx tsc --noEmit`
   - Verified Status: **0 errors**.
2. **Gate 2: Code Linting**
   - Command: `npm run lint`
   - Verified Status: **0 errors, 0 warnings**.
3. **Gate 3: Automated Unit Test Suite**
   - Command: `npm test` (executes `node --test tests/*.test.mjs`)
   - Verified Status: **34 test suites, 286 tests passed, 0 failed**.
4. **Gate 4: Production Build Static Generation**
   - Command: `npm run build` (Next.js Webpack production build)
   - Verified Status: **Compiled successfully; all 9 static routes prerendered without errors**.

### 9.2 Playwright Visual QA Protocol
When evaluating visual aesthetics or checking for layout overflow, a dedicated Node.js/Playwright script is executed against a production build server running on port 3005:
- Viewports tested:
  - Desktop: 1440x900
  - Laptop: 1280x800
  - Tablet Landscape: 1024x768
  - Tablet Portrait: 768x1024
  - Mobile Standard: 375x812
  - Mobile Small: 320x568
- Themes tested: Light Mode and Dark Mode for the target personality, plus Archivist regression check.
- Metrics evaluated: Horizontal overflow (`document.documentElement.scrollWidth > window.innerWidth`), console errors, hydration mismatches.
- Verified Status for Minimalist Industrial Futuristic: **`hasOverflow: false` across all 12 viewport configurations**.

---

## PART 10 — CURRENT PROJECT STATUS AND NEXT STEPS

### 10.1 Feature & Phase Status Breakdown

| Phase / Module | Description | Status |
| :--- | :--- | :--- |
| **Phases 1–8** | Core application, database, tasks, habits, inbox, calendar, library, insights | **Production Complete & Committed** |
| **Phase 9A–9D** | 7 theme personalities architecture, design tokens, live previews | **Production Complete & Committed** |
| **Phase 10A** | High-throughput indexed search engine & multi-tab cache invalidation | **Production Complete & Committed** |
| **Phase 10B.1** | Core primitives refinement (buttons, cards, reduced motion) | **Production Complete & Committed** |
| **Phase 10B.2** | Responsive Bento Grid layouts for Dashboard & Insights | **Production Complete & Committed** |
| **Phase 10B.3** | 3-step personalized onboarding wizard | **Production Complete & Committed** |
| **Phase 10C.1** | Archivist personality redesign (tactile laid paper & frosted glass) | **Production Complete & Approved** |
| **Phase 10C.2 (v1)**| Futuristic Holographic Command Deck (neon glassmorphism) | **REJECTED by User** |
| **Phase 10C.2 (v2)**| Futuristic Monolithic Avionics Console (3-column control room) | **REJECTED by User (Too Crowded)** |
| **Phase 10C.2 (v3)**| Futuristic Minimalist Industrial Workspace | **IMPLEMENTED (Awaiting Visual QA Review)** |
| **Phase 10C.3** | Aesthetic personality refinement (editorial warmth & typography) | **Scheduled Next** |
| **Phase 10C.4–10C.7**| Remaining personalities (Artistic, Minimalist, Naturalist, Midnight) | **Scheduled** |

### 10.2 Immediate Next Actions
1. **Visual QA Review:** Present the generated screenshots and visual walkthrough of the Minimalist Industrial Futuristic workspace to the user for final aesthetic sign-off.
2. **Stage & Commit:** Upon user approval, stage the Phase 10C.2 files (`src/app/globals.css`, `src/app/page.tsx`, `src/components/dashboard/futuristic/*`, `tests/phase10c2-futuristic.test.mjs`), commit with message `feat(themes): implement minimalist industrial futuristic workspace`, and push to `origin/main`.
3. **Proceed to Phase 10C.3:** Initiate design refinement for the `Aesthetic` personality following the approved single-personality refinement process.

---

## PART 11 — IMPORTANT DECISIONS AND REJECTED APPROACHES

| Decision | Context & Reason | Current Status / Resolution |
| :--- | :--- | :--- |
| **Reject Cloud Backend (Firebase/Supabase)** | Privacy-first core requirement. Users must retain 100% data ownership on device with zero tracking. | **Dexie / IndexedDB strictly enforced**. Zero remote database dependencies. |
| **Reject Pure CSS Theme Switching** | Themes must alter information hierarchy and component geometry, not just colors. | **Personality-scoped dashboard components** introduced in Phase 10C. |
| **Reject Holographic Neon Deck (10C.2 v1)** | Felt like "generic AI-slop" with excessive glow, blur, and decorative grids. | **Permanently rejected**. Replaced by physical industrial avionics language. |
| **Reject 3-Column Avionics Control Room (10C.2 v2)** | Excessive card density made it feel like a flight cockpit rather than a personal productivity app. | **Permanently rejected**. Stripped 5-card ribbon, diagnostics card, and throughput card. |
| **Adopt Minimalist Industrial Workspace (10C.2 v3)** | Delivers high-craft titanium/graphite aesthetics with a dominant, calm task focus list. | **Fully implemented** in working tree, awaiting user visual sign-off. |
| **In-Memory Inverted Search Index** | Native IndexedDB string matching (`startsWithIgnoreCase`) was too slow across multiple tables. | **Custom tokenized search index** with LRU cache built in Phase 10A. |
| **Pre-Hydration Layout Script** | Next.js server rendering caused white-flash flicker before theme persisted from client storage. | **Inline pre-hydration script** in `layout.tsx` injecting theme attribute before body renders. |
| **Zod Validation at DB Boundary** | Unvalidated objects caused corrupt state in early prototypes. | **All database writes** must pass strict Zod schema validation. |

---

## PART 12 — ENVIRONMENT AND HOW TO RUN ORBIT

### 12.1 System Prerequisites
- **OS:** Windows 10/11, macOS, or Linux.
- **Node.js:** `v24.14.1` (or modern LTS Node.js >= 20.x).
- **Package Manager:** `npm 11.11.0` (or compatible npm 10+).

### 12.2 Development Commands
```bash
# Install dependencies
npm install

# Start local development server (accessible at http://localhost:3000)
npm run dev

# Run TypeScript type-checker without emitting output
npx tsc --noEmit

# Run ESLint across entire codebase
npm run lint

# Run all 34 automated unit test suites
npm test

# Build optimized production bundle
npm run build

# Start production server
npm start
```

### 12.3 Windows Sandbox Specifics & Troubleshooting
1. **Next.js Font Fetch Network Failure:**
   - If `.next` cache is deleted, Next.js attempts to fetch `Geist` and `Newsreader` from Google Fonts during build. In a network-isolated sandbox, this throws `ENOTFOUND fonts.googleapis.com`.
   - **Fix:** Build with network enabled (`BypassSandbox: true`) once to populate `.next/cache`, or ensure font caching is preserved.
2. **Transient `EPERM: operation not permitted, mkdir` on Windows:**
   - Windows file locking can cause transient EPERM errors when 12 Next.js build workers write to `.next/server/app/*.segments` simultaneously.
   - **Fix:** Per sandbox rules, simply re-run `npm run build` up to twice; the lock releases and the build succeeds cleanly.
3. **Playwright Visual Verification:**
   - Start production server on dedicated test port: `npx next start -p 3005`.
   - Run verification script using Playwright: `node scratch/pw/qa-avionics.mjs`.

---

## PART 13 — INSTRUCTIONS FOR THE NEXT AI AGENT

Welcome to the ORBIT codebase. You are taking over a meticulously crafted, zero-debt codebase. Before touching a single line of code, read and commit these directives to memory:

### 13.1 Your First Steps
1. **Read This Entire Document First:** Do not ask the user basic questions about ORBIT's purpose, architecture, themes, or past rejections. Everything is documented here.
2. **Inspect Current Git State:** Run `git status`. Observe that uncommitted files are present in the working tree representing Phase 10C.2 (Futuristic Minimalist Industrial Workspace).
3. **Never Commit Without Approval:** Do not commit or push the working tree until the user has reviewed the visual screenshots and given explicit permission to commit.

### 13.2 Golden Rules for Development
- **Do Not Break Other Themes:** If asked to refine `Aesthetic` (Phase 10C.3), ensure your CSS selectors are strictly scoped to `[data-theme-personality="aesthetic"]` and do not touch `globals.css` base rules or `Archivist`/`Futuristic` tokens.
- **No Direct Color Utilities in Components:** Always use semantic tokens (`bg-[var(--orbit-surface)]`, `text-[var(--orbit-text)]`, `border-[var(--orbit-border)]`, etc.). Never write raw Tailwind palette utilities like `bg-zinc-800` or `text-blue-500` in shared UI primitives.
- **Maintain Test Quality:** When creating or modifying features, run `npm test`, `npx tsc --noEmit`, and `npm run lint`. Ensure all tests pass with 0 errors. If you add functionality, add corresponding tests in `tests/`.
- **Preserve Data Sovereignty:** Never introduce external cloud dependencies, external tracking scripts, or remote sync endpoints without explicit user architectural instruction.
- **Respect User Feedback:** The user has exceptional aesthetic standards and loathes generic AI-generated aesthetics. Take time to think through information architecture, visual weight, typography, and density before writing code.

---
*End of Complete Project Handoff Document. ORBIT is primed for continued architectural excellence.*
