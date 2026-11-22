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
    <Toolbar tool={tool} onToolChange={setTool} onClear={clear}>
      <div className="relative w-full">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full bg-white border-2 border-dashed border-line-strong cursor-crosshair touch-none"
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
              className="absolute top-0 bottom-0 border-l-[3px] border-dashed border-brand pointer-events-none"
              style={{ left: "50%" }}
            />
            <div
              className="partner-area absolute top-0 bottom-0 pointer-events-none flex items-center justify-center p-4"
              style={
                side === "left"
                  ? { left: "50%", right: 0 }
                  : { left: 0, right: "50%" }
              }
            >
              <span className="font-display font-bold text-lg text-muted text-center">
                Área do parceiro
              </span>
            </div>
          </>
        )}
        {side !== "full" && (side === "top" || side === "bottom") && (
          <>
            <div
              className="absolute left-0 right-0 border-t-[3px] border-dashed border-brand pointer-events-none"
              style={{ top: "50%" }}
            />
            <div
              className="partner-area absolute left-0 right-0 pointer-events-none flex items-center justify-center p-4"
              style={
                side === "top"
                  ? { top: "50%", bottom: 0 }
                  : { top: 0, bottom: "50%" }
              }
            >
              <span className="font-display font-bold text-lg text-muted text-center">
                Área do parceiro
              </span>
            </div>
            <span
              className="absolute left-2 px-2 py-0.5 bg-brand text-white font-display font-bold text-xs pointer-events-none"
              style={side === "top" ? { top: 6 } : { bottom: 6 }}
            >
              SUA ÁREA
            </span>
          </>
        )}
      </div>
    </Toolbar>
  );
});
