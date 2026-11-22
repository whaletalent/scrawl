"use client";
import { useRef, useEffect } from "react";
import { loadFaceTemplateImage, loadImage } from "@/lib/face-compose";
import { FACE_REGIONS } from "@/lib/face-regions";
import type { FaceDrawing, Player } from "@/types/game";
import {
  SaveButton,
  type GallerySaving,
} from "@/components/gallery/save-button";
import { DownloadDrawing } from "@/components/share/download-drawing";
import { composeFaceDrawing } from "@/lib/compose-drawing";
import { PairCard, PairResults, PLAYER_FILL, nameOf } from "./pair-results";

interface FaceRevealProps {
  drawings: FaceDrawing[];
  /** Both players drew every round. */
  players: Player[];
  saving: GallerySaving;
  isHost: boolean;
  onPlayAgain: () => void;
}

function CompositeCanvas({ drawing }: { drawing: FaceDrawing }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 600;

    const compose = async () => {
      // 1. White background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 800, 600);

      // 2. Render face template with skin tone
      const templateImg = await loadFaceTemplateImage(
        drawing.faceTemplate,
        drawing.skinTone,
      );
      if (templateImg) ctx.drawImage(templateImg, 0, 0, 800, 600);

      // 3. Draw player images on top (they have transparent backgrounds)
      for (const src of [
        drawing.player1ImageDataUrl,
        drawing.player2ImageDataUrl,
      ]) {
        if (!src) continue;
        try {
          const img = await loadImage(src);
          ctx.drawImage(img, 0, 0);
        } catch {
          // skip failed images
        }
      }
    };

    compose();
  }, [drawing]);

  return (
    <div
      className="relative w-full bg-white border-2 border-soft-strong overflow-hidden"
      style={{ aspectRatio: "800 / 600" }}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}

export function FaceReveal({
  drawings,
  players,
  saving,
  isHost,
  onPlayAgain,
}: FaceRevealProps) {
  if (drawings.length === 0) {
    return (
      <p className="sheet px-8 py-6 text-muted">Nenhum desenho para mostrar.</p>
    );
  }

  // Which parts of the face each player drew, in the order of FACE_REGIONS.
  const parts = (d: FaceDrawing) =>
    [d.player1Id, d.player2Id].map((id, i) => ({
      name: nameOf(players, id),
      fill: PLAYER_FILL[i],
      what: FACE_REGIONS.filter((r) =>
        d.assignments.some((a) => a.regionId === r.id && a.playerId === id),
      )
        .map((r) => r.label.toLowerCase())
        .join(", "),
    }));

  return (
    <PairResults
      mode="Caricatura a dois"
      players={players}
      rounds={drawings.length}
      isHost={isHost}
      onPlayAgain={onPlayAgain}
      title={`Vocês montaram ${drawings.length} ${drawings.length === 1 ? "caricatura" : "caricaturas"}`}
      summary="Cada rosto tem seis partes, três para cada um, sem ver o que o outro desenhou."
    >
      {drawings.map((drawing) => (
        <PairCard
          key={drawing.round}
          round={drawing.round}
          total={drawings.length}
          picture={<CompositeCanvas drawing={drawing} />}
          parts={parts(drawing)}
          footer={
            <>
              <div className="flex-1 min-w-0">
                <SaveButton
                  drawing={{ round: drawing.round }}
                  compose={() => composeFaceDrawing(drawing)}
                  saving={saving}
                />
              </div>
              <DownloadDrawing compose={() => composeFaceDrawing(drawing)} />
            </>
          }
        />
      ))}
    </PairResults>
  );
}
