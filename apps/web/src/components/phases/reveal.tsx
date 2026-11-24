"use client";
import { Authors, resultAuthors } from "@/components/account/authors";
import type { DrawingResult } from "@/types/game";
import { StackedDrawing } from "@/components/canvas/stacked-drawing";

interface RevealProps {
  drawings: DrawingResult[];
}

const score = (d: DrawingResult) =>
  d.votes.first * 3 + d.votes.second * 2 + d.votes.third;

const PLACE = ["bg-amber", "bg-sky", "bg-blush"];

export function Reveal({ drawings }: RevealProps) {
  const ranked = [...drawings].sort((a, b) => score(b) - score(a));

  return (
    <div className="w-full flex flex-col gap-8">
      <h2 className="text-4xl sm:text-6xl leading-none pr-10">Revelação!</h2>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] items-start gap-x-6 gap-y-9">
        {ranked.map((drawing, i) => (
          <article
            key={drawing.pairId}
            className="taped shadow-hard flex flex-col gap-2.5 bg-card border-2 border-soft-strong px-3 pt-3 pb-4"
          >
            <StackedDrawing
              layers={[drawing.imageLeftDataUrl, drawing.imageRightDataUrl]}
              frames={drawing.stripFrames}
              size={2}
              alt={`Desenho de ${drawing.playerNames.join(" + ")}`}
              className="border-2 border-soft-strong"
            />
            <h3 className="text-2xl leading-tight break-words">
              "{drawing.themeText}"
            </h3>
            <Authors authors={resultAuthors(drawing)} />
            <span
              className={`self-start px-3 py-1 font-display font-extrabold text-xl ${PLACE[i] ?? "bg-soft"}`}
            >
              {score(drawing)} pts
            </span>
          </article>
        ))}
      </div>
    </div>
  );
}
