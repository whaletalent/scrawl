"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { DrawingFooter, DrawingHeader } from "@/components/game/drawing-frame";
import {
  SeamCanvas,
  type SeamCanvasHandle,
} from "@/components/canvas/seam-canvas";

/** Where each member of a pair / trio draws, left to right. */
const PLACE: Record<2 | 3, string[]> = {
  2: ["a parte da esquerda", "a parte da direita"],
  3: ["a parte da esquerda", "a parte do meio", "a parte da direita"],
};

interface SeamDrawingPhaseProps {
  round: number;
  totalRounds: number;
  /** The group, left to right; `index` is me. */
  members: { id: string; nickname: string; avatarUrl?: string | null }[];
  index: number;
  /** Ids of the other members whose layer the server has. */
  received: string[];
  /** Live strip frames, keyed "strip:playerId". */
  frames: Record<string, string>;
  onStripFrame: (strip: number, imageDataUrl: string) => void;
  onSubmit: (imageDataUrl: string, round: number) => void;
  /** The server ended the turn: send whatever is on the canvas. */
  timeUp: boolean;
  mineReceived: boolean;
  /** True when rejoining a round the server already has our layer for. */
  initialSubmitted?: boolean;
  endsAt: number;
}

export function SeamDrawingPhase({
  round,
  totalRounds,
  members,
  index,
  received,
  frames,
  onStripFrame,
  onSubmit,
  timeUp,
  mineReceived,
  initialSubmitted,
  endsAt,
}: SeamDrawingPhaseProps) {
  const canvasRef = useRef<SeamCanvasHandle>(null);
  const [submitted, setSubmitted] = useState(initialSubmitted ?? false);
  const size = members.length === 3 ? 3 : 2;

  const doSubmit = useCallback(() => {
    if (submitted) return;
    const image = canvasRef.current?.exportLayer();
    if (image) {
      onSubmit(image, round);
      setSubmitted(true);
    }
  }, [submitted, onSubmit, round]);

  // The server says when time is up, never this device's clock.
  useEffect(() => {
    if (timeUp && !submitted) doSubmit();
  }, [timeUp, submitted, doSubmit]);

  const me = members[index];

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      <DrawingHeader
        round={round}
        totalRounds={totalRounds}
        title="Desenhe na sua faixa!"
        endsAt={endsAt}
      />

      <SeamCanvas
        ref={canvasRef}
        size={size}
        index={index}
        members={members}
        frames={frames}
        onStripFrame={onStripFrame}
      />

      <DrawingFooter
        me={{
          name: me?.nickname ?? "Você",
          avatarUrl: me?.avatarUrl,
          part: `Você desenha ${PLACE[size][index] ?? "a sua parte"}`,
        }}
        partners={members
          .map((m, i) => ({ m, i }))
          .filter(({ i }) => i !== index)
          .map(({ m, i }) => ({
            name: m.nickname,
            avatarUrl: m.avatarUrl,
            part: `${m.nickname}: ${PLACE[size][i]}`,
            received: received.includes(m.id),
          }))}
        submitted={submitted}
        timeUp={timeUp}
        mineReceived={mineReceived}
        waiting="Desenho enviado! Esperando os outros grupos..."
        onSubmit={doSubmit}
      />
    </div>
  );
}
