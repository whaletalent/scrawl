"use client";
import type { Player, DrawingResult } from "@/types/game";

interface ScoreboardProps {
  players: Player[];
  isFinal: boolean;
  drawings: DrawingResult[];
}

export function Scoreboard({ players, isFinal, drawings }: ScoreboardProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col items-center gap-6 px-4 w-full max-w-md">
      <h2 className="text-2xl font-bold">
        {isFinal ? "Final Results!" : "Scoreboard"}
      </h2>

      <div className="w-full flex flex-col gap-2">
        {sorted.map((player, index) => (
          <div
            key={player.id}
            className={`flex items-center justify-between px-4 py-3 rounded-xl ${
              index === 0 && isFinal
                ? "bg-yellow-600/20 border-2 border-yellow-500"
                : "bg-gray-800"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-gray-500 w-6">
                {index + 1}.
              </span>
              <span className="font-medium">{player.nickname}</span>
            </div>
            <span className="text-lg font-bold text-purple-400">{player.score} pts</span>
          </div>
        ))}
      </div>

      {isFinal && (
        <p className="text-gray-400 text-center">
          {sorted[0]?.nickname} wins!
        </p>
      )}
    </div>
  );
}
