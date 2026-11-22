"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen } from "@phosphor-icons/react";
import {
  MODE_LABEL,
  authorsLabel,
  listDrawings,
  type GalleryDrawing,
} from "@/lib/gallery";

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
    <aside className="tag bg-paper-deep flex-[1_1_21rem] min-w-0 flex flex-col gap-6 px-7 py-8">
      <h2 className="text-3xl">Últimos desenhos</h2>
      {drawings === null ? null : drawings.length === 0 ? (
        <p className="text-muted">
          Os desenhos salvos pela galera vão aparecer aqui.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-4 gap-y-5">
            {drawings.map((d, i) => (
              <Link
                key={d.id}
                href="/gallery/"
                className={`press relative flex flex-col bg-card shadow-hard ${
                  i === 0
                    ? "col-span-2 gap-2 px-2.5 pt-2.5 pb-3"
                    : "gap-1.5 px-2 pt-2 pb-2.5"
                }`}
              >
                {i === 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-3 left-6 w-15 h-6 bg-amber/80"
                  />
                )}
                <img
                  src={d.imageUrl}
                  alt={`Desenho de ${authorsLabel(d)}`}
                  loading="lazy"
                  className="w-full aspect-[4/3] object-cover bg-white"
                />
                {i === 0 && d.theme && (
                  <span className="font-display font-bold text-lg leading-tight">
                    {d.theme}
                  </span>
                )}
                <span className="text-sm text-muted">
                  {d.authors.map((a) => a.name).join(" e ")}
                  {i === 0 && `, no ${MODE_LABEL[d.gameMode]}`}
                </span>
              </Link>
            ))}
          </div>
          <Link
            href="/gallery/"
            className="press min-h-15 px-6 flex items-center justify-between gap-3 bg-brand text-white hover:bg-brand-dark font-display font-extrabold text-2xl"
          >
            Abrir a galeria
            <BookOpen aria-hidden="true" weight="bold" size={28} />
          </Link>
        </>
      )}
    </aside>
  );
}
