import type { Rect } from "./seam-geometry";

const TOLERANCE = 32;

/**
 * Flood fill on an RGBA buffer, in place. Only pixels inside one of the
 * `clip` rects are touched; the region is bounded by pixels whose colour
 * differs from the start pixel's (by more than a small tolerance). A start
 * outside the buffer or the clip does nothing.
 */
export function floodFill(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  rgba: [number, number, number, number],
  clip: Rect[],
): void {
  const sx = Math.floor(x);
  const sy = Math.floor(y);
  if (sx < 0 || sy < 0 || sx >= width || sy >= height) return;

  // Mask of the pixels the fill may touch.
  const allowed = new Uint8Array(width * height);
  for (const r of clip) {
    const x0 = Math.max(0, Math.floor(r.x));
    const x1 = Math.min(width, Math.floor(r.x + r.width));
    const y0 = Math.max(0, Math.floor(r.y));
    const y1 = Math.min(height, Math.floor(r.y + r.height));
    for (let py = y0; py < y1; py++)
      allowed.fill(1, py * width + x0, py * width + x1);
  }
  if (!allowed[sy * width + sx]) return;

  const s = (sy * width + sx) * 4;
  const target = [data[s], data[s + 1], data[s + 2], data[s + 3]];
  if (target.every((v, i) => v === rgba[i])) return;

  const matches = (i: number) =>
    Math.abs(data[i] - target[0]) <= TOLERANCE &&
    Math.abs(data[i + 1] - target[1]) <= TOLERANCE &&
    Math.abs(data[i + 2] - target[2]) <= TOLERANCE &&
    Math.abs(data[i + 3] - target[3]) <= TOLERANCE;

  const visited = new Uint8Array(width * height);
  const stack: number[] = [sx, sy];
  while (stack.length > 0) {
    const cy = stack.pop()!;
    const cx = stack.pop()!;
    if (cx < 0 || cy < 0 || cx >= width || cy >= height) continue;
    const p = cy * width + cx;
    if (visited[p] || !allowed[p]) continue;
    visited[p] = 1;
    const i = p * 4;
    if (!matches(i)) continue;
    data.set(rgba, i);
    stack.push(cx + 1, cy, cx - 1, cy, cx, cy + 1, cx, cy - 1);
  }
}

/**
 * The fill bucket on a player's layer: flood fills inside the one rect of
 * `rects` (a zone or a strip) that holds the start point, never into a
 * touching one, so a fill in the zone can't flood the shared strip and the
 * other way round. Returns that rect, or null when the start is in none.
 */
export function fillLayer(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  rgba: [number, number, number, number],
  rects: Rect[],
): Rect | null {
  const rect = rects.find(
    (r) => x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height,
  );
  if (!rect) return null;
  floodFill(data, width, height, x, y, rgba, [rect]);
  return rect;
}
