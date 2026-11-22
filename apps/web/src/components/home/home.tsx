"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AccountMenu } from "@/components/account/account-menu";
import type { Profile } from "@/lib/account";
import { roomPath } from "@/lib/routes";
import { art } from "@/components/brand/art";
import { Wordmark } from "@/components/brand/wordmark";
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
    <div className="min-h-screen w-full flex flex-col gap-7 px-4 sm:px-8 lg:px-14 pt-8 pb-14">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Wordmark large />
        <AccountMenu profile={profile} />
      </header>

      <div className="flex flex-wrap items-start gap-8">
        <main className="sheet flex-[999_1_36rem] min-w-0 flex flex-col gap-8 p-6 sm:p-12">
          <h1 className="text-4xl sm:text-6xl leading-none max-w-[14ch] break-words">
            Bora desenhar, {profile.username}?
          </h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-7">
            <button
              onClick={() => toggle("create")}
              aria-expanded={panel === "create"}
              className="press taped text-left flex flex-col gap-3 min-h-72 px-7 pt-10 pb-7 bg-brand text-white"
            >
              <img
                src={art("mascot-rocket-sm")}
                alt=""
                className="self-center w-full max-w-72 h-36 object-contain"
              />
              <span className="font-display font-extrabold text-4xl leading-none">
                Criar sala
              </span>
              <span className="text-lg leading-snug text-white/90">
                Você escolhe o modo e manda o link para a turma.
              </span>
            </button>
            <button
              onClick={() => toggle("join")}
              aria-expanded={panel === "join"}
              className="press taped text-left flex flex-col gap-3 min-h-72 px-7 pt-10 pb-7 bg-amber text-ink"
            >
              <img
                src={art("mascot-flyer-sm")}
                alt=""
                className="self-center w-full max-w-48 h-36 object-contain"
              />
              <span className="font-display font-extrabold text-4xl leading-none">
                Entrar com código
              </span>
              <span className="text-lg leading-snug">
                São 5 letras, como 4ANNZ. Quem criou a sala tem o código.
              </span>
            </button>
          </div>

          {panel === "create" && <CreateRoom username={profile.username} />}

          {panel === "join" && (
            <form
              onSubmit={join}
              className="flex flex-col gap-3 bg-paper-deep p-5"
              noValidate
            >
              <div className="flex flex-wrap gap-4">
                <input
                  type="text"
                  placeholder="Código da sala"
                  aria-label="Código da sala"
                  autoFocus
                  maxLength={5}
                  value={roomCode}
                  onChange={(e) => {
                    setRoomCode(e.target.value.toUpperCase());
                    setError(null);
                  }}
                  className="flex-1 min-w-40 h-14 px-4 bg-paper border-b-4 border-ink text-ink placeholder-faint focus:outline-none focus:border-brand text-center font-display font-bold text-2xl tracking-widest uppercase"
                />
                <button
                  type="submit"
                  className="press min-h-14 px-7 bg-brand text-white hover:bg-brand-dark font-display font-extrabold text-xl"
                >
                  Entrar
                </button>
              </div>
              {error && <p className="text-red-600 font-semibold">{error}</p>}
            </form>
          )}

          <RoomList />
        </main>

        <LatestDrawings />
      </div>
    </div>
  );
}
