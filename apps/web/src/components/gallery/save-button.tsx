"use client";
import { useEffect, useState } from "react";
import { Check } from "@phosphor-icons/react";
import { useAccount } from "@/hooks/use-account";
import type { DrawingRef } from "@/types/game";

export type SaveFailure = { reason: "limit" | "failed" | "not-allowed" };

/** What the final screens need to put drawings in the gallery (from `useGameState`). */
export interface GallerySaving {
  /** Keys of the drawings of this room that are already in the gallery. */
  saved: string[];
  /** The server's answer to the last failed attempt on a drawing, by key. A new object each time. */
  failed: Record<string, SaveFailure>;
  save: (ref: DrawingRef, imageDataUrl: string) => void;
}

export function drawingKey(ref: DrawingRef): string {
  return ref.pairId ? `${ref.round}:${ref.pairId}` : `${ref.round}`;
}

/** How long to wait for the server's answer before giving the button back. */
const ANSWER_TIMEOUT_MS = 15_000;

interface SaveButtonProps {
  drawing: DrawingRef;
  /** Builds the image that will be published. */
  compose: () => Promise<string>;
  saving: GallerySaving;
}

/** "Salvar na galeria" under a finished drawing. Only players with an account see it. */
export function SaveButton({ drawing, compose, saving }: SaveButtonProps) {
  const { status } = useAccount();
  const key = drawingKey(drawing);
  const failure = saving.failed[key];
  // An attempt in progress, and the failure that was already on screen when
  // it started (so it isn't mistaken for this attempt's answer).
  const [attempt, setAttempt] = useState<{ before?: SaveFailure } | null>(null);
  // Failed without an answer from the server: couldn't compose, or it never replied.
  const [localFailure, setLocalFailure] = useState(false);

  const saved = saving.saved.includes(key);
  const answered = failure !== undefined && failure !== attempt?.before;
  const busy = attempt !== null && !answered && !saved;

  // The request can be lost (the socket dropped) or the answer never come:
  // don't leave the button on "Salvando..." for ever.
  useEffect(() => {
    if (!busy) return;
    const timer = setTimeout(() => {
      setAttempt(null);
      setLocalFailure(true);
    }, ANSWER_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [busy]);

  if (saved)
    return (
      <p className="min-h-12 px-4 flex items-center justify-center gap-2 bg-mint font-display font-bold text-lg">
        <Check aria-hidden="true" weight="bold" size={22} />
        Salvo na galeria
      </p>
    );
  if (status !== "ready") return null;

  async function save() {
    if (busy) return;
    setLocalFailure(false);
    setAttempt({ before: failure });
    try {
      saving.save(drawing, await compose());
    } catch {
      setAttempt(null);
      setLocalFailure(true);
    }
  }

  // Only a failure of an attempt made from this button is worth showing.
  const shown = localFailure
    ? "failed"
    : attempt && answered
      ? failure.reason
      : null;
  return (
    <div className="w-full flex flex-col gap-1">
      <button
        onClick={save}
        disabled={busy}
        className="press w-full min-h-12 px-4 bg-brand text-white hover:bg-brand-dark disabled:opacity-60 font-display font-bold text-lg"
      >
        {busy ? "Salvando..." : "Salvar na galeria"}
      </button>
      {shown && (
        <p className="text-sm font-semibold text-red-600">
          {shown === "limit"
            ? "Você já salvou 10 desenhos hoje. Tente amanhã."
            : "Não deu para salvar. Tente de novo."}
        </p>
      )}
    </div>
  );
}
