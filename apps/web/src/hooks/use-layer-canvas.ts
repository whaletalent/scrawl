"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { floodFill } from "@/lib/flood-fill";
import type { Rect } from "@/lib/seam-geometry";
import type { CanvasTool, ToolType } from "./use-canvas";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

type Point = { x: number; y: number };

function hexToRgba(hex: string): [number, number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

const isShapeTool = (t: ToolType) =>
  t === "line" || t === "circle" || t === "rectangle";

const inside = (p: Point, r: Rect) =>
  p.x >= r.x && p.x < r.x + r.width && p.y >= r.y && p.y < r.y + r.height;

/** The box around a segment, grown by the stroke's half width. */
function segmentBox(a: Point, b: Point, width: number): Rect {
  const pad = width / 2 + 1;
  const x = Math.min(a.x, b.x) - pad;
  const y = Math.min(a.y, b.y) - pad;
  return {
    x,
    y,
    width: Math.abs(a.x - b.x) + pad * 2,
    height: Math.abs(a.y - b.y) + pad * 2,
  };
}

export interface LayerCanvasEvents {
  /** The layer changed inside `area` (null: anywhere). */
  onChange?(area: Rect | null): void;
  /** A stroke, fill or clear is finished. */
  onStrokeEnd?(): void;
}

/**
 * A transparent drawing layer clipped to `rects` (a player's zone and
 * strips). Whatever lies under it is HTML; nothing here can touch it: the
 * eraser cuts the layer to transparent and the fill bucket sees only the
 * layer's own pixels.
 */
export function useLayerCanvas(rects: Rect[], events: LayerCanvasEvents = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<Point | null>(null);
  const shapeStart = useRef<Point | null>(null);
  const shapeBox = useRef<Rect | null>(null);
  const savedImageData = useRef<ImageData | null>(null);
  const [tool, setTool] = useState<CanvasTool>({
    type: "brush",
    color: "#000000",
    size: 4,
  });

  const rectsRef = useRef(rects);
  const eventsRef = useRef(events);
  useEffect(() => {
    rectsRef.current = rects;
    eventsRef.current = events;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
  }, []);

  const context = () => canvasRef.current?.getContext("2d") ?? null;

  /** Point in logical coordinates, or null when off the canvas. */
  const getPoint = useCallback(
    (e: React.MouseEvent | React.TouchEvent): Point | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const box = canvas.getBoundingClientRect();
      let clientX: number, clientY: number;
      if ("touches" in e) {
        if (e.touches.length === 0) return null;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      const x = ((clientX - box.left) * CANVAS_WIDTH) / box.width;
      const y = ((clientY - box.top) * CANVAS_HEIGHT) / box.height;
      if (x < 0 || x > CANVAS_WIDTH || y < 0 || y > CANVAS_HEIGHT) return null;
      return { x, y };
    },
    [],
  );

  const clipTo = (ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();
    for (const r of rectsRef.current) ctx.rect(r.x, r.y, r.width, r.height);
    ctx.clip();
  };

  const drawShape = (
    ctx: CanvasRenderingContext2D,
    type: ToolType,
    from: Point,
    to: Point,
  ) => {
    ctx.save();
    clipTo(ctx);
    ctx.strokeStyle = tool.color;
    ctx.lineWidth = tool.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    if (type === "line") {
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
    } else if (type === "circle") {
      ctx.ellipse(
        (from.x + to.x) / 2,
        (from.y + to.y) / 2,
        Math.abs(to.x - from.x) / 2,
        Math.abs(to.y - from.y) / 2,
        0,
        0,
        Math.PI * 2,
      );
    } else {
      ctx.rect(
        Math.min(from.x, to.x),
        Math.min(from.y, to.y),
        Math.abs(to.x - from.x),
        Math.abs(to.y - from.y),
      );
    }
    ctx.stroke();
    ctx.restore();
  };

  const fill = (point: Point) => {
    const ctx = context();
    if (!ctx) return;
    const image = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    floodFill(
      image.data,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      point.x,
      point.y,
      hexToRgba(tool.color),
      rectsRef.current,
    );
    ctx.putImageData(image, 0, 0);
    // The fill stays inside the rect it started in or spreads to a touching
    // one, so any rect may have changed.
    eventsRef.current.onChange?.(null);
    eventsRef.current.onStrokeEnd?.();
  };

  const strokeTo = (point: Point) => {
    const ctx = context();
    const from = lastPoint.current;
    if (!ctx || !from) return;
    const eraser = tool.type === "eraser";
    const width = eraser ? tool.size * 3 : tool.size;
    ctx.save();
    clipTo(ctx);
    ctx.globalCompositeOperation = eraser ? "destination-out" : "source-over";
    ctx.strokeStyle = eraser ? "#000000" : tool.color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    ctx.restore();
    lastPoint.current = point;
    eventsRef.current.onChange?.(segmentBox(from, point, width));
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const point = getPoint(e);
    // A stroke starts only on the player's own paper.
    if (!point || !rectsRef.current.some((r) => inside(point, r))) return;

    if (tool.type === "fill") {
      fill(point);
      return;
    }

    if (isShapeTool(tool.type)) {
      const ctx = context();
      if (!ctx) return;
      savedImageData.current = ctx.getImageData(
        0,
        0,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
      );
      shapeStart.current = point;
      shapeBox.current = null;
      isDrawing.current = true;
      return;
    }

    isDrawing.current = true;
    lastPoint.current = point;
    // A tap leaves a dot.
    strokeTo(point);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    const point = getPoint(e);
    if (!point) return;

    if (
      isShapeTool(tool.type) &&
      shapeStart.current &&
      savedImageData.current
    ) {
      const ctx = context();
      if (!ctx) return;
      ctx.putImageData(savedImageData.current, 0, 0);
      drawShape(ctx, tool.type, shapeStart.current, point);
      // The area of this preview plus the one it replaced.
      const box = segmentBox(shapeStart.current, point, tool.size);
      const prev = shapeBox.current;
      shapeBox.current = prev
        ? {
            x: Math.min(prev.x, box.x),
            y: Math.min(prev.y, box.y),
            width:
              Math.max(prev.x + prev.width, box.x + box.width) -
              Math.min(prev.x, box.x),
            height:
              Math.max(prev.y + prev.height, box.y + box.height) -
              Math.min(prev.y, box.y),
          }
        : box;
      eventsRef.current.onChange?.(shapeBox.current);
      return;
    }

    strokeTo(point);
  };

  const stopDrawing = () => {
    const wasDrawing = isDrawing.current;
    shapeStart.current = null;
    shapeBox.current = null;
    savedImageData.current = null;
    isDrawing.current = false;
    lastPoint.current = null;
    if (wasDrawing) eventsRef.current.onStrokeEnd?.();
  };

  /** Clears the player's own paper only. */
  const clear = useCallback(() => {
    const ctx = context();
    if (!ctx) return;
    for (const r of rectsRef.current)
      ctx.clearRect(r.x, r.y, r.width, r.height);
    eventsRef.current.onChange?.(null);
    eventsRef.current.onStrokeEnd?.();
  }, []);

  /** The whole layer: a transparent 800×600 PNG. */
  const exportLayer = useCallback(
    () => canvasRef.current?.toDataURL("image/png") ?? "",
    [],
  );

  return {
    canvasRef,
    tool,
    setTool,
    startDrawing,
    draw,
    stopDrawing,
    clear,
    exportLayer,
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: CANVAS_HEIGHT,
  };
}
