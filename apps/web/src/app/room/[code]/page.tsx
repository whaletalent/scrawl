"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useGameState, readSession } from "@/hooks/use-game-state";
import { GameController } from "@/components/game/game-controller";
import { validateNickname } from "@/lib/room-utils";

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const gameState = useGameState();
  // Someone who opened an invite link directly never went through the landing
  // page, so they have no nickname yet — ask before joining.
  const [askNickname, setAskNickname] = useState(false);
  const [nickname, setNickname] = useState("");
  const [nicknameError, setNicknameError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameState.connected || gameState.roomState || gameState.sessionLost) return;

    // Reloaded (or came back to) a room this tab already has a slot in:
    // reclaim it instead of joining as a new player. If the server refuses,
    // `rejoinFailed` flips and this effect falls through to a normal join.
    const session = readSession();
    if (!gameState.rejoinFailed && session && session.code === params.code.toUpperCase()) {
      gameState.rejoinRoom(session);
      return;
    }

    const nickname = sessionStorage.getItem("scrawl-nickname");
    if (!nickname) {
      setAskNickname(true);
      return;
    }

    if (params.code === "new") {
      const gameMode = (sessionStorage.getItem("scrawl-gameMode") as "party" | "split-body" | "face-builder") || "party";
      const totalRounds = parseInt(sessionStorage.getItem("scrawl-totalRounds") || "3", 10);
      const turnDuration = parseInt(sessionStorage.getItem("scrawl-turnDuration") || "90", 10);
      const faceTemplate = (sessionStorage.getItem("scrawl-faceTemplate") || "random") as import("@/types/game").FaceTemplateOption;
      const skinTone = sessionStorage.getItem("scrawl-skinTone") || "#FDDCB5";
      gameState.createRoom(nickname, gameMode, totalRounds, turnDuration, faceTemplate, skinTone);
    } else {
      gameState.joinRoom(params.code, nickname);
    }
  }, [gameState.connected, gameState.roomState, gameState.rejoinFailed, gameState.sessionLost, askNickname, params.code]);

  // The host lands on /room/new; once the server assigns the real code,
  // put it in the URL so the address bar is a working invite link.
  const roomCode = gameState.roomState?.code;
  useEffect(() => {
    if (roomCode && window.location.pathname !== `/room/${roomCode}`) {
      window.history.replaceState(null, "", `/room/${roomCode}`);
    }
  }, [roomCode]);

  function submitNickname() {
    const err = validateNickname(nickname);
    if (err) { setNicknameError(err); return; }
    sessionStorage.setItem("scrawl-nickname", nickname.trim());
    setAskNickname(false);
  }

  if (askNickname && !gameState.roomState) {
    return (
      <main className="flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-sm flex flex-col gap-4 text-center">
          <h1 className="text-2xl font-bold">
            {params.code === "new" ? "Criar sala" : <>Entrar na sala <span className="text-purple-400">{params.code.toUpperCase()}</span></>}
          </h1>
          <input
            type="text"
            placeholder="Seu apelido"
            value={nickname}
            autoFocus
            onChange={(e) => { setNickname(e.target.value); setNicknameError(null); }}
            onKeyDown={(e) => e.key === "Enter" && submitNickname()}
            maxLength={16}
            className="w-full px-4 py-3 bg-gray-800 rounded-xl border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-center text-lg"
          />
          <button
            onClick={submitNickname}
            className="w-full py-3 bg-pink-600 hover:bg-pink-500 rounded-xl font-bold text-lg transition-colors"
          >
            Entrar
          </button>
          {nicknameError && <p className="text-red-400 text-sm">{nicknameError}</p>}
        </div>
      </main>
    );
  }

  return <GameController {...gameState} />;
}
