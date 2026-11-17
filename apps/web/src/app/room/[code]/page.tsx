"use client";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useGameState } from "@/hooks/use-game-state";
import { GameController } from "@/components/game/game-controller";

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const gameState = useGameState();

  useEffect(() => {
    if (!gameState.connected || gameState.roomState) return;

    const nickname = sessionStorage.getItem("scrawl-nickname") || "Player";

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
  }, [gameState.connected, gameState.roomState, params.code]);

  // The host lands on /room/new; once the server assigns the real code,
  // put it in the URL so the address bar is a working invite link.
  const roomCode = gameState.roomState?.code;
  useEffect(() => {
    if (roomCode && window.location.pathname !== `/room/${roomCode}`) {
      window.history.replaceState(null, "", `/room/${roomCode}`);
    }
  }, [roomCode]);

  return <GameController {...gameState} />;
}
