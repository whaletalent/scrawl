"use client";
import { useState } from "react";
import type { Theme } from "@/types/game";

export const NOTE_COLOURS = [
  "bg-blush",
  "bg-mint",
  "bg-sky",
  "bg-amber/50",
  "bg-card",
];

interface ThemeCreationProps {
  themes: Theme[];
  playerId: string;
  playerCount: number;
  onSubmit: (text: string) => void;
}

export function ThemeCreation({
  themes,
  playerId,
  playerCount,
  onSubmit,
}: ThemeCreationProps) {
  const [text, setText] = useState("");
  const maxThemes = playerCount < 6 ? 2 : 1;
  const myThemes = themes.filter((t) => t.authorId === playerId);
  const canSubmit = myThemes.length < maxThemes && text.trim().length > 0;

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit(text.trim());
    setText("");
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col gap-3 pr-10">
        <h2 className="text-4xl sm:text-6xl leading-none">Crie um tema</h2>
        <p className="text-lg leading-normal">
          Quanto mais absurdo, melhor. ({myThemes.length}/{maxThemes} enviados)
        </p>
      </div>

      {myThemes.length < maxThemes && (
        <div className="w-full max-w-2xl flex flex-wrap gap-3">
          <input
            type="text"
            aria-label="Seu tema"
            placeholder='ex.: "Shrek jogando xadrez com o Gandalf"'
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            maxLength={100}
            className="flex-[1_1_15rem] min-w-0 h-14 px-4 bg-soft border-b-4 border-ink font-medium text-lg text-ink placeholder-faint focus:outline-none focus:border-brand"
          />
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="press min-h-14 px-7 bg-brand text-white hover:bg-brand-dark disabled:bg-soft disabled:text-faint font-display font-extrabold text-xl"
          >
            Enviar
          </button>
        </div>
      )}

      {/* Your own themes are sticky notes; the others stay face down. */}
      <ul className="flex flex-wrap items-start gap-4">
        {themes.map((t, i) =>
          t.authorId === playerId ? (
            <li
              key={t.id}
              className={`shadow-hard max-w-xs px-4 pt-5 pb-3.5 font-display font-bold text-xl leading-tight break-words bg-blush ${i % 2 ? "rotate-1" : "-rotate-1"}`}
            >
              {t.text}
            </li>
          ) : (
            <li key={t.id} className="px-4 py-3.5 bg-paper-deep text-muted">
              Tema enviado...
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
