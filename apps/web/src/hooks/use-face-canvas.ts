"use client";
import { useRef, useState, useCallback, useEffect } from "react";
import {
  FACE_ELLIPSE,
  isPointInRegion,
  getRegionDef,
  WHOLE_CANVAS,
  type FaceRegionDef,
} from "@/lib/face-regions";
import type { FaceRegionId } from "@/types/game";
import type { CanvasTool, ToolType } from "./use-canvas";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.replace("#", ""), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/**
 * `free` ignores `assignedRegionIds`: the whole canvas is one region, so
 * nothing is off-limits and strokes aren't cut at region borders.
 */
export function useFaceCanvas(
  assignedRegionIds: FaceRegionId[],
  { free = false }: { free?: boolean } = {},
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const shapeStart = useRef<{ x: number; y: number } | null>(null);
  const savedImageData = useRef<ImageData | null>(null);
  const activeRegion = useRef<FaceRegionDef | null>(null);
  const [tool, setTool] = useState<CanvasTool>({
    type: "brush",
    color: "#000000",
    size: 4,
  });

  // Undo/redo history
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateUndoRedoState = useCallback(() => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  const pushHistory = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    const snapshot = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    // Discard any redo states ahead of current index
    historyRef.current = historyRef.current.slice(
      0,
      historyIndexRef.current + 1,
    );
    historyRef.current.push(snapshot);
    // Cap history at 50 entries
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
    }
    historyIndexRef.current = historyRef.current.length - 1;
    updateUndoRedoState();
  }, [updateUndoRedoState]);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
    updateUndoRedoState();
  }, [updateUndoRedoState]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
    updateUndoRedoState();
  }, [updateUndoRedoState]);

  const assignedRegions = free
    ? [WHOLE_CANVAS]
    : assignedRegionIds.map(getRegionDef);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    // Canvas stays transparent — white bg + template are HTML layers behind it
    // Save initial blank state for undo
    pushHistory();
  }, []);

  const findRegion = useCallback(
    (x: number, y: number): FaceRegionDef | null => {
      for (const region of assignedRegions) {
        if (isPointInRegion(x, y, region)) return region;
      }
      return null;
    },
    [assignedRegionIds, free],
  );

  const getPoint = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;

    let clientX: number, clientY: number;
    if ("touches" in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    return { x, y };
  }, []);

  const floodFill = useCallback(
    (
      startX: number,
      startY: number,
      fillColor: string,
      region: FaceRegionDef,
    ) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx || !canvas) return;

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      const w = canvas.width;

      const sx = Math.floor(startX);
      const sy = Math.floor(startY);
      const idx = (sy * w + sx) * 4;
      const tR = data[idx],
        tG = data[idx + 1],
        tB = data[idx + 2],
        tA = data[idx + 3];

      const fill = hexToRgb(fillColor);
      if (tR === fill.r && tG === fill.g && tB === fill.b && tA === 255) return;

      const tolerance = 32;
      const visited = new Uint8Array(w * canvas.height);
      const stack: number[] = [sx, sy];

      while (stack.length > 0) {
        const cy = stack.pop()!;
        const cx = stack.pop()!;
        if (cx < 0 || cx >= w || cy < 0 || cy >= canvas.height) continue;

        const pi = cy * w + cx;
        if (visited[pi]) continue;
        visited[pi] = 1;

        if (!isPointInRegion(cx, cy, region)) continue;

        const i = pi * 4;
        if (
          Math.abs(data[i] - tR) > tolerance ||
          Math.abs(data[i + 1] - tG) > tolerance ||
          Math.abs(data[i + 2] - tB) > tolerance ||
          Math.abs(data[i + 3] - tA) > tolerance
        )
          continue;

        data[i] = fill.r;
        data[i + 1] = fill.g;
        data[i + 2] = fill.b;
        data[i + 3] = 255;

        stack.push(cx + 1, cy, cx - 1, cy, cx, cy + 1, cx, cy - 1);
      }

      ctx.putImageData(imgData, 0, 0);
    },
    [],
  );

  const isShapeTool = (t: ToolType) =>
    t === "line" || t === "circle" || t === "rectangle";

  const clipToRegion = useCallback(
    (ctx: CanvasRenderingContext2D, region: FaceRegionDef) => {
      ctx.beginPath();
      if (region.isHairRegion) {
        // Hair = full canvas minus shoulders rect, then only outside ellipse + forehead inside ellipse
        // Approximate with: full canvas rect, then cut with clip
        const e = FACE_ELLIPSE;
        // Outer area: full canvas
        ctx.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        // Subtract ellipse body (below forehead y=200) by drawing ellipse counterclockwise
        // Instead, use a simpler approach: add forehead rect + outer rects
        ctx.rect(0, 0, CANVAS_WIDTH, 200); // everything above forehead line
        ctx.rect(0, 0, e.cx - e.rx, CANVAS_HEIGHT); // left of ellipse
        ctx.rect(e.cx + e.rx, 0, CANVAS_WIDTH - (e.cx + e.rx), CANVAS_HEIGHT); // right of ellipse
      } else {
        for (const r of region.rects) {
          ctx.rect(r.x, r.y, r.width, r.height);
        }
      }
      ctx.clip();
    },
    [],
  );

  const drawShape = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      type: ToolType,
      from: { x: number; y: number },
      to: { x: number; y: number },
      color: string,
      size: number,
      region: FaceRegionDef,
    ) => {
      ctx.save();
      clipToRegion(ctx, region);

      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (type === "line") {
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      } else if (type === "circle") {
        const rx = Math.abs(to.x - from.x) / 2;
        const ry = Math.abs(to.y - from.y) / 2;
        const cx = (from.x + to.x) / 2;
        const cy = (from.y + to.y) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (type === "rectangle") {
        ctx.strokeRect(
          Math.min(from.x, to.x),
          Math.min(from.y, to.y),
          Math.abs(to.x - from.x),
          Math.abs(to.y - from.y),
        );
      }

      ctx.restore();
    },
    [clipToRegion],
  );

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const point = getPoint(e);
      if (!point) return;

      const region = findRegion(point.x, point.y);
      if (!region) return;
      activeRegion.current = region;

      if (tool.type === "fill") {
        floodFill(point.x, point.y, tool.color, region);
        pushHistory();
        return;
      }

      if (isShapeTool(tool.type)) {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (ctx && canvas) {
          savedImageData.current = ctx.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
          );
        }
        shapeStart.current = point;
        isDrawing.current = true;
        return;
      }

      isDrawing.current = true;
      lastPoint.current = point;
    },
    [getPoint, tool, findRegion, floodFill],
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing.current) return;
      const point = getPoint(e);
      if (!point) return;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx) return;

      const region = activeRegion.current;
      if (!region) return;

      if (
        isShapeTool(tool.type) &&
        shapeStart.current &&
        savedImageData.current
      ) {
        ctx.putImageData(savedImageData.current, 0, 0);
        drawShape(
          ctx,
          tool.type,
          shapeStart.current,
          point,
          tool.color,
          tool.size,
          region,
        );
        return;
      }

      if (!isPointInRegion(point.x, point.y, region)) return;
      if (!lastPoint.current) return;

      if (tool.type === "eraser") {
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
        ctx.lineTo(point.x, point.y);
        ctx.strokeStyle = "rgba(0,0,0,1)";
        ctx.lineWidth = tool.size * 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
        ctx.lineTo(point.x, point.y);
        ctx.strokeStyle = tool.color;
        ctx.lineWidth = tool.size;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
      }

      lastPoint.current = point;
    },
    [getPoint, tool, drawShape],
  );

  const stopDrawing = useCallback(() => {
    if (isDrawing.current) {
      pushHistory();
    }
    shapeStart.current = null;
    savedImageData.current = null;
    activeRegion.current = null;
    isDrawing.current = false;
    lastPoint.current = null;
  }, [pushHistory]);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    for (const region of assignedRegions) {
      if (region.isHairRegion) {
        const imgData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        const data = imgData.data;
        for (let y = 0; y < CANVAS_HEIGHT; y++) {
          for (let x = 0; x < CANVAS_WIDTH; x++) {
            if (isPointInRegion(x, y, region)) {
              const i = (y * CANVAS_WIDTH + x) * 4;
              data[i] = 0;
              data[i + 1] = 0;
              data[i + 2] = 0;
              data[i + 3] = 0;
            }
          }
        }
        ctx.putImageData(imgData, 0, 0);
      } else {
        for (const r of region.rects) {
          ctx.clearRect(r.x, r.y, r.width, r.height);
        }
      }
    }
    pushHistory();
  }, [assignedRegions, pushHistory]);

  // Keyboard shortcuts: Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  const exportImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return "";
    // Canvas is already transparent where not drawn — export directly
    return canvas.toDataURL("image/png");
  }, []);

  return {
    canvasRef,
    tool,
    setTool,
    startDrawing,
    draw,
    stopDrawing,
    clear,
    undo,
    redo,
    canUndo,
    canRedo,
    exportImage,
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: CANVAS_HEIGHT,
  };
}
