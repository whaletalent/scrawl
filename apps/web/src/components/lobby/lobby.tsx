"use client";
import type { FaceTemplateOption, Player, GameMode } from "@/types/game";

interface LobbyProps {
  roomCode: string;
  players: Player[];
  playerId: string;
  isHost: boolean;
  gameMode: GameMode;
  faceTemplate?: FaceTemplateOption;
  onStart: () => void;
  error: string | null;
}

export function Lobby({ roomCode, players, playerId, isHost, gameMode, faceTemplate, onStart, error }: LobbyProps) {
  const isSplitBody = gameMode === "split-body";
  const isFaceBuilder = gameMode === "face-builder";
  const isTwoPlayerMode = isSplitBody || isFaceBuilder;
  const minPlayers = isTwoPlayerMode ? 2 : 4;
  const maxPlayers = isTwoPlayerMode ? 2 : 10;
  const canStart = isHost && players.length >= minPlayers;

  return (
    <div className="flex flex-col items-center gap-6 px-4 py-8">
      <div className="text-center">
        <p className="text-gray-400 text-sm">Room Code</p>
        <p className="text-4xl font-black tracking-widest text-purple-400">{roomCode}</p>
        <button
          onClick={() => navigator.clipboard.writeText(window.location.href)}
          className="text-sm text-gray-500 hover:text-gray-400 mt-1"
        >
          Copy invite link
        </button>
        {isSplitBody && (
          <span className="inline-block mt-2 text-xs bg-blue-600/30 text-blue-400 px-3 py-1 rounded-full">
            Split Body Mode
          </span>
        )}
        {isFaceBuilder && (
          <div className="text-center">
            <span className="inline-block px-3 py-1 bg-green-600/20 text-green-400 rounded-full text-sm font-medium">
              Face Builder Mode
            </span>
          </div>
        )}
      </div>

      <div className="w-full max-w-sm">
        <p className="text-gray-400 text-sm mb-2">
          Players ({players.length}/{maxPlayers})
          {players.length < minPlayers && ` — need ${isTwoPlayerMode ? "exactly 2" : "at least 4"}`}
        </p>
        <div className="flex flex-col gap-2">
          {players.map((p) => (
            <div
              key={p.id}
              className={`flex items-center justify-between px-4 py-2 rounded-lg ${
                p.id === playerId ? "bg-purple-900/40 border border-purple-700" : "bg-gray-800"
              }`}
            >
              <span className="font-medium">
                {p.nickname} {p.id === playerId && "(you)"}
              </span>
              {p.isHost && (
                <span className="text-xs bg-yellow-600/30 text-yellow-400 px-2 py-0.5 rounded-full">
                  Host
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {isHost ? (
        <button
          onClick={onStart}
          disabled={!canStart}
          className={`w-full max-w-sm py-3 rounded-xl font-bold text-lg transition-colors ${
            canStart
              ? "bg-green-600 hover:bg-green-500"
              : "bg-gray-700 text-gray-500 cursor-not-allowed"
          }`}
        >
          {players.length < minPlayers
            ? `Waiting for players (${players.length}/${minPlayers})...`
            : isFaceBuilder ? "Start Face Builder" : isSplitBody ? "Start Split Body" : "Start Game"}
        </button>
      ) : (
        <p className="text-gray-500">Waiting for the host to start...</p>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
