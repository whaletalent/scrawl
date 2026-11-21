/**
 * Flattens a finished drawing into the single 800×600 PNG that goes to the
 * gallery. The game keeps each player's part as a separate image, so this
 * rebuilds what the final screen shows.
 */
import { loadFaceTemplateImage, loadImage } from "./face-compose";
import type { DrawingResult, FaceDrawing, SplitDrawing } from "@/types/game";

const WIDTH = 800;
const HEIGHT = 600;

type Part = {
  src: string | null | undefined;
  x: number;
  y: number;
  w: number;
  h: number;
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
    if (img) ctx.drawImage(img, part.x, part.y, part.w, part.h);
  }
  return canvas.toDataURL("image/png");
}

/** Party: the two halves side by side. */
export function composePartyDrawing(d: DrawingResult): Promise<string> {
  return compose([
    { src: d.imageLeftDataUrl, x: 0, y: 0, w: WIDTH / 2, h: HEIGHT },
    { src: d.imageRightDataUrl, x: WIDTH / 2, y: 0, w: WIDTH / 2, h: HEIGHT },
  ]);
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
