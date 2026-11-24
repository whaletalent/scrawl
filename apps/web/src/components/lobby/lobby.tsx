"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, LinkSimple } from "@phosphor-icons/react";
import type { FaceTemplateOption, Player, GameMode } from "@/types/game";
import { FACE_TEMPLATE_LABELS } from "@/components/face-templates";
import { roomUrl } from "@/lib/routes";
import { Avatar } from "@/components/account/avatar";
import { art, type ArtName } from "@/components/brand/art";

interface LobbyProps {
  roomCode: string;
  players: Player[];
  playerId: string;
  isHost: boolean;
  gameMode: GameMode;
  faceTemplate?: FaceTemplateOption;
  isPublic?: boolean;
  notice?: string;
  onStart: () => void;
  error: string | null;
}

const MODE: Record<GameMode, { label: string; toy: ArtName }> = {
  party: { label: "Modo Racha-tema", toy: "mode-party" },
  "split-body": { label: "Modo Monstrinho", toy: "mode-split-body" },
  "face-builder": {
    label: "Modo Caricatura a dois",
    toy: "mode-face-builder",
  },
  // TODO(task 8): its own art
  seam: { label: "Modo Emenda", toy: "mode-party" },
};

/** The waiting room: the invite on a taped note, who has arrived on a sheet. */
export function Lobby({
  roomCode,
  players,
  playerId,
  isHost,
  gameMode,
  faceTemplate,
  isPublic,
  notice,
  onStart,
  error,
}: LobbyProps) {
  const [copied, setCopied] = useState(false);
  const isSplitBody = gameMode === "split-body";
  const isFaceBuilder = gameMode === "face-builder";
  const isTwoPlayerMode = isSplitBody || isFaceBuilder;
  const minPlayers = isTwoPlayerMode ? 2 : 4;
  const maxPlayers = isTwoPlayerMode ? 2 : 10;
  const canStart = isHost && players.length >= minPlayers;

  function copy() {
    void navigator.clipboard?.writeText(roomUrl(roomCode));
    setCopied(true);
  }

  return (
    <div className="w-full flex flex-col gap-7">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/"
          aria-label="Sair da sala"
          className="tag press w-12 h-12 sm:w-15 sm:h-15 grid place-items-center text-brand"
        >
          <ArrowLeft aria-hidden="true" weight="bold" size={30} />
        </Link>
        <span className="tag min-h-13 sm:min-h-15 pl-3 pr-5 flex items-center gap-2.5 font-display font-extrabold text-xl sm:text-2xl">
          <img
            src={art(MODE[gameMode].toy)}
            alt=""
            className="w-10 h-10 object-contain"
          />
          {MODE[gameMode].label}
        </span>
        {isPublic ? (
          <span className="tag min-h-11 px-4 flex items-center bg-mint font-semibold">
            Sala pública
          </span>
        ) : (
          <span aria-hidden="true" className="hidden sm:block w-15" />
        )}
      </header>

      <div className="flex flex-wrap items-start justify-center gap-8">
        <section className="taped shadow-hard-lg -rotate-1 flex-[1_1_21rem] max-w-[30rem] min-w-0 flex flex-col gap-4 bg-amber px-6 sm:px-8 pt-11 pb-8">
          <h1 className="font-sans font-semibold text-lg tracking-normal">
            Código da sala
          </h1>
          <p className="font-display font-extrabold text-6xl sm:text-8xl leading-none tracking-widest">
            {roomCode}
          </p>
          <p className="text-lg leading-snug">
            Mande o link ou dite o código. Quem entrar aparece na lista.
          </p>
          {isFaceBuilder && faceTemplate && (
            <p className="font-semibold">
              Moldura: {FACE_TEMPLATE_LABELS[faceTemplate]}
            </p>
          )}
          <button
            onClick={copy}
            className="press min-h-15 px-6 flex items-center justify-between gap-3 bg-ink text-paper font-display font-extrabold text-lg sm:text-2xl text-left"
          >
            {copied ? "Link copiado" : "Copiar link de convite"}
            <LinkSimple aria-hidden="true" weight="bold" size={26} />
          </button>
        </section>

        <section className="sheet flex-[999_1_28rem] max-w-3xl min-w-0 flex flex-col gap-6 p-6 sm:p-12">
          <div className="flex flex-wrap items-baseline justify-between gap-2 pr-10">
            <h2 className="text-3xl sm:text-5xl leading-none">
              Quem já chegou
            </h2>
            <p className="text-lg text-muted">
              Jogadores ({players.length}/{maxPlayers})
              {players.length < minPlayers &&
                ` — ${isTwoPlayerMode ? "precisa de exatamente 2" : "mínimo de 4"}`}
            </p>
          </div>

          {notice && (
            <p className="px-4 py-3 bg-amber/50 font-semibold">{notice}</p>
          )}

          <ul className="flex flex-col gap-2">
            {players.map((p) => (
              <li
                key={p.id}
                className={`flex items-center justify-between gap-3 px-3.5 py-2.5 ${
                  p.id === playerId ? "bg-amber/50" : "bg-soft"
                }`}
              >
                <span className="min-w-0 font-display font-bold text-xl sm:text-2xl flex flex-wrap items-center gap-x-3.5">
                  <Avatar url={p.avatarUrl} name={p.nickname} size={44} />
                  {p.nickname} {p.id === playerId && "(você)"}
                  {p.connected === false && (
                    <span className="font-sans font-semibold text-base text-muted">
                      {" "}
                      (reconectando...)
                    </span>
                  )}
                </span>
                {p.isHost && (
                  <span className="font-semibold bg-ink text-paper px-2.5 py-0.5">
                    Host
                  </span>
                )}
              </li>
            ))}
          </ul>

          {isHost ? (
            <button
              onClick={onStart}
              disabled={!canStart}
              className={`press min-h-17 px-7 flex items-center justify-between gap-4 font-display font-extrabold text-xl sm:text-3xl text-left ${
                canStart
                  ? "bg-brand text-white hover:bg-brand-dark"
                  : "bg-soft text-muted cursor-not-allowed"
              }`}
            >
              {players.length < minPlayers
                ? `Esperando jogadores (${players.length}/${minPlayers})...`
                : isFaceBuilder
                  ? "Começar Caricatura a dois"
                  : isSplitBody
                    ? "Começar Monstrinho"
                    : "Começar jogo"}
              {canStart && (
                <ArrowRight aria-hidden="true" weight="bold" size={30} />
              )}
            </button>
          ) : (
            <p className="px-4 py-4 bg-paper-deep font-display font-bold text-xl">
              Esperando o host começar...
            </p>
          )}

          {error && <p className="text-red-600 font-semibold">{error}</p>}
        </section>
      </div>
    </div>
  );
}
