"use client";
import type { Player, DrawingResult } from "@/types/game";
import { art } from "@/components/brand/art";
import { ShareCard } from "@/components/share/share-card";
import { Avatar } from "@/components/account/avatar";
import {
  SaveButton,
  type GallerySaving,
} from "@/components/gallery/save-button";
import { composePartyDrawing } from "@/lib/compose-drawing";
import { Authors, resultAuthors } from "@/components/account/authors";
import { FinalHeader, PlayAgain } from "./play-again";

interface ScoreboardProps {
  players: Player[];
  isFinal: boolean;
  drawings: DrawingResult[];
  saving: GallerySaving;
  /** The round that just ended, and how many there are. */
  round: number;
  totalRounds: number;
  isHost: boolean;
  onPlayAgain: () => void;
}

const TAPES = ["bg-amber/85", "bg-mint", "bg-sky"];

const score = (d: DrawingResult) =>
  d.votes.first * 3 + d.votes.second * 2 + d.votes.third;

/** The standings: the winner on an indigo block with the trophy, everyone else in a list. */
function Standings({
  players,
  isFinal,
}: {
  players: Player[];
  isFinal: boolean;
}) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const winner = isFinal ? sorted[0] : undefined;
  const rest = winner ? sorted.slice(1) : sorted;
  return (
    <>
      {winner && (
        <div className="taped shadow-hard flex items-center gap-4 px-5 pt-6 pb-5 bg-brand text-white">
          <img
            src={art("mascot-trophy-sm")}
            alt=""
            className="flex-none w-24 h-24 sm:w-30 sm:h-30 object-contain"
          />
          <div className="min-w-0 flex flex-col gap-1">
            <span className="text-[#e9e6ff]">1º lugar</span>
            <span className="flex items-center gap-2 font-display font-extrabold text-3xl sm:text-[2.75rem] leading-none break-words min-w-0">
              <Avatar url={winner.avatarUrl} name={winner.nickname} size={36} />
              {winner.nickname}
            </span>
            <span className="font-display font-bold text-2xl text-[#ffd98a]">
              {winner.score} pts
            </span>
          </div>
        </div>
      )}
      <ol className="flex flex-col">
        {rest.map((player, index) => (
          <li
            key={player.id}
            className="flex items-center gap-3.5 px-3.5 py-3 border-b-2 border-soft-strong"
          >
            <span className="flex-none w-9 font-display font-extrabold text-[1.375rem] text-muted">
              {index + (winner ? 2 : 1)}º
            </span>
            <Avatar url={player.avatarUrl} name={player.nickname} size={40} />
            <span className="flex-1 min-w-0 font-display font-bold text-[1.375rem] truncate">
              {player.nickname}
            </span>
            <span className="font-semibold text-lg tabular-nums">
              {player.score} pts
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}

export function Scoreboard({
  players,
  isFinal,
  drawings,
  saving,
  round,
  totalRounds,
  isHost,
  onPlayAgain,
}: ScoreboardProps) {
  // Between rounds: the standings alone, on one sheet.
  if (!isFinal)
    return (
      <section className="sheet w-full max-w-2xl flex flex-col gap-5 p-6 sm:p-10">
        <div className="flex flex-col gap-2 pr-10">
          <h2 className="text-4xl sm:text-5xl leading-none">Placar</h2>
          <p className="text-muted">
            Depois de {round} {round === 1 ? "rodada" : "rodadas"}.
            {round + 1 === totalRounds && " A última vale em dobro."}
          </p>
        </div>
        <Standings players={players} isFinal={false} />
      </section>
    );

  const ranked = [...drawings].sort(
    (a, b) => a.round - b.round || score(b) - score(a),
  );

  return (
    <div className="w-full flex flex-col gap-7">
      <FinalHeader
        title="Fim de jogo"
        detail={`Racha-tema, ${totalRounds} ${totalRounds === 1 ? "rodada" : "rodadas"}, ${players.length} jogadores`}
      />

      <div className="flex flex-wrap items-start gap-8">
        <section className="sheet flex-[1_1_26rem] lg:max-w-[34rem] min-w-0 flex flex-col gap-5 p-6 sm:p-10">
          <h1 className="text-4xl sm:text-[3.25rem] leading-none pr-10">
            Placar final
          </h1>
          <Standings players={players} isFinal />
          <div className="mt-2">
            <PlayAgain isHost={isHost} onPlayAgain={onPlayAgain} />
          </div>
        </section>

        {ranked.length > 0 && (
          <section className="shadow-hard-lg bg-paper-deep flex-[999_1_35rem] min-w-0 flex flex-col gap-6 p-6 sm:p-10">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-3xl sm:text-[2.5rem] leading-none">
                As obras-primas
              </h2>
              <span className="text-muted">
                Todos os desenhos da partida, rodada por rodada
              </span>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(15.5rem,1fr))] items-start gap-x-6 gap-y-7">
              {ranked.map((d, i) => (
                <article
                  key={d.pairId}
                  className="relative shadow-hard flex flex-col gap-2.5 bg-card px-3 pt-3 pb-4"
                >
                  <span
                    aria-hidden="true"
                    className={`absolute -top-3 left-1/2 -ml-7.5 w-15 h-6 ${TAPES[i % TAPES.length]}`}
                  />
                  <div className="flex aspect-[4/3] bg-white border-2 border-soft-strong">
                    <div className="w-1/2">
                      {d.imageLeftDataUrl && (
                        <img
                          src={d.imageLeftDataUrl}
                          alt=""
                          className="w-full h-full object-fill"
                        />
                      )}
                    </div>
                    <div className="w-1/2">
                      {d.imageRightDataUrl && (
                        <img
                          src={d.imageRightDataUrl}
                          alt=""
                          className="w-full h-full object-fill"
                        />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted">Rodada {d.round}</p>
                  <h3 className="text-2xl leading-tight break-words">
                    "{d.themeText}"
                  </h3>
                  <p>
                    <Authors authors={resultAuthors(d)} />
                  </p>
                  <p className="font-display font-bold text-lg text-brand">
                    {score(d)} pts
                  </p>
                  <div className="mt-1 flex items-start gap-2.5">
                    <div className="flex-1 min-w-0">
                      <SaveButton
                        drawing={{ round: d.round, pairId: d.pairId }}
                        compose={() => composePartyDrawing(d)}
                        saving={saving}
                      />
                    </div>
                    <ShareCard drawing={d} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
