"use client";
import type { Player } from "@/types/game";

interface LobbyProps {
  roomCode: string;
  players: Player[];
  playerId: string;
  isHost: boolean;
  onStart: () => void;
  error: string | null;
}

export function Lobby({ roomCode, players, playerId, isHost, onStart, error }: LobbyProps) {
  const canStart = isHost && players.length >= 4;

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
      </div>

      <div className="w-full max-w-sm">
        <p className="text-gray-400 text-sm mb-2">
          Players ({players.length}/10) {players.length < 4 && "— need at least 4"}
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
          {players.length < 4 ? `Waiting for players (${players.length}/4)...` : "Start Game"}
        </button>
      ) : (
        <p className="text-gray-500">Waiting for the host to start...</p>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
