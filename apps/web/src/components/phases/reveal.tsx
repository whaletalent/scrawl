"use client";
import type { DrawingResult } from "@/types/game";

interface RevealProps {
  drawings: DrawingResult[];
}

export function Reveal({ drawings }: RevealProps) {
  return (
    <div className="flex flex-col items-center gap-6 px-4 w-full max-w-2xl">
      <h2 className="text-2xl font-bold">Revelação!</h2>

      <div className="w-full flex flex-col gap-6">
        {drawings.map((drawing) => {
          const totalScore =
            drawing.votes.first * 3 +
            drawing.votes.second * 2 +
            drawing.votes.third;
          return (
            <div key={drawing.pairId} className="bg-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-400 mb-2">
                "{drawing.themeText}"
              </p>
              <div className="flex gap-0.5 rounded-lg overflow-hidden">
                {drawing.imageLeftDataUrl && (
                  <img
                    src={drawing.imageLeftDataUrl}
                    alt="Metade esquerda"
                    className="w-1/2"
                  />
                )}
                {drawing.imageRightDataUrl && (
                  <img
                    src={drawing.imageRightDataUrl}
                    alt="Metade direita"
                    className="w-1/2"
                  />
                )}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-gray-300">
                  {drawing.playerNames[0]} + {drawing.playerNames[1]}
                </span>
                <span className="text-lg font-bold text-purple-400">
                  {totalScore} pts
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
