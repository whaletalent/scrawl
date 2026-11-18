"use client";
import { useCanvas } from "@/hooks/use-canvas";
import { Toolbar } from "./toolbar";
import React, { forwardRef, useImperativeHandle } from "react";

interface DrawingCanvasProps {
  side: "left" | "right" | "top" | "bottom" | "full";
  silhouetteOverlay?: React.ReactNode;
}

export interface DrawingCanvasHandle {
  exportImage: () => string;
}

export const DrawingCanvas = forwardRef<
  DrawingCanvasHandle,
  DrawingCanvasProps
>(function DrawingCanvas({ side, silhouetteOverlay }, ref) {
  const {
    canvasRef,
    tool,
    setTool,
    startDrawing,
    draw,
    stopDrawing,
    clear,
    canvasWidth,
    canvasHeight,
    drawableArea,
  } = useCanvas(side);

  useImperativeHandle(ref, () => ({
    exportImage: () => {
      const canvas = canvasRef.current;
      if (!canvas) return "";
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = drawableArea.width;
      tempCanvas.height = drawableArea.height;
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) return "";
      tempCtx.drawImage(
        canvas,
        drawableArea.x,
        drawableArea.y,
        drawableArea.width,
        drawableArea.height,
        0,
        0,
        drawableArea.width,
        drawableArea.height,
      );
      return tempCanvas.toDataURL("image/png");
    },
  }));

  return (
    <div className="flex flex-col gap-3 items-center w-full">
      <div className="relative w-full" style={{ maxWidth: canvasWidth }}>
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full rounded-xl border-2 border-gray-700 cursor-crosshair touch-none"
          style={{ aspectRatio: `${canvasWidth} / ${canvasHeight}` }}
        />
        {silhouetteOverlay && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ opacity: 0.08 }}
          >
            {silhouetteOverlay}
          </div>
        )}
        {side !== "full" && (side === "left" || side === "right") && (
          <>
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-gray-600 opacity-50 pointer-events-none"
              style={{ left: "50%" }}
            />
            <div
              className="absolute top-0 bottom-0 bg-gray-900/30 pointer-events-none rounded-xl"
              style={
                side === "left"
                  ? { left: "50%", right: 0 }
                  : { left: 0, right: "50%" }
              }
            />
          </>
        )}
        {side !== "full" && (side === "top" || side === "bottom") && (
          <>
            <div
              className="absolute left-0 right-0 h-0.5 border-t-2 border-dashed border-blue-500 opacity-50 pointer-events-none"
              style={{ top: "50%" }}
            />
            <div
              className="absolute left-0 right-0 bg-gray-900/30 pointer-events-none rounded-xl flex items-center justify-center"
              style={
                side === "top"
                  ? { top: "50%", bottom: 0 }
                  : { top: 0, bottom: "50%" }
              }
            >
              <span className="text-gray-500 text-sm">Área do parceiro</span>
            </div>
            <span
              className="absolute left-2 text-[10px] font-bold tracking-wider text-blue-500/70 pointer-events-none"
              style={side === "top" ? { top: 6 } : { bottom: 6 }}
            >
              SUA ÁREA
            </span>
          </>
        )}
      </div>
      <Toolbar tool={tool} onToolChange={setTool} onClear={clear} />
    </div>
  );
});
