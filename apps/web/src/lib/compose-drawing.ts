/**
 * Flattens a finished drawing into the single 800×600 PNG that goes to the
 * gallery. The game keeps each player's part as a separate image, so this
 * rebuilds what the final screen shows.
 */
import { loadFaceTemplateImage, loadImage } from "./face-compose";
import { drawableRects, seamLayout, type Rect } from "./seam-geometry";
import type {
  DrawingResult,
  FaceDrawing,
  SeamDrawing,
  SplitDrawing,
} from "@/types/game";

const WIDTH = 800;
const HEIGHT = 600;

type Part = {
  src: string | null | undefined;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Only these rects of the part are drawn (the whole part when absent). */
  clip?: Rect[];
};

async function compose(
  parts: Part[],
  background?: HTMLImageElement | null,
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  if (background) ctx.drawImage(background, 0, 0, WIDTH, HEIGHT);
  for (const part of parts) {
    if (!part.src) continue; // a half that was never sent stays blank paper
    const img = await loadImage(part.src).catch(() => null);
    if (!img) continue;
    ctx.save();
    if (part.clip) {
      ctx.beginPath();
      for (const r of part.clip) ctx.rect(r.x, r.y, r.width, r.height);
      ctx.clip();
    }
    ctx.drawImage(img, part.x, part.y, part.w, part.h);
    ctx.restore();
  }
  return canvas.toDataURL("image/png");
}

/** A kept live frame of a strip, drawn by the `member`-th author. */
export interface StackedFrame {
  strip: number;
  member: number;
  imageDataUrl: string;
}

/**
 * Racha-tema and Emenda: white paper, then for each member in order their
 * kept strip frames (in place) and their 800×600 layer, cut to their own
 * zone and strips so a modified client can't paint over the others. The
 * frames keep a member's strip work after a reload or after they left; where
 * they repeat the layer's strokes, drawing them twice changes nothing.
 * `frames` is absent from a server older than the live strips.
 */
export function composeLayers(
  layers: (string | null)[],
  frames: StackedFrame[] | undefined,
  size: 2 | 3,
): Promise<string> {
  const { strips } = seamLayout(size);
  const full = { x: 0, y: 0, w: WIDTH, h: HEIGHT };
  return compose(
    layers.flatMap((layer, member) => [
      ...(frames ?? [])
        .filter((f) => f.member === member && strips[f.strip])
        .map((f) => {
          const r = strips[f.strip];
          return {
            src: f.imageDataUrl,
            x: r.x,
            y: r.y,
            w: r.width,
            h: r.height,
          };
        }),
      { src: layer, ...full, clip: drawableRects(size, member) },
    ]),
  );
}

/** Racha-tema: the pair's two layers (A on the left) with the middle strip. */
export function composePartyDrawing(d: DrawingResult): Promise<string> {
  return composeLayers(
    [d.imageLeftDataUrl, d.imageRightDataUrl],
    d.stripFrames,
    2,
  );
}

/** Emenda: the group's layers, left to right. */
export function composeSeamDrawing(d: SeamDrawing): Promise<string> {
  return composeLayers(
    d.layers,
    d.stripFrames,
    d.memberIds.length === 3 ? 3 : 2,
  );
}

/** Split Body: top half over bottom half. */
export function composeSplitDrawing(d: SplitDrawing): Promise<string> {
  return compose([
    { src: d.topImageDataUrl, x: 0, y: 0, w: WIDTH, h: HEIGHT / 2 },
    { src: d.bottomImageDataUrl, x: 0, y: HEIGHT / 2, w: WIDTH, h: HEIGHT / 2 },
  ]);
}

/** Face Builder: the face template in its skin tone, then both players' layers. */
export async function composeFaceDrawing(d: FaceDrawing): Promise<string> {
  const full = { x: 0, y: 0, w: WIDTH, h: HEIGHT };
  return compose(
    [
      { src: d.player1ImageDataUrl, ...full },
      { src: d.player2ImageDataUrl, ...full },
    ],
    await loadFaceTemplateImage(d.faceTemplate, d.skinTone),
  );
}
