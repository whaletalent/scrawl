"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ModeSelector } from "@/components/lobby/mode-selector";
import { CREATE_LABEL, storeRoomOptions } from "@/lib/room-options";
import { NEW_ROOM, roomPath } from "@/lib/routes";
import type { FaceTemplateOption, GameMode } from "@/types/game";

const VISIBILITY = [
  {
    id: "private",
    label: "Privada",
    hint: "Só entra quem tiver o link ou o código.",
  },
  {
    id: "public",
    label: "Pública",
    hint: "Aparece na lista de salas abertas para qualquer pessoa entrar.",
  },
] as const;

/** The home's "Criar sala" panel: game options plus who can find the room. */
export function CreateRoom({ username }: { username: string }) {
  const router = useRouter();
  const [gameMode, setGameMode] = useState<GameMode>("party");
  const [totalRounds, setTotalRounds] = useState(3);
  const [turnDuration, setTurnDuration] = useState(90);
  const [faceTemplate, setFaceTemplate] =
    useState<FaceTemplateOption>("random");
  const [skinTone, setSkinTone] = useState("#FDDCB5");
  const [visibility, setVisibility] = useState<"private" | "public">("private");

  function create() {
    storeRoomOptions({
      nickname: username,
      gameMode,
      totalRounds,
      turnDuration,
      faceTemplate,
      skinTone,
      visibility,
    });
    router.push(roomPath(NEW_ROOM));
  }

  return (
    <div className="flex flex-col gap-3 bg-gray-900 rounded-xl p-4">
      <ModeSelector
        gameMode={gameMode}
        totalRounds={totalRounds}
        turnDuration={turnDuration}
        faceTemplate={faceTemplate}
        onModeChange={setGameMode}
        onRoundsChange={setTotalRounds}
        onDurationChange={setTurnDuration}
        onFaceTemplateChange={setFaceTemplate}
        skinTone={skinTone}
        onSkinToneChange={setSkinTone}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm text-gray-400 px-2 mb-1">
          Quem pode entrar
        </legend>
        {VISIBILITY.map((v) => (
          <label
            key={v.id}
            className={`flex items-start gap-3 px-3 py-2 rounded-lg cursor-pointer border ${
              visibility === v.id
                ? "border-purple-500 bg-purple-900/20"
                : "border-gray-800"
            }`}
          >
            <input
              type="radio"
              name="visibility"
              aria-label={v.label}
              checked={visibility === v.id}
              onChange={() => setVisibility(v.id)}
              className="mt-1 accent-purple-500"
            />
            <span>
              <span className="font-medium">{v.label}</span>
              <span className="block text-xs text-gray-400">{v.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <button
        onClick={create}
        className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold text-lg transition-colors"
      >
        {CREATE_LABEL[gameMode]}
      </button>
    </div>
  );
}
