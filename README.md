# RoyalFlush

RoyalFlush is an offline scorekeeper for in-person Teen Patti. Cards stay on the table; the app tracks
boots, bets, pots, running balances and the final "who pays whom" settlement. It installs as an app on
your phone and works without a connection.

> No money is processed and no hands are evaluated. RoyalFlush only keeps the tally between friends.

## Features

**Playing**
- 3–15 players, seated in turn order; the round starter rotates every round
- **Auto mode**: turn-by-turn Blind / See / Call / Raise / Fold / Show with Teen Patti stake rules
  (blind pays half the seen stake, blind raises double the stake, show rules enforced, max-bet cap)
- **Manual mode**: enter each player's bet per iteration, fold players as they drop, "Repeat last"
  and "All ₹boot" quick-fill; the last player standing wins automatically
- **Undo anything**: every action, iteration, award and round discard, even after a page refresh
- Player cards show status (Blind / Seen / Folded), chips in the pot, the starter and whose turn it is
- Action log grouped by round, filterable by player
- Keyboard shortcuts: `B` `S` `C` `R` `F` `H` `D`, `N` (manual), `Ctrl/Cmd+Z`, `?` for the list

**Saving & results**
- The game is saved on the device continuously (IndexedDB) and offered for resume on next launch
- End & Settle refunds an unfinished round and shows standings, minimal "who pays whom", a
  balance-by-round chart, per-round recap and player stats; **Back to game** undoes an accidental end
- Copy or share a WhatsApp-ready settlement summary
- Saved Sessions keeps finished games and games you parked; export/import sessions as JSON
- Analytics across sessions: net by player, win rates, best/worst night, winning hands, date filter

**App**
- Installable PWA, fully offline after the first visit, keeps the screen on during play
- Light and dark themes (WCAG AA contrast), screen-reader announcements, reduced-motion support

## Tech stack

React 18 · TypeScript (strict) · Vite 5 · Tailwind CSS · shadcn/ui + Radix · Recharts · Zod ·
vite-plugin-pwa · Vitest + Testing Library

## Getting started

Requires **Node.js 20 or newer** (CI uses Node 22) and npm.

```bash
npm install
npm run dev        # http://localhost:8080
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check, then production build to `dist/` (includes the service worker) |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | `tsc` in strict mode |
| `npm run lint` | ESLint over the repo |
| `npm test` / `npm run test:watch` | Vitest |

CI (`.github/workflows/ci.yml`) runs lint, type-check, tests and build on every push and PR.

## How the code is organised

```text
src/
  lib/
    game.ts           Pure game engine: every rule, balance change, log entry and undo step
    teenpatti.ts      Domain types, settlement, stats, balance timeline
    storage.ts        IndexedDB persistence (localStorage fallback), v1→v2 migration
    importSession.ts  Strict validation of imported JSON
    analytics.ts      Cross-session aggregates
    export.ts         JSON/CSV export, settlement text
    prefs.ts          Small preferences (disclaimer, last setup, keep-awake)
  hooks/
    useGame.ts        Wires the engine into React; debounced saves; end/resume session
    useShortcuts.ts, useWakeLock.ts, useThemeSwitch.ts
  components/
    GameTable.tsx     Game screen (composition only; no rules)
    game/             Header, action panel, raise/winner/manual dialogs, confirm/shortcut dialogs
    SettlementDialog.tsx, BalanceChart.tsx, PlayerCard.tsx, HistoryPanel.tsx, Setup.tsx, …
  pages/              Index (startup flow), SessionHistory, Analytics, NotFound
```

All game rules live in `src/lib/game.ts` as a reducer (`reduceGame(config, state, action)`), so they
are unit-tested without a browser. The tests assert that money is conserved (balances + pot = 0)
after every action.

## Deploying

The app is a static SPA, ready for Vercel: build command `npm run build`, output `dist`.
`vercel.json` adds the SPA rewrite, long-lived caching for hashed assets, no-cache for the service
worker and manifest, and basic security headers.
