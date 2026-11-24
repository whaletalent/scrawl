// Shared seam geometry for the "Emenda" (seam) mode.
// Keep identical to apps/web/src/lib/seam-geometry.ts (copy of apps/ws-server/src/seam-geometry.ts).
// Canvas is 800x600 logical; the strips shared by neighbours are 100 wide.

export type Rect = { x: number; y: number; width: number; height: number };

export const STRIP_WIDTH = 100;

const CANVAS_HEIGHT = 600;

const rect = (from: number, to: number): Rect => ({
  x: from,
  y: 0,
  width: to - from,
  height: CANVAS_HEIGHT,
});

/** Zones are indexed by member; strips run left to right. */
export function seamLayout(size: 2 | 3): { zones: Rect[]; strips: Rect[] } {
  if (size === 2) {
    return {
      zones: [rect(0, 350), rect(450, 800)],
      strips: [rect(350, 450)],
    };
  }
  return {
    zones: [rect(0, 200), rect(300, 500), rect(600, 800)],
    strips: [rect(200, 300), rect(500, 600)],
  };
}

/** Indices of the strips that `member` touches. */
export function stripsOf(size: 2 | 3, member: number): number[] {
  const stripCount = size - 1;
  const result: number[] = [];
  // Strip i sits between member i and member i + 1.
  if (member - 1 >= 0 && member - 1 < stripCount) result.push(member - 1);
  if (member >= 0 && member < stripCount) result.push(member);
  return result;
}

/** The member on the other side of `strip`, or null if `member` doesn't touch it. */
export function neighbourAcross(
  size: 2 | 3,
  member: number,
  strip: number,
): number | null {
  if (!stripsOf(size, member).includes(strip)) return null;
  return member === strip ? strip + 1 : strip;
}

/** Everything `member` may draw on: own zone plus its strips. */
export function drawableRects(size: 2 | 3, member: number): Rect[] {
  const { zones, strips } = seamLayout(size);
  return [zones[member], ...stripsOf(size, member).map((s) => strips[s])];
}
