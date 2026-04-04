"use client";
import { useCanvas } from "@/hooks/use-canvas";
import { Toolbar } from "./toolbar";
import { forwardRef, useImperativeHandle } from "react";

interface DrawingCanvasProps {
  side: "left" | "right" | "full";
}

export interface DrawingCanvasHandle {
  exportImage: () => string;
}

export const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(
  function DrawingCanvas({ side }, ref) {
    const {
      canvasRef, tool, setTool, startDrawing, draw, stopDrawing, clear,
      canvasWidth, canvasHeight, drawableArea,
    } = useCanvas(side);

    useImperativeHandle(ref, () => ({
      exportImage: () => {
        const canvas = canvasRef.current;
        if (!canvas) return "";
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = drawableArea.width;
        tempCanvas.height = canvasHeight;
        const tempCtx = tempCanvas.getContext("2d");
        if (!tempCtx) return "";
        tempCtx.drawImage(
          canvas,
          drawableArea.x, 0, drawableArea.width, canvasHeight,
          0, 0, drawableArea.width, canvasHeight
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
          {side !== "full" && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-gray-600 opacity-50 pointer-events-none"
              style={{ left: "50%" }}
            />
          )}
          {side !== "full" && (
            <div
              className="absolute top-0 bottom-0 bg-gray-900/30 pointer-events-none rounded-xl"
              style={
                side === "left"
                  ? { left: "50%", right: 0 }
                  : { left: 0, right: "50%" }
              }
            />
          )}
        </div>
        <Toolbar tool={tool} onToolChange={setTool} onClear={clear} />
      </div>
    );
  }
);
