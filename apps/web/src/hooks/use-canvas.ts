"use client";
import { useRef, useState, useCallback, useEffect } from "react";
import { clearCanvas } from "@/lib/canvas-utils";

export interface CanvasTool {
  type: "brush" | "eraser";
  color: string;
  size: number;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

export function useCanvas(side: "left" | "right" | "top" | "bottom" | "full") {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
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

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const point = getPoint(e);
      if (!point) return;
      isDrawing.current = true;
      lastPoint.current = point;
    },
    [getPoint]
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing.current || !lastPoint.current) return;
      const point = getPoint(e);
      if (!point) return;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx) return;

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
    [getPoint, tool]
  );

  const stopDrawing = useCallback(() => {
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
