"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
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
    <main className="min-h-screen w-full max-w-5xl mx-auto flex flex-col gap-6 px-4 sm:px-6 py-6">
      <header className="flex items-center justify-between">
        <Link
          href="/"
          className="text-2xl font-black tracking-tight bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent"
        >
          Scrawl
        </Link>
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-200">
          Voltar
        </Link>
      </header>
      <h1 className="text-2xl font-bold">Galeria</h1>

      {drawings.length === 0 && state === "end" && (
        <p className="text-gray-500">
          Ninguém salvou um desenho ainda. Jogue uma partida e salve o primeiro.
        </p>
      )}
      {state === "failed" && (
        <p className="text-gray-500">Não deu para carregar a galeria agora.</p>
      )}

      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {drawings.map((d) => (
          <li key={d.id}>
            <DrawingCard drawing={d} onSelect={() => setSelected(d)} />
          </li>
        ))}
      </ul>

      {state === "loading" && <p className="text-gray-500">Carregando...</p>}
      {(state === "idle" || state === "failed") && (
        <button
          onClick={() => loadMore(drawings.length)}
          className="self-center px-5 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-semibold transition-colors"
        >
          {state === "failed" ? "Tentar de novo" : "Carregar mais"}
        </button>
      )}

      {selected && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-10"
          onClick={() => setSelected(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Desenho de ${authorsLabel(selected)}`}
            className="w-full max-w-2xl bg-gray-900 rounded-2xl p-4 flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <DrawingCard drawing={selected} />
            <div className="flex items-end justify-between gap-4">
              <DrawingCaption drawing={selected} />
              <button
                onClick={() => setSelected(null)}
                autoFocus
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-semibold transition-colors"
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
