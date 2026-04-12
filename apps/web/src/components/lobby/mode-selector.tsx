"use client";
import type { GameMode } from "@/types/game";

interface ModeSelectorProps {
  gameMode: GameMode;
  totalRounds: number;
  turnDuration: number;
  onModeChange: (mode: GameMode) => void;
  onRoundsChange: (rounds: number) => void;
  onDurationChange: (seconds: number) => void;
}

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 180];

export function ModeSelector({ gameMode, totalRounds, turnDuration, onModeChange, onRoundsChange, onDurationChange }: ModeSelectorProps) {
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

      <div className="flex items-center justify-between px-2">
        <span className="text-sm text-gray-400">Tempo por turno</span>
        <select
          value={turnDuration}
          onChange={(e) => onDurationChange(Number(e.target.value))}
          className="bg-gray-800 text-white text-sm rounded-lg px-3 py-1.5 border border-gray-700 focus:outline-none focus:border-purple-500"
        >
          {DURATION_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s >= 60 ? `${s / 60}min` : `${s}s`}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
