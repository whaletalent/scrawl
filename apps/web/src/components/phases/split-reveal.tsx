"use client";
import { useState } from "react";
import { getSilhouette } from "@/components/silhouettes";
import type { SplitDrawing, Player } from "@/types/game";
import { Authors } from "@/components/account/authors";

interface SplitRevealProps {
  drawings: SplitDrawing[];
  /** Both players drew every round; shown under the title with their avatars. */
  players: Player[];
}

export function SplitReveal({ drawings, players }: SplitRevealProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (drawings.length === 0) {
    return <p className="text-gray-400">Nenhum desenho para mostrar.</p>;
  }

  const drawing = drawings[currentIndex];
  const Silhouette = getSilhouette(drawing.silhouetteId);

  return (
    <div className="flex flex-col items-center gap-6 px-4 w-full max-w-lg">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Resultado!</h2>
        <p className="text-gray-400 text-sm">
          Rodada {currentIndex + 1} de {drawings.length}
        </p>
        <Authors
          className="text-sm text-gray-300 mt-1"
          authors={players.map((p) => ({
            name: p.nickname,
            avatarUrl: p.avatarUrl,
          }))}
        />
      </div>

      <div
        className="relative w-full bg-white rounded-xl overflow-hidden"
        style={{ aspectRatio: "800 / 600" }}
      >
        {/* Silhouette ghost behind */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ opacity: 0.04 }}
        >
          <Silhouette className="w-full h-full" />
        </div>

        {/* Top half */}
        {drawing.topImageDataUrl ? (
          <img
            src={drawing.topImageDataUrl}
            alt="Metade de cima"
            className="absolute top-0 left-0 w-full"
            style={{ height: "50%", objectFit: "fill" }}
          />
        ) : (
          <div
            className="absolute top-0 left-0 w-full flex items-center justify-center bg-gray-100"
            style={{ height: "50%" }}
          >
            <span className="text-gray-400 text-sm">Não enviado</span>
          </div>
        )}

        {/* Merge line */}
        <div
          className="absolute left-0 right-0 border-t border-dashed border-gray-300 pointer-events-none"
          style={{ top: "50%" }}
        />

        {/* Bottom half */}
        {drawing.bottomImageDataUrl ? (
          <img
            src={drawing.bottomImageDataUrl}
            alt="Metade de baixo"
            className="absolute bottom-0 left-0 w-full"
            style={{ height: "50%", objectFit: "fill" }}
          />
        ) : (
          <div
            className="absolute bottom-0 left-0 w-full flex items-center justify-center bg-gray-100"
            style={{ height: "50%" }}
          >
            <span className="text-gray-400 text-sm">Não enviado</span>
          </div>
        )}
      </div>

      {/* Navigation */}
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
