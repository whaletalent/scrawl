# Face Builder Mode — Design Spec

## Overview

New game mode "face-builder" for Scrawl. Two players collaboratively draw a face by each being assigned random facial feature regions. The humor comes from the mismatched, uncoordinated results.

## Game Flow

- **Players**: exactly 2 (same as split-body)
- **Room creation**: creator selects face template (masculine, feminine, monster, etc.) and number of rounds (1-5)
- **Turn duration**: configurable (reuses existing `turnDuration` setting)
- **Each round**:
  1. Server shuffles 6 face regions, assigns 3 to each player
  2. Both players draw simultaneously on the same 800x600 canvas, but can only draw in their assigned regions
  3. Auto-submit 500ms before timer expires (reuses existing mechanism)
  4. When both submit, server stores both images and advances
- **Final reveal**: shows all combined faces with navigation between rounds

## Face Templates

Predefined SVG face outlines used as background guides. Each template is an elliptical head shape with neck. Templates:

| ID | Label |
|---|---|
| `masculine` | Masculino |
| `feminine` | Feminino |
| `monster` | Monstro |
| `alien-face` | Alien |
| `robot-face` | Robo |

The template defines the head ellipse outline (dashed stroke, low opacity). All templates use the same region coordinates — only the outline shape/decoration differs.

## Face Regions

6 regions, split 3+3 each round:

| ID | Label | Type | Bounds (x, y, w, h) |
|---|---|---|---|
| `hair` | Cabelo + Testa | inverted | Everything outside face ellipse + forehead area (inside ellipse, y < 200) |
| `ears` | Orelhas | multi-rect | Left: (165, 200, 50, 120), Right: (585, 200, 50, 120) |
| `eyes` | Olhos | rect | (215, 200, 370, 80) |
| `nose` | Nariz | rect | (320, 280, 160, 100) |
| `mouth` | Boca | rect | (270, 380, 260, 90) |
| `shoulders` | Ombros | rect | (120, 520, 560, 70) |

### Special regions

- **Hair**: Inverted mask — drawable area is everything OUTSIDE the face ellipse (cx=400, cy=280, rx=200, ry=250) PLUS the forehead inside the ellipse (above y=200). Excludes the shoulders region.
- **Ears**: Two separate rectangles that behave as a single logical region. Same player always draws both ears.
- **Eyes**: Extends laterally close to ears to allow glasses, masks, wide eyebrows.
- **Nose**: Vertically touches eyes (top at y=280) and mouth (bottom at y=380). No gap.

## Canvas Architecture Changes

### Current: single `side` prop
```typescript
useCanvas(side: "left" | "right" | "top" | "bottom" | "full")
```

### New: support `regions` mode
```typescript
useCanvas(side: "left" | "right" | "top" | "bottom" | "full")
// OR
useCanvas("regions", regions: FaceRegion[])
```

The hook needs to support an array of `FaceRegion` objects, each defining a drawable area. Point validation (`getPoint`) checks against ALL assigned regions. For the `hair` region, validation uses an inverted ellipse test (point is outside the ellipse OR in the forehead zone).

### Drawing constraints

- Brush/eraser: stroke only within assigned regions
- Shapes (line, circle, rectangle): clipped to the region the start point is in
- Flood fill: bounded to the region the click point is in
- Canvas export: exports full 800x600 canvas (white background). Server composites both players' exports by overlaying them.

### Visual overlay

During drawing, non-assigned regions are darkened (semi-transparent overlay). Assigned regions show a subtle colored border. The face template outline renders at low opacity behind everything.

Region labels ("Olhos", "Nariz", etc.) appear as small text in each assigned region.

## Data Model

### Server types

```typescript
type FaceTemplateId = "masculine" | "feminine" | "monster" | "alien-face" | "robot-face";

interface FaceRegionAssignment {
  regionId: string;     // "hair" | "ears" | "eyes" | "nose" | "mouth" | "shoulders"
  playerId: string;
}

interface FaceDrawing {
  round: number;
  faceTemplate: FaceTemplateId;
  assignments: FaceRegionAssignment[];
  player1Id: string;
  player2Id: string;
  player1ImageDataUrl: string | null;
  player2ImageDataUrl: string | null;
}
```

### GameMode union
```typescript
type GameMode = "party" | "split-body" | "face-builder";
```

### Room additions
```typescript
interface Room {
  // ... existing fields
  faceTemplate: FaceTemplateId;
  faceDrawings: FaceDrawing[];
}
```

## Message Protocol

### Client → Server
```typescript
| { type: "create-room"; nickname: string; gameMode?: GameMode; totalRounds?: number; turnDuration?: number; faceTemplate?: FaceTemplateId }
| { type: "submit-face-drawing"; imageDataUrl: string }
```

### Server → Client
```typescript
| { type: "face-round-start"; round: number; regions: string[]; faceTemplate: FaceTemplateId; totalRounds: number }
| { type: "face-round-end"; round: number }
| { type: "face-final-results"; drawings: FaceDrawing[] }
```

`regions` in `face-round-start` is the array of region IDs assigned to THIS player (3 items).

## UI Components

### FaceDrawingPhase
- Props: `round`, `totalRounds`, `regions: string[]`, `faceTemplate`, `endsAt`, `onSubmit`
- Renders `DrawingCanvas` with face-specific region configuration
- Shows assigned region labels and colors
- Auto-submits before timer

### FaceReveal
- Props: `drawings: FaceDrawing[]`
- Composites both player images by overlaying them on a white canvas
- Shows face template outline at low opacity behind
- Navigation between rounds (same pattern as SplitReveal)

### ModeSelector updates
- Add "Face Builder (2)" button
- When face-builder selected, show face template picker (icon buttons for each template)
- Rounds selector (1-5) same as split-body

### Lobby updates
- Show "Face Builder Mode" badge and selected template name when applicable
- Same 2-player requirement as split-body

## Reveal Compositing

Both players export their full 800x600 canvas. In FaceReveal, composite them:

1. Start with white 800x600 background
2. Draw player 1's image
3. Draw player 2's image on top (white pixels from player 2 won't cover player 1's drawing because both start from white canvas — need to handle transparency)

**Transparency approach**: When exporting, replace white pixels with transparent. This way when overlaying, only the drawn content from each player shows through.

Alternative: export only the assigned regions (crop each region and send separately). This is more complex but avoids the transparency issue.

**Chosen approach**: Export full canvas but make white pixels transparent before sending. This keeps the export/submission simple (single image) while enabling clean compositing.

## Implementation Notes

- Reuse as much split-body infrastructure as possible (game flow, timer, auto-submit, reveal navigation)
- The `useCanvas` hook is the biggest change — needs to support multiple non-contiguous regions
- Face template SVGs are simple head outlines, similar to existing silhouette components
- The `hair` region requires special hit-testing (inverted ellipse) rather than simple rectangle bounds
