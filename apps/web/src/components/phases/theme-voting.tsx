"use client";
import { useState } from "react";
import type { Theme } from "@/types/game";
import { NOTE_COLOURS } from "./theme-creation";

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
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col gap-3 pr-10">
        <h2 className="text-4xl sm:text-6xl leading-none">Vote nos temas</h2>
        <p className="text-lg leading-normal">
          Escolha seus 2 favoritos ({votedIds.size}/2 votos usados)
        </p>
      </div>

      <ul className="grid grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] gap-5">
        {themes
          .filter((t) => t.authorId !== playerId)
          .map((t, i) => {
            const voted = votedIds.has(t.id);
            return (
              <li key={t.id} className="flex">
                <button
                  onClick={() => handleVote(t.id)}
                  disabled={!canVote && !voted}
                  aria-pressed={voted}
                  className={`press w-full min-h-28 flex flex-col justify-between gap-3 px-4 py-3.5 text-left border-4 ${NOTE_COLOURS[i % NOTE_COLOURS.length]} ${
                    voted ? "border-brand" : "border-transparent"
                  } ${!canVote && !voted ? "opacity-55" : ""}`}
                >
                  <span className="font-display font-extrabold text-xl leading-tight break-words">
                    {t.text}
                  </span>
                  <span className="font-semibold">
                    {t.votes} {t.votes === 1 ? "voto" : "votos"}
                    {voted && ", um é seu"}
                  </span>
                </button>
              </li>
            );
          })}
      </ul>
    </div>
  );
}
