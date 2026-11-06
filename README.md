# ORBIT 🪐
> **"Your Personal Space. Everything in Place."**

ORBIT is a private, local-first personal digital assistant evolved from [Everything-List](legacy/README.md). It helps you capture thoughts, organize tasks and goals, manage daily routines, and store personal references without mandatory cloud accounts or tracking.

---

## ✨ Key Principles

- **Local-First**: Works completely offline without needing an active internet connection.
- **Privacy-First**: No mandatory login or account creation; all data resides locally on your device in IndexedDB.
- **Reliable Storage**: Powered by Dexie.js with atomic transactions, multi-reminder occurrence tracking, and full JSON backup/restore.
- **Smooth Evolution**: Preserves the dual-mode "Everything" capture and 180-day habit heatmap concepts from Everything-List with an automatic, non-destructive migration engine.

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router, static export ready)
- **Language**: TypeScript (strict mode)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com)
- **Database**: [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) via [Dexie.js](https://dexie.org/) & `dexie-react-hooks`
- **Validation**: [Zod](https://zod.dev)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) (ephemeral UI state only)
- **Drag-and-Drop**: [@dnd-kit](https://dndkit.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Theming**: `next-themes` (light / dark / system)

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (tested with Node 20+)
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/Prithvikatkar17/orbit.git
cd orbit

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📋 Project Structure

```
orbit/
├── legacy/                  # Archived Everything-List source & docs
├── public/                  # Static assets & icons
├── src/
│   ├── app/                 # Next.js App Router (pages & layout)
│   ├── components/          # Reusable UI & layout components
│   └── lib/
│       ├── db/              # Dexie.js database client & indexes
│       ├── schemas/         # Zod schemas for all 9 entities
│       ├── stores/          # Zustand ephemeral UI stores
│       └── utils/           # Migration, date helpers, export/import
├── package.json
└── tsconfig.json
```

---

## 📄 License

Open-source and available under the MIT License.
