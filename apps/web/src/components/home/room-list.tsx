"use client";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/account/avatar";
import { usePublicRooms } from "@/hooks/use-public-rooms";
import { roomPath } from "@/lib/routes";
import type { GameMode } from "@/types/game";

const MODE: Record<GameMode, { label: string; className: string }> = {
  party: { label: "Party", className: "bg-purple-600/20 text-purple-400" },
  "split-body": {
    label: "Split Body",
    className: "bg-blue-600/20 text-blue-400",
  },
  "face-builder": {
    label: "Face Builder",
    className: "bg-green-600/20 text-green-400",
  },
};

/** Open public rooms, live from the game server. */
export function RoomList() {
  const router = useRouter();
  const { rooms, status } = usePublicRooms();

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-gray-400">
        Salas abertas{status === "ready" && ` (${rooms.length})`}
      </h2>

      {status === "connecting" ? (
        // The free game server sleeps when idle and takes a while to wake up.
        <p className="text-gray-500 text-sm py-6 text-center">
          Acordando o servidor…
        </p>
      ) : rooms.length === 0 ? (
        <p className="text-gray-500 text-sm py-6 text-center">
          Nenhuma sala aberta agora. Crie uma sala pública e chame a galera.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rooms.map((room) => (
            <li
              key={room.code}
              className="flex items-center gap-3 bg-gray-800 rounded-xl px-3 py-2.5"
            >
              <Avatar url={room.hostAvatarUrl} name={room.hostName} size={32} />
              <span className="flex-1 min-w-0 font-medium truncate">
                Sala de {room.hostName}
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full whitespace-nowrap ${MODE[room.gameMode].className}`}
              >
                {MODE[room.gameMode].label}
              </span>
              <span className="text-sm text-gray-400 tabular-nums">
                {room.playerCount}/{room.capacity}
              </span>
              <button
                onClick={() => router.push(roomPath(room.code))}
                className="px-3.5 py-1.5 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-bold transition-colors"
              >
                Entrar
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
