"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AccountMenu } from "@/components/account/account-menu";
import type { Profile } from "@/lib/account";
import { roomPath } from "@/lib/routes";
import { CreateRoom } from "./create-room";
import { RoomList } from "./room-list";
import { LatestDrawings } from "@/components/gallery/latest-drawings";

/** What a logged-in player lands on: start or find a game, and see what people have been drawing. */
export function Home({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [panel, setPanel] = useState<"none" | "create" | "join">("none");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const toggle = (next: "create" | "join") =>
    setPanel((current) => (current === next ? "none" : next));

  function join(e: React.FormEvent) {
    e.preventDefault();
    const code = roomCode.trim().toUpperCase();
    if (code.length < 5) {
      setError("Digite um código de sala válido");
      return;
    }
    sessionStorage.setItem("scrawl-nickname", profile.username);
    router.push(roomPath(code));
  }

  return (
    <div className="min-h-screen w-full flex flex-col">
      <header className="flex items-center justify-between gap-4 px-4 sm:px-6 py-4 border-b border-gray-800">
        <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
          Scrawl
        </span>
        <AccountMenu profile={profile} />
      </header>

      <div className="w-full max-w-5xl mx-auto flex flex-col md:flex-row gap-8 px-4 sm:px-6 py-6">
        <main className="flex-1 min-w-0 flex flex-col gap-5">
          <div className="flex gap-3">
            <button
              onClick={() => toggle("create")}
              aria-expanded={panel === "create"}
              className="flex-1 sm:flex-none px-5 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold transition-colors"
            >
              Criar sala
            </button>
            <button
              onClick={() => toggle("join")}
              aria-expanded={panel === "join"}
              className="flex-1 sm:flex-none px-5 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold transition-colors"
            >
              Entrar com código
            </button>
          </div>

          {panel === "create" && <CreateRoom username={profile.username} />}

          {panel === "join" && (
            <form
              onSubmit={join}
              className="flex flex-col gap-3 bg-gray-900 rounded-xl p-4"
              noValidate
            >
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Código da sala"
                  autoFocus
                  maxLength={5}
                  value={roomCode}
                  onChange={(e) => {
                    setRoomCode(e.target.value.toUpperCase());
                    setError(null);
                  }}
                  className="flex-1 min-w-0 px-4 py-3 bg-gray-800 rounded-xl border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-center text-lg tracking-widest uppercase"
                />
                <button
                  type="submit"
                  className="px-5 py-3 bg-pink-600 hover:bg-pink-500 rounded-xl font-bold transition-colors"
                >
                  Entrar
                </button>
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
            </form>
          )}

          <RoomList />
        </main>

        <LatestDrawings />
      </div>
    </div>
  );
}
