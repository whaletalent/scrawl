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
    <section className="w-full flex flex-col gap-3">
      <h2 className="font-semibold">Seus desenhos na galeria</h2>
      {drawings.length === 0 && (
        <p className="text-sm text-gray-500">
          Você ainda não tem desenhos na galeria.
        </p>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
      <ul className="flex flex-col gap-4">
        {drawings.map((d) => (
          <li
            key={d.id}
            className="bg-gray-800 rounded-xl p-3 flex flex-col gap-2"
          >
            <DrawingCard drawing={d} />
            <DrawingCaption drawing={d} />
            {confirming === d.id ? (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-300">
                  Sai da galeria para todo mundo. Remover?
                </span>
                <button
                  onClick={() => remove(d)}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded-lg font-semibold"
                >
                  Sim, remover
                </button>
                <button
                  onClick={() => setConfirming(null)}
                  className="text-gray-400 hover:text-gray-200"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(d.id)}
                className="self-start text-sm text-gray-400 hover:text-red-300 underline"
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
