"use client";
import { useState, useRef, useEffect } from "react";
import { loadFaceTemplateImage, loadImage } from "@/lib/face-compose";
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

    const compose = async () => {
      // 1. White background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 800, 600);

      // 2. Render face template with skin tone
      const templateImg = await loadFaceTemplateImage(
        drawing.faceTemplate,
        drawing.skinTone,
      );
      if (templateImg) ctx.drawImage(templateImg, 0, 0, 800, 600);

      // 3. Draw player images on top (they have transparent backgrounds)
      for (const src of [
        drawing.player1ImageDataUrl,
        drawing.player2ImageDataUrl,
      ]) {
        if (!src) continue;
        try {
          const img = await loadImage(src);
          ctx.drawImage(img, 0, 0);
        } catch {
          // skip failed images
        }
      }
    };

    compose();
  }, [drawing]);

  return (
    <div
      className="relative w-full bg-white rounded-xl overflow-hidden"
      style={{ aspectRatio: "800 / 600" }}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
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
        <p className="text-gray-400 text-sm">
          Rodada {currentIndex + 1} de {drawings.length}
        </p>
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
            onClick={() =>
              setCurrentIndex((i) => Math.min(drawings.length - 1, i + 1))
            }
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
