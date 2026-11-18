"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import {
  FaceCanvas,
  type FaceCanvasHandle,
} from "@/components/canvas/face-canvas";
import { getRegionDef } from "@/lib/face-regions";
import type { FaceRegionId, FaceTemplateId } from "@/types/game";

interface FaceDrawingPhaseProps {
  round: number;
  totalRounds: number;
  regions: FaceRegionId[];
  faceTemplate: FaceTemplateId;
  skinTone: string;
  endsAt: number;
  onSubmit: (imageDataUrl: string) => void;
  /** True when rejoining a round the server already has our drawing for. */
  initialSubmitted?: boolean;
}

export function FaceDrawingPhase({
  round,
  totalRounds,
  regions,
  faceTemplate,
  skinTone,
  endsAt,
  onSubmit,
  initialSubmitted,
}: FaceDrawingPhaseProps) {
  const canvasRef = useRef<FaceCanvasHandle>(null);
  const [submitted, setSubmitted] = useState(initialSubmitted ?? false);

  const doSubmit = useCallback(() => {
    if (submitted) return;
    const image = canvasRef.current?.exportImage();
    if (image) {
      onSubmit(image);
      setSubmitted(true);
    }
  }, [submitted, onSubmit]);

  useEffect(() => {
    if (!endsAt || submitted) return;
    const ms = endsAt - Date.now() - 500;
    if (ms <= 0) {
      doSubmit();
      return;
    }
    const timer = setTimeout(doSubmit, ms);
    return () => clearTimeout(timer);
  }, [endsAt, submitted, doSubmit]);

  return (
    <div className="flex flex-col items-center gap-4 px-4 w-full">
      <div className="text-center">
        <p className="text-sm text-gray-500">
          Rodada {round}/{totalRounds}
        </p>
        <h2 className="text-xl font-bold">Monte o rosto!</h2>
        <div className="flex gap-2 justify-center mt-1">
          {regions.map((id) => {
            const def = getRegionDef(id);
            return (
              <span
                key={id}
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: def.color + "22", color: def.color }}
              >
                {def.label}
              </span>
            );
          })}
        </div>
      </div>

      <FaceCanvas
        ref={canvasRef}
        assignedRegions={regions}
        faceTemplate={faceTemplate}
        skinTone={skinTone}
      />

      {!submitted ? (
        <button
          onClick={doSubmit}
          className="px-8 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-bold text-lg transition-colors"
        >
          Enviar Desenho
        </button>
      ) : (
        <p className="text-green-400 font-medium">
          Desenho enviado! Esperando parceiro...
        </p>
      )}
    </div>
  );
}
