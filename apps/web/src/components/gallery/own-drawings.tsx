"use client";
import { useEffect, useState } from "react";
import {
  listOwnDrawings,
  removeDrawing,
  type GalleryDrawing,
} from "@/lib/gallery";
import { DrawingCaption, DrawingCard } from "./drawing-card";

/** The profile's list of gallery drawings the player drew or saved, each removable. */
export function OwnDrawings({ userId }: { userId: string }) {
  const [drawings, setDrawings] = useState<GalleryDrawing[] | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listOwnDrawings(userId).then((list) => {
      if (!cancelled) setDrawings(list ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function remove(d: GalleryDrawing) {
    setError(null);
    if (await removeDrawing(d)) {
      setDrawings((current) => current?.filter((x) => x.id !== d.id) ?? null);
    } else {
      setError("Não deu para remover. Tente de novo.");
    }
    setConfirming(null);
  }

  if (drawings === null) return null;
  return (
    <section className="w-full flex flex-col gap-5">
      <h2 className="text-3xl sm:text-4xl leading-none pr-10">
        Seus desenhos na galeria
      </h2>
      {drawings.length === 0 && (
        <p className="text-lg text-muted">
          Você ainda não tem desenhos na galeria.
        </p>
      )}
      {error && <p className="font-semibold text-red-600">{error}</p>}
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] items-start gap-x-5 gap-y-7">
        {drawings.map((d) => (
          <li
            key={d.id}
            className="shadow-hard bg-card border-2 border-soft-strong p-2.5 flex flex-col gap-2"
          >
            <DrawingCard drawing={d} />
            <DrawingCaption drawing={d} />
            {confirming === d.id ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="font-semibold">
                  Sai da galeria para todo mundo. Remover?
                </span>
                <button
                  onClick={() => remove(d)}
                  className="press min-h-11 px-4 bg-red-600 text-white hover:bg-red-700 font-display font-bold"
                >
                  Sim, remover
                </button>
                <button
                  onClick={() => setConfirming(null)}
                  className="min-h-11 underline"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(d.id)}
                className="self-start min-h-11 font-semibold text-red-700 underline"
              >
                Remover da galeria
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
