# Scrawl MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Scrawl MVP — a web-based party drawing game where players create absurd themes, vote on them, draw in split-canvas pairs, vote on drawings, and share results.

**Architecture:** Next.js App Router for the frontend (SSR landing page + client-side game). WebSocket server (Node.js, ws library) for real-time room coordination, phase transitions, and synchronized timers. Firestore for persistence (rooms, themes, votes, results). Firebase Storage for drawing images. Monorepo with `apps/web` and `apps/ws-server`.

**Tech Stack:** Next.js 15, TypeScript, HTML5 Canvas API, ws (WebSocket), Firebase (Firestore, Storage), Tailwind CSS 4

---

## File Structure

```
scrawl/
├── apps/
│   ├── web/                          # Next.js App Router frontend
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx        # Root layout with fonts, metadata
│   │   │   │   ├── page.tsx          # Landing page
│   │   │   │   ├── room/
│   │   │   │   │   └── [code]/
│   │   │   │   │       └── page.tsx  # Game room page (lobby + all phases)
│   │   │   │   └── globals.css       # Tailwind imports
│   │   │   ├── components/
│   │   │   │   ├── landing/
│   │   │   │   │   └── hero.tsx      # Landing page hero with create/join room
│   │   │   │   ├── lobby/
│   │   │   │   │   └── lobby.tsx     # Room lobby: player list, start button
│   │   │   │   ├── canvas/
│   │   │   │   │   ├── drawing-canvas.tsx   # Core canvas with drawing tools
│   │   │   │   │   └── toolbar.tsx          # Color picker, brush size, eraser
│   │   │   │   ├── phases/
│   │   │   │   │   ├── theme-creation.tsx   # Phase 1: submit themes
│   │   │   │   │   ├── theme-voting.tsx     # Phase 2: vote on themes
│   │   │   │   │   ├── drawing-phase.tsx    # Phase 3: draw on half canvas
│   │   │   │   │   ├── drawing-voting.tsx   # Phase 4: vote on drawings
│   │   │   │   │   └── reveal.tsx           # Reveal animation + scores
│   │   │   │   ├── game/
│   │   │   │   │   ├── game-controller.tsx  # Phase state machine, renders current phase
│   │   │   │   │   ├── timer-bar.tsx        # Countdown timer bar
│   │   │   │   │   └── scoreboard.tsx       # Running scores between rounds
│   │   │   │   └── share/
│   │   │   │       └── share-card.tsx       # Generate + download share card image
│   │   │   ├── lib/
│   │   │   │   ├── firebase.ts       # Firebase app init + Firestore/Storage exports
│   │   │   │   ├── ws-client.ts      # WebSocket client wrapper (connect, send, listen)
│   │   │   │   ├── canvas-utils.ts   # Canvas helpers: export to PNG, clear, resize
│   │   │   │   └── room-utils.ts     # Generate room codes, validate nicknames
│   │   │   ├── hooks/
│   │   │   │   ├── use-game-state.ts # Hook: subscribes to WS messages, manages local game state
│   │   │   │   ├── use-canvas.ts     # Hook: canvas drawing logic (mouse/touch events, tools)
│   │   │   │   └── use-timer.ts      # Hook: countdown from WS-synced start time
│   │   │   └── types/
│   │   │       └── game.ts           # Shared types: Room, Player, Phase, Theme, Vote, DrawingResult
│   │   ├── public/
│   │   │   └── logo.svg
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   └── tsconfig.json
│   └── ws-server/                    # WebSocket server for room coordination
│       ├── src/
│       │   ├── server.ts             # HTTP + WebSocket server setup
│       │   ├── room-manager.ts       # Create/join/leave rooms, track players
│       │   ├── game-engine.ts        # Phase state machine, timer management, scoring
│       │   ├── handlers.ts           # Message handlers: one function per message type
│       │   └── types.ts              # Server-side types (shared shape with client types)
│       ├── package.json
│       └── tsconfig.json
├── package.json                      # Root package.json (npm workspaces)
├── tsconfig.base.json                # Shared TS config
└── .gitignore
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.base.json`, `.gitignore`
- Create: `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/next.config.ts`, `apps/web/tailwind.config.ts`
- Create: `apps/web/src/app/layout.tsx`, `apps/web/src/app/page.tsx`, `apps/web/src/app/globals.css`
- Create: `apps/ws-server/package.json`, `apps/ws-server/tsconfig.json`

- [ ] **Step 1: Initialize root monorepo**

```bash
cd /path/to/scrawl
git init
```

Create `package.json`:
```json
{
  "name": "scrawl",
  "private": true,
  "workspaces": ["apps/*"]
}
```

Create `.gitignore`:
```
node_modules/
.next/
dist/
.env
.env.local
*.tgz
```

Create `tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

- [ ] **Step 2: Scaffold Next.js web app**

```bash
cd apps/web
```

Create `apps/web/package.json`:
```json
{
  "name": "@scrawl/web",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^15.3.1",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "firebase": "^11.6.0",
    "tailwindcss": "^4.1.4",
    "@tailwindcss/postcss": "^4.1.4"
  },
  "devDependencies": {
    "typescript": "^5.8.3",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "@types/node": "^22.14.1"
  }
}
```

Create `apps/web/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Create `apps/web/next.config.ts`:
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
```

Create `apps/web/postcss.config.mjs`:
```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

Create `apps/web/src/app/globals.css`:
```css
@import "tailwindcss";
```

Create `apps/web/src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scrawl — Party Drawing Game",
  description: "Draw, laugh, compete. The party game where your terrible art becomes legendary.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white min-h-screen">{children}</body>
    </html>
  );
}
```

Create `apps/web/src/app/page.tsx`:
```tsx
export default function Home() {
  return (
    <main className="flex items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold">Scrawl</h1>
    </main>
  );
}
```

- [ ] **Step 3: Scaffold WebSocket server**

Create `apps/ws-server/package.json`:
```json
{
  "name": "@scrawl/ws-server",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  },
  "dependencies": {
    "ws": "^8.18.1"
  },
  "devDependencies": {
    "typescript": "^5.8.3",
    "tsx": "^4.19.3",
    "@types/ws": "^8.18.1",
    "@types/node": "^22.14.1"
  }
}
```

Create `apps/ws-server/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "jsx": "react-jsx"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

Create `apps/ws-server/src/server.ts`:
```typescript
import { createServer } from "http";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT) || 8080;

const server = createServer();
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("Client connected");
  ws.on("close", () => console.log("Client disconnected"));
});

server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
```

- [ ] **Step 4: Install dependencies and verify**

```bash
cd /path/to/scrawl
npm install
cd apps/web && npx next build && cd ../..
cd apps/ws-server && npx tsc --noEmit && cd ../..
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: scaffold monorepo with Next.js web app and WebSocket server"
```

---

## Task 2: Shared Types

**Files:**
- Create: `apps/web/src/types/game.ts`
- Create: `apps/ws-server/src/types.ts`

- [ ] **Step 1: Define client-side types**

Create `apps/web/src/types/game.ts`:
```typescript
export type Phase =
  | "lobby"
  | "theme-creation"
  | "theme-voting"
  | "drawing"
  | "drawing-voting"
  | "reveal"
  | "scoreboard"
  | "final-results";

export interface Player {
  id: string;
  nickname: string;
  score: number;
  isHost: boolean;
}

export interface Theme {
  id: string;
  text: string;
  authorId: string;
  votes: number;
}

export interface Pair {
  id: string;
  playerA: string;
  playerB: string;
  themeId: string;
}

export interface DrawingResult {
  pairId: string;
  themeText: string;
  imageLeftDataUrl: string;
  imageRightDataUrl: string;
  combinedImageDataUrl: string;
  votes: { first: number; second: number; third: number };
}

export interface RoomState {
  code: string;
  phase: Phase;
  round: number;
  totalRounds: number;
  players: Player[];
  themes: Theme[];
  pairs: Pair[];
  drawings: DrawingResult[];
  phaseEndsAt: number; // Unix timestamp ms
}

// WebSocket message types (client → server)
export type ClientMessage =
  | { type: "join-room"; roomCode: string; nickname: string }
  | { type: "start-game" }
  | { type: "submit-theme"; text: string }
  | { type: "vote-theme"; themeId: string }
  | { type: "submit-drawing"; imageDataUrl: string }
  | { type: "vote-drawing"; pairId: string; rank: 1 | 2 | 3 };

// WebSocket message types (server → client)
export type ServerMessage =
  | { type: "room-state"; state: RoomState }
  | { type: "error"; message: string }
  | { type: "phase-change"; phase: Phase; phaseEndsAt: number }
  | { type: "player-joined"; player: Player }
  | { type: "player-left"; playerId: string }
  | { type: "theme-submitted"; theme: Theme }
  | { type: "theme-votes-update"; themes: Theme[] }
  | { type: "drawing-submitted"; pairId: string; side: "left" | "right" }
  | { type: "drawings-ready"; drawings: DrawingResult[] }
  | { type: "vote-update"; drawings: DrawingResult[] }
  | { type: "reveal-data"; drawings: DrawingResult[]; players: Player[] }
  | { type: "final-results"; players: Player[]; drawings: DrawingResult[] };
```

- [ ] **Step 2: Define server-side types**

Create `apps/ws-server/src/types.ts`:
```typescript
import type { WebSocket } from "ws";

export type Phase =
  | "lobby"
  | "theme-creation"
  | "theme-voting"
  | "drawing"
  | "drawing-voting"
  | "reveal"
  | "scoreboard"
  | "final-results";

export interface Player {
  id: string;
  nickname: string;
  score: number;
  isHost: boolean;
  ws: WebSocket;
}

export interface Theme {
  id: string;
  text: string;
  authorId: string;
  votes: string[]; // player IDs who voted
}

export interface Pair {
  id: string;
  playerA: string;
  playerB: string;
  themeId: string;
}

export interface DrawingSubmission {
  pairId: string;
  playerId: string;
  side: "left" | "right";
  imageDataUrl: string;
}

export interface DrawingResult {
  pairId: string;
  themeText: string;
  imageLeftDataUrl: string;
  imageRightDataUrl: string;
  combinedImageDataUrl: string;
  votes: Record<string, { first: string; second: string; third: string }>;
}

export interface Room {
  code: string;
  phase: Phase;
  round: number;
  totalRounds: number;
  players: Map<string, Player>;
  themes: Theme[];
  pairs: Pair[];
  drawings: DrawingSubmission[];
  results: DrawingResult[];
  phaseTimer: ReturnType<typeof setTimeout> | null;
  phaseEndsAt: number;
}

// Client → Server messages
export type ClientMessage =
  | { type: "join-room"; roomCode: string; nickname: string }
  | { type: "create-room"; nickname: string }
  | { type: "start-game" }
  | { type: "submit-theme"; text: string }
  | { type: "vote-theme"; themeId: string }
  | { type: "submit-drawing"; imageDataUrl: string }
  | { type: "vote-drawing"; pairId: string; rank: 1 | 2 | 3 };
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: define shared game types for client and server"
```

---

## Task 3: WebSocket Room Manager

**Files:**
- Create: `apps/ws-server/src/room-manager.ts`
- Update: `apps/ws-server/src/server.ts`

- [ ] **Step 1: Implement room manager**

Create `apps/ws-server/src/room-manager.ts`:
```typescript
import type { Room, Player } from "./types.js";
import type { WebSocket } from "ws";

const rooms = new Map<string, Room>();

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateCode() : code;
}

export function createRoom(nickname: string, ws: WebSocket): Room {
  const code = generateCode();
  const playerId = crypto.randomUUID();
  const host: Player = { id: playerId, nickname, score: 0, isHost: true, ws };

  const room: Room = {
    code,
    phase: "lobby",
    round: 0,
    totalRounds: 3,
    players: new Map([[playerId, host]]),
    themes: [],
    pairs: [],
    drawings: [],
    results: [],
    phaseTimer: null,
    phaseEndsAt: 0,
  };

  rooms.set(code, room);
  return room;
}

export function joinRoom(code: string, nickname: string, ws: WebSocket): { room: Room; playerId: string } | null {
  const room = rooms.get(code);
  if (!room) return null;
  if (room.phase !== "lobby") return null;
  if (room.players.size >= 10) return null;

  const playerId = crypto.randomUUID();
  const player: Player = { id: playerId, nickname, score: 0, isHost: false, ws };
  room.players.set(playerId, player);

  return { room, playerId };
}

export function removePlayer(roomCode: string, playerId: string): Room | null {
  const room = rooms.get(roomCode);
  if (!room) return null;

  room.players.delete(playerId);

  if (room.players.size === 0) {
    if (room.phaseTimer) clearTimeout(room.phaseTimer);
    rooms.delete(roomCode);
    return null;
  }

  // Transfer host if host left
  const hasHost = Array.from(room.players.values()).some((p) => p.isHost);
  if (!hasHost) {
    const firstPlayer = room.players.values().next().value;
    if (firstPlayer) firstPlayer.isHost = true;
  }

  return room;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code);
}

export function getPlayerRoom(playerId: string): { room: Room; player: Player } | null {
  for (const room of rooms.values()) {
    const player = room.players.get(playerId);
    if (player) return { room, player };
  }
  return null;
}

export function broadcast(room: Room, message: object, excludeId?: string) {
  const data = JSON.stringify(message);
  for (const [id, player] of room.players) {
    if (id !== excludeId && player.ws.readyState === player.ws.OPEN) {
      player.ws.send(data);
    }
  }
}

export function sendTo(room: Room, playerId: string, message: object) {
  const player = room.players.get(playerId);
  if (player && player.ws.readyState === player.ws.OPEN) {
    player.ws.send(JSON.stringify(message));
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add .
git commit -m "feat: add WebSocket room manager with create/join/leave"
```

---

## Task 4: Game Engine (Phase State Machine + Scoring)

**Files:**
- Create: `apps/ws-server/src/game-engine.ts`

- [ ] **Step 1: Implement game engine**

Create `apps/ws-server/src/game-engine.ts`:
```typescript
import type { Room, Phase, Pair, DrawingResult } from "./types.js";
import { broadcast } from "./room-manager.js";

const PHASE_DURATIONS: Record<string, number> = {
  "theme-creation": 30_000,
  "theme-voting": 20_000,
  drawing: 90_000,
  "drawing-voting": 20_000,
  reveal: 10_000,
  scoreboard: 8_000,
};

export function startGame(room: Room) {
  if (room.players.size < 4) return;
  room.round = 1;
  transitionTo(room, "theme-creation");
}

export function transitionTo(room: Room, phase: Phase) {
  if (room.phaseTimer) clearTimeout(room.phaseTimer);

  room.phase = phase;
  const duration = PHASE_DURATIONS[phase] ?? 0;
  room.phaseEndsAt = duration > 0 ? Date.now() + duration : 0;

  broadcast(room, {
    type: "phase-change",
    phase,
    phaseEndsAt: room.phaseEndsAt,
  });

  if (duration > 0) {
    room.phaseTimer = setTimeout(() => onPhaseEnd(room), duration);
  }
}

function onPhaseEnd(room: Room) {
  switch (room.phase) {
    case "theme-creation":
      processThemes(room);
      break;
    case "theme-voting":
      selectTopThemesAndPair(room);
      break;
    case "drawing":
      processDrawings(room);
      break;
    case "drawing-voting":
      processDrawingVotes(room);
      break;
    case "reveal":
      transitionTo(room, "scoreboard");
      break;
    case "scoreboard":
      nextRoundOrEnd(room);
      break;
  }
}

function processThemes(room: Room) {
  if (room.themes.length === 0) {
    // Fallback: add a default theme if nobody submitted
    room.themes.push({
      id: crypto.randomUUID(),
      text: "A cat riding a unicorn",
      authorId: "system",
      votes: [],
    });
  }

  const playerCount = room.players.size;
  if (playerCount <= 4) {
    // Skip voting, use all themes
    assignPairs(room, room.themes);
    transitionTo(room, "drawing");
  } else {
    transitionTo(room, "theme-voting");
  }
}

function selectTopThemesAndPair(room: Room) {
  const numPairs = Math.floor(room.players.size / 2);
  const sorted = [...room.themes].sort((a, b) => b.votes.length - a.votes.length);
  const selected = sorted.slice(0, numPairs);

  // Award "Tema Popular" bonus
  if (sorted.length > 0 && sorted[0].votes.length > 0) {
    const topAuthorId = sorted[0].authorId;
    const author = room.players.get(topAuthorId);
    if (author) author.score += 1;
  }

  assignPairs(room, selected);
  transitionTo(room, "drawing");
}

function assignPairs(room: Room, themes: typeof room.themes) {
  const playerIds = shuffleArray(Array.from(room.players.keys()));
  const numPairs = Math.floor(playerIds.length / 2);
  room.pairs = [];
  room.drawings = [];

  for (let i = 0; i < numPairs; i++) {
    const theme = themes[i % themes.length];
    const pair: Pair = {
      id: crypto.randomUUID(),
      playerA: playerIds[i * 2],
      playerB: playerIds[i * 2 + 1],
      themeId: theme.id,
    };
    room.pairs.push(pair);
  }

  // Send each player their pair info and theme
  for (const pair of room.pairs) {
    const theme = room.themes.find((t) => t.id === pair.themeId);
    const pairInfo = {
      type: "pair-assigned" as const,
      pairId: pair.id,
      partnerId: "",
      side: "" as "left" | "right",
      theme: theme?.text ?? "Free draw",
    };

    const playerA = room.players.get(pair.playerA);
    if (playerA?.ws.readyState === playerA?.ws.OPEN) {
      playerA.ws.send(JSON.stringify({ ...pairInfo, partnerId: pair.playerB, side: "left" }));
    }
    const playerB = room.players.get(pair.playerB);
    if (playerB?.ws.readyState === playerB?.ws.OPEN) {
      playerB.ws.send(JSON.stringify({ ...pairInfo, partnerId: pair.playerA, side: "right" }));
    }
  }
}

function processDrawings(room: Room) {
  room.results = room.pairs.map((pair) => {
    const theme = room.themes.find((t) => t.id === pair.themeId);
    const leftDrawing = room.drawings.find((d) => d.pairId === pair.id && d.side === "left");
    const rightDrawing = room.drawings.find((d) => d.pairId === pair.id && d.side === "right");

    return {
      pairId: pair.id,
      themeText: theme?.text ?? "",
      imageLeftDataUrl: leftDrawing?.imageDataUrl ?? "",
      imageRightDataUrl: rightDrawing?.imageDataUrl ?? "",
      combinedImageDataUrl: "", // Combined on client for reveal
      votes: {},
    };
  });

  broadcast(room, { type: "drawings-ready", drawings: serializeResults(room.results) });
  transitionTo(room, "drawing-voting");
}

function processDrawingVotes(room: Room) {
  // Calculate scores from votes
  for (const result of room.results) {
    let first = 0, second = 0, third = 0;
    for (const vote of Object.values(result.votes)) {
      if (vote.first === result.pairId) first++;
      if (vote.second === result.pairId) second++;
      if (vote.third === result.pairId) third++;
    }

    const pairScore = first * 3 + second * 2 + third * 1;
    const multiplier = room.round === room.totalRounds ? 2 : 1;
    const finalScore = pairScore * multiplier;

    const pair = room.pairs.find((p) => p.id === result.pairId);
    if (pair) {
      const playerA = room.players.get(pair.playerA);
      const playerB = room.players.get(pair.playerB);
      if (playerA) playerA.score += finalScore;
      if (playerB) playerB.score += finalScore;
    }
  }

  const players = Array.from(room.players.values()).map(({ id, nickname, score, isHost }) => ({
    id, nickname, score, isHost,
  }));

  broadcast(room, {
    type: "reveal-data",
    drawings: serializeResults(room.results),
    players,
  });

  transitionTo(room, "reveal");
}

function nextRoundOrEnd(room: Room) {
  if (room.round >= room.totalRounds) {
    const players = Array.from(room.players.values()).map(({ id, nickname, score, isHost }) => ({
      id, nickname, score, isHost,
    }));
    broadcast(room, {
      type: "final-results",
      players: players.sort((a, b) => b.score - a.score),
      drawings: serializeResults(room.results),
    });
    transitionTo(room, "final-results");
  } else {
    room.round++;
    room.themes = [];
    room.pairs = [];
    room.drawings = [];
    room.results = [];
    transitionTo(room, "theme-creation");
  }
}

function serializeResults(results: DrawingResult[]) {
  return results.map((r) => ({
    ...r,
    votes: {
      first: Object.values(r.votes).filter((v) => v.first === r.pairId).length,
      second: Object.values(r.votes).filter((v) => v.second === r.pairId).length,
      third: Object.values(r.votes).filter((v) => v.third === r.pairId).length,
    },
  }));
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
```

- [ ] **Step 2: Commit**

```bash
git add .
git commit -m "feat: add game engine with phase state machine and scoring"
```

---

## Task 5: WebSocket Message Handlers

**Files:**
- Create: `apps/ws-server/src/handlers.ts`
- Modify: `apps/ws-server/src/server.ts`

- [ ] **Step 1: Implement message handlers**

Create `apps/ws-server/src/handlers.ts`:
```typescript
import type { WebSocket } from "ws";
import type { ClientMessage } from "./types.js";
import { createRoom, joinRoom, removePlayer, getRoom, broadcast, sendTo, getPlayerRoom } from "./room-manager.js";
import { startGame, transitionTo } from "./game-engine.js";

// Map ws connections to their player/room info
const wsToPlayer = new Map<WebSocket, { playerId: string; roomCode: string }>();

export function handleConnection(ws: WebSocket) {
  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as ClientMessage;
      handleMessage(ws, msg);
    } catch {
      ws.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
    }
  });

  ws.on("close", () => {
    const info = wsToPlayer.get(ws);
    if (info) {
      const room = removePlayer(info.roomCode, info.playerId);
      if (room) {
        broadcast(room, { type: "player-left", playerId: info.playerId });
      }
      wsToPlayer.delete(ws);
    }
  });
}

function handleMessage(ws: WebSocket, msg: ClientMessage) {
  switch (msg.type) {
    case "create-room":
      handleCreateRoom(ws, msg.nickname);
      break;
    case "join-room":
      handleJoinRoom(ws, msg.roomCode, msg.nickname);
      break;
    case "start-game":
      handleStartGame(ws);
      break;
    case "submit-theme":
      handleSubmitTheme(ws, msg.text);
      break;
    case "vote-theme":
      handleVoteTheme(ws, msg.themeId);
      break;
    case "submit-drawing":
      handleSubmitDrawing(ws, msg.imageDataUrl);
      break;
    case "vote-drawing":
      handleVoteDrawing(ws, msg.pairId, msg.rank);
      break;
  }
}

function handleCreateRoom(ws: WebSocket, nickname: string) {
  const room = createRoom(nickname, ws);
  const hostId = Array.from(room.players.keys())[0];
  wsToPlayer.set(ws, { playerId: hostId, roomCode: room.code });

  const state = serializeRoomState(room, hostId);
  ws.send(JSON.stringify({ type: "room-state", state, playerId: hostId }));
}

function handleJoinRoom(ws: WebSocket, roomCode: string, nickname: string) {
  const result = joinRoom(roomCode, nickname, ws);
  if (!result) {
    ws.send(JSON.stringify({ type: "error", message: "Room not found, full, or already started" }));
    return;
  }

  const { room, playerId } = result;
  wsToPlayer.set(ws, { playerId, roomCode: room.code });

  const state = serializeRoomState(room, playerId);
  ws.send(JSON.stringify({ type: "room-state", state, playerId }));

  const player = room.players.get(playerId)!;
  broadcast(room, {
    type: "player-joined",
    player: { id: player.id, nickname: player.nickname, score: player.score, isHost: player.isHost },
  }, playerId);
}

function handleStartGame(ws: WebSocket) {
  const info = wsToPlayer.get(ws);
  if (!info) return;

  const room = getRoom(info.roomCode);
  if (!room) return;

  const player = room.players.get(info.playerId);
  if (!player?.isHost) {
    ws.send(JSON.stringify({ type: "error", message: "Only the host can start the game" }));
    return;
  }

  if (room.players.size < 4) {
    ws.send(JSON.stringify({ type: "error", message: "Need at least 4 players to start" }));
    return;
  }

  startGame(room);
}

function handleSubmitTheme(ws: WebSocket, text: string) {
  const info = wsToPlayer.get(ws);
  if (!info) return;

  const room = getRoom(info.roomCode);
  if (!room || room.phase !== "theme-creation") return;

  const trimmed = text.trim().slice(0, 100);
  if (!trimmed) return;

  // Check if player already submitted (1 theme per player, 2 if < 6 players)
  const maxThemes = room.players.size < 6 ? 2 : 1;
  const playerThemes = room.themes.filter((t) => t.authorId === info.playerId);
  if (playerThemes.length >= maxThemes) return;

  const theme = {
    id: crypto.randomUUID(),
    text: trimmed,
    authorId: info.playerId,
    votes: [] as string[],
  };

  room.themes.push(theme);

  broadcast(room, {
    type: "theme-submitted",
    theme: { id: theme.id, text: theme.text, authorId: theme.authorId, votes: 0 },
  });
}

function handleVoteTheme(ws: WebSocket, themeId: string) {
  const info = wsToPlayer.get(ws);
  if (!info) return;

  const room = getRoom(info.roomCode);
  if (!room || room.phase !== "theme-voting") return;

  const theme = room.themes.find((t) => t.id === themeId);
  if (!theme) return;
  if (theme.authorId === info.playerId) return; // Can't vote own theme
  if (theme.votes.includes(info.playerId)) return; // Already voted this theme

  // Max 2 votes per player
  const playerVoteCount = room.themes.reduce(
    (count, t) => count + (t.votes.includes(info.playerId) ? 1 : 0), 0
  );
  if (playerVoteCount >= 2) return;

  theme.votes.push(info.playerId);

  broadcast(room, {
    type: "theme-votes-update",
    themes: room.themes.map((t) => ({
      id: t.id, text: t.text, authorId: t.authorId, votes: t.votes.length,
    })),
  });
}

function handleSubmitDrawing(ws: WebSocket, imageDataUrl: string) {
  const info = wsToPlayer.get(ws);
  if (!info) return;

  const room = getRoom(info.roomCode);
  if (!room || room.phase !== "drawing") return;

  const pair = room.pairs.find(
    (p) => p.playerA === info.playerId || p.playerB === info.playerId
  );
  if (!pair) return;

  const side = pair.playerA === info.playerId ? "left" : "right";

  // Don't allow duplicate submissions
  const existing = room.drawings.find(
    (d) => d.pairId === pair.id && d.playerId === info.playerId
  );
  if (existing) return;

  room.drawings.push({
    pairId: pair.id,
    playerId: info.playerId,
    side,
    imageDataUrl,
  });

  broadcast(room, { type: "drawing-submitted", pairId: pair.id, side });
}

function handleVoteDrawing(ws: WebSocket, pairId: string, rank: 1 | 2 | 3) {
  const info = wsToPlayer.get(ws);
  if (!info) return;

  const room = getRoom(info.roomCode);
  if (!room || room.phase !== "drawing-voting") return;

  // Can't vote for own pair
  const ownPair = room.pairs.find(
    (p) => p.playerA === info.playerId || p.playerB === info.playerId
  );
  if (ownPair?.id === pairId) return;

  const result = room.results.find((r) => r.pairId === pairId);
  if (!result) return;

  if (!result.votes[info.playerId]) {
    result.votes[info.playerId] = { first: "", second: "", third: "" };
  }

  const rankKey = rank === 1 ? "first" : rank === 2 ? "second" : "third";
  result.votes[info.playerId][rankKey] = pairId;
}

function serializeRoomState(room: ReturnType<typeof getRoom>, _playerId: string) {
  if (!room) return null;
  return {
    code: room.code,
    phase: room.phase,
    round: room.round,
    totalRounds: room.totalRounds,
    players: Array.from(room.players.values()).map(({ id, nickname, score, isHost }) => ({
      id, nickname, score, isHost,
    })),
    themes: room.themes.map((t) => ({
      id: t.id, text: t.text, authorId: t.authorId, votes: t.votes.length,
    })),
    pairs: room.pairs,
    drawings: [],
    phaseEndsAt: room.phaseEndsAt,
  };
}
```

- [ ] **Step 2: Update server.ts to use handlers**

Replace `apps/ws-server/src/server.ts`:
```typescript
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { handleConnection } from "./handlers.js";

const PORT = Number(process.env.PORT) || 8080;

const server = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Scrawl WebSocket Server");
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  handleConnection(ws);
});

server.listen(PORT, () => {
  console.log(`Scrawl WebSocket server running on port ${PORT}`);
});
```

- [ ] **Step 3: Verify compilation**

```bash
cd /path/to/scrawl/apps/ws-server
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add WebSocket message handlers and wire up server"
```

---

## Task 6: Firebase Setup + Config

**Files:**
- Create: `apps/web/src/lib/firebase.ts`
- Create: `apps/web/.env.local`

- [ ] **Step 1: Create Firebase config**

Create `apps/web/.env.local`:
```
NEXT_PUBLIC_FIREBASE_API_KEY=<redacted>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<redacted>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<redacted>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<redacted>
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<redacted>
NEXT_PUBLIC_FIREBASE_APP_ID=<redacted>
NEXT_PUBLIC_WS_URL=ws://localhost:8080
```

Create `apps/web/src/lib/firebase.ts`:
```typescript
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export const storage = getStorage(app);
```

- [ ] **Step 2: Add firebase and firestore deps**

```bash
cd /path/to/scrawl/apps/web
npm install firebase
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/firebase.ts
git commit -m "feat: add Firebase configuration and Firestore/Storage exports"
```

Note: `.env.local` is in `.gitignore` — do not commit it.

---

## Task 7: WebSocket Client Wrapper

**Files:**
- Create: `apps/web/src/lib/ws-client.ts`

- [ ] **Step 1: Implement WS client**

Create `apps/web/src/lib/ws-client.ts`:
```typescript
type MessageHandler = (data: any) => void;

let ws: WebSocket | null = null;
let handlers: MessageHandler[] = [];
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

export function connect(url: string) {
  if (ws?.readyState === WebSocket.OPEN) return;

  ws = new WebSocket(url);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handlers.forEach((handler) => handler(data));
    } catch {
      // ignore malformed messages
    }
  };

  ws.onclose = () => {
    reconnectTimeout = setTimeout(() => connect(url), 2000);
  };

  ws.onerror = () => {
    ws?.close();
  };
}

export function disconnect() {
  if (reconnectTimeout) clearTimeout(reconnectTimeout);
  ws?.close();
  ws = null;
}

export function send(message: object) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

export function onMessage(handler: MessageHandler): () => void {
  handlers.push(handler);
  return () => {
    handlers = handlers.filter((h) => h !== handler);
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add .
git commit -m "feat: add WebSocket client wrapper with reconnect"
```

---

## Task 8: Game State Hook

**Files:**
- Create: `apps/web/src/hooks/use-game-state.ts`
- Create: `apps/web/src/hooks/use-timer.ts`
- Create: `apps/web/src/lib/room-utils.ts`

- [ ] **Step 1: Create room utilities**

Create `apps/web/src/lib/room-utils.ts`:
```typescript
export function validateNickname(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 2) return "Nickname must be at least 2 characters";
  if (trimmed.length > 16) return "Nickname must be 16 characters or less";
  return null;
}
```

- [ ] **Step 2: Create timer hook**

Create `apps/web/src/hooks/use-timer.ts`:
```typescript
"use client";
import { useState, useEffect, useRef } from "react";

export function useTimer(endsAt: number) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!endsAt) {
      setSecondsLeft(0);
      return;
    }

    function tick() {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    tick();
    intervalRef.current = setInterval(tick, 250);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [endsAt]);

  const progress = endsAt ? Math.max(0, (endsAt - Date.now()) / (endsAt - (endsAt - secondsLeft * 1000))) : 0;

  return { secondsLeft, progress };
}
```

- [ ] **Step 3: Create game state hook**

Create `apps/web/src/hooks/use-game-state.ts`:
```typescript
"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { connect, disconnect, send, onMessage } from "@/lib/ws-client";
import type { RoomState, Phase, Player, Theme, DrawingResult, ServerMessage } from "@/types/game";

interface PairAssignment {
  pairId: string;
  partnerId: string;
  side: "left" | "right";
  theme: string;
}

interface GameState {
  connected: boolean;
  playerId: string | null;
  roomState: RoomState | null;
  pairAssignment: PairAssignment | null;
  drawings: DrawingResult[];
  error: string | null;
}

const initialState: GameState = {
  connected: false,
  playerId: null,
  roomState: null,
  pairAssignment: null,
  drawings: [],
  error: null,
};

export function useGameState() {
  const [state, setState] = useState<GameState>(initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";
    connect(wsUrl);
    setState((s) => ({ ...s, connected: true }));

    const unsubscribe = onMessage((data: ServerMessage & { playerId?: string }) => {
      switch (data.type) {
        case "room-state":
          setState((s) => ({
            ...s,
            roomState: data.state,
            playerId: data.playerId ?? s.playerId,
            error: null,
          }));
          break;

        case "phase-change":
          setState((s) => ({
            ...s,
            roomState: s.roomState
              ? { ...s.roomState, phase: data.phase, phaseEndsAt: data.phaseEndsAt }
              : null,
          }));
          break;

        case "player-joined":
          setState((s) => ({
            ...s,
            roomState: s.roomState
              ? { ...s.roomState, players: [...s.roomState.players, data.player] }
              : null,
          }));
          break;

        case "player-left":
          setState((s) => ({
            ...s,
            roomState: s.roomState
              ? {
                  ...s.roomState,
                  players: s.roomState.players.filter((p) => p.id !== data.playerId),
                }
              : null,
          }));
          break;

        case "theme-submitted":
          setState((s) => ({
            ...s,
            roomState: s.roomState
              ? { ...s.roomState, themes: [...s.roomState.themes, data.theme] }
              : null,
          }));
          break;

        case "theme-votes-update":
          setState((s) => ({
            ...s,
            roomState: s.roomState
              ? { ...s.roomState, themes: data.themes }
              : null,
          }));
          break;

        case "pair-assigned" as any: {
          const pairData = data as unknown as PairAssignment & { type: string };
          setState((s) => ({
            ...s,
            pairAssignment: {
              pairId: pairData.pairId,
              partnerId: pairData.partnerId,
              side: pairData.side,
              theme: pairData.theme,
            },
          }));
          break;
        }

        case "drawings-ready":
          setState((s) => ({ ...s, drawings: data.drawings }));
          break;

        case "reveal-data":
          setState((s) => ({
            ...s,
            drawings: data.drawings,
            roomState: s.roomState
              ? {
                  ...s.roomState,
                  players: data.players,
                }
              : null,
          }));
          break;

        case "final-results":
          setState((s) => ({
            ...s,
            drawings: data.drawings,
            roomState: s.roomState
              ? {
                  ...s.roomState,
                  players: data.players,
                  phase: "final-results" as Phase,
                }
              : null,
          }));
          break;

        case "error":
          setState((s) => ({ ...s, error: data.message }));
          break;
      }
    });

    return () => {
      unsubscribe();
      disconnect();
    };
  }, []);

  const createRoom = useCallback((nickname: string) => {
    send({ type: "create-room", nickname });
  }, []);

  const joinRoom = useCallback((roomCode: string, nickname: string) => {
    send({ type: "join-room", roomCode, nickname });
  }, []);

  const startGame = useCallback(() => {
    send({ type: "start-game" });
  }, []);

  const submitTheme = useCallback((text: string) => {
    send({ type: "submit-theme", text });
  }, []);

  const voteTheme = useCallback((themeId: string) => {
    send({ type: "vote-theme", themeId });
  }, []);

  const submitDrawing = useCallback((imageDataUrl: string) => {
    send({ type: "submit-drawing", imageDataUrl });
  }, []);

  const voteDrawing = useCallback((pairId: string, rank: 1 | 2 | 3) => {
    send({ type: "vote-drawing", pairId, rank });
  }, []);

  return {
    ...state,
    createRoom,
    joinRoom,
    startGame,
    submitTheme,
    voteTheme,
    submitDrawing,
    voteDrawing,
  };
}
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add game state hook, timer hook, and room utilities"
```

---

## Task 9: Landing Page (Create/Join Room)

**Files:**
- Create: `apps/web/src/components/landing/hero.tsx`
- Modify: `apps/web/src/app/page.tsx`

- [ ] **Step 1: Build hero component**

Create `apps/web/src/components/landing/hero.tsx`:
```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { validateNickname } from "@/lib/room-utils";

export function Hero() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState<"initial" | "create" | "join">("initial");
  const [error, setError] = useState<string | null>(null);

  function handleCreate() {
    const err = validateNickname(nickname);
    if (err) { setError(err); return; }
    // Store nickname in sessionStorage, navigate to a new room
    sessionStorage.setItem("scrawl-nickname", nickname.trim());
    sessionStorage.setItem("scrawl-action", "create");
    router.push("/room/new");
  }

  function handleJoin() {
    const err = validateNickname(nickname);
    if (err) { setError(err); return; }
    const code = roomCode.trim().toUpperCase();
    if (code.length < 5) { setError("Enter a valid room code"); return; }
    sessionStorage.setItem("scrawl-nickname", nickname.trim());
    sessionStorage.setItem("scrawl-action", "join");
    router.push(`/room/${code}`);
  }

  return (
    <div className="flex flex-col items-center gap-8 px-4">
      <h1 className="text-6xl font-black tracking-tight bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
        Scrawl
      </h1>
      <p className="text-xl text-gray-400 text-center max-w-md">
        Draw, laugh, compete. The party game where your terrible art becomes legendary.
      </p>

      <div className="w-full max-w-sm flex flex-col gap-4">
        <input
          type="text"
          placeholder="Your nickname"
          value={nickname}
          onChange={(e) => { setNickname(e.target.value); setError(null); }}
          maxLength={16}
          className="w-full px-4 py-3 bg-gray-800 rounded-xl border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-center text-lg"
        />

        {mode === "initial" && (
          <div className="flex gap-3">
            <button
              onClick={() => setMode("create")}
              className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold text-lg transition-colors"
            >
              Create Room
            </button>
            <button
              onClick={() => setMode("join")}
              className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold text-lg transition-colors"
            >
              Join Room
            </button>
          </div>
        )}

        {mode === "create" && (
          <button
            onClick={handleCreate}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold text-lg transition-colors"
          >
            Create Party
          </button>
        )}

        {mode === "join" && (
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Room code (e.g. ABC12)"
              value={roomCode}
              onChange={(e) => { setRoomCode(e.target.value.toUpperCase()); setError(null); }}
              maxLength={5}
              className="w-full px-4 py-3 bg-gray-800 rounded-xl border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-center text-lg tracking-widest uppercase"
            />
            <button
              onClick={handleJoin}
              className="w-full py-3 bg-pink-600 hover:bg-pink-500 rounded-xl font-bold text-lg transition-colors"
            >
              Join Party
            </button>
          </div>
        )}

        {mode !== "initial" && (
          <button
            onClick={() => { setMode("initial"); setError(null); }}
            className="text-gray-500 hover:text-gray-400 text-sm"
          >
            Back
          </button>
        )}

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update landing page**

Replace `apps/web/src/app/page.tsx`:
```tsx
import { Hero } from "@/components/landing/hero";

export default function Home() {
  return (
    <main className="flex items-center justify-center min-h-screen">
      <Hero />
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add landing page with create/join room flow"
```

---

## Task 10: Room Page + Lobby

**Files:**
- Create: `apps/web/src/app/room/[code]/page.tsx`
- Create: `apps/web/src/components/lobby/lobby.tsx`
- Create: `apps/web/src/components/game/game-controller.tsx`

- [ ] **Step 1: Create lobby component**

Create `apps/web/src/components/lobby/lobby.tsx`:
```tsx
"use client";
import type { Player } from "@/types/game";

interface LobbyProps {
  roomCode: string;
  players: Player[];
  playerId: string;
  isHost: boolean;
  onStart: () => void;
  error: string | null;
}

export function Lobby({ roomCode, players, playerId, isHost, onStart, error }: LobbyProps) {
  const canStart = isHost && players.length >= 4;

  return (
    <div className="flex flex-col items-center gap-6 px-4 py-8">
      <div className="text-center">
        <p className="text-gray-400 text-sm">Room Code</p>
        <p className="text-4xl font-black tracking-widest text-purple-400">{roomCode}</p>
        <button
          onClick={() => navigator.clipboard.writeText(window.location.href)}
          className="text-sm text-gray-500 hover:text-gray-400 mt-1"
        >
          Copy invite link
        </button>
      </div>

      <div className="w-full max-w-sm">
        <p className="text-gray-400 text-sm mb-2">
          Players ({players.length}/10) {players.length < 4 && "— need at least 4"}
        </p>
        <div className="flex flex-col gap-2">
          {players.map((p) => (
            <div
              key={p.id}
              className={`flex items-center justify-between px-4 py-2 rounded-lg ${
                p.id === playerId ? "bg-purple-900/40 border border-purple-700" : "bg-gray-800"
              }`}
            >
              <span className="font-medium">
                {p.nickname} {p.id === playerId && "(you)"}
              </span>
              {p.isHost && (
                <span className="text-xs bg-yellow-600/30 text-yellow-400 px-2 py-0.5 rounded-full">
                  Host
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {isHost ? (
        <button
          onClick={onStart}
          disabled={!canStart}
          className={`w-full max-w-sm py-3 rounded-xl font-bold text-lg transition-colors ${
            canStart
              ? "bg-green-600 hover:bg-green-500"
              : "bg-gray-700 text-gray-500 cursor-not-allowed"
          }`}
        >
          {players.length < 4 ? `Waiting for players (${players.length}/4)...` : "Start Game"}
        </button>
      ) : (
        <p className="text-gray-500">Waiting for the host to start...</p>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Create game controller (phase router)**

Create `apps/web/src/components/game/game-controller.tsx`:
```tsx
"use client";
import type { GameState } from "@/hooks/use-game-state";
import { Lobby } from "@/components/lobby/lobby";
import { ThemeCreation } from "@/components/phases/theme-creation";
import { ThemeVoting } from "@/components/phases/theme-voting";
import { DrawingPhase } from "@/components/phases/drawing-phase";
import { DrawingVoting } from "@/components/phases/drawing-voting";
import { Reveal } from "@/components/phases/reveal";
import { Scoreboard } from "@/components/game/scoreboard";
import { TimerBar } from "@/components/game/timer-bar";

type GameControllerProps = ReturnType<typeof import("@/hooks/use-game-state").useGameState>;

export function GameController(props: GameControllerProps) {
  const { roomState, playerId, pairAssignment, drawings, error } = props;

  if (!roomState || !playerId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Connecting...</p>
      </div>
    );
  }

  const currentPlayer = roomState.players.find((p) => p.id === playerId);
  const isHost = currentPlayer?.isHost ?? false;
  const phase = roomState.phase;

  return (
    <div className="min-h-screen flex flex-col">
      {phase !== "lobby" && phase !== "final-results" && (
        <div className="px-4 pt-4 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Round {roomState.round}/{roomState.totalRounds}
          </span>
          <TimerBar endsAt={roomState.phaseEndsAt} />
        </div>
      )}

      <div className="flex-1 flex items-center justify-center">
        {phase === "lobby" && (
          <Lobby
            roomCode={roomState.code}
            players={roomState.players}
            playerId={playerId}
            isHost={isHost}
            onStart={props.startGame}
            error={error}
          />
        )}

        {phase === "theme-creation" && (
          <ThemeCreation
            themes={roomState.themes}
            playerId={playerId}
            playerCount={roomState.players.length}
            onSubmit={props.submitTheme}
          />
        )}

        {phase === "theme-voting" && (
          <ThemeVoting
            themes={roomState.themes}
            playerId={playerId}
            onVote={props.voteTheme}
          />
        )}

        {phase === "drawing" && pairAssignment && (
          <DrawingPhase
            theme={pairAssignment.theme}
            side={pairAssignment.side}
            onSubmit={props.submitDrawing}
            endsAt={roomState.phaseEndsAt}
          />
        )}

        {phase === "drawing-voting" && (
          <DrawingVoting
            drawings={drawings}
            playerId={playerId}
            pairs={roomState.pairs}
            onVote={props.voteDrawing}
          />
        )}

        {phase === "reveal" && (
          <Reveal drawings={drawings} players={roomState.players} />
        )}

        {(phase === "scoreboard" || phase === "final-results") && (
          <Scoreboard
            players={roomState.players}
            isFinal={phase === "final-results"}
            drawings={drawings}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create room page**

Create `apps/web/src/app/room/[code]/page.tsx`:
```tsx
"use client";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useGameState } from "@/hooks/use-game-state";
import { GameController } from "@/components/game/game-controller";

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const gameState = useGameState();

  useEffect(() => {
    if (!gameState.connected || gameState.roomState) return;

    const nickname = sessionStorage.getItem("scrawl-nickname") || "Player";
    const action = sessionStorage.getItem("scrawl-action") || "join";

    if (params.code === "new" || action === "create") {
      gameState.createRoom(nickname);
    } else {
      gameState.joinRoom(params.code, nickname);
    }
  }, [gameState.connected, gameState.roomState, params.code]);

  return <GameController {...gameState} />;
}
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add room page, lobby, and game controller"
```

---

## Task 11: Timer Bar Component

**Files:**
- Create: `apps/web/src/components/game/timer-bar.tsx`

- [ ] **Step 1: Build timer bar**

Create `apps/web/src/components/game/timer-bar.tsx`:
```tsx
"use client";
import { useTimer } from "@/hooks/use-timer";

interface TimerBarProps {
  endsAt: number;
}

export function TimerBar({ endsAt }: TimerBarProps) {
  const { secondsLeft } = useTimer(endsAt);
  const isUrgent = secondsLeft <= 5;

  return (
    <div className="flex items-center gap-2">
      <span className={`text-lg font-bold tabular-nums ${isUrgent ? "text-red-400" : "text-white"}`}>
        {secondsLeft}s
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add .
git commit -m "feat: add timer bar component"
```

---

## Task 12: Phase 1 — Theme Creation

**Files:**
- Create: `apps/web/src/components/phases/theme-creation.tsx`

- [ ] **Step 1: Build theme creation**

Create `apps/web/src/components/phases/theme-creation.tsx`:
```tsx
"use client";
import { useState } from "react";
import type { Theme } from "@/types/game";

interface ThemeCreationProps {
  themes: Theme[];
  playerId: string;
  playerCount: number;
  onSubmit: (text: string) => void;
}

export function ThemeCreation({ themes, playerId, playerCount, onSubmit }: ThemeCreationProps) {
  const [text, setText] = useState("");
  const maxThemes = playerCount < 6 ? 2 : 1;
  const myThemes = themes.filter((t) => t.authorId === playerId);
  const canSubmit = myThemes.length < maxThemes && text.trim().length > 0;

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit(text.trim());
    setText("");
  }

  return (
    <div className="flex flex-col items-center gap-6 px-4 w-full max-w-md">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Create a Theme</h2>
        <p className="text-gray-400 mt-1">
          The more absurd, the better. ({myThemes.length}/{maxThemes} submitted)
        </p>
      </div>

      {myThemes.length < maxThemes && (
        <div className="w-full flex gap-2">
          <input
            type="text"
            placeholder='e.g. "Shrek playing chess with Gandalf"'
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            maxLength={100}
            className="flex-1 px-4 py-3 bg-gray-800 rounded-xl border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl font-bold transition-colors"
          >
            Send
          </button>
        </div>
      )}

      <div className="w-full flex flex-col gap-2">
        {themes.map((t) => (
          <div key={t.id} className="px-4 py-2 bg-gray-800/50 rounded-lg text-gray-300">
            {t.authorId === playerId ? t.text : "Theme submitted..."}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add .
git commit -m "feat: add theme creation phase component"
```

---

## Task 13: Phase 2 — Theme Voting

**Files:**
- Create: `apps/web/src/components/phases/theme-voting.tsx`

- [ ] **Step 1: Build theme voting**

Create `apps/web/src/components/phases/theme-voting.tsx`:
```tsx
"use client";
import { useState } from "react";
import type { Theme } from "@/types/game";

interface ThemeVotingProps {
  themes: Theme[];
  playerId: string;
  onVote: (themeId: string) => void;
}

export function ThemeVoting({ themes, playerId, onVote }: ThemeVotingProps) {
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const canVote = votedIds.size < 2;

  function handleVote(themeId: string) {
    if (!canVote || votedIds.has(themeId)) return;
    onVote(themeId);
    setVotedIds((prev) => new Set(prev).add(themeId));
  }

  return (
    <div className="flex flex-col items-center gap-6 px-4 w-full max-w-md">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Vote for Themes</h2>
        <p className="text-gray-400 mt-1">
          Pick your 2 favorites ({votedIds.size}/2 votes used)
        </p>
      </div>

      <div className="w-full flex flex-col gap-3">
        {themes
          .filter((t) => t.authorId !== playerId)
          .map((t) => {
            const voted = votedIds.has(t.id);
            return (
              <button
                key={t.id}
                onClick={() => handleVote(t.id)}
                disabled={!canVote && !voted}
                className={`w-full px-4 py-3 rounded-xl text-left transition-all ${
                  voted
                    ? "bg-purple-600/30 border-2 border-purple-500"
                    : canVote
                    ? "bg-gray-800 border-2 border-transparent hover:border-gray-600"
                    : "bg-gray-800/50 border-2 border-transparent text-gray-600"
                }`}
              >
                <span className="font-medium">{t.text}</span>
                <span className="ml-2 text-sm text-gray-500">{t.votes} votes</span>
              </button>
            );
          })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add .
git commit -m "feat: add theme voting phase component"
```

---

## Task 14: Canvas Engine + Drawing Phase

**Files:**
- Create: `apps/web/src/hooks/use-canvas.ts`
- Create: `apps/web/src/lib/canvas-utils.ts`
- Create: `apps/web/src/components/canvas/toolbar.tsx`
- Create: `apps/web/src/components/canvas/drawing-canvas.tsx`
- Create: `apps/web/src/components/phases/drawing-phase.tsx`

- [ ] **Step 1: Create canvas utilities**

Create `apps/web/src/lib/canvas-utils.ts`:
```typescript
export function exportCanvasToDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png");
}

export function clearCanvas(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
}
```

- [ ] **Step 2: Create canvas hook**

Create `apps/web/src/hooks/use-canvas.ts`:
```typescript
"use client";
import { useRef, useState, useCallback, useEffect } from "react";
import { clearCanvas } from "@/lib/canvas-utils";

export interface CanvasTool {
  type: "brush" | "eraser";
  color: string;
  size: number;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

export function useCanvas(side: "left" | "right" | "full") {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [tool, setTool] = useState<CanvasTool>({ type: "brush", color: "#000000", size: 4 });

  const halfWidth = CANVAS_WIDTH / 2;
  const drawableArea = side === "full"
    ? { x: 0, width: CANVAS_WIDTH }
    : side === "left"
    ? { x: 0, width: halfWidth }
    : { x: halfWidth, width: halfWidth };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (ctx) clearCanvas(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
  }, []);

  const getPoint = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;

      let clientX: number, clientY: number;
      if ("touches" in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;

      // Clamp to drawable area
      if (x < drawableArea.x || x > drawableArea.x + drawableArea.width) return null;

      return { x, y };
    },
    [drawableArea]
  );

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const point = getPoint(e);
      if (!point) return;
      isDrawing.current = true;
      lastPoint.current = point;
    },
    [getPoint]
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing.current || !lastPoint.current) return;
      const point = getPoint(e);
      if (!point) return;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx) return;

      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(point.x, point.y);
      ctx.strokeStyle = tool.type === "eraser" ? "#ffffff" : tool.color;
      ctx.lineWidth = tool.type === "eraser" ? tool.size * 3 : tool.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      lastPoint.current = point;
    },
    [getPoint, tool]
  );

  const stopDrawing = useCallback(() => {
    isDrawing.current = false;
    lastPoint.current = null;
  }, []);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    // Only clear the drawable area
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(drawableArea.x, 0, drawableArea.width, CANVAS_HEIGHT);
  }, [drawableArea]);

  return {
    canvasRef,
    tool,
    setTool,
    startDrawing,
    draw,
    stopDrawing,
    clear,
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: CANVAS_HEIGHT,
    drawableArea,
  };
}
```

- [ ] **Step 3: Create toolbar**

Create `apps/web/src/components/canvas/toolbar.tsx`:
```tsx
"use client";
import type { CanvasTool } from "@/hooks/use-canvas";

const COLORS = [
  "#000000", "#ffffff", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280",
  "#92400e", "#0891b2",
];

const SIZES = [2, 4, 8, 16];

interface ToolbarProps {
  tool: CanvasTool;
  onToolChange: (tool: CanvasTool) => void;
  onClear: () => void;
}

export function Toolbar({ tool, onToolChange, onClear }: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-800 rounded-xl">
      {/* Colors */}
      <div className="flex gap-1 flex-wrap">
        {COLORS.map((color) => (
          <button
            key={color}
            onClick={() => onToolChange({ ...tool, type: "brush", color })}
            className={`w-7 h-7 rounded-full border-2 transition-transform ${
              tool.type === "brush" && tool.color === color
                ? "border-white scale-110"
                : "border-gray-600"
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      {/* Separator */}
      <div className="w-px h-8 bg-gray-600" />

      {/* Brush sizes */}
      <div className="flex gap-1 items-center">
        {SIZES.map((size) => (
          <button
            key={size}
            onClick={() => onToolChange({ ...tool, size })}
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
              tool.size === size && tool.type === "brush" ? "bg-gray-600" : "hover:bg-gray-700"
            }`}
          >
            <div
              className="rounded-full bg-white"
              style={{ width: size + 2, height: size + 2 }}
            />
          </button>
        ))}
      </div>

      {/* Separator */}
      <div className="w-px h-8 bg-gray-600" />

      {/* Eraser */}
      <button
        onClick={() => onToolChange({ ...tool, type: tool.type === "eraser" ? "brush" : "eraser" })}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          tool.type === "eraser" ? "bg-purple-600" : "bg-gray-700 hover:bg-gray-600"
        }`}
      >
        Eraser
      </button>

      {/* Clear */}
      <button
        onClick={onClear}
        className="px-3 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg text-sm font-medium transition-colors"
      >
        Clear
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Create drawing canvas component**

Create `apps/web/src/components/canvas/drawing-canvas.tsx`:
```tsx
"use client";
import { useCanvas } from "@/hooks/use-canvas";
import { Toolbar } from "./toolbar";
import { exportCanvasToDataUrl } from "@/lib/canvas-utils";
import { forwardRef, useImperativeHandle } from "react";

interface DrawingCanvasProps {
  side: "left" | "right" | "full";
}

export interface DrawingCanvasHandle {
  exportImage: () => string;
}

export const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(
  function DrawingCanvas({ side }, ref) {
    const {
      canvasRef, tool, setTool, startDrawing, draw, stopDrawing, clear,
      canvasWidth, canvasHeight, drawableArea,
    } = useCanvas(side);

    useImperativeHandle(ref, () => ({
      exportImage: () => {
        const canvas = canvasRef.current;
        if (!canvas) return "";
        // Export only the player's half
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = drawableArea.width;
        tempCanvas.height = canvasHeight;
        const tempCtx = tempCanvas.getContext("2d");
        if (!tempCtx) return "";
        tempCtx.drawImage(
          canvas,
          drawableArea.x, 0, drawableArea.width, canvasHeight,
          0, 0, drawableArea.width, canvasHeight
        );
        return tempCanvas.toDataURL("image/png");
      },
    }));

    return (
      <div className="flex flex-col gap-3 items-center w-full">
        <div className="relative w-full" style={{ maxWidth: canvasWidth }}>
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full rounded-xl border-2 border-gray-700 cursor-crosshair touch-none"
            style={{ aspectRatio: `${canvasWidth} / ${canvasHeight}` }}
          />
          {/* Divider line */}
          {side !== "full" && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-gray-600 opacity-50 pointer-events-none"
              style={{ left: "50%" }}
            />
          )}
          {/* Overlay on non-drawable side */}
          {side !== "full" && (
            <div
              className="absolute top-0 bottom-0 bg-gray-900/30 pointer-events-none rounded-xl"
              style={
                side === "left"
                  ? { left: "50%", right: 0 }
                  : { left: 0, right: "50%" }
              }
            />
          )}
        </div>
        <Toolbar tool={tool} onToolChange={setTool} onClear={clear} />
      </div>
    );
  }
);
```

- [ ] **Step 5: Create drawing phase**

Create `apps/web/src/components/phases/drawing-phase.tsx`:
```tsx
"use client";
import { useRef, useState } from "react";
import { DrawingCanvas, type DrawingCanvasHandle } from "@/components/canvas/drawing-canvas";

interface DrawingPhaseProps {
  theme: string;
  side: "left" | "right";
  onSubmit: (imageDataUrl: string) => void;
  endsAt: number;
}

export function DrawingPhase({ theme, side, onSubmit, endsAt }: DrawingPhaseProps) {
  const canvasRef = useRef<DrawingCanvasHandle>(null);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    if (submitted) return;
    const image = canvasRef.current?.exportImage();
    if (image) {
      onSubmit(image);
      setSubmitted(true);
    }
  }

  // Auto-submit when timer ends
  if (!submitted && endsAt > 0 && Date.now() >= endsAt) {
    handleSubmit();
  }

  return (
    <div className="flex flex-col items-center gap-4 px-4 w-full">
      <div className="text-center">
        <h2 className="text-xl font-bold">Draw: {theme}</h2>
        <p className="text-gray-400 text-sm">
          You draw the {side} half. Your partner draws the other side!
        </p>
      </div>

      <DrawingCanvas ref={canvasRef} side={side} />

      {!submitted ? (
        <button
          onClick={handleSubmit}
          className="px-8 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-bold text-lg transition-colors"
        >
          Submit Drawing
        </button>
      ) : (
        <p className="text-green-400 font-medium">Drawing submitted! Waiting for others...</p>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: add canvas engine, toolbar, and drawing phase"
```

---

## Task 15: Phase 4 — Drawing Voting

**Files:**
- Create: `apps/web/src/components/phases/drawing-voting.tsx`

- [ ] **Step 1: Build drawing voting**

Create `apps/web/src/components/phases/drawing-voting.tsx`:
```tsx
"use client";
import { useState } from "react";
import type { DrawingResult, Pair } from "@/types/game";

interface DrawingVotingProps {
  drawings: DrawingResult[];
  playerId: string;
  pairs: Pair[];
  onVote: (pairId: string, rank: 1 | 2 | 3) => void;
}

export function DrawingVoting({ drawings, playerId, pairs, onVote }: DrawingVotingProps) {
  const [votes, setVotes] = useState<Record<number, string>>({}); // rank -> pairId

  // Filter out the player's own pair
  const ownPair = pairs.find((p) => p.playerA === playerId || p.playerB === playerId);
  const voteable = drawings.filter((d) => d.pairId !== ownPair?.id);

  function handleVote(pairId: string, rank: 1 | 2 | 3) {
    // Remove previous vote for this rank
    const newVotes = { ...votes };
    // Remove this pairId from any existing rank
    for (const [r, id] of Object.entries(newVotes)) {
      if (id === pairId) delete newVotes[Number(r)];
    }
    newVotes[rank] = pairId;
    setVotes(newVotes);
    onVote(pairId, rank);
  }

  const rankLabels = { 1: "1st", 2: "2nd", 3: "3rd" };

  return (
    <div className="flex flex-col items-center gap-6 px-4 w-full max-w-2xl">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Vote for the Best</h2>
        <p className="text-gray-400 mt-1">Assign 1st, 2nd, and 3rd place</p>
      </div>

      <div className="w-full flex flex-col gap-6">
        {voteable.map((drawing) => {
          const currentRank = Object.entries(votes).find(([, id]) => id === drawing.pairId)?.[0];

          return (
            <div key={drawing.pairId} className="bg-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-400 mb-2">Theme: {drawing.themeText}</p>
              <div className="flex gap-0.5 rounded-lg overflow-hidden">
                {drawing.imageLeftDataUrl && (
                  <img src={drawing.imageLeftDataUrl} alt="Left half" className="w-1/2" />
                )}
                {drawing.imageRightDataUrl && (
                  <img src={drawing.imageRightDataUrl} alt="Right half" className="w-1/2" />
                )}
              </div>
              <div className="flex gap-2 mt-3">
                {([1, 2, 3] as const).map((rank) => (
                  <button
                    key={rank}
                    onClick={() => handleVote(drawing.pairId, rank)}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${
                      Number(currentRank) === rank
                        ? rank === 1 ? "bg-yellow-600" : rank === 2 ? "bg-gray-400 text-black" : "bg-orange-700"
                        : "bg-gray-700 hover:bg-gray-600"
                    }`}
                  >
                    {rankLabels[rank]}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add .
git commit -m "feat: add drawing voting phase component"
```

---

## Task 16: Reveal + Scoreboard

**Files:**
- Create: `apps/web/src/components/phases/reveal.tsx`
- Create: `apps/web/src/components/game/scoreboard.tsx`

- [ ] **Step 1: Build reveal component**

Create `apps/web/src/components/phases/reveal.tsx`:
```tsx
"use client";
import type { DrawingResult, Player } from "@/types/game";

interface RevealProps {
  drawings: DrawingResult[];
  players: Player[];
}

export function Reveal({ drawings, players }: RevealProps) {
  return (
    <div className="flex flex-col items-center gap-6 px-4 w-full max-w-2xl">
      <h2 className="text-2xl font-bold">Reveal!</h2>

      <div className="w-full flex flex-col gap-6">
        {drawings.map((drawing) => {
          const totalScore = drawing.votes.first * 3 + drawing.votes.second * 2 + drawing.votes.third;
          return (
            <div key={drawing.pairId} className="bg-gray-800 rounded-xl p-4 animate-fade-in">
              <p className="text-sm text-gray-400 mb-2">"{drawing.themeText}"</p>
              <div className="flex gap-0.5 rounded-lg overflow-hidden">
                {drawing.imageLeftDataUrl && (
                  <img src={drawing.imageLeftDataUrl} alt="Left half" className="w-1/2" />
                )}
                {drawing.imageRightDataUrl && (
                  <img src={drawing.imageRightDataUrl} alt="Right half" className="w-1/2" />
                )}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-lg font-bold text-purple-400">{totalScore} pts</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build scoreboard**

Create `apps/web/src/components/game/scoreboard.tsx`:
```tsx
"use client";
import type { Player, DrawingResult } from "@/types/game";

interface ScoreboardProps {
  players: Player[];
  isFinal: boolean;
  drawings: DrawingResult[];
}

export function Scoreboard({ players, isFinal, drawings }: ScoreboardProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col items-center gap-6 px-4 w-full max-w-md">
      <h2 className="text-2xl font-bold">
        {isFinal ? "Final Results!" : "Scoreboard"}
      </h2>

      <div className="w-full flex flex-col gap-2">
        {sorted.map((player, index) => (
          <div
            key={player.id}
            className={`flex items-center justify-between px-4 py-3 rounded-xl ${
              index === 0 && isFinal
                ? "bg-yellow-600/20 border-2 border-yellow-500"
                : "bg-gray-800"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-gray-500 w-6">
                {index + 1}.
              </span>
              <span className="font-medium">{player.nickname}</span>
            </div>
            <span className="text-lg font-bold text-purple-400">{player.score} pts</span>
          </div>
        ))}
      </div>

      {isFinal && (
        <p className="text-gray-400 text-center">
          {sorted[0]?.nickname} wins! Share your masterpieces below.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add reveal animation and scoreboard components"
```

---

## Task 17: Share Card Generator

**Files:**
- Create: `apps/web/src/components/share/share-card.tsx`

- [ ] **Step 1: Build share card**

Create `apps/web/src/components/share/share-card.tsx`:
```tsx
"use client";
import { useRef, useCallback } from "react";
import type { DrawingResult } from "@/types/game";

interface ShareCardProps {
  drawing: DrawingResult;
  playerNames: [string, string];
}

export function ShareCard({ drawing, playerNames }: ShareCardProps) {
  const cardRef = useRef<HTMLCanvasElement>(null);

  const generateCard = useCallback(() => {
    const canvas = cardRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Card dimensions (1:1 for feed)
    canvas.width = 1080;
    canvas.height = 1080;

    // Background
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, 1080, 1080);

    // Title
    ctx.fillStyle = "#a855f7";
    ctx.font = "bold 48px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SCRAWL", 540, 60);

    // Theme
    ctx.fillStyle = "#9ca3af";
    ctx.font = "24px sans-serif";
    ctx.fillText(`"${drawing.themeText}"`, 540, 110);

    // Load and draw images
    const leftImg = new Image();
    const rightImg = new Image();

    leftImg.onload = () => {
      ctx.drawImage(leftImg, 40, 140, 500, 375);
      rightImg.onload = () => {
        ctx.drawImage(rightImg, 540, 140, 500, 375);

        // Divider
        ctx.strokeStyle = "#374151";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(540, 140);
        ctx.lineTo(540, 515);
        ctx.stroke();

        // Player names
        ctx.fillStyle = "#e5e7eb";
        ctx.font = "28px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`${playerNames[0]} + ${playerNames[1]}`, 540, 570);

        // Score
        const score = drawing.votes.first * 3 + drawing.votes.second * 2 + drawing.votes.third;
        ctx.fillStyle = "#a855f7";
        ctx.font = "bold 36px sans-serif";
        ctx.fillText(`${score} pts`, 540, 620);

        // CTA
        ctx.fillStyle = "#6b7280";
        ctx.font = "20px sans-serif";
        ctx.fillText("Play at scrawl.gg", 540, 680);
      };
      rightImg.src = drawing.imageRightDataUrl;
    };
    leftImg.src = drawing.imageLeftDataUrl;
  }, [drawing, playerNames]);

  function download() {
    generateCard();
    // Small delay for images to load
    setTimeout(() => {
      const canvas = cardRef.current;
      if (!canvas) return;
      const link = document.createElement("a");
      link.download = `scrawl-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    }, 500);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas ref={cardRef} className="hidden" />
      <button
        onClick={download}
        className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold transition-colors"
      >
        Download Share Card
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add .
git commit -m "feat: add share card generator"
```

---

## Task 18: Integration + Polish

**Files:**
- Modify: `apps/web/src/components/game/game-controller.tsx` (add share card to final results)
- Modify: `apps/web/src/components/game/scoreboard.tsx` (integrate share card)

- [ ] **Step 1: Add share card to scoreboard**

Update `apps/web/src/components/game/scoreboard.tsx` — add import and render ShareCard when `isFinal`:

```tsx
"use client";
import type { Player, DrawingResult } from "@/types/game";
import { ShareCard } from "@/components/share/share-card";

interface ScoreboardProps {
  players: Player[];
  isFinal: boolean;
  drawings: DrawingResult[];
}

export function Scoreboard({ players, isFinal, drawings }: ScoreboardProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col items-center gap-6 px-4 w-full max-w-lg">
      <h2 className="text-2xl font-bold">
        {isFinal ? "Final Results!" : "Scoreboard"}
      </h2>

      <div className="w-full flex flex-col gap-2">
        {sorted.map((player, index) => (
          <div
            key={player.id}
            className={`flex items-center justify-between px-4 py-3 rounded-xl ${
              index === 0 && isFinal
                ? "bg-yellow-600/20 border-2 border-yellow-500"
                : "bg-gray-800"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-gray-500 w-6">
                {index + 1}.
              </span>
              <span className="font-medium">{player.nickname}</span>
            </div>
            <span className="text-lg font-bold text-purple-400">{player.score} pts</span>
          </div>
        ))}
      </div>

      {isFinal && drawings.length > 0 && (
        <div className="w-full flex flex-col gap-4 mt-4">
          <h3 className="text-lg font-bold text-center">Share your masterpieces</h3>
          {drawings.map((d) => (
            <div key={d.pairId} className="bg-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-400 mb-2">"{d.themeText}"</p>
              <div className="flex gap-0.5 rounded-lg overflow-hidden mb-3">
                {d.imageLeftDataUrl && <img src={d.imageLeftDataUrl} alt="" className="w-1/2" />}
                {d.imageRightDataUrl && <img src={d.imageRightDataUrl} alt="" className="w-1/2" />}
              </div>
              <ShareCard drawing={d} playerNames={["Player A", "Player B"]} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the full app builds**

```bash
cd /path/to/scrawl
npm run --workspace=@scrawl/web build
npx --workspace=@scrawl/ws-server tsc --noEmit
```

Expected: Both build without errors.

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: integrate share card into final results"
```

---

## Task 19: Dev Script + README

**Files:**
- Modify: `package.json` (add dev script)

- [ ] **Step 1: Add concurrent dev script**

Update root `package.json`:
```json
{
  "name": "scrawl",
  "private": true,
  "workspaces": ["apps/*"],
  "scripts": {
    "dev": "npm run dev --workspace=@scrawl/ws-server & npm run dev --workspace=@scrawl/web",
    "build": "npm run build --workspace=@scrawl/web"
  }
}
```

- [ ] **Step 2: Test full dev flow**

```bash
cd /path/to/scrawl
npm run dev
```

Expected: WebSocket server on port 8080, Next.js dev on port 3000.

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: add dev script for concurrent web + ws server"
```
