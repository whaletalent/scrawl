"use client";
import type { Player, DrawingResult } from "@/types/game";
import { ShareCard } from "@/components/share/share-card";

interface ScoreboardProps {
  players: Player[];
  isFinal: boolean;
  drawings: DrawingResult[];
}

export function Scoreboard({ players, isFinal, drawings }: ScoreboardProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col items-center gap-6 px-4 w-full max-w-lg">
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

      {isFinal && drawings.length > 0 && (
        <div className="w-full flex flex-col gap-4 mt-4">
          <h3 className="text-lg font-bold text-center">Share your masterpieces</h3>
          {drawings.map((d) => (
            <div key={d.pairId} className="bg-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-400 mb-2">"{d.themeText}"</p>
              <div className="flex gap-0.5 rounded-lg overflow-hidden mb-3">
                {d.imageLeftDataUrl && <img src={d.imageLeftDataUrl} alt="" className="w-1/2" />}
                {d.imageRightDataUrl && <img src={d.imageRightDataUrl} alt="" className="w-1/2" />}
              </div>
              <ShareCard drawing={d} playerNames={["Player A", "Player B"]} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
