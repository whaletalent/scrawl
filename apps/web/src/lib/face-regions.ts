import type { FaceRegionId } from "@/types/game";

export const FACE_ELLIPSE = { cx: 400, cy: 280, rx: 200, ry: 250 };

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceRegionDef {
  id: FaceRegionId;
  label: string;
  color: string;
  rects: Rect[];
  isHairRegion?: boolean;
}

export const FACE_REGIONS: FaceRegionDef[] = [
  {
    id: "hair",
    label: "Cabelo",
    color: "#8b5cf6",
    rects: [],
    isHairRegion: true,
  },
  {
    id: "ears",
    label: "Orelhas",
    color: "#3b82f6",
    rects: [
      { x: 165, y: 200, width: 50, height: 120 },
      { x: 585, y: 200, width: 50, height: 120 },
    ],
  },
  {
    id: "eyes",
    label: "Olhos",
    color: "#22c55e",
    rects: [{ x: 215, y: 200, width: 370, height: 80 }],
  },
  {
    id: "nose",
    label: "Nariz",
    color: "#f97316",
    rects: [{ x: 320, y: 280, width: 160, height: 100 }],
  },
  {
    id: "mouth",
    label: "Boca",
    color: "#ef4444",
    rects: [{ x: 270, y: 380, width: 260, height: 90 }],
  },
  {
    id: "shoulders",
    label: "Ombros",
    color: "#eab308",
    rects: [{ x: 120, y: 520, width: 560, height: 70 }],
  },
];

const SHOULDERS_RECT = { x: 120, y: 520, width: 560, height: 70 };

function isInsideEllipse(px: number, py: number): boolean {
  const { cx, cy, rx, ry } = FACE_ELLIPSE;
  return ((px - cx) ** 2) / (rx ** 2) + ((py - cy) ** 2) / (ry ** 2) <= 1;
}

function isInsideRect(px: number, py: number, r: Rect): boolean {
  return px >= r.x && px <= r.x + r.width && py >= r.y && py <= r.y + r.height;
}

export function isPointInRegion(px: number, py: number, region: FaceRegionDef): boolean {
  if (region.isHairRegion) {
    if (isInsideRect(px, py, SHOULDERS_RECT)) return false;
    if (!isInsideEllipse(px, py)) return px >= 0 && px <= 800 && py >= 0 && py <= 600;
    return py < 200;
  }
  return region.rects.some((r) => isInsideRect(px, py, r));
}

export function getRegionDef(id: FaceRegionId): FaceRegionDef {
  return FACE_REGIONS.find((r) => r.id === id)!;
}
