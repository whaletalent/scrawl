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
  onSubmit: (imageDataUrl: string) => void;
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
      onSubmit(image);
      setSubmitted(true);
    }
  }, [submitted, onSubmit]);

  useEffect(() => {
    if (!endsAt || submitted) return;
    const ms = endsAt - Date.now() - 500;
    if (ms <= 0) {
      doSubmit();
      return;
    }
    const timer = setTimeout(doSubmit, ms);
    return () => clearTimeout(timer);
  }, [endsAt, submitted, doSubmit]);

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
        parts={[
          { ...me, part: `Você desenha a metade ${mine}` },
          { ...partner, part: `${partner.name}, metade ${theirs}` },
        ]}
        submitted={submitted}
        waiting="Desenho enviado! Esperando os outros..."
        onSubmit={handleSubmit}
      />
    </div>
  );
}
