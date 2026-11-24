"use client";
import type { Player, SeamDrawing } from "@/types/game";
import { StackedDrawing } from "@/components/canvas/stacked-drawing";
import {
  SaveButton,
  type GallerySaving,
} from "@/components/gallery/save-button";
import { DownloadDrawing } from "@/components/share/download-drawing";
import { composeSeamDrawing } from "@/lib/compose-drawing";
import { PairCard, PairResults, PLAYER_FILL } from "./pair-results";

const PLACE: Record<2 | 3, string[]> = {
  2: ["esquerda", "direita"],
  3: ["esquerda", "meio", "direita"],
};

const sizeOf = (d: SeamDrawing): 2 | 3 => (d.memberIds.length === 3 ? 3 : 2);

/** The group's picture: every layer that came, blank where one didn't. */
function Picture({ drawing }: { drawing: SeamDrawing }) {
  return (
    <StackedDrawing
      layers={drawing.layers}
      frames={drawing.stripFrames}
      size={sizeOf(drawing)}
      alt={`Desenho de ${drawing.memberNames.join(" + ")}`}
      className="border-2 border-soft-strong"
    />
  );
}

/** Who drew which part, left to right, in the result cards' colours. */
const partsOf = (d: SeamDrawing) =>
  d.memberNames.map((name, i) => ({
    name,
    fill: PLAYER_FILL[i] ?? PLAYER_FILL[0],
    what: PLACE[sizeOf(d)][i] ?? "",
  }));

/** After each Emenda round: every group's picture of the round, as taped cards. */
export function SeamRoundReveal({ drawings }: { drawings: SeamDrawing[] }) {
  return (
    <div className="w-full flex flex-col gap-8">
      <h2 className="text-4xl sm:text-6xl leading-none pr-10">Revelação!</h2>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] items-start gap-x-6 gap-y-9">
        {drawings.map((drawing) => (
          <article
            key={drawing.groupId}
            className="taped shadow-hard flex flex-col gap-3 bg-card border-2 border-soft-strong px-3.5 pt-4 pb-4"
          >
            <Picture drawing={drawing} />
            <dl className="flex flex-col gap-2">
              {partsOf(drawing).map((p, i) => (
                <div key={i} className="flex flex-wrap items-baseline gap-x-2">
                  <dt className={`px-2 font-display font-bold ${p.fill}`}>
                    {p.name}
                  </dt>
                  <dd className="leading-snug">{p.what}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}

/** The end of an Emenda game: every picture of every round. */
export function SeamFinal({
  drawings,
  players,
  saving,
  isHost,
  onPlayAgain,
}: {
  drawings: SeamDrawing[];
  players: Player[];
  saving: GallerySaving;
  isHost: boolean;
  onPlayAgain: () => void;
}) {
  if (drawings.length === 0) {
    return (
      <p className="sheet px-8 py-6 text-muted">Nenhum desenho para mostrar.</p>
    );
  }
  // The rounds played: a game cut short by players leaving has fewer.
  const rounds = Math.max(...drawings.map((d) => d.round));
  const ordered = [...drawings].sort((a, b) => a.round - b.round);

  return (
    <PairResults
      mode="Fim de jogo"
      detail={`Emenda, ${rounds} ${rounds === 1 ? "rodada" : "rodadas"}, ${players.length} jogadores`}
      players={players}
      rounds={rounds}
      isHost={isHost}
      onPlayAgain={onPlayAgain}
      title={`Vocês emendaram ${drawings.length} ${drawings.length === 1 ? "desenho" : "desenhos"}`}
      summary="Cada um desenhou escondido na sua faixa, e só as emendas com o vizinho eram vistas ao vivo."
    >
      {ordered.map((drawing) => (
        <PairCard
          key={`${drawing.round}:${drawing.groupId}`}
          round={drawing.round}
          total={rounds}
          picture={<Picture drawing={drawing} />}
          parts={partsOf(drawing)}
          footer={
            <>
              <div className="flex-1 min-w-0">
                <SaveButton
                  drawing={{ round: drawing.round, pairId: drawing.groupId }}
                  compose={() => composeSeamDrawing(drawing)}
                  saving={saving}
                />
              </div>
              <DownloadDrawing compose={() => composeSeamDrawing(drawing)} />
            </>
          }
        />
      ))}
    </PairResults>
  );
}
