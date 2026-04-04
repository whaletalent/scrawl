"use client";
import { useState } from "react";
import type { Theme } from "@/types/game";

interface ThemeCreationProps {
  themes: Theme[];
  playerId: string;
  playerCount: number;
  onSubmit: (text: string) => void;
}

export function ThemeCreation({ themes, playerId, playerCount, onSubmit }: ThemeCreationProps) {
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
    <div className="flex flex-col items-center gap-6 px-4 w-full max-w-md">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Create a Theme</h2>
        <p className="text-gray-400 mt-1">
          The more absurd, the better. ({myThemes.length}/{maxThemes} submitted)
        </p>
      </div>

      {myThemes.length < maxThemes && (
        <div className="w-full flex gap-2">
          <input
            type="text"
            placeholder='e.g. "Shrek playing chess with Gandalf"'
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            maxLength={100}
            className="flex-1 px-4 py-3 bg-gray-800 rounded-xl border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl font-bold transition-colors"
          >
            Send
          </button>
        </div>
      )}

      <div className="w-full flex flex-col gap-2">
        {themes.map((t) => (
          <div key={t.id} className="px-4 py-2 bg-gray-800/50 rounded-lg text-gray-300">
            {t.authorId === playerId ? t.text : "Theme submitted..."}
          </div>
        ))}
      </div>
    </div>
  );
}
