"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { DrawingCanvas, type DrawingCanvasHandle } from "@/components/canvas/drawing-canvas";

interface DrawingPhaseProps {
  theme: string;
  side: "left" | "right";
  onSubmit: (imageDataUrl: string) => void;
  /** True when rejoining a round the server already has our drawing for. */
  initialSubmitted?: boolean;
  endsAt: number;
}

export function DrawingPhase({ theme, side, onSubmit, endsAt, initialSubmitted }: DrawingPhaseProps) {
  const canvasRef = useRef<DrawingCanvasHandle>(null);
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
    if (ms <= 0) { doSubmit(); return; }
    const timer = setTimeout(doSubmit, ms);
    return () => clearTimeout(timer);
  }, [endsAt, submitted, doSubmit]);

  function handleSubmit() {
    doSubmit();
  }

  return (
    <div className="flex flex-col items-center gap-4 px-4 w-full">
      <div className="text-center">
        <h2 className="text-xl font-bold">Desenhe: {theme}</h2>
        <p className="text-gray-400 text-sm">
          Você desenha a metade {side === "left" ? "esquerda" : "direita"}. Seu parceiro desenha a outra!
        </p>
      </div>

      <DrawingCanvas ref={canvasRef} side={side} />

      {!submitted ? (
        <button
          onClick={handleSubmit}
          className="px-8 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-bold text-lg transition-colors"
        >
          Enviar Desenho
        </button>
      ) : (
        <p className="text-green-400 font-medium">Desenho enviado! Esperando os outros...</p>
      )}
    </div>
  );
}
