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
  onSubmit: (imageDataUrl: string) => void;
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
        parts={[
          {
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
          },
          { ...partner, part: `${partner.name}: ${theirs.join(", ")}` },
        ]}
        submitted={submitted}
        waiting="Desenho enviado! Esperando parceiro..."
        onSubmit={doSubmit}
      />
    </div>
  );
}
