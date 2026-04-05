"use client";
import type { GameMode } from "@/types/game";

interface ModeSelectorProps {
  gameMode: GameMode;
  totalRounds: number;
  onModeChange: (mode: GameMode) => void;
  onRoundsChange: (rounds: number) => void;
}

export function ModeSelector({ gameMode, totalRounds, onModeChange, onRoundsChange }: ModeSelectorProps) {
  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex gap-2">
        <button
          onClick={() => onModeChange("party")}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            gameMode === "party"
              ? "bg-purple-600 text-white"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          Party (4-10)
        </button>
        <button
          onClick={() => onModeChange("split-body")}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            gameMode === "split-body"
              ? "bg-blue-600 text-white"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          Split Body (2)
        </button>
      </div>

      {gameMode === "split-body" && (
        <div className="flex items-center justify-between px-2">
          <span className="text-sm text-gray-400">Rounds</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => onRoundsChange(n)}
                className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
                  totalRounds === n
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
