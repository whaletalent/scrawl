# Split Body Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 2-player "Split Body" game mode where each player draws half a character (top/bottom) without seeing the other's work, then all drawings are revealed at the end.

**Architecture:** Separate phase flow (`split-drawing` → `split-final`) that shares canvas/timer/lobby UI components but has its own game engine logic, server message types, and frontend phase components. A `gameMode` field on Room drives conditional behavior in lobby and game controller.

**Tech Stack:** TypeScript, WebSocket (ws), Next.js/React, HTML5 Canvas, Tailwind CSS

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `apps/web/src/components/silhouettes/man.tsx` | Man silhouette SVG component |
| `apps/web/src/components/silhouettes/woman.tsx` | Woman silhouette SVG component |
| `apps/web/src/components/silhouettes/child.tsx` | Child silhouette SVG component |
| `apps/web/src/components/silhouettes/robot.tsx` | Robot silhouette SVG component |
| `apps/web/src/components/silhouettes/alien.tsx` | Alien silhouette SVG component |
| `apps/web/src/components/silhouettes/superhero.tsx` | Superhero silhouette SVG component |
| `apps/web/src/components/silhouettes/index.ts` | Silhouette registry — maps IDs to components |
| `apps/web/src/components/lobby/mode-selector.tsx` | Game mode toggle + round count selector |
| `apps/web/src/components/phases/split-drawing-phase.tsx` | Drawing phase with top/bottom split and silhouette overlay |
| `apps/web/src/components/phases/split-reveal.tsx` | Final reveal — browse all combined drawings |

### Modified Files

| File | What Changes |
|------|-------------|
| `apps/ws-server/src/types.ts` | Add `GameMode`, `SplitDrawing`, new phases, new messages to `Phase` and `ClientMessage` |
| `apps/ws-server/src/room-manager.ts` | Accept `gameMode`/`totalRounds` in `createRoom()`, add `gameMode`/`splitDrawings` to Room |
| `apps/ws-server/src/game-engine.ts` | Add `startSplitGame()`, `handleSplitDrawingSubmit()`, `startSplitFinal()`, split-body phase durations |
| `apps/ws-server/src/handlers.ts` | Handle `create-room` with gameMode, `start-game` with 2-player check, `submit-split-drawing` |
| `apps/web/src/types/game.ts` | Add `GameMode`, `SplitDrawing`, new phases, new messages |
| `apps/web/src/hooks/use-canvas.ts` | Add `"top" \| "bottom"` to side type, clamp y-coordinates |
| `apps/web/src/hooks/use-game-state.ts` | Handle split-body messages, store split state (`splitRound`, `splitSide`, `silhouetteId`, `splitDrawings`) |
| `apps/web/src/components/canvas/drawing-canvas.tsx` | Support `"top" \| "bottom"` side with horizontal divider/overlay |
| `apps/web/src/components/landing/hero.tsx` | Pass `gameMode`/`totalRounds` via sessionStorage |
| `apps/web/src/components/lobby/lobby.tsx` | Accept and display mode selector, adjust min players |
| `apps/web/src/components/game/game-controller.tsx` | Route `split-drawing` and `split-final` phases |
| `apps/web/src/app/room/[code]/page.tsx` | Read `gameMode`/`totalRounds` from sessionStorage, pass to `createRoom` |

---

### Task 1: Server Types — Add Split Body types

**Files:**
- Modify: `apps/ws-server/src/types.ts`

- [ ] **Step 1: Add GameMode type and SplitDrawing interface**

In `apps/ws-server/src/types.ts`, add after the `Phase` type (line 11):

```typescript
export type GameMode = "party" | "split-body";

export const SILHOUETTE_IDS = ["man", "woman", "child", "robot", "alien", "superhero"] as const;
export type SilhouetteId = (typeof SILHOUETTE_IDS)[number];
```

Add after `DrawingResult` interface (line 49):

```typescript
export interface SplitDrawing {
  round: number;
  topPlayerId: string;
  bottomPlayerId: string;
  topImageDataUrl: string | null;
  bottomImageDataUrl: string | null;
  silhouetteId: SilhouetteId;
}
```

- [ ] **Step 2: Add split-body phases to Phase type**

Replace the `Phase` type (lines 3-11):

```typescript
export type Phase =
  | "lobby"
  | "theme-creation"
  | "theme-voting"
  | "drawing"
  | "drawing-voting"
  | "reveal"
  | "scoreboard"
  | "final-results"
  | "split-drawing"
  | "split-final";
```

- [ ] **Step 3: Add gameMode and splitDrawings to Room interface**

Add to Room interface (after line 55 `totalRounds`):

```typescript
  gameMode: GameMode;
  splitDrawings: SplitDrawing[];
```

- [ ] **Step 4: Add new client message types**

Add to `ClientMessage` union (after line 72):

```typescript
  | { type: "create-room"; nickname: string; gameMode?: GameMode; totalRounds?: number }
  | { type: "submit-split-drawing"; imageDataUrl: string };
```

Update the existing `create-room` line (line 67) — replace it with the version above that includes optional fields. Remove the duplicate old line.

- [ ] **Step 5: Commit**

```bash
git add apps/ws-server/src/types.ts
git commit -m "feat(server): add split-body types — GameMode, SplitDrawing, new phases"
```

---

### Task 2: Client Types — Mirror split-body types

**Files:**
- Modify: `apps/web/src/types/game.ts`

- [ ] **Step 1: Add split-body phases to Phase type**

Replace the `Phase` type (lines 1-9):

```typescript
export type Phase =
  | "lobby"
  | "theme-creation"
  | "theme-voting"
  | "drawing"
  | "drawing-voting"
  | "reveal"
  | "scoreboard"
  | "final-results"
  | "split-drawing"
  | "split-final";

export type GameMode = "party" | "split-body";

export type SilhouetteId = "man" | "woman" | "child" | "robot" | "alien" | "superhero";
```

- [ ] **Step 2: Add SplitDrawing interface**

Add after `DrawingResult` interface (line 39):

```typescript
export interface SplitDrawing {
  round: number;
  topPlayerId: string;
  bottomPlayerId: string;
  topImageDataUrl: string | null;
  bottomImageDataUrl: string | null;
  silhouetteId: SilhouetteId;
}
```

- [ ] **Step 3: Add gameMode to RoomState**

Add `gameMode: GameMode;` to `RoomState` interface after line 43 (`code`):

```typescript
export interface RoomState {
  code: string;
  gameMode: GameMode;
  phase: Phase;
  // ... rest stays the same
```

- [ ] **Step 4: Add new client and server message types**

Update `ClientMessage` (replace lines 53-60):

```typescript
export type ClientMessage =
  | { type: "join-room"; roomCode: string; nickname: string }
  | { type: "create-room"; nickname: string; gameMode?: GameMode; totalRounds?: number }
  | { type: "start-game" }
  | { type: "submit-theme"; text: string }
  | { type: "vote-theme"; themeId: string }
  | { type: "submit-drawing"; imageDataUrl: string }
  | { type: "vote-drawing"; pairId: string; rank: 1 | 2 | 3 }
  | { type: "submit-split-drawing"; imageDataUrl: string };
```

Add to `ServerMessage` union (after line 74):

```typescript
  | { type: "split-round-start"; round: number; side: "top" | "bottom"; silhouetteId: SilhouetteId; totalRounds: number }
  | { type: "split-round-end"; round: number }
  | { type: "split-final-results"; drawings: SplitDrawing[] };
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/types/game.ts
git commit -m "feat(web): add split-body client types"
```

---

### Task 3: Room Manager — Support gameMode in room creation

**Files:**
- Modify: `apps/ws-server/src/room-manager.ts`

- [ ] **Step 1: Update createRoom signature and Room initialization**

Import the new type:

```typescript
import type { Room, Player, GameMode } from "./types.js";
```

Update `createRoom` function (lines 15-36) to accept `gameMode` and `totalRounds`:

```typescript
export function createRoom(nickname: string, ws: WebSocket, gameMode: GameMode = "party", totalRounds?: number): Room {
  const code = generateCode();
  const playerId = crypto.randomUUID();
  const host: Player = { id: playerId, nickname, score: 0, isHost: true, ws };

  const defaultRounds = gameMode === "split-body" ? 3 : 3;
  const clampedRounds = gameMode === "split-body"
    ? Math.min(Math.max(totalRounds ?? defaultRounds, 1), 5)
    : totalRounds ?? defaultRounds;

  const room: Room = {
    code,
    phase: "lobby",
    round: 0,
    totalRounds: clampedRounds,
    gameMode,
    splitDrawings: [],
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/ws-server/src/room-manager.ts
git commit -m "feat(server): createRoom accepts gameMode and totalRounds"
```

---

### Task 4: Game Engine — Add split-body game logic

**Files:**
- Modify: `apps/ws-server/src/game-engine.ts`

- [ ] **Step 1: Add split-body phase durations**

Add to `PHASE_DURATIONS` (after line 10):

```typescript
  "split-drawing": 90_000,
```

- [ ] **Step 2: Import new types and sendTo**

Update imports (line 1-2):

```typescript
import type { Room, Phase, Pair, DrawingResult, SplitDrawing, SilhouetteId, GameMode } from "./types.js";
import { SILHOUETTE_IDS } from "./types.js";
import { broadcast, sendTo } from "./room-manager.js";
```

- [ ] **Step 3: Add startSplitGame function**

Add after the `startGame` function (after line 17):

```typescript
export function startSplitGame(room: Room) {
  if (room.players.size !== 2) return;
  room.round = 1;
  room.splitDrawings = [];
  startSplitRound(room);
}

function startSplitRound(room: Room) {
  const playerIds = Array.from(room.players.keys());
  const hostId = Array.from(room.players.values()).find((p) => p.isHost)?.id ?? playerIds[0];
  const guestId = playerIds.find((id) => id !== hostId)!;

  const isOddRound = room.round % 2 === 1;
  const topPlayerId = isOddRound ? hostId : guestId;
  const bottomPlayerId = isOddRound ? guestId : hostId;

  const silhouetteId = SILHOUETTE_IDS[Math.floor(Math.random() * SILHOUETTE_IDS.length)];

  const drawing: SplitDrawing = {
    round: room.round,
    topPlayerId,
    bottomPlayerId,
    topImageDataUrl: null,
    bottomImageDataUrl: null,
    silhouetteId,
  };
  room.splitDrawings.push(drawing);

  // Send each player their side assignment
  sendTo(room, topPlayerId, {
    type: "split-round-start",
    round: room.round,
    side: "top" as const,
    silhouetteId,
    totalRounds: room.totalRounds,
  });
  sendTo(room, bottomPlayerId, {
    type: "split-round-start",
    round: room.round,
    side: "bottom" as const,
    silhouetteId,
    totalRounds: room.totalRounds,
  });

  transitionTo(room, "split-drawing");
}
```

- [ ] **Step 4: Add handleSplitDrawingSubmit function**

Add after `startSplitRound`:

```typescript
export function handleSplitDrawingSubmit(room: Room, playerId: string, imageDataUrl: string) {
  if (room.phase !== "split-drawing") return;

  const currentDrawing = room.splitDrawings.find((d) => d.round === room.round);
  if (!currentDrawing) return;

  if (playerId === currentDrawing.topPlayerId) {
    if (currentDrawing.topImageDataUrl) return; // already submitted
    currentDrawing.topImageDataUrl = imageDataUrl;
  } else if (playerId === currentDrawing.bottomPlayerId) {
    if (currentDrawing.bottomImageDataUrl) return;
    currentDrawing.bottomImageDataUrl = imageDataUrl;
  } else {
    return; // not a participant
  }

  // Check if both submitted
  if (currentDrawing.topImageDataUrl && currentDrawing.bottomImageDataUrl) {
    advanceSplitRound(room);
  }
}

function advanceSplitRound(room: Room) {
  if (room.round >= room.totalRounds) {
    startSplitFinal(room);
  } else {
    broadcast(room, { type: "split-round-end", round: room.round });
    room.round++;
    startSplitRound(room);
  }
}
```

- [ ] **Step 5: Add startSplitFinal function**

Add after `advanceSplitRound`:

```typescript
function startSplitFinal(room: Room) {
  broadcast(room, {
    type: "split-final-results",
    drawings: room.splitDrawings,
  });
  transitionTo(room, "split-final");
}
```

- [ ] **Step 6: Handle split-drawing phase end in onPhaseEnd**

Add to the `switch` in `onPhaseEnd` (after the `scoreboard` case, before the closing `}`):

```typescript
    case "split-drawing": {
      // Timer expired — force-submit whatever we have
      const currentDrawing = room.splitDrawings.find((d) => d.round === room.round);
      if (currentDrawing) {
        advanceSplitRound(room);
      }
      break;
    }
```

- [ ] **Step 7: Commit**

```bash
git add apps/ws-server/src/game-engine.ts
git commit -m "feat(server): split-body game engine — round flow, side assignment, silhouette selection"
```

---

### Task 5: Handlers — Wire up split-body messages

**Files:**
- Modify: `apps/ws-server/src/handlers.ts`

- [ ] **Step 1: Import new functions**

Update imports (line 4):

```typescript
import { startGame, startSplitGame, handleSplitDrawingSubmit } from "./game-engine.js";
```

- [ ] **Step 2: Update handleCreateRoom to accept gameMode**

Replace `handleCreateRoom` function (lines 56-63):

```typescript
function handleCreateRoom(ws: WebSocket, msg: Extract<ClientMessage, { type: "create-room" }>) {
  const room = createRoom(msg.nickname, ws, msg.gameMode, msg.totalRounds);
  const hostId = Array.from(room.players.keys())[0];
  wsToPlayer.set(ws, { playerId: hostId, roomCode: room.code });

  const state = serializeRoomState(room);
  ws.send(JSON.stringify({ type: "room-state", state, playerId: hostId }));
}
```

Update the `handleMessage` switch case for `create-room` (line 33):

```typescript
    case "create-room":
      handleCreateRoom(ws, msg);
      break;
```

- [ ] **Step 3: Update handleStartGame for split-body mode**

Replace `handleStartGame` function (lines 85-104):

```typescript
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

  if (room.gameMode === "split-body") {
    if (room.players.size !== 2) {
      ws.send(JSON.stringify({ type: "error", message: "Split Body mode requires exactly 2 players" }));
      return;
    }
    startSplitGame(room);
  } else {
    if (room.players.size < 4) {
      ws.send(JSON.stringify({ type: "error", message: "Need at least 4 players to start" }));
      return;
    }
    startGame(room);
  }
}
```

- [ ] **Step 4: Add submit-split-drawing handler**

Add to `handleMessage` switch (after the `vote-drawing` case):

```typescript
    case "submit-split-drawing":
      handleSubmitSplitDrawing(ws, msg.imageDataUrl);
      break;
```

Add the handler function:

```typescript
function handleSubmitSplitDrawing(ws: WebSocket, imageDataUrl: string) {
  const info = wsToPlayer.get(ws);
  if (!info) return;

  const room = getRoom(info.roomCode);
  if (!room || room.phase !== "split-drawing") return;

  handleSplitDrawingSubmit(room, info.playerId, imageDataUrl);
}
```

- [ ] **Step 5: Add gameMode to serializeRoomState**

In `serializeRoomState` (line 216), add `gameMode` to the returned object:

```typescript
  return {
    code: room.code,
    gameMode: room.gameMode,
    phase: room.phase,
    // ... rest stays the same
```

- [ ] **Step 6: Commit**

```bash
git add apps/ws-server/src/handlers.ts
git commit -m "feat(server): wire split-body message handlers"
```

---

### Task 6: Silhouette SVG Components

**Files:**
- Create: `apps/web/src/components/silhouettes/man.tsx`
- Create: `apps/web/src/components/silhouettes/woman.tsx`
- Create: `apps/web/src/components/silhouettes/child.tsx`
- Create: `apps/web/src/components/silhouettes/robot.tsx`
- Create: `apps/web/src/components/silhouettes/alien.tsx`
- Create: `apps/web/src/components/silhouettes/superhero.tsx`
- Create: `apps/web/src/components/silhouettes/index.ts`

- [ ] **Step 1: Create man silhouette**

`apps/web/src/components/silhouettes/man.tsx`:

```tsx
export function ManSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 400" className={className} fill="#000">
      <ellipse cx="100" cy="45" rx="28" ry="32" />
      <rect x="90" y="75" width="20" height="18" />
      <path d="M70,93 L130,93 L125,200 L75,200 Z" />
      <path d="M70,96 L45,155 L55,158 L78,105 Z" />
      <path d="M130,96 L155,155 L145,158 L122,105 Z" />
      <path d="M78,200 L85,310 L100,310 L100,200 Z" />
      <path d="M100,200 L100,310 L115,310 L122,200 Z" />
      <path d="M82,310 L78,330 L103,330 L100,310 Z" />
      <path d="M100,310 L100,330 L125,330 L118,310 Z" />
    </svg>
  );
}
```

- [ ] **Step 2: Create woman silhouette**

`apps/web/src/components/silhouettes/woman.tsx`:

```tsx
export function WomanSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 400" className={className} fill="#000">
      <ellipse cx="100" cy="42" rx="25" ry="30" />
      <rect x="92" y="70" width="16" height="16" />
      <path d="M75,86 L125,86 L120,150 L80,150 Z" />
      <path d="M80,150 L60,220 L140,220 L120,150 Z" />
      <path d="M75,89 L50,145 L60,148 L80,98 Z" />
      <path d="M125,89 L150,145 L140,148 L120,98 Z" />
      <path d="M80,220 L85,315 L100,315 L98,220 Z" />
      <path d="M102,220 L100,315 L115,315 L120,220 Z" />
      <path d="M82,315 L78,335 L103,335 L100,315 Z" />
      <path d="M100,315 L100,335 L125,335 L118,315 Z" />
    </svg>
  );
}
```

- [ ] **Step 3: Create child silhouette**

`apps/web/src/components/silhouettes/child.tsx`:

```tsx
export function ChildSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 400" className={className} fill="#000">
      <ellipse cx="100" cy="55" rx="32" ry="38" />
      <rect x="92" y="90" width="16" height="12" />
      <path d="M78,102 L122,102 L118,180 L82,180 Z" />
      <path d="M78,105 L58,150 L66,153 L82,112 Z" />
      <path d="M122,105 L142,150 L134,153 L118,112 Z" />
      <path d="M85,180 L88,270 L100,270 L100,180 Z" />
      <path d="M100,180 L100,270 L112,270 L115,180 Z" />
      <path d="M85,270 L82,288 L103,288 L100,270 Z" />
      <path d="M100,270 L100,288 L120,288 L115,270 Z" />
    </svg>
  );
}
```

- [ ] **Step 4: Create robot silhouette**

`apps/web/src/components/silhouettes/robot.tsx`:

```tsx
export function RobotSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 400" className={className} fill="#000">
      <rect x="72" y="20" rx="8" ry="8" width="56" height="56" />
      <rect x="88" y="76" width="24" height="14" />
      <rect x="65" y="90" width="70" height="100" rx="5" />
      <rect x="45" y="95" width="18" height="70" rx="4" />
      <rect x="137" y="95" width="18" height="70" rx="4" />
      <rect x="72" y="192" width="24" height="110" rx="3" />
      <rect x="104" y="192" width="24" height="110" rx="3" />
      <rect x="68" y="300" width="32" height="18" rx="4" />
      <rect x="100" y="300" width="32" height="18" rx="4" />
    </svg>
  );
}
```

- [ ] **Step 5: Create alien silhouette**

`apps/web/src/components/silhouettes/alien.tsx`:

```tsx
export function AlienSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 400" className={className} fill="#000">
      <ellipse cx="100" cy="50" rx="40" ry="45" />
      <rect x="94" y="93" width="12" height="15" />
      <path d="M82,108 L118,108 L114,195 L86,195 Z" />
      <path d="M82,112 L58,160 L65,164 L86,120 Z" />
      <path d="M118,112 L142,160 L135,164 L114,120 Z" />
      <path d="M88,195 L90,300 L100,300 L100,195 Z" />
      <path d="M100,195 L100,300 L110,300 L112,195 Z" />
      <path d="M86,300 L82,320 L103,320 L100,300 Z" />
      <path d="M100,300 L100,320 L120,320 L115,300 Z" />
    </svg>
  );
}
```

- [ ] **Step 6: Create superhero silhouette**

`apps/web/src/components/silhouettes/superhero.tsx`:

```tsx
export function SuperheroSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 400" className={className} fill="#000">
      <ellipse cx="100" cy="42" rx="26" ry="30" />
      <rect x="90" y="70" width="20" height="16" />
      <path d="M68,86 L132,86 L126,195 L74,195 Z" />
      <path d="M68,89 L38,155 L48,160 L74,98 Z" />
      <path d="M132,89 L162,155 L152,160 L126,98 Z" />
      <path d="M72,86 L50,200 L80,195 Z" opacity="0.7" />
      <path d="M128,86 L150,200 L120,195 Z" opacity="0.7" />
      <path d="M78,195 L72,310 L96,310 L100,195 Z" />
      <path d="M100,195 L104,310 L128,310 L122,195 Z" />
      <path d="M68,310 L65,332 L100,332 L96,310 Z" />
      <path d="M104,310 L100,332 L135,332 L132,310 Z" />
    </svg>
  );
}
```

- [ ] **Step 7: Create silhouette index/registry**

`apps/web/src/components/silhouettes/index.ts`:

```typescript
import type { SilhouetteId } from "@/types/game";
import { ManSilhouette } from "./man";
import { WomanSilhouette } from "./woman";
import { ChildSilhouette } from "./child";
import { RobotSilhouette } from "./robot";
import { AlienSilhouette } from "./alien";
import { SuperheroSilhouette } from "./superhero";

const SILHOUETTES: Record<SilhouetteId, React.FC<{ className?: string }>> = {
  man: ManSilhouette,
  woman: WomanSilhouette,
  child: ChildSilhouette,
  robot: RobotSilhouette,
  alien: AlienSilhouette,
  superhero: SuperheroSilhouette,
};

export function getSilhouette(id: SilhouetteId) {
  return SILHOUETTES[id];
}
```

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/silhouettes/
git commit -m "feat(web): add 6 silhouette SVG components with registry"
```

---

### Task 7: Canvas — Support top/bottom side

**Files:**
- Modify: `apps/web/src/hooks/use-canvas.ts`
- Modify: `apps/web/src/components/canvas/drawing-canvas.tsx`

- [ ] **Step 1: Update useCanvas to support top/bottom**

Replace the side parameter type and drawableArea logic in `apps/web/src/hooks/use-canvas.ts`.

Change line 14:

```typescript
export function useCanvas(side: "left" | "right" | "top" | "bottom" | "full") {
```

Replace the `drawableArea` calculation (lines 20-25):

```typescript
  const halfWidth = CANVAS_WIDTH / 2;
  const halfHeight = CANVAS_HEIGHT / 2;

  const drawableArea =
    side === "full"
      ? { x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT }
      : side === "left"
      ? { x: 0, y: 0, width: halfWidth, height: CANVAS_HEIGHT }
      : side === "right"
      ? { x: halfWidth, y: 0, width: halfWidth, height: CANVAS_HEIGHT }
      : side === "top"
      ? { x: 0, y: 0, width: CANVAS_WIDTH, height: halfHeight }
      : { x: 0, y: halfHeight, width: CANVAS_WIDTH, height: halfHeight };
```

Update the `getPoint` boundary check (line 56) to also clamp y:

```typescript
      if (x < drawableArea.x || x > drawableArea.x + drawableArea.width) return null;
      if (y < drawableArea.y || y > drawableArea.y + drawableArea.height) return null;
```

Update the `clear` function (lines 102-108):

```typescript
  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(drawableArea.x, drawableArea.y, drawableArea.width, drawableArea.height);
  }, [drawableArea]);
```

- [ ] **Step 2: Update DrawingCanvas to support top/bottom overlay**

In `apps/web/src/components/canvas/drawing-canvas.tsx`, update the `DrawingCanvasProps` interface (line 7):

```typescript
interface DrawingCanvasProps {
  side: "left" | "right" | "top" | "bottom" | "full";
  silhouetteOverlay?: React.ReactNode;
}
```

Update the forwardRef line to destructure the new prop:

```typescript
  function DrawingCanvas({ side, silhouetteOverlay }, ref) {
```

Update `exportImage` in `useImperativeHandle` to handle top/bottom:

```typescript
    useImperativeHandle(ref, () => ({
      exportImage: () => {
        const canvas = canvasRef.current;
        if (!canvas) return "";
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = drawableArea.width;
        tempCanvas.height = drawableArea.height;
        const tempCtx = tempCanvas.getContext("2d");
        if (!tempCtx) return "";
        tempCtx.drawImage(
          canvas,
          drawableArea.x, drawableArea.y, drawableArea.width, drawableArea.height,
          0, 0, drawableArea.width, drawableArea.height
        );
        return tempCanvas.toDataURL("image/png");
      },
    }));
```

Replace the divider and overlay section (lines 54-69) with logic that handles both horizontal and vertical splits:

```tsx
          {silhouetteOverlay && (
            <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.08 }}>
              {silhouetteOverlay}
            </div>
          )}
          {side !== "full" && (side === "left" || side === "right") && (
            <>
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-gray-600 opacity-50 pointer-events-none"
                style={{ left: "50%" }}
              />
              <div
                className="absolute top-0 bottom-0 bg-gray-900/30 pointer-events-none rounded-xl"
                style={side === "left" ? { left: "50%", right: 0 } : { left: 0, right: "50%" }}
              />
            </>
          )}
          {side !== "full" && (side === "top" || side === "bottom") && (
            <>
              <div
                className="absolute left-0 right-0 h-0.5 border-t-2 border-dashed border-blue-500 opacity-50 pointer-events-none"
                style={{ top: "50%" }}
              />
              <div
                className="absolute left-0 right-0 bg-gray-900/30 pointer-events-none rounded-xl flex items-center justify-center"
                style={side === "top" ? { top: "50%", bottom: 0 } : { top: 0, bottom: "50%" }}
              >
                <span className="text-gray-500 text-sm">Área do parceiro</span>
              </div>
            </>
          )}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/hooks/use-canvas.ts apps/web/src/components/canvas/drawing-canvas.tsx
git commit -m "feat(web): canvas supports top/bottom split with silhouette overlay"
```

---

### Task 8: Mode Selector Component

**Files:**
- Create: `apps/web/src/components/lobby/mode-selector.tsx`

- [ ] **Step 1: Create the mode selector component**

`apps/web/src/components/lobby/mode-selector.tsx`:

```tsx
"use client";
import type { GameMode } from "@/types/game";

interface ModeSelectorProps {
  gameMode: GameMode;
  totalRounds: number;
  onModeChange: (mode: GameMode) => void;
  onRoundsChange: (rounds: number) => void;
}

export function ModeSelector({ gameMode, totalRounds, onModeChange, onRoundsChange }: ModeSelectorProps) {
  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex gap-2">
        <button
          onClick={() => onModeChange("party")}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            gameMode === "party"
              ? "bg-purple-600 text-white"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          Party (4-10)
        </button>
        <button
          onClick={() => onModeChange("split-body")}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            gameMode === "split-body"
              ? "bg-blue-600 text-white"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          Split Body (2)
        </button>
      </div>

      {gameMode === "split-body" && (
        <div className="flex items-center justify-between px-2">
          <span className="text-sm text-gray-400">Rounds</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => onRoundsChange(n)}
                className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
                  totalRounds === n
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/lobby/mode-selector.tsx
git commit -m "feat(web): add ModeSelector component for lobby"
```

---

### Task 9: Landing Page — Pass gameMode via sessionStorage

**Files:**
- Modify: `apps/web/src/components/landing/hero.tsx`

- [ ] **Step 1: Add game mode and rounds state to Hero**

In `apps/web/src/components/landing/hero.tsx`, add imports and state. After line 4:

```typescript
import type { GameMode } from "@/types/game";
import { ModeSelector } from "@/components/lobby/mode-selector";
```

Add state after line 11 (`const [error, setError] = ...`):

```typescript
  const [gameMode, setGameMode] = useState<GameMode>("party");
  const [totalRounds, setTotalRounds] = useState(3);
```

- [ ] **Step 2: Store gameMode/totalRounds in sessionStorage on create**

Update `handleCreate` function — add after the existing `sessionStorage.setItem` lines:

```typescript
    sessionStorage.setItem("scrawl-gameMode", gameMode);
    sessionStorage.setItem("scrawl-totalRounds", String(totalRounds));
```

- [ ] **Step 3: Add ModeSelector to create mode UI**

Replace the create mode button section (lines 67-73):

```tsx
        {mode === "create" && (
          <div className="flex flex-col gap-3">
            <ModeSelector
              gameMode={gameMode}
              totalRounds={totalRounds}
              onModeChange={setGameMode}
              onRoundsChange={setTotalRounds}
            />
            <button
              onClick={handleCreate}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold text-lg transition-colors"
            >
              {gameMode === "party" ? "Create Party" : "Create Split Body"}
            </button>
          </div>
        )}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/landing/hero.tsx
git commit -m "feat(web): hero passes gameMode and totalRounds via sessionStorage"
```

---

### Task 10: Lobby — Show mode info and adjust player requirements

**Files:**
- Modify: `apps/web/src/components/lobby/lobby.tsx`

- [ ] **Step 1: Update Lobby props and start logic**

In `apps/web/src/components/lobby/lobby.tsx`, add `gameMode` import:

```typescript
import type { Player, GameMode } from "@/types/game";
```

Update `LobbyProps` (lines 4-11):

```typescript
interface LobbyProps {
  roomCode: string;
  players: Player[];
  playerId: string;
  isHost: boolean;
  gameMode: GameMode;
  onStart: () => void;
  error: string | null;
}
```

Update the component to destructure `gameMode` and fix the start condition:

```typescript
export function Lobby({ roomCode, players, playerId, isHost, gameMode, onStart, error }: LobbyProps) {
  const isSplitBody = gameMode === "split-body";
  const minPlayers = isSplitBody ? 2 : 4;
  const maxPlayers = isSplitBody ? 2 : 10;
  const canStart = isHost && players.length >= minPlayers;
```

- [ ] **Step 2: Update player count display and button text**

Replace the player count text (line 31):

```tsx
        <p className="text-gray-400 text-sm mb-2">
          Players ({players.length}/{maxPlayers})
          {players.length < minPlayers && ` — need ${isSplitBody ? "exactly 2" : "at least 4"}`}
        </p>
```

Update the start button text (line 64):

```tsx
          {players.length < minPlayers
            ? `Waiting for players (${players.length}/${minPlayers})...`
            : isSplitBody ? "Start Split Body" : "Start Game"}
```

- [ ] **Step 3: Add mode badge to lobby header**

After the room code section (after the "Copy invite link" button, around line 27), add:

```tsx
        {isSplitBody && (
          <span className="inline-block mt-2 text-xs bg-blue-600/30 text-blue-400 px-3 py-1 rounded-full">
            Split Body Mode
          </span>
        )}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/lobby/lobby.tsx
git commit -m "feat(web): lobby adapts to split-body mode — player count, labels, badge"
```

---

### Task 11: Split Drawing Phase Component

**Files:**
- Create: `apps/web/src/components/phases/split-drawing-phase.tsx`

- [ ] **Step 1: Create the split drawing phase component**

`apps/web/src/components/phases/split-drawing-phase.tsx`:

```tsx
"use client";
import { useRef, useState } from "react";
import { DrawingCanvas, type DrawingCanvasHandle } from "@/components/canvas/drawing-canvas";
import { getSilhouette } from "@/components/silhouettes";
import type { SilhouetteId } from "@/types/game";

interface SplitDrawingPhaseProps {
  round: number;
  totalRounds: number;
  side: "top" | "bottom";
  silhouetteId: SilhouetteId;
  onSubmit: (imageDataUrl: string) => void;
}

export function SplitDrawingPhase({ round, totalRounds, side, silhouetteId, onSubmit }: SplitDrawingPhaseProps) {
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

  const Silhouette = getSilhouette(silhouetteId);
  const sideLabel = side === "top" ? "cabeça e tronco" : "pernas e pés";

  return (
    <div className="flex flex-col items-center gap-4 px-4 w-full">
      <div className="text-center">
        <p className="text-sm text-gray-500">Round {round}/{totalRounds}</p>
        <h2 className="text-xl font-bold">Complete o personagem!</h2>
        <p className="text-gray-400 text-sm">
          Você desenha: <span className="text-blue-400 font-medium">{sideLabel}</span>
        </p>
      </div>

      <DrawingCanvas
        ref={canvasRef}
        side={side}
        silhouetteOverlay={
          <Silhouette className="w-full h-full" />
        }
      />

      {!submitted ? (
        <button
          onClick={handleSubmit}
          className="px-8 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-bold text-lg transition-colors"
        >
          Enviar Desenho
        </button>
      ) : (
        <p className="text-green-400 font-medium">Desenho enviado! Esperando parceiro...</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/phases/split-drawing-phase.tsx
git commit -m "feat(web): add SplitDrawingPhase component"
```

---

### Task 12: Split Reveal Component

**Files:**
- Create: `apps/web/src/components/phases/split-reveal.tsx`

- [ ] **Step 1: Create the split reveal component**

`apps/web/src/components/phases/split-reveal.tsx`:

```tsx
"use client";
import { useState } from "react";
import { getSilhouette } from "@/components/silhouettes";
import type { SplitDrawing } from "@/types/game";

interface SplitRevealProps {
  drawings: SplitDrawing[];
}

export function SplitReveal({ drawings }: SplitRevealProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (drawings.length === 0) {
    return <p className="text-gray-400">No drawings to show.</p>;
  }

  const drawing = drawings[currentIndex];
  const Silhouette = getSilhouette(drawing.silhouetteId);

  return (
    <div className="flex flex-col items-center gap-6 px-4 w-full max-w-lg">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Resultado!</h2>
        <p className="text-gray-400 text-sm">Round {drawing.round} de {drawings.length}</p>
      </div>

      <div className="relative w-full bg-white rounded-xl overflow-hidden" style={{ aspectRatio: "800 / 600" }}>
        {/* Silhouette ghost behind */}
        <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.04 }}>
          <Silhouette className="w-full h-full" />
        </div>

        {/* Top half */}
        {drawing.topImageDataUrl && (
          <img
            src={drawing.topImageDataUrl}
            alt="Top half"
            className="absolute top-0 left-0 w-full"
            style={{ height: "50%", objectFit: "fill" }}
          />
        )}

        {/* Merge line */}
        <div
          className="absolute left-0 right-0 border-t border-dashed border-gray-300 pointer-events-none"
          style={{ top: "50%" }}
        />

        {/* Bottom half */}
        {drawing.bottomImageDataUrl && (
          <img
            src={drawing.bottomImageDataUrl}
            alt="Bottom half"
            className="absolute bottom-0 left-0 w-full"
            style={{ height: "50%", objectFit: "fill" }}
          />
        )}
      </div>

      {/* Navigation */}
      {drawings.length > 1 && (
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentIndex === 0
                ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                : "bg-gray-700 hover:bg-gray-600 text-white"
            }`}
          >
            ← Anterior
          </button>

          <div className="flex gap-2">
            {drawings.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  i === currentIndex ? "bg-purple-500" : "bg-gray-600"
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => setCurrentIndex((i) => Math.min(drawings.length - 1, i + 1))}
            disabled={currentIndex === drawings.length - 1}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentIndex === drawings.length - 1
                ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                : "bg-purple-600 hover:bg-purple-500 text-white"
            }`}
          >
            Próximo →
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/phases/split-reveal.tsx
git commit -m "feat(web): add SplitReveal component with round navigation"
```

---

### Task 13: Game State Hook — Handle split-body messages

**Files:**
- Modify: `apps/web/src/hooks/use-game-state.ts`

- [ ] **Step 1: Add split-body state to GameState interface**

In `apps/web/src/hooks/use-game-state.ts`, update imports (line 4):

```typescript
import type { RoomState, Phase, Player, Theme, DrawingResult, SplitDrawing, SilhouetteId, GameMode } from "@/types/game";
```

Add split-body fields to the `GameState` interface (after `drawings`, line 19):

```typescript
  splitRound: number;
  splitSide: "top" | "bottom" | null;
  silhouetteId: SilhouetteId | null;
  splitDrawings: SplitDrawing[];
```

Update `initialState` to include new fields:

```typescript
const initialState: GameState = {
  connected: false,
  playerId: null,
  roomState: null,
  pairAssignment: null,
  drawings: [],
  splitRound: 0,
  splitSide: null,
  silhouetteId: null,
  splitDrawings: [],
  error: null,
};
```

- [ ] **Step 2: Add message handlers for split-body events**

Add these cases to the `switch` in `onMessage` (after the `error` case, before the closing `}`):

```typescript
        case "split-round-start":
          setState((s) => ({
            ...s,
            splitRound: data.round,
            splitSide: data.side,
            silhouetteId: data.silhouetteId,
            error: null,
          }));
          break;

        case "split-round-end":
          setState((s) => ({
            ...s,
            splitSide: null,
          }));
          break;

        case "split-final-results":
          setState((s) => ({
            ...s,
            splitDrawings: data.drawings,
          }));
          break;
```

- [ ] **Step 3: Add submitSplitDrawing action**

Add after `voteDrawing` callback (around line 173):

```typescript
  const submitSplitDrawing = useCallback((imageDataUrl: string) => {
    send({ type: "submit-split-drawing", imageDataUrl });
  }, []);
```

Add to the return object (line 176):

```typescript
    submitSplitDrawing,
```

- [ ] **Step 4: Update createRoom to pass gameMode and totalRounds**

Update the `createRoom` callback (around line 147):

```typescript
  const createRoom = useCallback((nickname: string, gameMode?: GameMode, totalRounds?: number) => {
    send({ type: "create-room", nickname, gameMode, totalRounds });
  }, []);
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/use-game-state.ts
git commit -m "feat(web): useGameState handles split-body messages and actions"
```

---

### Task 14: Game Controller — Route split-body phases

**Files:**
- Modify: `apps/web/src/components/game/game-controller.tsx`

- [ ] **Step 1: Import split-body components**

Add imports after line 10:

```typescript
import { SplitDrawingPhase } from "@/components/phases/split-drawing-phase";
import { SplitReveal } from "@/components/phases/split-reveal";
```

- [ ] **Step 2: Add split-body phase rendering**

In the render section, add after the scoreboard/final-results block (after line 97, before the closing `</div>`):

```tsx
        {phase === "split-drawing" && props.splitSide && props.silhouetteId && (
          <SplitDrawingPhase
            round={props.splitRound}
            totalRounds={roomState.totalRounds}
            side={props.splitSide}
            silhouetteId={props.silhouetteId}
            onSubmit={props.submitSplitDrawing}
          />
        )}

        {phase === "split-final" && (
          <SplitReveal drawings={props.splitDrawings} />
        )}
```

- [ ] **Step 3: Update timer bar visibility**

Update the condition for showing round info and timer (line 31). Split-body phases should show timer for `split-drawing` but not `split-final`:

```tsx
      {phase !== "lobby" && phase !== "final-results" && phase !== "split-final" && (
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/game/game-controller.tsx
git commit -m "feat(web): game controller routes split-body phases"
```

---

### Task 15: Room Page and Lobby — Wire up gameMode

**Files:**
- Modify: `apps/web/src/app/room/[code]/page.tsx`
- Modify: `apps/web/src/components/game/game-controller.tsx` (Lobby props)

- [ ] **Step 1: Update room page to pass gameMode/totalRounds**

In `apps/web/src/app/room/[code]/page.tsx`, update the create room call (lines 17-18):

```typescript
    if (params.code === "new" || action === "create") {
      const gameMode = (sessionStorage.getItem("scrawl-gameMode") as "party" | "split-body") || "party";
      const totalRounds = parseInt(sessionStorage.getItem("scrawl-totalRounds") || "3", 10);
      gameState.createRoom(nickname, gameMode, totalRounds);
    } else {
```

- [ ] **Step 2: Pass gameMode to Lobby in GameController**

In `apps/web/src/components/game/game-controller.tsx`, update the Lobby rendering (around line 42):

```tsx
          <Lobby
            roomCode={roomState.code}
            players={roomState.players}
            playerId={playerId}
            isHost={isHost}
            gameMode={roomState.gameMode ?? "party"}
            onStart={props.startGame}
            error={error}
          />
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/room/[code]/page.tsx apps/web/src/components/game/game-controller.tsx
git commit -m "feat(web): wire gameMode from sessionStorage through to lobby"
```

---

### Task 16: Verify and Fix TypeScript Compilation

**Files:**
- All modified files

- [ ] **Step 1: Build the server**

Run:
```bash
cd apps/ws-server && npx tsc --noEmit
```

Expected: no errors. If there are errors, fix them.

- [ ] **Step 2: Build the web app**

Run:
```bash
cd apps/web && npx next build
```

Expected: build succeeds. If there are type errors, fix them.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve TypeScript compilation errors from split-body integration"
```

Only commit if there were fixes needed. Skip if builds passed clean.

---

### Task 17: Manual Integration Test

- [ ] **Step 1: Start both servers**

```bash
cd apps/ws-server && npm run dev &
cd apps/web && npm run dev &
```

- [ ] **Step 2: Test split-body flow**

1. Open http://localhost:3000
2. Enter nickname, click Create Room
3. Verify mode selector appears — select "Split Body"
4. Select 2 rounds
5. Click "Create Split Body"
6. Open another browser tab, enter nickname, join the room
7. Verify lobby shows "Split Body Mode" badge and "2/2" players
8. Host clicks "Start Split Body"
9. Both players see drawing canvas with silhouette guide
10. One player draws top, other draws bottom
11. Both submit
12. Verify round 2 starts with sides swapped
13. Both submit again
14. Verify final reveal shows both combined drawings with navigation

- [ ] **Step 3: Test party mode still works**

1. Create a new room with "Party" mode selected
2. Verify it requires 4 players and follows the existing theme/drawing flow

- [ ] **Step 4: Commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: integration test fixes for split-body mode"
```
