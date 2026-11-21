"use client";
import { Toolbar } from "./toolbar";
import { useFaceCanvas } from "@/hooks/use-face-canvas";
import { FACE_REGIONS } from "@/lib/face-regions";
import { getFaceTemplate } from "@/components/face-templates";
import React, { forwardRef, useImperativeHandle } from "react";
import type { FaceRegionId, FaceTemplateId } from "@/types/game";

interface FaceCanvasProps {
  assignedRegions: FaceRegionId[];
  faceTemplate: FaceTemplateId;
  skinTone: string;
  /** Avatar editor: draw anywhere, no region overlay. `assignedRegions` is ignored. */
  free?: boolean;
}

export interface FaceCanvasHandle {
  exportImage: () => string;
}

export const FaceCanvas = forwardRef<FaceCanvasHandle, FaceCanvasProps>(
  function FaceCanvas({ assignedRegions, faceTemplate, skinTone, free }, ref) {
    const {
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
      canvasWidth,
      canvasHeight,
    } = useFaceCanvas(assignedRegions, { free });

    useImperativeHandle(ref, () => ({ exportImage }));

    const Template = getFaceTemplate(faceTemplate);

    return (
      <div className="flex flex-col gap-3 items-center w-full">
        <div className="relative w-full" style={{ maxWidth: canvasWidth }}>
          {/* White background + face template behind transparent canvas */}
          <div className="absolute inset-0 bg-white rounded-xl pointer-events-none">
            <Template className="w-full h-full" fillColor={skinTone} />
          </div>
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="relative w-full rounded-xl border-2 border-gray-700 cursor-crosshair touch-none"
            style={{ aspectRatio: `${canvasWidth} / ${canvasHeight}` }}
          />
          {/* Region overlay: darken non-assigned areas, label assigned ones */}
          {!free && (
            <svg
              viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
              className="absolute inset-0 w-full h-full pointer-events-none"
            >
              {FACE_REGIONS.filter((r) => !r.isHairRegion).map((region) => {
                const isAssigned = assignedRegions.includes(
                  region.id as FaceRegionId,
                );
                return region.rects.map((rect, i) => (
                  <g key={`${region.id}-${i}`}>
                    <rect
                      x={rect.x}
                      y={rect.y}
                      width={rect.width}
                      height={rect.height}
                      rx={6}
                      fill={isAssigned ? "none" : "rgba(0,0,0,0.25)"}
                      stroke={isAssigned ? region.color : "none"}
                      strokeWidth={isAssigned ? 2 : 0}
                      strokeDasharray={isAssigned ? "6 3" : "none"}
                    />
                    {isAssigned && i === 0 && (
                      <text
                        x={rect.x + rect.width / 2}
                        y={rect.y + 14}
                        textAnchor="middle"
                        fill={region.color}
                        fontSize="11"
                        fontWeight="bold"
                        opacity="0.6"
                      >
                        {region.label}
                      </text>
                    )}
                  </g>
                ));
              })}
            </svg>
          )}
        </div>
        <Toolbar
          tool={tool}
          onToolChange={setTool}
          onClear={clear}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
        />
      </div>
    );
  },
);
