# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Scrawl — a realtime multiplayer party drawing game. Two-workspace npm monorepo:

- `apps/web` — Next.js 15 (App Router) + React 19 + Tailwind v4. Port **3000**.
- `apps/ws-server` — standalone WebSocket server (`ws`) run with `tsx`. Port **8080**.

The WebSocket server is authoritative for game state; all rooms live in memory (`rooms: Map<string, Room>` in `apps/ws-server/src/room-manager.ts`). A restart drops every active game — there is no persistence layer yet, even though Firebase (Firestore + Storage) is initialized in `apps/web/src/lib/firebase.ts`.

UI copy is in **Portuguese (pt-BR)**; types, code, commit messages, and this file are in English.

## Commands

Run from repo root (npm workspaces):

```bash
npm run dev              # Start web (3000) + ws-server (8080) in parallel
npm run build            # Build the web app (Next.js)

# Per workspace
npm run dev   --workspace=@scrawl/web
npm run dev   --workspace=@scrawl/ws-server   # tsx watch
npm run lint  --workspace=@scrawl/web         # only web has lint
npm run build --workspace=@scrawl/ws-server   # tsc -> dist/
```

There is **no test suite**, no root-level lint, and no typecheck script — rely on `tsc --noEmit` (web `tsconfig.json` already sets `noEmit: true`, so `npx tsc -p apps/web` works for typechecking).

Web dev requires `apps/web/.env.local` with `NEXT_PUBLIC_WS_URL` and the Firebase `NEXT_PUBLIC_*` vars. The ws-server reads only `PORT` (defaults to 8080) — no other env vars.

## Architecture

### Client ↔ server protocol

All realtime is JSON over a single WebSocket. The message contract is duplicated on both sides and must stay in sync:

- `apps/ws-server/src/types.ts` — `ClientMessage` union, `Room`, `Phase`, `GameMode`.
- `apps/web/src/types/game.ts` — mirrored `ClientMessage`, plus a `ServerMessage` union and a client-shaped `RoomState` (the server never sends `Map` / `ws` — see `serializeRoomState` in `handlers.ts`).

**Adding a new client→server message** requires edits in three places: server `types.ts` (union), server `handlers.ts` (dispatch in `handleMessage`), and the `use-game-state.ts` hook (add a `send(...)` callback and expose it).

**Adding a new server→client message** requires: server emits via `broadcast` / `sendTo` (in `room-manager.ts`), web `ServerMessage` union, and a new `case` in the `onMessage` switch inside `use-game-state.ts`.

**Adding a new phase**: extend `Phase` on both sides AND add a render branch in `apps/web/src/components/game/game-controller.tsx`. The controller is the single switchboard for rendering per-phase components.

### Game modes and phase graphs

`GameMode = "party" | "split-body" | "face-builder"` — each drives a different phase graph in `apps/ws-server/src/game-engine.ts`:

- **party** (4–10 players): `theme-creation → [theme-voting if >4] → drawing → drawing-voting → reveal → scoreboard → …` repeats for `totalRounds`, then `final-results`. Pairs are shuffled each round; final round scoring doubles.
- **split-body** (exactly 2 players): alternating top/bottom halves on a shared silhouette; advances when both halves are submitted OR the per-turn timer expires. Ends in `split-final`.
- **face-builder** (exactly 2 players): 6 face regions (`hair`, `ears`, `eyes`, `nose`, `mouth`, `shoulders`) are shuffled and split 3-and-3; each player draws only their assigned regions. Ends in `face-final`. Supports `faceTemplate: "random" | FaceTemplateId` and a `skinTone` hex.

Phase timing lives in `PHASE_DURATIONS` inside `game-engine.ts`; per-turn drawing phases use `room.turnDuration` (clamped 15–300s). `transitionTo` is the only allowed phase mutator — it broadcasts `phase-change` and arms the timeout.

### Module imports in ws-server

`apps/ws-server/tsconfig.json` uses `"module": "NodeNext"`, so **local imports must include the `.js` extension** even in `.ts` source (`import { ... } from "./room-manager.js"`). Omitting it breaks dev (`tsx watch`) and the built output.

### Canvas subsystem

Canvases are a fixed **800×600 logical coordinate space**; pointer events are rescaled in `getPoint`. Two hooks:

- `apps/web/src/hooks/use-canvas.ts` — general drawing (brush / eraser / fill / line / circle / rectangle), clipped to a `side` region (`left` / `right` / `top` / `bottom` / `full`). Used by party and split-body modes.
- `apps/web/src/hooks/use-face-canvas.ts` — face-builder variant. Draws are clipped to the player's **assigned** face regions only; the hair region is ellipse-based (see `isPointInRegion` in `apps/web/src/lib/face-regions.ts`). Also owns **undo/redo history** and `Ctrl+Z` / `Ctrl+Y` bindings. Exports a transparent PNG (white bg + template are HTML layers *behind* the canvas).

`FACE_REGIONS` in `lib/face-regions.ts` is the source of truth for region geometry — changing a rect changes both hit-testing and clipping.

### Landing → room handoff

`apps/web/src/app/page.tsx` renders `Hero`, which stuffs nickname and room-creation options into `sessionStorage` (`scrawl-nickname`, `scrawl-action`, `scrawl-gameMode`, `scrawl-totalRounds`, `scrawl-turnDuration`, `scrawl-faceTemplate`, `scrawl-skinTone`) and navigates to `/room/<code>`. The room page reads those keys, and the sentinel `/room/new` (or `action=create`) triggers `create-room` on the socket; anything else is treated as a join. The real room code is assigned by the server and arrives in the `room-state` message.

### WebSocket client

`apps/web/src/lib/ws-client.ts` holds a **module-level singleton socket** with a 2s auto-reconnect. There is no session / resume token — a reconnect does **not** rejoin the previous room; the player loses their slot. Keep this in mind when touching connection lifecycle.

## Conventions worth knowing

- Path alias `@/*` maps to `apps/web/src/*` (web only).
- Strict TypeScript via `tsconfig.base.json` (`strict: true`, `target: ES2022`).
- Room codes are 5 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no 0/O/1/I/L confusion).
- Rounds clamp: split-body 1–5; other modes use the client-supplied `totalRounds` unchanged. Turn duration clamps 15–300s.
- `docs/game-mode-ideas.md` is a Portuguese brainstorm list of 40 proposed modes — useful context for mode-related work; not a spec.
