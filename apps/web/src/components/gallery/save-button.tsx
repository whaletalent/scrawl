"use client";
import { useState } from "react";
import { useAccount } from "@/hooks/use-account";
import type { DrawingRef } from "@/types/game";

/** What the final screens need to put drawings in the gallery (from `useGameState`). */
export interface GallerySaving {
  /** Keys of the drawings of this room that are already in the gallery. */
  saved: string[];
  /** Why the last attempt on a drawing failed, by key. */
  failed: Record<string, "limit" | "failed" | "not-allowed">;
  save: (ref: DrawingRef, imageDataUrl: string) => void;
}

export function drawingKey(ref: DrawingRef): string {
  return ref.pairId ? `${ref.round}:${ref.pairId}` : `${ref.round}`;
}

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
  // Which failure (if any) had already been seen when this attempt started.
  const [pending, setPending] = useState<{ failure?: string } | null>(null);
  const [composeFailed, setComposeFailed] = useState(false);

  if (saving.saved.includes(key))
    return <p className="text-sm text-green-400">Salvo na galeria</p>;
  if (status !== "ready") return null;

  const failure = saving.failed[key];
  // The attempt is over once the server has answered with a (new) failure.
  const busy = pending !== null && failure === pending.failure;

  async function save() {
    setComposeFailed(false);
    setPending({ failure });
    try {
      saving.save(drawing, await compose());
    } catch {
      setComposeFailed(true);
      setPending(null);
    }
  }

  const showFailure = !busy && (composeFailed || (pending && failure));
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={save}
        disabled={busy}
        className="px-5 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-60 rounded-lg text-sm font-semibold transition-colors"
      >
        {busy ? "Salvando..." : "Salvar na galeria"}
      </button>
      {showFailure && (
        <p className="text-xs text-red-400 text-center">
          {failure === "limit" && !composeFailed
            ? "Você já salvou 10 desenhos hoje. Tente amanhã."
            : "Não deu para salvar. Tente de novo."}
        </p>
      )}
    </div>
  );
}
