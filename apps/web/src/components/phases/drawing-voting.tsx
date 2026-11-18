"use client";
import { useState } from "react";
import type { DrawingResult } from "@/types/game";

interface DrawingVotingProps {
  drawings: DrawingResult[];
  /** The pair this player drew in — not votable. Null for the round's judge. */
  ownPairId: string | null;
  onVote: (pairId: string, rank: 1 | 2 | 3) => void;
}

export function DrawingVoting({ drawings, ownPairId, onVote }: DrawingVotingProps) {
  const [votes, setVotes] = useState<Record<number, string>>({});

  const voteable = drawings.filter((d) => d.pairId !== ownPairId);

  function handleVote(pairId: string, rank: 1 | 2 | 3) {
    const newVotes = { ...votes };
    for (const [r, id] of Object.entries(newVotes)) {
      if (id === pairId) delete newVotes[Number(r)];
    }
    newVotes[rank] = pairId;
    setVotes(newVotes);
    onVote(pairId, rank);
  }

  const rankLabels: Record<number, string> = { 1: "1º", 2: "2º", 3: "3º" };

  return (
    <div className="flex flex-col items-center gap-6 px-4 w-full max-w-2xl">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Vote nos melhores</h2>
        <p className="text-gray-400 mt-1">Escolha o 1º, 2º e 3º lugar</p>
      </div>

      <div className="w-full flex flex-col gap-6">
        {voteable.map((drawing) => {
          const currentRank = Object.entries(votes).find(([, id]) => id === drawing.pairId)?.[0];

          return (
            <div key={drawing.pairId} className="bg-gray-800 rounded-xl p-4">
              <p className="text-sm text-gray-400 mb-2">Tema: {drawing.themeText}</p>
              <div className="flex gap-0.5 rounded-lg overflow-hidden">
                {drawing.imageLeftDataUrl && (
                  <img src={drawing.imageLeftDataUrl} alt="Metade esquerda" className="w-1/2" />
                )}
                {drawing.imageRightDataUrl && (
                  <img src={drawing.imageRightDataUrl} alt="Metade direita" className="w-1/2" />
                )}
              </div>
              <div className="flex gap-2 mt-3">
                {([1, 2, 3] as const).map((rank) => (
                  <button
                    key={rank}
                    onClick={() => handleVote(drawing.pairId, rank)}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${
                      Number(currentRank) === rank
                        ? rank === 1 ? "bg-yellow-600" : rank === 2 ? "bg-gray-400 text-black" : "bg-orange-700"
                        : "bg-gray-700 hover:bg-gray-600"
                    }`}
                  >
                    {rankLabels[rank]}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
