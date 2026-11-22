"use client";
import { getSilhouette } from "@/components/silhouettes";
import type { SplitDrawing, Player } from "@/types/game";
import {
  SaveButton,
  type GallerySaving,
} from "@/components/gallery/save-button";
import { DownloadDrawing } from "@/components/share/download-drawing";
import { composeSplitDrawing } from "@/lib/compose-drawing";
import { PairCard, PairResults, PLAYER_FILL, nameOf } from "./pair-results";

interface SplitRevealProps {
  drawings: SplitDrawing[];
  /** Both players drew every round. */
  players: Player[];
  saving: GallerySaving;
  isHost: boolean;
  onPlayAgain: () => void;
}

function Half({ src, alt }: { src: string | null; alt: string }) {
  return src ? (
    <img
      src={src}
      alt={alt}
      className="w-full h-1/2"
      style={{ objectFit: "fill" }}
    />
  ) : (
    <div className="w-full h-1/2 flex items-center justify-center bg-soft">
      <span className="text-muted">Não enviado</span>
    </div>
  );
}

export function SplitReveal({
  drawings,
  players,
  saving,
  isHost,
  onPlayAgain,
}: SplitRevealProps) {
  if (drawings.length === 0) {
    return (
      <p className="sheet px-8 py-6 text-muted">Nenhum desenho para mostrar.</p>
    );
  }
  const fill = (id: string) =>
    PLAYER_FILL[players.findIndex((p) => p.id === id) === 1 ? 1 : 0];

  return (
    <PairResults
      mode="Monstrinho"
      players={players}
      rounds={drawings.length}
      isHost={isHost}
      onPlayAgain={onPlayAgain}
      title={`Vocês montaram ${drawings.length} ${drawings.length === 1 ? "monstrinho" : "monstrinhos"}`}
      summary="Um fez a cabeça e o tronco, o outro as pernas, sem ver a outra metade."
    >
      {drawings.map((drawing) => {
        const Silhouette = getSilhouette(drawing.silhouetteId);
        return (
          <PairCard
            key={drawing.round}
            round={drawing.round}
            total={drawings.length}
            picture={
              <div
                className="relative w-full flex flex-col bg-white border-2 border-soft-strong overflow-hidden"
                style={{ aspectRatio: "800 / 600" }}
              >
                <div className="absolute inset-0 pointer-events-none opacity-[0.04]">
                  <Silhouette className="w-full h-full" />
                </div>
                <Half src={drawing.topImageDataUrl} alt="Metade de cima" />
                <div className="absolute left-0 right-0 top-1/2 border-t-2 border-dashed border-brand/50 pointer-events-none" />
                <Half src={drawing.bottomImageDataUrl} alt="Metade de baixo" />
              </div>
            }
            parts={[
              {
                name: nameOf(players, drawing.topPlayerId),
                fill: fill(drawing.topPlayerId),
                what: "cabeça e tronco",
              },
              {
                name: nameOf(players, drawing.bottomPlayerId),
                fill: fill(drawing.bottomPlayerId),
                what: "pernas",
              },
            ]}
            footer={
              <>
                <div className="flex-1 min-w-0">
                  <SaveButton
                    drawing={{ round: drawing.round }}
                    compose={() => composeSplitDrawing(drawing)}
                    saving={saving}
                  />
                </div>
                <DownloadDrawing compose={() => composeSplitDrawing(drawing)} />
              </>
            }
          />
        );
      })}
    </PairResults>
  );
}
