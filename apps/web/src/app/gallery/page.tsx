"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { DrawingCaption, DrawingCard } from "@/components/gallery/drawing-card";
import {
  GALLERY_PAGE_SIZE,
  authorsLabel,
  listDrawings,
  type GalleryDrawing,
} from "@/lib/gallery";

/** Everything players chose to make public, newest first. Open to anyone. */
export default function GalleryPage() {
  const [drawings, setDrawings] = useState<GalleryDrawing[]>([]);
  const [state, setState] = useState<"loading" | "idle" | "end" | "failed">(
    "loading",
  );
  const [selected, setSelected] = useState<GalleryDrawing | null>(null);

  async function loadMore(offset: number) {
    setState("loading");
    const page = await listDrawings({ offset });
    if (!page) {
      setState("failed");
      return;
    }
    setDrawings((current) => {
      // A drawing saved while paging shifts everything: never show one twice.
      const seen = new Set(current.map((d) => d.id));
      return [...current, ...page.filter((d) => !seen.has(d.id))];
    });
    setState(page.length < GALLERY_PAGE_SIZE ? "end" : "idle");
  }

  useEffect(() => {
    void loadMore(0);
  }, []);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  return (
    <main className="min-h-screen w-full flex flex-col gap-7 px-4 sm:px-8 lg:px-14 pt-8 pb-14">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/">
          <Wordmark large />
        </Link>
        <Link
          href="/"
          className="tag min-h-11 px-4 flex items-center font-semibold hover:text-brand"
        >
          Voltar
        </Link>
      </header>
      <div className="sheet flex flex-col gap-7 p-6 sm:p-12">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 pr-10">
          <h1 className="text-5xl sm:text-7xl leading-none">Galeria</h1>
          <p className="text-lg leading-normal max-w-[40ch]">
            Os desenhos que os jogadores salvaram no fim das partidas, do mais
            novo para o mais antigo.
          </p>
        </div>

        {drawings.length === 0 && state === "end" && (
          <p className="text-muted">
            Ninguém salvou um desenho ainda. Jogue uma partida e salve o
            primeiro.
          </p>
        )}
        {state === "failed" && (
          <p className="text-muted">Não deu para carregar a galeria agora.</p>
        )}

        <ul className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-x-5 gap-y-6">
          {drawings.map((d) => (
            <li
              key={d.id}
              className={`bg-card p-2 shadow-hard ${d === drawings[0] ? "taped" : ""}`}
            >
              <DrawingCard drawing={d} onSelect={() => setSelected(d)} />
            </li>
          ))}
        </ul>

        {state === "loading" && <p className="text-muted">Carregando...</p>}
        {(state === "idle" || state === "failed") && (
          <button
            onClick={() => loadMore(drawings.length)}
            className="press self-center min-h-12 px-6 bg-brand text-white hover:bg-brand-dark font-display font-bold text-lg"
          >
            {state === "failed" ? "Tentar de novo" : "Carregar mais"}
          </button>
        )}
      </div>

      {selected && (
        <div
          className="fixed inset-0 bg-ink/80 flex items-center justify-center p-4 z-20"
          onClick={() => setSelected(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Desenho de ${authorsLabel(selected)}`}
            className="taped w-full max-w-2xl bg-paper-deep shadow-hard-lg px-4 sm:px-6 pt-9 pb-5 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white p-1.5 shadow-hard">
              <DrawingCard drawing={selected} />
            </div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <DrawingCaption drawing={selected} />
              <button
                onClick={() => setSelected(null)}
                autoFocus
                className="press min-h-11 px-5 bg-brand text-white hover:bg-brand-dark font-display font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
