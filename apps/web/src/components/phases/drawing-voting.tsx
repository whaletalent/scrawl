"use client";
import { useState } from "react";
import type { DrawingResult } from "@/types/game";
import { StackedDrawing } from "@/components/canvas/stacked-drawing";

interface DrawingVotingProps {
  drawings: DrawingResult[];
  /** The pair this player drew in — not votable. Null for the round's judge. */
  ownPairId: string | null;
  onVote: (pairId: string, rank: 1 | 2 | 3) => void;
}

export function DrawingVoting({
  drawings,
  ownPairId,
  onVote,
}: DrawingVotingProps) {
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
  const rankFill: Record<number, string> = {
    1: "bg-amber",
    2: "bg-sky",
    3: "bg-blush",
  };

  return (
    <div className="w-full flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 pr-10">
        <h2 className="text-4xl sm:text-6xl leading-none">Vote nos melhores</h2>
        <p className="text-lg leading-normal max-w-[40ch]">
          Escolha o 1º, 2º e 3º lugar.
          {ownPairId && " O desenho da sua dupla fica de fora."}
        </p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] items-start gap-x-7 gap-y-9">
        {voteable.map((drawing) => {
          const currentRank = Object.entries(votes).find(
            ([, id]) => id === drawing.pairId,
          )?.[0];

          return (
            <article
              key={drawing.pairId}
              className="taped shadow-hard flex flex-col gap-3 bg-card border-2 border-soft-strong px-3.5 pt-4 pb-4"
            >
              <h3 className="text-2xl leading-tight break-words">
                {drawing.themeText}
              </h3>
              <StackedDrawing
                layers={[drawing.imageLeftDataUrl, drawing.imageRightDataUrl]}
                frames={drawing.stripFrames}
                size={2}
                alt={`Desenho: ${drawing.themeText}`}
                className="border-2 border-soft-strong"
              />
              <div
                role="group"
                aria-label={`Lugar para ${drawing.themeText}`}
                className="grid grid-cols-3 gap-2.5"
              >
                {([1, 2, 3] as const).map((rank) => (
                  <button
                    key={rank}
                    onClick={() => handleVote(drawing.pairId, rank)}
                    aria-pressed={Number(currentRank) === rank}
                    className={`press min-h-13 border-[3px] border-ink font-display font-extrabold text-xl ${
                      Number(currentRank) === rank
                        ? rankFill[rank]
                        : "bg-paper hover:bg-soft"
                    }`}
                  >
                    {rankLabels[rank]}
                  </button>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
