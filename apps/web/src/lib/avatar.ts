import { loadFaceTemplateImage, loadImage } from "./face-compose";
import type { FaceTemplateId } from "@/types/game";

/** Avatars are square PNGs of this many pixels. */
export const AVATAR_SIZE = 256;

/** The 600×600 square of the 800×600 canvas that holds the face (its ellipse is centred at x=400). */
const CROP = { x: 100, y: 0, size: 600 };

/**
 * Flattens what the avatar editor shows — white background, face template in
 * `skinTone`, the player's transparent drawing — into the avatar PNG.
 */
export async function composeAvatar(
  drawingDataUrl: string,
  faceTemplate: FaceTemplateId,
  skinTone: string,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);

  const layers = [
    await loadFaceTemplateImage(faceTemplate, skinTone),
    await loadImage(drawingDataUrl).catch(() => null),
  ];
  for (const layer of layers) {
    if (!layer) continue;
    // The template is an SVG with only a viewBox: give it its 800×600 size
    // on an intermediate canvas so the crop below is in canvas coordinates.
    const full = document.createElement("canvas");
    full.width = 800;
    full.height = 600;
    full.getContext("2d")?.drawImage(layer, 0, 0, 800, 600);
    ctx.drawImage(
      full,
      CROP.x,
      CROP.y,
      CROP.size,
      CROP.size,
      0,
      0,
      AVATAR_SIZE,
      AVATAR_SIZE,
    );
  }

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/png",
    ),
  );
}
