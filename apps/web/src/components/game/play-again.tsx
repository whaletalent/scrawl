"use client";
import Link from "next/link";
import { ArrowLeft, ArrowClockwise } from "@phosphor-icons/react";

/** The end of every final screen: the host restarts the room, everyone can leave. */
export function PlayAgain({
  isHost,
  onPlayAgain,
}: {
  isHost: boolean;
  onPlayAgain: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      {isHost ? (
        <button
          onClick={onPlayAgain}
          className="press flex-[1_1_14rem] max-w-sm min-h-16 px-6 flex items-center justify-between gap-3 bg-brand text-white hover:bg-brand-dark font-display font-extrabold text-2xl sm:text-[1.625rem]"
        >
          Jogar de novo
          <ArrowClockwise aria-hidden="true" weight="bold" size={28} />
        </button>
      ) : (
        <p className="flex-[1_1_14rem] max-w-sm px-4 py-3 bg-paper-deep font-semibold">
          O host pode começar outra partida com a mesma turma.
        </p>
      )}
      <Link
        href="/"
        className="min-h-16 px-2 flex items-center font-semibold text-[1.0625rem] underline hover:text-brand"
      >
        Sair da sala
      </Link>
    </div>
  );
}

/** The final screens' top line: a way out, what ended, and who played. */
export function FinalHeader({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <Link
        href="/"
        aria-label="Sair da sala"
        className="tag press w-12 h-12 sm:w-15 sm:h-15 grid place-items-center text-brand"
      >
        <ArrowLeft aria-hidden="true" weight="bold" size={30} />
      </Link>
      <span className="shadow-hard -rotate-[1.5deg] min-h-13 sm:min-h-16 px-5 sm:px-8 flex items-center bg-amber font-display font-extrabold text-2xl sm:text-[2rem]">
        {title}
      </span>
      <span className="tag min-h-11 px-4 flex items-center font-semibold">
        {detail}
      </span>
    </header>
  );
}
