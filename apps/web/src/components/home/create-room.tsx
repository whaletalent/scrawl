"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "@phosphor-icons/react";
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
    <div className="flex flex-col gap-6 bg-paper-deep p-5 sm:p-8">
      <h2 className="text-3xl sm:text-4xl leading-none">
        Qual é o jogo de hoje?
      </h2>
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
      <fieldset className="flex flex-col gap-2 max-w-xl">
        <legend className="font-display font-bold text-lg mb-2.5">
          Quem pode entrar
        </legend>
        {VISIBILITY.map((v) => (
          <label
            key={v.id}
            className={`flex items-start gap-3 px-3.5 py-2.5 cursor-pointer ${
              visibility === v.id ? "bg-amber/60" : "bg-paper"
            }`}
          >
            <input
              type="radio"
              name="visibility"
              aria-label={v.label}
              checked={visibility === v.id}
              onChange={() => setVisibility(v.id)}
              className="mt-1 w-5 h-5 accent-brand"
            />
            <span>
              <span className="font-semibold text-lg">{v.label}</span>
              <span className="block text-muted">{v.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <button
        onClick={create}
        className="press w-full max-w-md min-h-17 px-7 flex items-center justify-between gap-4 bg-brand text-white hover:bg-brand-dark font-display font-extrabold text-xl sm:text-3xl text-left"
      >
        {CREATE_LABEL[gameMode]}
        <ArrowRight aria-hidden="true" weight="bold" size={30} />
      </button>
    </div>
  );
}
