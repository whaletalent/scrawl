"use client";
import type { Player, DrawingResult } from "@/types/game";
import { ShareCard } from "@/components/share/share-card";
import { Avatar } from "@/components/account/avatar";
import {
  SaveButton,
  type GallerySaving,
} from "@/components/gallery/save-button";
import { composePartyDrawing } from "@/lib/compose-drawing";
import { Authors, resultAuthors } from "@/components/account/authors";

interface ScoreboardProps {
  players: Player[];
  isFinal: boolean;
  drawings: DrawingResult[];
  saving: GallerySaving;
}

export function Scoreboard({
  players,
  isFinal,
  drawings,
  saving,
}: ScoreboardProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col items-center gap-6 px-4 py-8 w-full max-w-lg">
      <h2 className="text-2xl font-bold">
        {isFinal ? "Resultado final!" : "Placar"}
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
              <Avatar url={player.avatarUrl} name={player.nickname} size={28} />
              <span className="font-medium">{player.nickname}</span>
            </div>
            <span className="text-lg font-bold text-purple-400">
              {player.score} pts
            </span>
          </div>
        ))}
      </div>

      {isFinal && drawings.length > 0 && (
        <div className="w-full flex flex-col gap-4 mt-4">
          <h3 className="text-lg font-bold text-center">
            Compartilhe as obras-primas
          </h3>
          {drawings.map((d) => (
            <div key={d.pairId} className="bg-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500">Rodada {d.round}</p>
              <p className="text-sm text-gray-400">"{d.themeText}"</p>
              <p className="text-sm text-gray-300 mb-2">
                <Authors authors={resultAuthors(d)} />
              </p>
              <div className="flex gap-0.5 rounded-lg overflow-hidden mb-3 bg-white">
                <div className="w-1/2">
                  {d.imageLeftDataUrl && (
                    <img src={d.imageLeftDataUrl} alt="" className="w-full" />
                  )}
                </div>
                <div className="w-1/2">
                  {d.imageRightDataUrl && (
                    <img src={d.imageRightDataUrl} alt="" className="w-full" />
                  )}
                </div>
              </div>
              <ShareCard drawing={d} />
              <div className="mt-3 flex justify-center">
                <SaveButton
                  drawing={{ round: d.round, pairId: d.pairId }}
                  compose={() => composePartyDrawing(d)}
                  saving={saving}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
