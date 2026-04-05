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
    const action = sessionStorage.getItem("scrawl-action") || "join";

    if (params.code === "new" || action === "create") {
      const gameMode = (sessionStorage.getItem("scrawl-gameMode") as "party" | "split-body") || "party";
      const totalRounds = parseInt(sessionStorage.getItem("scrawl-totalRounds") || "3", 10);
      gameState.createRoom(nickname, gameMode, totalRounds);
    } else {
      gameState.joinRoom(params.code, nickname);
    }
  }, [gameState.connected, gameState.roomState, params.code]);

  return <GameController {...gameState} />;
}
