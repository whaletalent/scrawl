"use client";
import { useState, useRef, useEffect } from "react";
import { getFaceTemplate } from "@/components/face-templates";
import type { FaceDrawing } from "@/types/game";

interface FaceRevealProps {
  drawings: FaceDrawing[];
}

function CompositeCanvas({ drawing }: { drawing: FaceDrawing }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 600;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 800, 600);

    const loadAndDraw = async () => {
      for (const src of [drawing.player1ImageDataUrl, drawing.player2ImageDataUrl]) {
        if (!src) continue;
        const img = new Image();
        img.src = src;
        await new Promise<void>((resolve) => {
          img.onload = () => { ctx.drawImage(img, 0, 0); resolve(); };
          img.onerror = () => resolve();
        });
      }
    };
    loadAndDraw();
  }, [drawing]);

  const Template = getFaceTemplate(drawing.faceTemplate);

  return (
    <div className="relative w-full bg-white rounded-xl overflow-hidden" style={{ aspectRatio: "800 / 600" }}>
      {/* Skin tone background at full opacity BEHIND drawings */}
      <div className="absolute inset-0 pointer-events-none">
        <Template className="w-full h-full" fillColor={drawing.skinTone} />
      </div>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}

export function FaceReveal({ drawings }: FaceRevealProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (drawings.length === 0) {
    return <p className="text-gray-400">Nenhum desenho para mostrar.</p>;
  }

  const drawing = drawings[currentIndex];

  return (
    <div className="flex flex-col items-center gap-6 px-4 w-full max-w-lg">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Resultado!</h2>
        <p className="text-gray-400 text-sm">Round {drawing.round} de {drawings.length}</p>
      </div>

      <CompositeCanvas drawing={drawing} />

      {drawings.length > 1 && (
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentIndex === 0
                ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                : "bg-gray-700 hover:bg-gray-600 text-white"
            }`}
          >
            ← Anterior
          </button>
          <div className="flex gap-2">
            {drawings.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  i === currentIndex ? "bg-purple-500" : "bg-gray-600"
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => setCurrentIndex((i) => Math.min(drawings.length - 1, i + 1))}
            disabled={currentIndex === drawings.length - 1}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentIndex === drawings.length - 1
                ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                : "bg-purple-600 hover:bg-purple-500 text-white"
            }`}
          >
            Próximo →
          </button>
        </div>
      )}
    </div>
  );
}
