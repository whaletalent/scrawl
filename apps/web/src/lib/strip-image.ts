import type { Rect } from "./seam-geometry";

/** The part of a 2D context `drawStrip` needs (a fake one in tests). */
interface DrawTarget<S> {
  drawImage(image: S, dx: number, dy: number, dw: number, dh: number): void;
  drawImage(
    image: S,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void;
}

/**
 * Paints `strip` of `layer` at the origin of `ctx`, over `kept` (the
 * player's own frame for that strip the server kept across a reload), so a
 * sent frame still carries the strokes made before the reload.
 */
export function drawStrip<S>(
  ctx: DrawTarget<S>,
  layer: S,
  strip: Rect,
  kept: S | null,
): void {
  if (kept) ctx.drawImage(kept, 0, 0, strip.width, strip.height);
  ctx.drawImage(
    layer,
    strip.x,
    strip.y,
    strip.width,
    strip.height,
    0,
    0,
    strip.width,
    strip.height,
  );
}

/**
 * The canvas cropped to `strip` (100×600 logical px), over the player's
 * kept frame when there is one, as a PNG data URL.
 */
export function cropStrip(
  canvas: HTMLCanvasElement,
  strip: Rect,
  kept: CanvasImageSource | null = null,
): string {
  const out = document.createElement("canvas");
  out.width = strip.width;
  out.height = strip.height;
  const ctx = out.getContext("2d");
  if (!ctx) return "";
  drawStrip<CanvasImageSource>(ctx, canvas, strip, kept);
  return out.toDataURL("image/png");
}
