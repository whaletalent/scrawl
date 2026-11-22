"use client";
import Link from "next/link";
import { ArrowLeft, Check, PencilSimple } from "@phosphor-icons/react";
import { TimerBar } from "./timer-bar";
import { Avatar } from "@/components/account/avatar";

/**
 * The top of every drawing screen: a way out, the round and what to draw on
 * one strip, and the timer on a taped note.
 */
export function DrawingHeader({
  round,
  totalRounds,
  title,
  srPrefix,
  endsAt,
}: {
  round: number;
  totalRounds: number;
  /** What to draw (the theme), or the mode's instruction. */
  title: string;
  /** Read before the title by screen readers only ("Desenhe: "). */
  srPrefix?: string;
  endsAt: number;
}) {
  return (
    <header className="w-full flex flex-wrap items-center justify-between gap-4">
      <Link
        href="/"
        aria-label="Sair da sala"
        className="tag press w-12 h-12 sm:w-15 sm:h-15 grid place-items-center text-brand"
      >
        <ArrowLeft aria-hidden="true" weight="bold" size={30} />
      </Link>

      <div className="order-3 sm:order-none flex-[1_1_100%] sm:flex-[1_1_26rem] max-w-3xl flex flex-wrap shadow-hard">
        <p className="min-h-13 sm:min-h-15 px-5 flex items-center gap-2.5 bg-ink text-paper font-display font-bold text-lg sm:text-xl">
          <PencilSimple aria-hidden="true" weight="bold" size={24} />
          Rodada {round} de {totalRounds}
        </p>
        <h2 className="flex-[1_1_14rem] min-h-13 sm:min-h-15 px-5 sm:px-6 py-2 flex items-center bg-blush text-2xl sm:text-[1.75rem] leading-tight break-words">
          {srPrefix && <span className="sr-only">{srPrefix}</span>}
          {title}
        </h2>
      </div>

      <TimerBar endsAt={endsAt} />
    </header>
  );
}

export interface DrawingPart {
  name: string;
  avatarUrl?: string | null;
  /** "metade esquerda", "cabeça e tronco"… */
  part: React.ReactNode;
}

/** The bottom of every drawing screen: who draws which part, and the send button. */
export function DrawingFooter({
  parts,
  submitted,
  waiting,
  onSubmit,
}: {
  parts: DrawingPart[];
  submitted: boolean;
  /** Shown in place of the button once the drawing is in. */
  waiting: string;
  onSubmit: () => void;
}) {
  return (
    <footer className="w-full max-w-[66rem] flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
      <ul className="flex flex-wrap items-center gap-3">
        {parts.map((p) => (
          <li
            key={p.name}
            className="tag min-h-13 flex items-center gap-2.5 py-2 pl-2 pr-4"
          >
            <Avatar url={p.avatarUrl} name={p.name} size={36} />
            <div>{p.part}</div>
          </li>
        ))}
      </ul>
      {!submitted ? (
        <button
          onClick={onSubmit}
          className="press flex-[0_1_22.5rem] min-h-17 px-7 flex items-center justify-between gap-4 bg-brand text-white hover:bg-brand-dark font-display font-extrabold text-2xl sm:text-[1.75rem]"
        >
          Enviar desenho
          <Check aria-hidden="true" weight="bold" size={30} />
        </button>
      ) : (
        <p className="tag px-5 py-4 font-display font-bold text-lg text-go">
          {waiting}
        </p>
      )}
    </footer>
  );
}
