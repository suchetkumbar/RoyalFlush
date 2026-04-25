# Teen Patti Tally

Teen Patti Tally is an offline scorekeeper for in-person Teen Patti games. It helps track player actions, round pots, running balances, and the final settlement at the end of a session.

## What It Does

- Set up a session with 3 to 15 players
- Configure the boot amount and per-turn max bet
- Track player state through each round: blind, seen, folded
- Record actions like blind, see, call, raise, fold, show, and winner declaration
- Keep a running pot and per-player net balance
- Undo recent actions during play
- Show round history, action log, final settlement, and player stats

## Important Notes

- This app does not deal cards or evaluate hands automatically.
- Cards are played physically; the app only tracks the tally.
- No money is processed by the app.
- Session state is currently in memory only, so refreshing the page resets the active session.

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui + Radix UI
- Vitest

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm

### Install

```bash
npm install
```

### Start the dev server

```bash
npm run dev
```

The app runs on `http://localhost:8080`.

## Available Scripts

- `npm run dev` - start the Vite dev server
- `npm run build` - create a production build
- `npm run build:dev` - create a development-mode build
- `npm run lint` - run ESLint
- `npm run test` - run Vitest once
- `npm run test:watch` - run Vitest in watch mode
- `npm run preview` - preview the production build locally

## Project Structure

```text
src/
  components/    Reusable UI and game-specific components
  hooks/         Shared React hooks
  lib/           Core Teen Patti tally types and calculations
  pages/         Route-level page components
  test/          Test setup
```

## Core Files

- `src/pages/Index.tsx` controls the disclaimer -> setup -> game flow
- `src/components/GameTable.tsx` contains the main session logic
- `src/lib/teenpatti.ts` defines the domain types, settlement logic, and stats helpers
- `src/components/SettlementDialog.tsx` shows final settlement and player stats

## Current Limitations

- No persistent storage yet
- No multiplayer sync or backend
- No export or share flow for session results
