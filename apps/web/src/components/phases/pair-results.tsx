"use client";
import type { Player } from "@/types/game";
import { FinalHeader, PlayAgain } from "@/components/game/play-again";

/** How the players of one picture (two, or three in Emenda) are told apart on a result card. */
export const PLAYER_FILL = ["bg-amber", "bg-sky", "bg-mint"] as const;

/**
 * The final screen of the two-player modes and Emenda: a header with a tag,
 * then one sheet with every round's drawing as a taped card.
 */
export function PairResults({
  mode,
  players,
  rounds,
  detail,
  title,
  summary,
  isHost,
  onPlayAgain,
  children,
}: {
  /** The title on the header's tag. */
  mode: string;
  players: Player[];
  /** The header's note; by default who played and how many rounds. */
  detail?: string;
  rounds: number;
  /** "Vocês montaram 3 monstrinhos" */
  title: string;
  summary: string;
  isHost: boolean;
  onPlayAgain: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full flex flex-col gap-7">
      <FinalHeader
        title={mode}
        detail={
          detail ??
          `${players.map((p) => p.nickname).join(" e ")}, ${rounds} ${rounds === 1 ? "rodada" : "rodadas"}`
        }
      />

      <main className="sheet flex flex-col gap-8 p-6 sm:p-12">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 pr-10">
          <h1 className="text-4xl sm:text-6xl leading-none max-w-[16ch]">
            {title}
          </h1>
          <p className="text-lg leading-normal max-w-[40ch]">{summary}</p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] items-start gap-x-7 gap-y-9">
          {children}
        </div>

        <PlayAgain isHost={isHost} onPlayAgain={onPlayAgain} />
      </main>
    </div>
  );
}

/** One round's card: the picture, the round, who drew what, and the save button. */
export function PairCard({
  round,
  total,
  picture,
  parts,
  footer,
}: {
  round: number;
  total: number;
  picture: React.ReactNode;
  /** Each player's share of the drawing, in player order. */
  parts: { name: string; fill: string; what: string }[];
  footer: React.ReactNode;
}) {
  return (
    <article className="taped shadow-hard flex flex-col gap-3 bg-card border-2 border-soft-strong px-3.5 pt-4 pb-4">
      {picture}
      <p className="text-muted">
        Rodada {round} de {total}
      </p>
      <dl className="flex flex-col gap-2">
        {parts.map((p, i) => (
          <div key={i} className="flex flex-wrap items-baseline gap-x-2">
            <dt className={`px-2 font-display font-bold ${p.fill}`}>
              {p.name}
            </dt>
            <dd className="leading-snug">{p.what}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-1 flex items-start gap-2.5">{footer}</div>
    </article>
  );
}

/** A player who left is no longer in the room's list. */
export function nameOf(players: Player[], id: string): string {
  return players.find((p) => p.id === id)?.nickname ?? "Quem saiu";
}
