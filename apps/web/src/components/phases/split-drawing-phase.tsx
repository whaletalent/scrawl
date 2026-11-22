"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { DrawingFooter, DrawingHeader } from "@/components/game/drawing-frame";
import {
  DrawingCanvas,
  type DrawingCanvasHandle,
} from "@/components/canvas/drawing-canvas";
import { getSilhouette } from "@/components/silhouettes";
import type { SilhouetteId } from "@/types/game";

interface SplitDrawingPhaseProps {
  round: number;
  totalRounds: number;
  side: "top" | "bottom";
  silhouetteId: SilhouetteId;
  endsAt: number;
  onSubmit: (imageDataUrl: string, round: number) => void;
  /** The server ended the turn: send whatever is on the canvas. */
  timeUp: boolean;
  /** The server confirmed it has this round's drawing from me / my partner. */
  mineReceived: boolean;
  partnerReceived: boolean;
  /** True when rejoining a round the server already has our drawing for. */
  initialSubmitted?: boolean;
  /** The two people drawing this picture, for the chips under the canvas. */
  me: { name: string; avatarUrl?: string | null };
  partner: { name: string; avatarUrl?: string | null };
}

export function SplitDrawingPhase({
  round,
  totalRounds,
  side,
  silhouetteId,
  endsAt,
  timeUp,
  mineReceived,
  partnerReceived,
  onSubmit,
  initialSubmitted,
  me,
  partner,
}: SplitDrawingPhaseProps) {
  const canvasRef = useRef<DrawingCanvasHandle>(null);
  const [submitted, setSubmitted] = useState(initialSubmitted ?? false);

  const doSubmit = useCallback(() => {
    if (submitted) return;
    const image = canvasRef.current?.exportImage();
    if (image) {
      onSubmit(image, round);
      setSubmitted(true);
    }
  }, [submitted, onSubmit, round]);

  // The server says when time is up (and waits a moment for the drawing),
  // so neither this device's clock nor the network delay decides whether
  // the drawing makes it into its round.
  useEffect(() => {
    if (timeUp && !submitted) doSubmit();
  }, [timeUp, submitted, doSubmit]);

  function handleSubmit() {
    doSubmit();
  }

  const Silhouette = getSilhouette(silhouetteId);
  const mine = side === "top" ? "cabeça e tronco" : "pernas e pés";
  const theirs = side === "top" ? "pernas e pés" : "cabeça e tronco";

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      <DrawingHeader
        round={round}
        totalRounds={totalRounds}
        title="Complete o personagem!"
        endsAt={endsAt}
      />

      <DrawingCanvas
        ref={canvasRef}
        side={side}
        silhouetteOverlay={<Silhouette className="w-full h-full" />}
      />

      <DrawingFooter
        me={{
          ...me,
          part: (
            <>
              Você desenha: <strong className="text-brand">{mine}</strong>
            </>
          ),
        }}
        partner={{ ...partner, part: `${partner.name}: ${theirs}` }}
        submitted={submitted}
        timeUp={timeUp}
        mineReceived={mineReceived}
        partnerReceived={partnerReceived}
        waiting="Desenho enviado! Esperando parceiro..."
        onSubmit={handleSubmit}
      />
    </div>
  );
}
