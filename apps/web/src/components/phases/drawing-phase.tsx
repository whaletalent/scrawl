"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { DrawingFooter, DrawingHeader } from "@/components/game/drawing-frame";
import {
  DrawingCanvas,
  type DrawingCanvasHandle,
} from "@/components/canvas/drawing-canvas";

interface DrawingPhaseProps {
  theme: string;
  side: "left" | "right";
  onSubmit: (imageDataUrl: string, round: number) => void;
  /** The server ended the turn: send whatever is on the canvas. */
  timeUp: boolean;
  /** The server confirmed it has this round's drawing from me / my partner. */
  mineReceived: boolean;
  partnerReceived: boolean;
  /** True when rejoining a round the server already has our drawing for. */
  initialSubmitted?: boolean;
  endsAt: number;
  round: number;
  totalRounds: number;
  /** The two people drawing this picture, for the chips under the canvas. */
  me: { name: string; avatarUrl?: string | null };
  partner: { name: string; avatarUrl?: string | null };
}

export function DrawingPhase({
  theme,
  side,
  onSubmit,
  endsAt,
  timeUp,
  mineReceived,
  partnerReceived,
  initialSubmitted,
  round,
  totalRounds,
  me,
  partner,
}: DrawingPhaseProps) {
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

  const mine = side === "left" ? "esquerda" : "direita";
  const theirs = side === "left" ? "direita" : "esquerda";

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      <DrawingHeader
        round={round}
        totalRounds={totalRounds}
        srPrefix="Desenhe: "
        title={theme}
        endsAt={endsAt}
      />

      <DrawingCanvas ref={canvasRef} side={side} />

      <DrawingFooter
        me={{ ...me, part: `Você desenha a metade ${mine}` }}
        partner={{ ...partner, part: `${partner.name}, metade ${theirs}` }}
        submitted={submitted}
        timeUp={timeUp}
        mineReceived={mineReceived}
        partnerReceived={partnerReceived}
        waiting="Desenho enviado! Esperando os outros..."
        onSubmit={handleSubmit}
      />
    </div>
  );
}
