"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listDrawings, type GalleryDrawing } from "@/lib/gallery";
import { DrawingCard } from "./drawing-card";

/** The home's side column: the latest drawings anybody saved. */
export function LatestDrawings() {
  const [drawings, setDrawings] = useState<GalleryDrawing[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    void listDrawings({ limit: 6 }).then((list) => {
      if (!cancelled) setDrawings(list ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <aside className="md:w-60 shrink-0 flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-gray-400">
        Últimos desenhos salvos
      </h2>
      {drawings === null ? null : drawings.length === 0 ? (
        <p className="text-gray-500 text-sm py-6 text-center md:text-left">
          Os desenhos salvos pela galera vão aparecer aqui.
        </p>
      ) : (
        <>
          {/* A strip on phones, a two-column grid beside the room list on wider screens. */}
          <div className="flex md:grid md:grid-cols-2 gap-2 overflow-x-auto md:overflow-visible">
            {drawings.map((d) => (
              <div key={d.id} className="w-28 md:w-auto shrink-0">
                <DrawingCard drawing={d} />
              </div>
            ))}
          </div>
          <Link
            href="/gallery/"
            className="text-sm text-gray-400 hover:text-gray-200 underline"
          >
            Ver todos
          </Link>
        </>
      )}
    </aside>
  );
}
