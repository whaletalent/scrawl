import type { Rect } from "./seam-geometry";

/** The canvas cropped to `strip` (100×600 logical px), as a PNG data URL. */
export function cropStrip(canvas: HTMLCanvasElement, strip: Rect): string {
  const out = document.createElement("canvas");
  out.width = strip.width;
  out.height = strip.height;
  const ctx = out.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(
    canvas,
    strip.x,
    strip.y,
    strip.width,
    strip.height,
    0,
    0,
    strip.width,
    strip.height,
  );
  return out.toDataURL("image/png");
}
