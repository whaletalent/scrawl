"use client";
import { useRef, useState, useCallback, useEffect } from "react";
import { clearCanvas } from "@/lib/canvas-utils";

export type ToolType = "brush" | "eraser" | "fill" | "line" | "circle" | "rectangle";

export interface CanvasTool {
  type: ToolType;
  color: string;
  size: number;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.replace("#", ""), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function useCanvas(side: "left" | "right" | "top" | "bottom" | "full") {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const shapeStart = useRef<{ x: number; y: number } | null>(null);
  const savedImageData = useRef<ImageData | null>(null);
  const [tool, setTool] = useState<CanvasTool>({ type: "brush", color: "#000000", size: 4 });

  const halfWidth = CANVAS_WIDTH / 2;
  const halfHeight = CANVAS_HEIGHT / 2;

  const drawableArea =
    side === "full"
      ? { x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT }
      : side === "left"
      ? { x: 0, y: 0, width: halfWidth, height: CANVAS_HEIGHT }
      : side === "right"
      ? { x: halfWidth, y: 0, width: halfWidth, height: CANVAS_HEIGHT }
      : side === "top"
      ? { x: 0, y: 0, width: CANVAS_WIDTH, height: halfHeight }
      : { x: 0, y: halfHeight, width: CANVAS_WIDTH, height: halfHeight };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (ctx) clearCanvas(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
  }, []);

  const getPoint = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
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

      if (x < drawableArea.x || x > drawableArea.x + drawableArea.width) return null;
      if (y < drawableArea.y || y > drawableArea.y + drawableArea.height) return null;

      return { x, y };
    },
    [drawableArea]
  );

  const floodFill = useCallback(
    (startX: number, startY: number, fillColor: string) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx || !canvas) return;

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      const w = canvas.width;
      const h = canvas.height;

      const sx = Math.floor(startX);
      const sy = Math.floor(startY);
      const idx = (sy * w + sx) * 4;
      const tR = data[idx], tG = data[idx + 1], tB = data[idx + 2], tA = data[idx + 3];

      const fill = hexToRgb(fillColor);
      if (tR === fill.r && tG === fill.g && tB === fill.b && tA === 255) return;

      const tolerance = 32;
      const minX = Math.floor(drawableArea.x);
      const maxX = Math.floor(drawableArea.x + drawableArea.width);
      const minY = Math.floor(drawableArea.y);
      const maxY = Math.floor(drawableArea.y + drawableArea.height);

      const visited = new Uint8Array(w * h);
      const stack: number[] = [sx, sy];

      while (stack.length > 0) {
        const cy = stack.pop()!;
        const cx = stack.pop()!;
        if (cx < minX || cx >= maxX || cy < minY || cy >= maxY) continue;

        const pi = cy * w + cx;
        if (visited[pi]) continue;
        visited[pi] = 1;

        const i = pi * 4;
        if (
          Math.abs(data[i] - tR) > tolerance ||
          Math.abs(data[i + 1] - tG) > tolerance ||
          Math.abs(data[i + 2] - tB) > tolerance ||
          Math.abs(data[i + 3] - tA) > tolerance
        ) continue;

        data[i] = fill.r;
        data[i + 1] = fill.g;
        data[i + 2] = fill.b;
        data[i + 3] = 255;

        stack.push(cx + 1, cy, cx - 1, cy, cx, cy + 1, cx, cy - 1);
      }

      ctx.putImageData(imgData, 0, 0);
    },
    [drawableArea]
  );

  const drawShape = useCallback(
    (ctx: CanvasRenderingContext2D, type: ToolType, from: { x: number; y: number }, to: { x: number; y: number }, color: string, size: number) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(drawableArea.x, drawableArea.y, drawableArea.width, drawableArea.height);
      ctx.clip();

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
          Math.abs(to.y - from.y)
        );
      }

      ctx.restore();
    },
    [drawableArea]
  );

  const isShapeTool = (t: ToolType) => t === "line" || t === "circle" || t === "rectangle";

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const point = getPoint(e);
      if (!point) return;

      if (tool.type === "fill") {
        floodFill(point.x, point.y, tool.color);
        return;
      }

      if (isShapeTool(tool.type)) {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (ctx && canvas) {
          savedImageData.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
        }
        shapeStart.current = point;
        isDrawing.current = true;
        return;
      }

      isDrawing.current = true;
      lastPoint.current = point;
    },
    [getPoint, tool, floodFill]
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing.current) return;
      const point = getPoint(e);
      if (!point) return;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx) return;

      if (isShapeTool(tool.type) && shapeStart.current && savedImageData.current) {
        ctx.putImageData(savedImageData.current, 0, 0);
        drawShape(ctx, tool.type, shapeStart.current, point, tool.color, tool.size);
        return;
      }

      if (!lastPoint.current) return;

      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(point.x, point.y);
      ctx.strokeStyle = tool.type === "eraser" ? "#ffffff" : tool.color;
      ctx.lineWidth = tool.type === "eraser" ? tool.size * 3 : tool.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      lastPoint.current = point;
    },
    [getPoint, tool, drawShape]
  );

  const stopDrawing = useCallback(() => {
    shapeStart.current = null;
    savedImageData.current = null;
    isDrawing.current = false;
    lastPoint.current = null;
  }, []);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(drawableArea.x, drawableArea.y, drawableArea.width, drawableArea.height);
  }, [drawableArea]);

  return {
    canvasRef,
    tool,
    setTool,
    startDrawing,
    draw,
    stopDrawing,
    clear,
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: CANVAS_HEIGHT,
    drawableArea,
  };
}
