"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { DrawingFooter, DrawingHeader } from "@/components/game/drawing-frame";
import {
  FaceCanvas,
  type FaceCanvasHandle,
} from "@/components/canvas/face-canvas";
import { FACE_REGIONS, getRegionDef } from "@/lib/face-regions";
import type { FaceRegionId, FaceTemplateId } from "@/types/game";

interface FaceDrawingPhaseProps {
  round: number;
  totalRounds: number;
  regions: FaceRegionId[];
  faceTemplate: FaceTemplateId;
  skinTone: string;
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

export function FaceDrawingPhase({
  round,
  totalRounds,
  regions,
  faceTemplate,
  skinTone,
  endsAt,
  timeUp,
  mineReceived,
  partnerReceived,
  onSubmit,
  initialSubmitted,
  me,
  partner,
}: FaceDrawingPhaseProps) {
  const canvasRef = useRef<FaceCanvasHandle>(null);
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

  const theirs = FACE_REGIONS.filter(
    (r) => r.id !== "whole" && !regions.includes(r.id as FaceRegionId),
  ).map((r) => r.label.toLowerCase());

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      <DrawingHeader
        round={round}
        totalRounds={totalRounds}
        title="Monte o rosto!"
        endsAt={endsAt}
      />

      <FaceCanvas
        ref={canvasRef}
        assignedRegions={regions}
        faceTemplate={faceTemplate}
        skinTone={skinTone}
      />

      <DrawingFooter
        me={{
          ...me,
          part: (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              Você desenha:
              <ul aria-label="Suas partes do rosto" className="contents">
                {regions.map((id) => (
                  <li
                    key={id}
                    className="px-2 font-display font-bold"
                    style={{
                      backgroundColor: getRegionDef(id).color + "33",
                    }}
                  >
                    {getRegionDef(id).label}
                  </li>
                ))}
              </ul>
            </div>
          ),
        }}
        partner={{ ...partner, part: `${partner.name}: ${theirs.join(", ")}` }}
        submitted={submitted}
        timeUp={timeUp}
        mineReceived={mineReceived}
        partnerReceived={partnerReceived}
        waiting="Desenho enviado! Esperando parceiro..."
        onSubmit={doSubmit}
      />
    </div>
  );
}
