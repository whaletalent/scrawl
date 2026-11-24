"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { DrawingFooter, DrawingHeader } from "@/components/game/drawing-frame";
import {
  SeamCanvas,
  type SeamCanvasHandle,
} from "@/components/canvas/seam-canvas";

interface DrawingPhaseProps {
  theme: string;
  side: "left" | "right";
  /** The pair, left to right (`side` says which one is me). */
  members: { id: string; nickname: string }[];
  /** Live strip frames, keyed "strip:playerId". */
  frames: Record<string, string>;
  onStripFrame: (strip: number, imageDataUrl: string) => void;
  /** The round-start message; a new one is a resync (see SeamCanvas). */
  resync?: unknown;
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
  members,
  frames,
  onStripFrame,
  resync,
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
  const canvasRef = useRef<SeamCanvasHandle>(null);
  const [submitted, setSubmitted] = useState(initialSubmitted ?? false);

  const doSubmit = useCallback(() => {
    if (submitted) return;
    const image = canvasRef.current?.exportLayer();
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

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      <DrawingHeader
        round={round}
        totalRounds={totalRounds}
        srPrefix="Desenhe: "
        title={theme}
        endsAt={endsAt}
      />

      {/* A new paper every round: the canvas keeps its strokes otherwise. */}
      <SeamCanvas
        key={round}
        ref={canvasRef}
        size={2}
        index={side === "left" ? 0 : 1}
        members={members}
        frames={frames}
        onStripFrame={onStripFrame}
        resync={resync}
        disabled={submitted}
      />

      <DrawingFooter
        me={{ ...me, part: "Você desenha sua parte e a emenda no meio" }}
        partners={[
          {
            ...partner,
            part: `${partner.name}: a outra parte e a emenda no meio`,
            received: partnerReceived,
          },
        ]}
        submitted={submitted}
        timeUp={timeUp}
        mineReceived={mineReceived}
        waiting="Desenho enviado! Esperando os outros..."
        onSubmit={handleSubmit}
      />
    </div>
  );
}
