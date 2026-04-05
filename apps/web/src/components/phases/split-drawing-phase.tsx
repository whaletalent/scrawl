"use client";
import { useRef, useState } from "react";
import { DrawingCanvas, type DrawingCanvasHandle } from "@/components/canvas/drawing-canvas";
import { getSilhouette } from "@/components/silhouettes";
import type { SilhouetteId } from "@/types/game";

interface SplitDrawingPhaseProps {
  round: number;
  totalRounds: number;
  side: "top" | "bottom";
  silhouetteId: SilhouetteId;
  onSubmit: (imageDataUrl: string) => void;
}

export function SplitDrawingPhase({ round, totalRounds, side, silhouetteId, onSubmit }: SplitDrawingPhaseProps) {
  const canvasRef = useRef<DrawingCanvasHandle>(null);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    if (submitted) return;
    const image = canvasRef.current?.exportImage();
    if (image) {
      onSubmit(image);
      setSubmitted(true);
    }
  }

  const Silhouette = getSilhouette(silhouetteId);
  const sideLabel = side === "top" ? "cabeça e tronco" : "pernas e pés";

  return (
    <div className="flex flex-col items-center gap-4 px-4 w-full">
      <div className="text-center">
        <p className="text-sm text-gray-500">Round {round}/{totalRounds}</p>
        <h2 className="text-xl font-bold">Complete o personagem!</h2>
        <p className="text-gray-400 text-sm">
          Você desenha: <span className="text-blue-400 font-medium">{sideLabel}</span>
        </p>
      </div>

      <DrawingCanvas
        ref={canvasRef}
        side={side}
        silhouetteOverlay={
          <Silhouette className="w-full h-full" />
        }
      />

      {!submitted ? (
        <button
          onClick={handleSubmit}
          className="px-8 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-bold text-lg transition-colors"
        >
          Enviar Desenho
        </button>
      ) : (
        <p className="text-green-400 font-medium">Desenho enviado! Esperando parceiro...</p>
      )}
    </div>
  );
}
