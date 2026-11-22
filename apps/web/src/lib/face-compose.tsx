import { renderToStaticMarkup } from "react-dom/server";
import { getFaceTemplate } from "@/components/face-templates";
import type { FaceTemplateId } from "@/types/game";

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * A face template, filled with `skinTone`, as an image that can be drawn onto
 * a canvas. Resolves null if the browser can't rasterize the SVG.
 */
export async function loadFaceTemplateImage(
  faceTemplate: FaceTemplateId,
  skinTone: string,
): Promise<HTMLImageElement | null> {
  const Template = getFaceTemplate(faceTemplate);
  if (!Template) return null;
  let svg = renderToStaticMarkup(
    <Template className="" fillColor={skinTone} />,
  );
  // An SVG loaded as an image through a data URL must declare its namespace.
  if (!svg.includes("xmlns"))
    svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  try {
    return await loadImage(
      "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg),
    );
  } catch {
    return null;
  }
}
