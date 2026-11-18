"use client";
import { useState } from "react";
import type { Theme } from "@/types/game";

interface ThemeVotingProps {
  themes: Theme[];
  playerId: string;
  onVote: (themeId: string) => void;
}

export function ThemeVoting({ themes, playerId, onVote }: ThemeVotingProps) {
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const canVote = votedIds.size < 2;

  function handleVote(themeId: string) {
    if (!canVote || votedIds.has(themeId)) return;
    onVote(themeId);
    setVotedIds((prev) => new Set(prev).add(themeId));
  }

  return (
    <div className="flex flex-col items-center gap-6 px-4 w-full max-w-md">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Vote nos temas</h2>
        <p className="text-gray-400 mt-1">
          Escolha seus 2 favoritos ({votedIds.size}/2 votos usados)
        </p>
      </div>

      <div className="w-full flex flex-col gap-3">
        {themes
          .filter((t) => t.authorId !== playerId)
          .map((t) => {
            const voted = votedIds.has(t.id);
            return (
              <button
                key={t.id}
                onClick={() => handleVote(t.id)}
                disabled={!canVote && !voted}
                className={`w-full px-4 py-3 rounded-xl text-left transition-all ${
                  voted
                    ? "bg-purple-600/30 border-2 border-purple-500"
                    : canVote
                    ? "bg-gray-800 border-2 border-transparent hover:border-gray-600"
                    : "bg-gray-800/50 border-2 border-transparent text-gray-600"
                }`}
              >
                <span className="font-medium">{t.text}</span>
                <span className="ml-2 text-sm text-gray-500">{t.votes} {t.votes === 1 ? "voto" : "votos"}</span>
              </button>
            );
          })}
      </div>
    </div>
  );
}
