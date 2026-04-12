# Face Builder Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "face-builder" game mode where 2 players each draw 3 randomly-assigned facial feature regions on a shared canvas, producing collaborative face drawings.

**Architecture:** Follows the same pattern as split-body mode. Server manages round progression and region assignment; client constrains drawing to assigned regions using multi-region hit-testing. Each player exports a full 800x600 canvas with white→transparent conversion; the reveal composites both layers.

**Tech Stack:** TypeScript, React, HTML5 Canvas, WebSocket (ws), Next.js, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-04-11-face-builder-mode-design.md`

---

## File Map

### Server (apps/ws-server/src/)
- **Modify:** `types.ts` — Add FaceTemplateId, FaceDrawing, extend GameMode/Room/ClientMessage
- **Modify:** `room-manager.ts` — Accept faceTemplate param in createRoom
- **Modify:** `game-engine.ts` — Add face-builder game logic functions
- **Modify:** `handlers.ts` — Wire face-builder messages

### Client Types (apps/web/src/)
- **Modify:** `types/game.ts` — Mirror server types, add ServerMessage variants

### Shared Constants (apps/web/src/lib/)
- **Create:** `face-regions.ts` — Region definitions with bounds, hit-test functions

### Canvas (apps/web/src/)
- **Create:** `hooks/use-face-canvas.ts` — Multi-region canvas hook
- **Create:** `components/canvas/face-canvas.tsx` — Canvas with region overlays

### Face Templates (apps/web/src/components/)
- **Create:** `face-templates/masculine.tsx`
- **Create:** `face-templates/feminine.tsx`
- **Create:** `face-templates/monster.tsx`
- **Create:** `face-templates/alien-face.tsx`
- **Create:** `face-templates/robot-face.tsx`
- **Create:** `face-templates/index.ts`

### Phase Components (apps/web/src/components/phases/)
- **Create:** `face-drawing-phase.tsx`
- **Create:** `face-reveal.tsx`

### UI Updates (apps/web/src/)
- **Modify:** `components/lobby/mode-selector.tsx` — Add face-builder button + template picker
- **Modify:** `components/landing/hero.tsx` — faceTemplate state + sessionStorage
- **Modify:** `components/lobby/lobby.tsx` — Face builder badge + template info
- **Modify:** `hooks/use-game-state.ts` — Handle face messages, add faceRegions/faceDrawings state
- **Modify:** `components/game/game-controller.tsx` — Route face-drawing/face-final phases
- **Modify:** `app/room/[code]/page.tsx` — Pass faceTemplate to createRoom

---

### Task 1: Server types — FaceBuilder types

**Files:**
- Modify: `apps/ws-server/src/types.ts`

- [ ] **Step 1: Add FaceTemplateId and FaceDrawing types**

Add after the `SplitDrawing` interface:

```typescript
export const FACE_TEMPLATE_IDS = ["masculine", "feminine", "monster", "alien-face", "robot-face"] as const;
export type FaceTemplateId = (typeof FACE_TEMPLATE_IDS)[number];

export const FACE_REGION_IDS = ["hair", "ears", "eyes", "nose", "mouth", "shoulders"] as const;
export type FaceRegionId = (typeof FACE_REGION_IDS)[number];

export interface FaceDrawing {
  round: number;
  faceTemplate: FaceTemplateId;
  assignments: { regionId: FaceRegionId; playerId: string }[];
  player1Id: string;
  player2Id: string;
  player1ImageDataUrl: string | null;
  player2ImageDataUrl: string | null;
}
```

- [ ] **Step 2: Extend GameMode**

Change:
```typescript
export type GameMode = "party" | "split-body";
```
To:
```typescript
export type GameMode = "party" | "split-body" | "face-builder";
```

- [ ] **Step 3: Extend Phase union**

Add `"face-drawing" | "face-final"` to the Phase type.

- [ ] **Step 4: Extend Room interface**

Add to Room:
```typescript
faceTemplate: FaceTemplateId;
faceDrawings: FaceDrawing[];
```

- [ ] **Step 5: Extend ClientMessage**

Change the create-room variant:
```typescript
| { type: "create-room"; nickname: string; gameMode?: GameMode; totalRounds?: number; turnDuration?: number; faceTemplate?: FaceTemplateId }
```

Add new variant:
```typescript
| { type: "submit-face-drawing"; imageDataUrl: string }
```

- [ ] **Step 6: Commit**

```bash
git add apps/ws-server/src/types.ts
git commit -m "feat(server): add face-builder types"
```

---

### Task 2: Client types — Mirror face-builder types

**Files:**
- Modify: `apps/web/src/types/game.ts`

- [ ] **Step 1: Add FaceTemplateId, FaceRegionId, FaceDrawing**

Add after SplitDrawing:

```typescript
export type FaceTemplateId = "masculine" | "feminine" | "monster" | "alien-face" | "robot-face";
export type FaceRegionId = "hair" | "ears" | "eyes" | "nose" | "mouth" | "shoulders";

export interface FaceDrawing {
  round: number;
  faceTemplate: FaceTemplateId;
  assignments: { regionId: FaceRegionId; playerId: string }[];
  player1Id: string;
  player2Id: string;
  player1ImageDataUrl: string | null;
  player2ImageDataUrl: string | null;
}
```

- [ ] **Step 2: Extend GameMode, Phase, RoomState**

```typescript
export type GameMode = "party" | "split-body" | "face-builder";
```

Add `"face-drawing" | "face-final"` to Phase.

Add to RoomState:
```typescript
faceTemplate: FaceTemplateId;
```

- [ ] **Step 3: Extend ClientMessage**

Update create-room to include `faceTemplate?: FaceTemplateId`.

Add:
```typescript
| { type: "submit-face-drawing"; imageDataUrl: string }
```

- [ ] **Step 4: Extend ServerMessage**

Add:
```typescript
| { type: "face-round-start"; round: number; regions: FaceRegionId[]; faceTemplate: FaceTemplateId; totalRounds: number }
| { type: "face-round-end"; round: number }
| { type: "face-final-results"; drawings: FaceDrawing[] }
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/types/game.ts
git commit -m "feat(client): add face-builder types"
```

---

### Task 3: Face region definitions

**Files:**
- Create: `apps/web/src/lib/face-regions.ts`

- [ ] **Step 1: Create the region definitions file**

```typescript
import type { FaceRegionId } from "@/types/game";

// Face ellipse parameters (shared with hit-testing and SVG overlay)
export const FACE_ELLIPSE = { cx: 400, cy: 280, rx: 200, ry: 250 };

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceRegionDef {
  id: FaceRegionId;
  label: string;
  color: string;
  rects: Rect[];          // drawable rectangles (ears have 2, most have 1)
  isHairRegion?: boolean;  // special inverted-ellipse logic
}

export const FACE_REGIONS: FaceRegionDef[] = [
  {
    id: "hair",
    label: "Cabelo",
    color: "#8b5cf6",
    rects: [],  // hair uses inverted ellipse, not rects
    isHairRegion: true,
  },
  {
    id: "ears",
    label: "Orelhas",
    color: "#3b82f6",
    rects: [
      { x: 165, y: 200, width: 50, height: 120 },
      { x: 585, y: 200, width: 50, height: 120 },
    ],
  },
  {
    id: "eyes",
    label: "Olhos",
    color: "#22c55e",
    rects: [{ x: 215, y: 200, width: 370, height: 80 }],
  },
  {
    id: "nose",
    label: "Nariz",
    color: "#f97316",
    rects: [{ x: 320, y: 280, width: 160, height: 100 }],
  },
  {
    id: "mouth",
    label: "Boca",
    color: "#ef4444",
    rects: [{ x: 270, y: 380, width: 260, height: 90 }],
  },
  {
    id: "shoulders",
    label: "Ombros",
    color: "#eab308",
    rects: [{ x: 120, y: 520, width: 560, height: 70 }],
  },
];

const SHOULDERS_RECT = { x: 120, y: 520, width: 560, height: 70 };

function isInsideEllipse(px: number, py: number): boolean {
  const { cx, cy, rx, ry } = FACE_ELLIPSE;
  return ((px - cx) ** 2) / (rx ** 2) + ((py - cy) ** 2) / (ry ** 2) <= 1;
}

function isInsideRect(px: number, py: number, r: Rect): boolean {
  return px >= r.x && px <= r.x + r.width && py >= r.y && py <= r.y + r.height;
}

/** Check if a point falls inside a given face region */
export function isPointInRegion(px: number, py: number, region: FaceRegionDef): boolean {
  if (region.isHairRegion) {
    // Hair = outside ellipse (but inside canvas and not in shoulders) OR forehead (inside ellipse, y < 200)
    if (isInsideRect(px, py, SHOULDERS_RECT)) return false;
    if (!isInsideEllipse(px, py)) return px >= 0 && px <= 800 && py >= 0 && py <= 600;
    return py < 200; // forehead zone inside ellipse
  }
  return region.rects.some((r) => isInsideRect(px, py, r));
}

/** Get region definition by ID */
export function getRegionDef(id: FaceRegionId): FaceRegionDef {
  return FACE_REGIONS.find((r) => r.id === id)!;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/lib/face-regions.ts
git commit -m "feat: add face region definitions and hit-testing"
```

---

### Task 4: Room manager — faceTemplate in room creation

**Files:**
- Modify: `apps/ws-server/src/room-manager.ts`

- [ ] **Step 1: Add faceTemplate param to createRoom**

Change the signature:
```typescript
export function createRoom(nickname: string, ws: WebSocket, gameMode: GameMode = "party", totalRounds?: number, turnDuration?: number, faceTemplate?: FaceTemplateId): Room {
```

Add import of `FaceTemplateId` from `"./types.js"`.

After `clampedTurnDuration`, add:
```typescript
const validatedTemplate = faceTemplate ?? "masculine";
```

In the Room object initialization, add:
```typescript
faceTemplate: validatedTemplate,
faceDrawings: [],
```

- [ ] **Step 2: Commit**

```bash
git add apps/ws-server/src/room-manager.ts
git commit -m "feat(server): accept faceTemplate in room creation"
```

---

### Task 5: Game engine — face-builder game logic

**Files:**
- Modify: `apps/ws-server/src/game-engine.ts`

- [ ] **Step 1: Add face-drawing to getPhaseDuration**

In the `getPhaseDuration` function, update the condition:
```typescript
if (phase === "drawing" || phase === "split-drawing" || phase === "face-drawing") {
  return room.turnDuration * 1000;
}
```

- [ ] **Step 2: Add startFaceGame function**

Add after `startSplitGame`:

```typescript
export function startFaceGame(room: Room) {
  if (room.players.size !== 2) return;
  room.round = 1;
  room.faceDrawings = [];
  startFaceRound(room);
}
```

- [ ] **Step 3: Add startFaceRound function**

```typescript
function startFaceRound(room: Room) {
  const playerIds = Array.from(room.players.keys());
  const [player1Id, player2Id] = playerIds;

  // Shuffle regions and split 3+3
  const shuffled = shuffleArray([...FACE_REGION_IDS]);
  const player1Regions = shuffled.slice(0, 3);
  const player2Regions = shuffled.slice(3, 6);

  const assignments = [
    ...player1Regions.map((regionId) => ({ regionId, playerId: player1Id })),
    ...player2Regions.map((regionId) => ({ regionId, playerId: player2Id })),
  ];

  const drawing: FaceDrawing = {
    round: room.round,
    faceTemplate: room.faceTemplate,
    assignments,
    player1Id,
    player2Id,
    player1ImageDataUrl: null,
    player2ImageDataUrl: null,
  };
  room.faceDrawings.push(drawing);

  sendTo(room, player1Id, {
    type: "face-round-start",
    round: room.round,
    regions: player1Regions,
    faceTemplate: room.faceTemplate,
    totalRounds: room.totalRounds,
  });
  sendTo(room, player2Id, {
    type: "face-round-start",
    round: room.round,
    regions: player2Regions,
    faceTemplate: room.faceTemplate,
    totalRounds: room.totalRounds,
  });

  transitionTo(room, "face-drawing");
}
```

Add imports at top: `FACE_REGION_IDS`, `FaceDrawing` from `"./types.js"`.

- [ ] **Step 4: Add handleFaceDrawingSubmit function**

```typescript
export function handleFaceDrawingSubmit(room: Room, playerId: string, imageDataUrl: string) {
  if (room.phase !== "face-drawing") {
    console.log(`[face] submit rejected: phase is ${room.phase}`);
    return;
  }

  const currentDrawing = room.faceDrawings.find((d) => d.round === room.round);
  if (!currentDrawing) return;

  if (playerId === currentDrawing.player1Id) {
    if (currentDrawing.player1ImageDataUrl) return;
    currentDrawing.player1ImageDataUrl = imageDataUrl;
    console.log(`[face] round ${room.round}: P1 submitted (${imageDataUrl.length} chars)`);
  } else if (playerId === currentDrawing.player2Id) {
    if (currentDrawing.player2ImageDataUrl) return;
    currentDrawing.player2ImageDataUrl = imageDataUrl;
    console.log(`[face] round ${room.round}: P2 submitted (${imageDataUrl.length} chars)`);
  } else {
    return;
  }

  if (currentDrawing.player1ImageDataUrl && currentDrawing.player2ImageDataUrl) {
    console.log(`[face] round ${room.round}: BOTH submitted, advancing`);
    advanceFaceRound(room);
  }
}
```

- [ ] **Step 5: Add advanceFaceRound and startFaceFinal**

```typescript
function advanceFaceRound(room: Room) {
  if (room.round >= room.totalRounds) {
    startFaceFinal(room);
  } else {
    broadcast(room, { type: "face-round-end", round: room.round });
    room.round++;
    startFaceRound(room);
  }
}

function startFaceFinal(room: Room) {
  const summary = room.faceDrawings.map((d) => ({
    round: d.round,
    hasP1: !!d.player1ImageDataUrl,
    hasP2: !!d.player2ImageDataUrl,
  }));
  console.log(`[face] FINAL REVEAL:`, JSON.stringify(summary));
  broadcast(room, {
    type: "face-final-results",
    drawings: room.faceDrawings,
  });
  transitionTo(room, "face-final");
}
```

- [ ] **Step 6: Add face-drawing case to onPhaseEnd**

In the `onPhaseEnd` switch, add before the closing `}`:

```typescript
case "face-drawing": {
  const currentDrawing = room.faceDrawings.find((d) => d.round === room.round);
  if (currentDrawing) {
    console.log(`[face] TIMER EXPIRED round ${room.round}: p1=${!!currentDrawing.player1ImageDataUrl}, p2=${!!currentDrawing.player2ImageDataUrl}`);
    advanceFaceRound(room);
  }
  break;
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/ws-server/src/game-engine.ts
git commit -m "feat(server): add face-builder game engine logic"
```

---

### Task 6: Handlers — wire face-builder messages

**Files:**
- Modify: `apps/ws-server/src/handlers.ts`

- [ ] **Step 1: Add imports**

Add `startFaceGame, handleFaceDrawingSubmit` to the import from `"./game-engine.js"`.

- [ ] **Step 2: Update handleCreateRoom**

Change:
```typescript
const room = createRoom(msg.nickname, ws, msg.gameMode, msg.totalRounds, msg.turnDuration);
```
To:
```typescript
const room = createRoom(msg.nickname, ws, msg.gameMode, msg.totalRounds, msg.turnDuration, msg.faceTemplate);
```

- [ ] **Step 3: Add face-builder branch to handleStartGame**

In `handleStartGame`, after the split-body branch and before the party else:

```typescript
} else if (room.gameMode === "face-builder") {
  if (room.players.size !== 2) {
    ws.send(JSON.stringify({ type: "error", message: "Face Builder mode requires exactly 2 players" }));
    return;
  }
  startFaceGame(room);
} else {
```

- [ ] **Step 4: Add submit-face-drawing handler**

Add function:
```typescript
function handleSubmitFaceDrawing(ws: WebSocket, imageDataUrl: string) {
  const info = wsToPlayer.get(ws);
  if (!info) return;
  const room = getRoom(info.roomCode);
  if (!room || room.phase !== "face-drawing") return;
  handleFaceDrawingSubmit(room, info.playerId, imageDataUrl);
}
```

Add case to `handleMessage` switch:
```typescript
case "submit-face-drawing":
  handleSubmitFaceDrawing(ws, msg.imageDataUrl);
  break;
```

- [ ] **Step 5: Update serializeRoomState**

Add `faceTemplate: room.faceTemplate,` to the returned object, after `gameMode`.

- [ ] **Step 6: Commit**

```bash
git add apps/ws-server/src/handlers.ts
git commit -m "feat(server): wire face-builder message handlers"
```

---

### Task 7: Face template SVG components

**Files:**
- Create: `apps/web/src/components/face-templates/masculine.tsx`
- Create: `apps/web/src/components/face-templates/feminine.tsx`
- Create: `apps/web/src/components/face-templates/monster.tsx`
- Create: `apps/web/src/components/face-templates/alien-face.tsx`
- Create: `apps/web/src/components/face-templates/robot-face.tsx`
- Create: `apps/web/src/components/face-templates/index.ts`

- [ ] **Step 1: Create masculine template**

File: `apps/web/src/components/face-templates/masculine.tsx`

```tsx
export function MasculineTemplate({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 800 600" className={className} fill="none" stroke="#888" strokeWidth="2" strokeDasharray="8 4">
      <ellipse cx="400" cy="280" rx="200" ry="250" />
      <rect x="355" y="510" width="90" height="20" rx="4" />
      <line x1="370" y1="265" x2="420" y2="265" strokeWidth="1.5" strokeDasharray="none" opacity="0.3" />
    </svg>
  );
}
```

- [ ] **Step 2: Create feminine template**

File: `apps/web/src/components/face-templates/feminine.tsx`

```tsx
export function FeminineTemplate({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 800 600" className={className} fill="none" stroke="#888" strokeWidth="2" strokeDasharray="8 4">
      <ellipse cx="400" cy="280" rx="190" ry="245" />
      <rect x="360" y="508" width="80" height="18" rx="4" />
      <ellipse cx="400" cy="80" rx="140" ry="30" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}
```

- [ ] **Step 3: Create monster template**

File: `apps/web/src/components/face-templates/monster.tsx`

```tsx
export function MonsterTemplate({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 800 600" className={className} fill="none" stroke="#888" strokeWidth="2" strokeDasharray="8 4">
      <ellipse cx="400" cy="280" rx="210" ry="260" />
      <rect x="350" y="515" width="100" height="22" rx="4" />
      <circle cx="320" cy="60" r="15" strokeWidth="1.5" opacity="0.3" />
      <circle cx="480" cy="60" r="15" strokeWidth="1.5" opacity="0.3" />
    </svg>
  );
}
```

- [ ] **Step 4: Create alien-face template**

File: `apps/web/src/components/face-templates/alien-face.tsx`

```tsx
export function AlienFaceTemplate({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 800 600" className={className} fill="none" stroke="#888" strokeWidth="2" strokeDasharray="8 4">
      <ellipse cx="400" cy="290" rx="180" ry="260" />
      <rect x="365" y="520" width="70" height="16" rx="4" />
      <ellipse cx="400" cy="50" rx="100" ry="20" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}
```

- [ ] **Step 5: Create robot-face template**

File: `apps/web/src/components/face-templates/robot-face.tsx`

```tsx
export function RobotFaceTemplate({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 800 600" className={className} fill="none" stroke="#888" strokeWidth="2" strokeDasharray="8 4">
      <rect x="210" y="50" width="380" height="470" rx="30" />
      <rect x="355" y="510" width="90" height="25" rx="4" />
      <circle cx="400" cy="30" r="10" strokeWidth="1.5" opacity="0.3" />
      <line x1="400" y1="15" x2="400" y2="5" strokeWidth="1.5" opacity="0.3" />
    </svg>
  );
}
```

- [ ] **Step 6: Create index file**

File: `apps/web/src/components/face-templates/index.ts`

```typescript
import type { FaceTemplateId } from "@/types/game";
import { MasculineTemplate } from "./masculine";
import { FeminineTemplate } from "./feminine";
import { MonsterTemplate } from "./monster";
import { AlienFaceTemplate } from "./alien-face";
import { RobotFaceTemplate } from "./robot-face";

const FACE_TEMPLATES: Record<FaceTemplateId, React.FC<{ className?: string }>> = {
  masculine: MasculineTemplate,
  feminine: FeminineTemplate,
  monster: MonsterTemplate,
  "alien-face": AlienFaceTemplate,
  "robot-face": RobotFaceTemplate,
};

export const FACE_TEMPLATE_LABELS: Record<FaceTemplateId, string> = {
  masculine: "Masculino",
  feminine: "Feminino",
  monster: "Monstro",
  "alien-face": "Alien",
  "robot-face": "Robô",
};

export function getFaceTemplate(id: FaceTemplateId) {
  return FACE_TEMPLATES[id];
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/face-templates/
git commit -m "feat: add face template SVG components"
```

---

### Task 8: useFaceCanvas hook — multi-region drawing

**Files:**
- Create: `apps/web/src/hooks/use-face-canvas.ts`

- [ ] **Step 1: Create the hook**

```typescript
"use client";
import { useRef, useState, useCallback, useEffect } from "react";
import { clearCanvas } from "@/lib/canvas-utils";
import { FACE_REGIONS, isPointInRegion, getRegionDef, type FaceRegionDef } from "@/lib/face-regions";
import type { FaceRegionId } from "@/types/game";
import type { CanvasTool, ToolType } from "./use-canvas";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.replace("#", ""), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function useFaceCanvas(assignedRegionIds: FaceRegionId[]) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const shapeStart = useRef<{ x: number; y: number } | null>(null);
  const savedImageData = useRef<ImageData | null>(null);
  const activeRegion = useRef<FaceRegionDef | null>(null);
  const [tool, setTool] = useState<CanvasTool>({ type: "brush", color: "#000000", size: 4 });

  const assignedRegions = assignedRegionIds.map(getRegionDef);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (ctx) clearCanvas(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
  }, []);

  const findRegion = useCallback(
    (x: number, y: number): FaceRegionDef | null => {
      for (const region of assignedRegions) {
        if (isPointInRegion(x, y, region)) return region;
      }
      return null;
    },
    [assignedRegionIds]
  );

  const getPoint = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;

      let clientX: number, clientY: number;
      if ("touches" in e) {
        if (e.touches.length === 0) return null;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;

      return { x, y };
    },
    []
  );

  const clipToRegion = useCallback(
    (ctx: CanvasRenderingContext2D, region: FaceRegionDef) => {
      ctx.beginPath();
      if (region.isHairRegion) {
        // Hair: full canvas minus ellipse interior (below y=200) minus shoulders
        ctx.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        // Cut out shoulders
        ctx.rect(120, 520, 560, 70);
        // Forehead: inside ellipse above y=200
        const { cx, cy, rx, ry } = { cx: 400, cy: 280, rx: 200, ry: 250 };
        // Add forehead region
        ctx.moveTo(cx + rx * Math.cos(0), cy + ry * Math.sin(0));
        for (let a = 0; a <= Math.PI * 2; a += 0.05) {
          const px = cx + rx * Math.cos(a);
          const py = cy + ry * Math.sin(a);
          if (py <= 200) ctx.lineTo(px, py);
        }
        // Clip: we use evenodd for the inverted mask approach
        // Simpler approach: just clip to the full canvas region check per-stroke
      } else {
        for (const r of region.rects) {
          ctx.rect(r.x, r.y, r.width, r.height);
        }
      }
      ctx.clip();
    },
    []
  );

  const floodFill = useCallback(
    (startX: number, startY: number, fillColor: string, region: FaceRegionDef) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx || !canvas) return;

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      const w = canvas.width;

      const sx = Math.floor(startX);
      const sy = Math.floor(startY);
      const idx = (sy * w + sx) * 4;
      const tR = data[idx], tG = data[idx + 1], tB = data[idx + 2], tA = data[idx + 3];

      const fill = hexToRgb(fillColor);
      if (tR === fill.r && tG === fill.g && tB === fill.b && tA === 255) return;

      const tolerance = 32;
      const visited = new Uint8Array(w * canvas.height);
      const stack: number[] = [sx, sy];

      while (stack.length > 0) {
        const cy = stack.pop()!;
        const cx = stack.pop()!;
        if (cx < 0 || cx >= w || cy < 0 || cy >= canvas.height) continue;

        const pi = cy * w + cx;
        if (visited[pi]) continue;
        visited[pi] = 1;

        // Must be in the same region
        if (!isPointInRegion(cx, cy, region)) continue;

        const i = pi * 4;
        if (
          Math.abs(data[i] - tR) > tolerance ||
          Math.abs(data[i + 1] - tG) > tolerance ||
          Math.abs(data[i + 2] - tB) > tolerance ||
          Math.abs(data[i + 3] - tA) > tolerance
        ) continue;

        data[i] = fill.r;
        data[i + 1] = fill.g;
        data[i + 2] = fill.b;
        data[i + 3] = 255;

        stack.push(cx + 1, cy, cx - 1, cy, cx, cy + 1, cx, cy - 1);
      }

      ctx.putImageData(imgData, 0, 0);
    },
    []
  );

  const isShapeTool = (t: ToolType) => t === "line" || t === "circle" || t === "rectangle";

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const point = getPoint(e);
      if (!point) return;

      const region = findRegion(point.x, point.y);
      if (!region) return;
      activeRegion.current = region;

      if (tool.type === "fill") {
        floodFill(point.x, point.y, tool.color, region);
        return;
      }

      if (isShapeTool(tool.type)) {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (ctx && canvas) {
          savedImageData.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
        }
        shapeStart.current = point;
        isDrawing.current = true;
        return;
      }

      isDrawing.current = true;
      lastPoint.current = point;
    },
    [getPoint, tool, findRegion, floodFill]
  );

  const drawShape = useCallback(
    (ctx: CanvasRenderingContext2D, type: ToolType, from: { x: number; y: number }, to: { x: number; y: number }, color: string, size: number, region: FaceRegionDef) => {
      ctx.save();
      clipToRegion(ctx, region);

      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (type === "line") {
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      } else if (type === "circle") {
        const rx = Math.abs(to.x - from.x) / 2;
        const ry = Math.abs(to.y - from.y) / 2;
        const cx = (from.x + to.x) / 2;
        const cy = (from.y + to.y) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (type === "rectangle") {
        ctx.strokeRect(Math.min(from.x, to.x), Math.min(from.y, to.y), Math.abs(to.x - from.x), Math.abs(to.y - from.y));
      }

      ctx.restore();
    },
    [clipToRegion]
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing.current) return;
      const point = getPoint(e);
      if (!point) return;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx) return;

      const region = activeRegion.current;
      if (!region) return;

      if (isShapeTool(tool.type) && shapeStart.current && savedImageData.current) {
        ctx.putImageData(savedImageData.current, 0, 0);
        drawShape(ctx, tool.type, shapeStart.current, point, tool.color, tool.size, region);
        return;
      }

      // Brush/eraser: only draw if point is in same region
      if (!isPointInRegion(point.x, point.y, region)) return;
      if (!lastPoint.current) return;

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
    [getPoint, tool, drawShape]
  );

  const stopDrawing = useCallback(() => {
    shapeStart.current = null;
    savedImageData.current = null;
    activeRegion.current = null;
    isDrawing.current = false;
    lastPoint.current = null;
  }, []);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    // Clear only assigned regions
    for (const region of assignedRegions) {
      if (region.isHairRegion) {
        // Clear full canvas then restore non-hair areas — simpler: just fill white everywhere that is hair
        const imgData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        const data = imgData.data;
        for (let y = 0; y < CANVAS_HEIGHT; y++) {
          for (let x = 0; x < CANVAS_WIDTH; x++) {
            if (isPointInRegion(x, y, region)) {
              const i = (y * CANVAS_WIDTH + x) * 4;
              data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 255;
            }
          }
        }
        ctx.putImageData(imgData, 0, 0);
      } else {
        ctx.fillStyle = "#ffffff";
        for (const r of region.rects) {
          ctx.fillRect(r.x, r.y, r.width, r.height);
        }
      }
    }
  }, [assignedRegions]);

  /** Export full canvas with white pixels made transparent */
  const exportImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return "";
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    const imgData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] >= 250 && data[i + 1] >= 250 && data[i + 2] >= 250) {
        data[i + 3] = 0; // make white pixels transparent
      }
    }
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = CANVAS_WIDTH;
    tempCanvas.height = CANVAS_HEIGHT;
    const tempCtx = tempCanvas.getContext("2d")!;
    tempCtx.putImageData(imgData, 0, 0);
    return tempCanvas.toDataURL("image/png");
  }, []);

  return {
    canvasRef,
    tool,
    setTool,
    startDrawing,
    draw,
    stopDrawing,
    clear,
    exportImage,
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: CANVAS_HEIGHT,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/hooks/use-face-canvas.ts
git commit -m "feat: add useFaceCanvas hook with multi-region support"
```

---

### Task 9: FaceCanvas component

**Files:**
- Create: `apps/web/src/components/canvas/face-canvas.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";
import { Toolbar } from "./toolbar";
import { useFaceCanvas } from "@/hooks/use-face-canvas";
import { FACE_REGIONS, isPointInRegion, FACE_ELLIPSE, getRegionDef } from "@/lib/face-regions";
import { getFaceTemplate } from "@/components/face-templates";
import React, { forwardRef, useImperativeHandle } from "react";
import type { FaceRegionId, FaceTemplateId } from "@/types/game";

interface FaceCanvasProps {
  assignedRegions: FaceRegionId[];
  faceTemplate: FaceTemplateId;
}

export interface FaceCanvasHandle {
  exportImage: () => string;
}

export const FaceCanvas = forwardRef<FaceCanvasHandle, FaceCanvasProps>(
  function FaceCanvas({ assignedRegions, faceTemplate }, ref) {
    const {
      canvasRef, tool, setTool, startDrawing, draw, stopDrawing, clear,
      exportImage, canvasWidth, canvasHeight,
    } = useFaceCanvas(assignedRegions);

    useImperativeHandle(ref, () => ({ exportImage }));

    const Template = getFaceTemplate(faceTemplate);

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
          {/* Face template outline */}
          <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.15 }}>
            <Template className="w-full h-full" />
          </div>
          {/* Region overlay: darken non-assigned areas, label assigned ones */}
          <svg
            viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            {FACE_REGIONS.filter((r) => !r.isHairRegion).map((region) => {
              const isAssigned = assignedRegions.includes(region.id);
              return region.rects.map((rect, i) => (
                <g key={`${region.id}-${i}`}>
                  <rect
                    x={rect.x} y={rect.y} width={rect.width} height={rect.height}
                    rx={6}
                    fill={isAssigned ? "none" : "rgba(0,0,0,0.25)"}
                    stroke={isAssigned ? region.color : "none"}
                    strokeWidth={isAssigned ? 2 : 0}
                    strokeDasharray={isAssigned ? "6 3" : "none"}
                  />
                  {isAssigned && i === 0 && (
                    <text
                      x={rect.x + rect.width / 2} y={rect.y + 14}
                      textAnchor="middle" fill={region.color}
                      fontSize="11" fontWeight="bold" opacity="0.6"
                    >
                      {region.label}
                    </text>
                  )}
                </g>
              ));
            })}
          </svg>
        </div>
        <Toolbar tool={tool} onToolChange={setTool} onClear={clear} />
      </div>
    );
  }
);
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/canvas/face-canvas.tsx
git commit -m "feat: add FaceCanvas component with region overlays"
```

---

### Task 10: FaceDrawingPhase component

**Files:**
- Create: `apps/web/src/components/phases/face-drawing-phase.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { FaceCanvas, type FaceCanvasHandle } from "@/components/canvas/face-canvas";
import { getRegionDef } from "@/lib/face-regions";
import type { FaceRegionId, FaceTemplateId } from "@/types/game";

interface FaceDrawingPhaseProps {
  round: number;
  totalRounds: number;
  regions: FaceRegionId[];
  faceTemplate: FaceTemplateId;
  endsAt: number;
  onSubmit: (imageDataUrl: string) => void;
}

export function FaceDrawingPhase({ round, totalRounds, regions, faceTemplate, endsAt, onSubmit }: FaceDrawingPhaseProps) {
  const canvasRef = useRef<FaceCanvasHandle>(null);
  const [submitted, setSubmitted] = useState(false);

  const doSubmit = useCallback(() => {
    if (submitted) return;
    const image = canvasRef.current?.exportImage();
    if (image) {
      onSubmit(image);
      setSubmitted(true);
    }
  }, [submitted, onSubmit]);

  useEffect(() => {
    if (!endsAt || submitted) return;
    const ms = endsAt - Date.now() - 500;
    if (ms <= 0) { doSubmit(); return; }
    const timer = setTimeout(doSubmit, ms);
    return () => clearTimeout(timer);
  }, [endsAt, submitted, doSubmit]);

  return (
    <div className="flex flex-col items-center gap-4 px-4 w-full">
      <div className="text-center">
        <p className="text-sm text-gray-500">Round {round}/{totalRounds}</p>
        <h2 className="text-xl font-bold">Monte o rosto!</h2>
        <div className="flex gap-2 justify-center mt-1">
          {regions.map((id) => {
            const def = getRegionDef(id);
            return (
              <span key={id} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: def.color + "22", color: def.color }}>
                {def.label}
              </span>
            );
          })}
        </div>
      </div>

      <FaceCanvas ref={canvasRef} assignedRegions={regions} faceTemplate={faceTemplate} />

      {!submitted ? (
        <button
          onClick={doSubmit}
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
git add apps/web/src/components/phases/face-drawing-phase.tsx
git commit -m "feat: add FaceDrawingPhase component"
```

---

### Task 11: FaceReveal component

**Files:**
- Create: `apps/web/src/components/phases/face-reveal.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";
import { useState, useRef, useEffect } from "react";
import { getFaceTemplate } from "@/components/face-templates";
import type { FaceDrawing } from "@/types/game";

interface FaceRevealProps {
  drawings: FaceDrawing[];
}

function CompositeCanvas({ drawing }: { drawing: FaceDrawing }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 600;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 800, 600);

    const loadAndDraw = async () => {
      for (const src of [drawing.player1ImageDataUrl, drawing.player2ImageDataUrl]) {
        if (!src) continue;
        const img = new Image();
        img.src = src;
        await new Promise<void>((resolve) => {
          img.onload = () => { ctx.drawImage(img, 0, 0); resolve(); };
          img.onerror = () => resolve();
        });
      }
    };
    loadAndDraw();
  }, [drawing]);

  const Template = getFaceTemplate(drawing.faceTemplate);

  return (
    <div className="relative w-full bg-white rounded-xl overflow-hidden" style={{ aspectRatio: "800 / 600" }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.06 }}>
        <Template className="w-full h-full" />
      </div>
    </div>
  );
}

export function FaceReveal({ drawings }: FaceRevealProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (drawings.length === 0) {
    return <p className="text-gray-400">Nenhum desenho para mostrar.</p>;
  }

  const drawing = drawings[currentIndex];

  return (
    <div className="flex flex-col items-center gap-6 px-4 w-full max-w-lg">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Resultado!</h2>
        <p className="text-gray-400 text-sm">Round {drawing.round} de {drawings.length}</p>
      </div>

      <CompositeCanvas drawing={drawing} />

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
git add apps/web/src/components/phases/face-reveal.tsx
git commit -m "feat: add FaceReveal component with image compositing"
```

---

### Task 12: ModeSelector — face-builder option + template picker

**Files:**
- Modify: `apps/web/src/components/lobby/mode-selector.tsx`

- [ ] **Step 1: Add face-builder props and imports**

Add import:
```typescript
import type { FaceTemplateId } from "@/types/game";
import { FACE_TEMPLATE_LABELS } from "@/components/face-templates";
```

Extend `ModeSelectorProps`:
```typescript
interface ModeSelectorProps {
  gameMode: GameMode;
  totalRounds: number;
  turnDuration: number;
  faceTemplate: FaceTemplateId;
  onModeChange: (mode: GameMode) => void;
  onRoundsChange: (rounds: number) => void;
  onDurationChange: (seconds: number) => void;
  onFaceTemplateChange: (template: FaceTemplateId) => void;
}
```

Update destructuring to include `faceTemplate, onFaceTemplateChange`.

- [ ] **Step 2: Add Face Builder button**

Add a third button after Split Body:
```tsx
<button
  onClick={() => onModeChange("face-builder")}
  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
    gameMode === "face-builder"
      ? "bg-green-600 text-white"
      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
  }`}
>
  Face Builder (2)
</button>
```

- [ ] **Step 3: Add rounds selector for face-builder**

Change the rounds section condition from `{gameMode === "split-body" && (` to `{(gameMode === "split-body" || gameMode === "face-builder") && (`.

- [ ] **Step 4: Add face template picker**

After the rounds selector, add:
```tsx
{gameMode === "face-builder" && (
  <div className="flex items-center justify-between px-2">
    <span className="text-sm text-gray-400">Moldura</span>
    <div className="flex gap-1">
      {(Object.entries(FACE_TEMPLATE_LABELS) as [FaceTemplateId, string][]).map(([id, label]) => (
        <button
          key={id}
          onClick={() => onFaceTemplateChange(id)}
          className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
            faceTemplate === id
              ? "bg-green-600 text-white"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/lobby/mode-selector.tsx
git commit -m "feat: add face-builder mode to ModeSelector with template picker"
```

---

### Task 13: Landing hero — faceTemplate state + sessionStorage

**Files:**
- Modify: `apps/web/src/components/landing/hero.tsx`

- [ ] **Step 1: Add faceTemplate state**

Add import:
```typescript
import type { FaceTemplateId } from "@/types/game";
```

Add state:
```typescript
const [faceTemplate, setFaceTemplate] = useState<FaceTemplateId>("masculine");
```

- [ ] **Step 2: Store faceTemplate in sessionStorage**

In `handleCreate`, add after the turnDuration line:
```typescript
sessionStorage.setItem("scrawl-faceTemplate", faceTemplate);
```

- [ ] **Step 3: Pass props to ModeSelector**

Add `faceTemplate={faceTemplate}` and `onFaceTemplateChange={setFaceTemplate}` to the ModeSelector component.

- [ ] **Step 4: Update create button text**

Change the button text conditional to:
```tsx
{gameMode === "party" ? "Create Party" : gameMode === "split-body" ? "Create Split Body" : "Create Face Builder"}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/landing/hero.tsx
git commit -m "feat: add face-builder option to landing page"
```

---

### Task 14: Game state hook — handle face messages

**Files:**
- Modify: `apps/web/src/hooks/use-game-state.ts`

- [ ] **Step 1: Add face state fields**

Add imports: `FaceDrawing, FaceRegionId, FaceTemplateId`.

Add to `GameState` interface:
```typescript
faceRegions: FaceRegionId[];
faceTemplate: FaceTemplateId | null;
faceRound: number;
faceDrawings: FaceDrawing[];
```

Add to `initialState`:
```typescript
faceRegions: [],
faceTemplate: null,
faceRound: 0,
faceDrawings: [],
```

- [ ] **Step 2: Add message handlers**

In the `onMessage` switch, add:

```typescript
case "face-round-start":
  setState((s) => ({
    ...s,
    faceRound: data.round,
    faceRegions: data.regions,
    faceTemplate: data.faceTemplate,
    error: null,
  }));
  break;

case "face-round-end":
  setState((s) => ({
    ...s,
    faceRegions: [],
  }));
  break;

case "face-final-results":
  setState((s) => ({
    ...s,
    faceDrawings: data.drawings,
  }));
  break;
```

- [ ] **Step 3: Add submitFaceDrawing callback**

```typescript
const submitFaceDrawing = useCallback((imageDataUrl: string) => {
  send({ type: "submit-face-drawing", imageDataUrl });
}, []);
```

- [ ] **Step 4: Update createRoom signature**

Change to:
```typescript
const createRoom = useCallback((nickname: string, gameMode?: GameMode, totalRounds?: number, turnDuration?: number, faceTemplate?: FaceTemplateId) => {
  send({ type: "create-room", nickname, gameMode, totalRounds, turnDuration, faceTemplate });
}, []);
```

- [ ] **Step 5: Add to return object**

Add `submitFaceDrawing` to the return object.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/hooks/use-game-state.ts
git commit -m "feat: handle face-builder messages in game state hook"
```

---

### Task 15: Game controller — route face phases

**Files:**
- Modify: `apps/web/src/components/game/game-controller.tsx`

- [ ] **Step 1: Add imports**

```typescript
import { FaceDrawingPhase } from "@/components/phases/face-drawing-phase";
import { FaceReveal } from "@/components/phases/face-reveal";
```

- [ ] **Step 2: Update timer bar exclusion**

Add `"face-final"` to the phase exclusion:
```typescript
phase !== "split-final" && phase !== "face-final" && (
```

- [ ] **Step 3: Add face-drawing phase rendering**

After the split-final block, add:
```tsx
{phase === "face-drawing" && props.faceRegions.length > 0 && props.faceTemplate && (
  <FaceDrawingPhase
    key={`face-${props.faceRound}`}
    round={props.faceRound}
    totalRounds={roomState.totalRounds}
    regions={props.faceRegions}
    faceTemplate={props.faceTemplate}
    endsAt={roomState.phaseEndsAt}
    onSubmit={props.submitFaceDrawing}
  />
)}

{phase === "face-final" && (
  <FaceReveal drawings={props.faceDrawings} />
)}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/game/game-controller.tsx
git commit -m "feat: route face-builder phases in game controller"
```

---

### Task 16: Room page + Lobby — wire faceTemplate

**Files:**
- Modify: `apps/web/src/app/room/[code]/page.tsx`
- Modify: `apps/web/src/components/lobby/lobby.tsx`

- [ ] **Step 1: Room page — read faceTemplate from sessionStorage**

In `page.tsx`, update the create room block:
```typescript
const faceTemplate = sessionStorage.getItem("scrawl-faceTemplate") || "masculine";
gameState.createRoom(nickname, gameMode, totalRounds, turnDuration, faceTemplate);
```

- [ ] **Step 2: Lobby — show face-builder info**

In `lobby.tsx`, add `FaceTemplateId` import and add `faceTemplate?: FaceTemplateId` to `LobbyProps`.

Update the mode detection:
```typescript
const isSplitBody = gameMode === "split-body";
const isFaceBuilder = gameMode === "face-builder";
const isTwoPlayerMode = isSplitBody || isFaceBuilder;
const minPlayers = isTwoPlayerMode ? 2 : 4;
const maxPlayers = isTwoPlayerMode ? 2 : 10;
```

Add badge for face-builder (after the split-body badge):
```tsx
{isFaceBuilder && (
  <div className="text-center">
    <span className="inline-block px-3 py-1 bg-green-600/20 text-green-400 rounded-full text-sm font-medium">
      Face Builder Mode
    </span>
  </div>
)}
```

Update start button text:
```tsx
{isFaceBuilder ? "Start Face Builder" : isSplitBody ? "Start Split Body" : "Start Game"}
```

Update the `canStart` logic and player count text to use `isTwoPlayerMode`.

- [ ] **Step 3: Pass faceTemplate from GameController to Lobby**

In `game-controller.tsx`, pass `faceTemplate` to the Lobby:
```tsx
faceTemplate={roomState.faceTemplate}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/room/[code]/page.tsx apps/web/src/components/lobby/lobby.tsx apps/web/src/components/game/game-controller.tsx
git commit -m "feat: wire faceTemplate through room page and lobby"
```

---

### Task 17: TypeScript compilation check

- [ ] **Step 1: Check server compilation**

```bash
cd apps/ws-server && npx tsc --noEmit
```

Fix any type errors.

- [ ] **Step 2: Check client compilation**

```bash
cd apps/web && npx tsc --noEmit
```

Fix any type errors.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A && git commit -m "fix: resolve TypeScript errors for face-builder mode"
```

---

### Task 18: Manual integration test

- [ ] **Step 1: Start servers**

```bash
cd apps/ws-server && npx tsx src/server.ts &
cd apps/web && npm run dev &
```

- [ ] **Step 2: Test face-builder flow**

1. Open http://localhost:3000 in two browser tabs
2. Tab 1: Enter nickname, select "Face Builder (2)", choose a template, set 1 round, create room
3. Tab 2: Enter nickname, join with room code
4. Tab 1: Start game
5. Both tabs: verify you can only draw in assigned regions (3 regions each)
6. Both tabs: submit drawings
7. Verify reveal shows composited face with both players' drawings

- [ ] **Step 3: Verify party and split-body modes still work**

Test that existing modes are not broken by the changes.
