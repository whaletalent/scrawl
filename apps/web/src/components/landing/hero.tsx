"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { validateNickname } from "@/lib/room-utils";
import type { FaceTemplateOption, GameMode } from "@/types/game";
import { ModeSelector } from "@/components/lobby/mode-selector";

export function Hero() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState<"initial" | "create" | "join">("initial");
  const [error, setError] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>("party");
  const [totalRounds, setTotalRounds] = useState(3);
  const [turnDuration, setTurnDuration] = useState(90);
  const [faceTemplate, setFaceTemplate] = useState<FaceTemplateOption>("random");
  const [skinTone, setSkinTone] = useState("#FDDCB5");

  function handleCreate() {
    const err = validateNickname(nickname);
    if (err) { setError(err); return; }
    sessionStorage.setItem("scrawl-nickname", nickname.trim());
    sessionStorage.setItem("scrawl-action", "create");
    sessionStorage.setItem("scrawl-gameMode", gameMode);
    sessionStorage.setItem("scrawl-totalRounds", String(totalRounds));
    sessionStorage.setItem("scrawl-turnDuration", String(turnDuration));
    sessionStorage.setItem("scrawl-faceTemplate", faceTemplate);
    sessionStorage.setItem("scrawl-skinTone", skinTone);
    router.push("/room/new");
  }

  function handleJoin() {
    const err = validateNickname(nickname);
    if (err) { setError(err); return; }
    const code = roomCode.trim().toUpperCase();
    if (code.length < 5) { setError("Enter a valid room code"); return; }
    sessionStorage.setItem("scrawl-nickname", nickname.trim());
    sessionStorage.setItem("scrawl-action", "join");
    router.push(`/room/${code}`);
  }

  return (
    <div className="flex flex-col items-center gap-8 px-4">
      <h1 className="text-6xl font-black tracking-tight bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
        Scrawl
      </h1>
      <p className="text-xl text-gray-400 text-center max-w-md">
        Draw, laugh, compete. The party game where your terrible art becomes legendary.
      </p>

      <div className="w-full max-w-sm flex flex-col gap-4">
        <input
          type="text"
          placeholder="Your nickname"
          value={nickname}
          onChange={(e) => { setNickname(e.target.value); setError(null); }}
          maxLength={16}
          className="w-full px-4 py-3 bg-gray-800 rounded-xl border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-center text-lg"
        />

        {mode === "initial" && (
          <div className="flex gap-3">
            <button
              onClick={() => setMode("create")}
              className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold text-lg transition-colors"
            >
              Create Room
            </button>
            <button
              onClick={() => setMode("join")}
              className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold text-lg transition-colors"
            >
              Join Room
            </button>
          </div>
        )}

        {mode === "create" && (
          <div className="flex flex-col gap-3">
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
            <button
              onClick={handleCreate}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold text-lg transition-colors"
            >
              {gameMode === "party" ? "Create Party" : gameMode === "split-body" ? "Create Split Body" : "Create Face Builder"}
            </button>
          </div>
        )}

        {mode === "join" && (
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Room code (e.g. ABC12)"
              value={roomCode}
              onChange={(e) => { setRoomCode(e.target.value.toUpperCase()); setError(null); }}
              maxLength={5}
              className="w-full px-4 py-3 bg-gray-800 rounded-xl border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-center text-lg tracking-widest uppercase"
            />
            <button
              onClick={handleJoin}
              className="w-full py-3 bg-pink-600 hover:bg-pink-500 rounded-xl font-bold text-lg transition-colors"
            >
              Join Party
            </button>
          </div>
        )}

        {mode !== "initial" && (
          <button
            onClick={() => { setMode("initial"); setError(null); }}
            className="text-gray-500 hover:text-gray-400 text-sm"
          >
            Back
          </button>
        )}

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      </div>
    </div>
  );
}
