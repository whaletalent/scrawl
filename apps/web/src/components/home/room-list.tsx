"use client";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/account/avatar";
import { art, type ArtName } from "@/components/brand/art";
import { usePublicRooms } from "@/hooks/use-public-rooms";
import { roomPath } from "@/lib/routes";
import type { GameMode } from "@/types/game";

const MODE: Record<GameMode, { label: string; toy: ArtName }> = {
  party: { label: "Racha-tema", toy: "mode-party" },
  "split-body": { label: "Monstrinho", toy: "mode-split-body" },
  "face-builder": { label: "Caricatura a dois", toy: "mode-face-builder" },
  // TODO(task 8): its own art
  seam: { label: "Emenda", toy: "mode-party" },
};

/** Open public rooms, live from the game server. */
export function RoomList() {
  const router = useRouter();
  const { rooms, status } = usePublicRooms();

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-3xl">Salas abertas</h2>
        {status === "ready" && (
          <span className="text-muted">
            {rooms.length === 0
              ? "nenhuma esperando jogadores"
              : `${rooms.length} ${rooms.length === 1 ? "sala" : "salas"} esperando jogadores`}
          </span>
        )}
      </div>

      {status === "connecting" ? (
        // The free game server sleeps when idle and takes a while to wake up.
        <p className="text-muted py-6">Acordando o servidor…</p>
      ) : rooms.length === 0 ? (
        <p className="text-muted py-6">
          Nenhuma sala aberta agora. Crie uma sala pública e chame a galera.
        </p>
      ) : (
        <ul className="flex flex-col">
          {rooms.map((room) => (
            <li
              key={room.code}
              className="flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3.5 odd:bg-soft hover:bg-amber/40"
            >
              <Avatar url={room.hostAvatarUrl} name={room.hostName} size={44} />
              <span className="flex-1 basis-40 min-w-0 font-display font-bold text-xl truncate">
                Sala de {room.hostName}
              </span>
              <span className="inline-flex items-center gap-2 whitespace-nowrap">
                <img
                  src={art(MODE[room.gameMode].toy)}
                  alt=""
                  className="w-8 h-8 object-contain"
                />
                {MODE[room.gameMode].label}
              </span>
              <span className="text-muted tabular-nums">
                {room.playerCount} de {room.capacity}
              </span>
              <button
                onClick={() => router.push(roomPath(room.code))}
                aria-label={`Entrar na sala de ${room.hostName}`}
                className="press min-h-11 px-5 bg-brand text-white hover:bg-brand-dark font-display font-bold text-lg"
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
