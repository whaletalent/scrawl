"use client";
import { Authors, resultAuthors } from "@/components/account/authors";
import type { DrawingResult } from "@/types/game";

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
            <div className="flex aspect-[4/3] border-2 border-soft-strong bg-white">
              <div className="w-1/2">
                {drawing.imageLeftDataUrl && (
                  <img
                    src={drawing.imageLeftDataUrl}
                    alt="Metade esquerda"
                    className="w-full h-full object-fill"
                  />
                )}
              </div>
              <div className="w-1/2">
                {drawing.imageRightDataUrl && (
                  <img
                    src={drawing.imageRightDataUrl}
                    alt="Metade direita"
                    className="w-full h-full object-fill"
                  />
                )}
              </div>
            </div>
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
