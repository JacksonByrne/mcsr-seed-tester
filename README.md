# MCSR Seed Tester

A seed testing tool for MCSR Ranked Leagues (Leagues 1–6). Testers evaluate Minecraft seeds and assign them to leagues they don't play in, preventing conflicts of interest.

## Features

- **Testers** — Add testers and tag which leagues they play in (conflict of interest system)
- **Seed Pool** — Bulk import overworld/nether seed pairs with types (Village, Desert Temple, Ruined Portal, Buried Treasure, Shipwreck)
- **Evaluate** — Testers pick up pending seeds, test them, approve for specific leagues or reject. Only leagues they don't play in are shown.
- **Dashboard** — Overview of seed counts by status and per-league breakdown
- **Dark mode** toggle

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express + SQLite (better-sqlite3) + Drizzle ORM
- **Routing**: wouter with hash-based routing

## Setup

```bash
npm install
npx drizzle-kit push
npm run dev
```

The dev server starts on port 5000.

## Production

```bash
npm run build
NODE_ENV=production node dist/index.cjs
```

## Seed Import Format

When adding seeds, select a seed type then paste overworld/nether pairs, one per line:

```
overworld_seed, nether_seed
-1234567890, 9876543210
5555555555, -3333333333
```

Supports comma, tab, or pipe-separated values.
