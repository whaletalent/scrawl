# Split Body Mode — Design Spec

## Overview

New game mode for Scrawl where exactly 2 players collaborate to draw a character, each drawing half of the body (top or bottom) without seeing the other's work. Results are revealed after all rounds complete.

## Game Flow

```
lobby → split-drawing → (repeat N rounds) → split-final
```

### Lobby
- Host selects game mode: "Party" (existing) or "Split Body" (new)
- Mode is set at room creation and cannot be changed after
- Split Body: host configures number of rounds (1–5, default 3)
- Requires exactly 2 players to start (not 4+ like Party mode)
- Room state includes `gameMode` and `totalRounds`

### Split Drawing Phase (per round)
- Duration: 90 seconds (same as Party mode drawing phase)
- Each player draws on one half of the canvas (top or bottom)
- Sides alternate each round: odd rounds → host draws top; even rounds → host draws bottom
- A silhouette SVG appears at ~8% opacity as a drawing guide
- Silhouette is randomly selected from a pool of 6 per round
- Both players see the same silhouette (server sends `silhouetteId`)
- Players cannot see each other's drawing during the phase
- When both players submit (or timer expires), the round ends
- If a player doesn't submit before the timer, their half is captured as-is (export canvas state) and stored — no blank halves

### Between Rounds
- Brief transition: server increments round, assigns new sides, picks new silhouette
- Sends `split-round-start` with new round info
- No intermediate reveal — drawings stay hidden until the final screen

### Split Final Phase
- All drawings from all rounds are revealed
- Navigation between rounds via Previous/Next buttons with dot indicators
- Each result shows the combined top + bottom drawing with the silhouette at ~4% opacity behind it
- A subtle dashed line marks where the two halves meet
- No voting, no scoring — purely for fun and laughter

## Data Model

### Server Types (additions to `types.ts`)

```typescript
type GameMode = "party" | "split-body";

interface SplitDrawing {
  round: number;
  topPlayerId: string;
  bottomPlayerId: string;
  topImageDataUrl: string | null;
  bottomImageDataUrl: string | null;
  silhouetteId: string;
}
```

### Room Changes

Add to existing `Room` type:
- `gameMode: GameMode` (default: `"party"`)
- `splitDrawings: SplitDrawing[]` (only used in split-body mode)

`totalRounds` already exists on Room — in split-body mode it's configurable (1–5) instead of fixed at 3.

### Messages

**Client → Server:**
- `create-room`: add optional `gameMode: GameMode` and `totalRounds: number`
- `submit-split-drawing`: `{ type: "submit-split-drawing", imageDataUrl: string }` — server determines which half based on current round assignment

**Server → Client:**
- `split-round-start`: `{ type: "split-round-start", round: number, side: "top" | "bottom", silhouetteId: string, totalRounds: number }`
- `split-round-end`: `{ type: "split-round-end", round: number }` — signals round complete, next starting
- `split-final-results`: `{ type: "split-final-results", drawings: SplitDrawing[] }` — all rounds' combined drawings

## Canvas

- Same dimensions as Party mode: 800×600 pixels
- Horizontal split at y=300 (top half: 0–299, bottom half: 300–599)
- Active half: normal white background, blue dashed border at division line, "SUA ÁREA" label
- Blocked half: darkened overlay (6% black) with "Área do parceiro" text
- Silhouette SVG rendered full-canvas at 8% opacity, visible through both halves
- Drawing input is clamped to the player's active half

### Side Assignment Logic

```
Round 1 (odd):  host → top,    guest → bottom
Round 2 (even): host → bottom, guest → top
Round 3 (odd):  host → top,    guest → bottom
...
```

## Silhouettes

Pool of 6 SVG silhouettes stored as React components in `components/silhouettes/`:

1. **Man** — standard proportions
2. **Woman** — dress silhouette
3. **Child** — shorter, bigger head
4. **Robot** — boxy proportions
5. **Alien** — big head, thin body
6. **Superhero** — cape, wide stance

Each is a `viewBox="0 0 200 400"` SVG. The server picks a random `silhouetteId` per round from this pool and sends it to both players.

## Frontend Components

### New Components

| Component | Path | Purpose |
|-----------|------|---------|
| `ModeSelector` | `components/lobby/mode-selector.tsx` | Toggle Party/Split Body + round count selector |
| `SplitDrawingPhase` | `components/phases/split-drawing-phase.tsx` | Drawing screen with top/bottom split, silhouette, timer |
| `SplitReveal` | `components/phases/split-reveal.tsx` | Final reveal screen, navigate between round results |
| Silhouette SVGs | `components/silhouettes/*.tsx` | 6 silhouette components + index with `getSilhouette(id)` |

### Modified Components

| Component | Change |
|-----------|--------|
| `use-canvas.ts` | Add `"top" \| "bottom"` to side type, clamp y-coordinates accordingly |
| `game-controller.tsx` | Add cases for `split-drawing` and `split-final` phases |
| `use-game-state.ts` | Handle `split-round-start`, `split-round-end`, `split-final-results` messages; store `splitDrawings`, `currentRound`, `side`, `silhouetteId` |
| `hero.tsx` | Pass `gameMode` and `totalRounds` when creating room |
| `lobby.tsx` | Show mode selector (host only), display mode and round count, require 2 players for split-body start |
| `types/game.ts` | Add `GameMode`, `SplitDrawing`, new phases, new messages |

### Reused As-Is

- `DrawingCanvas` + `Toolbar` — same component, just receives `"top"` or `"bottom"` as side
- `TimerBar` — unchanged

## Server Logic

### Game Engine Changes

Add to `game-engine.ts`:

- `startSplitGame(room)`: enters `split-drawing` phase, assigns sides for round 1, picks silhouette, sends `split-round-start` to both players
- `handleSplitDrawingSubmit(room, playerId, imageDataUrl)`: stores drawing in `splitDrawings`, checks if both submitted. If yes: if more rounds remain, start next round; otherwise enter `split-final`
- `startSplitFinal(room)`: sends `split-final-results` with all `splitDrawings`

### Handler Changes

Add to `handlers.ts`:
- Handle `submit-split-drawing` message type
- Modify `start-game` handler to check `gameMode` and call appropriate start function

### Phase Durations

```typescript
"split-drawing": 90_000,  // 90 seconds per round
"split-final": 0,         // no auto-advance, players browse at their pace
```

## Scope Boundaries

**In scope:**
- Mode selection in lobby
- Split-body drawing with top/bottom division
- 6 silhouette SVGs as guides
- Alternating sides per round
- Final reveal with round navigation
- All WebSocket communication for the new flow

**Out of scope:**
- Sharing/downloading combined drawings (future enhancement)
- Spectator mode
- More than 2 players in split-body
- Custom silhouette uploads
- Sound effects or animations during reveal
