"use client";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CircleNotch,
  PencilSimple,
} from "@phosphor-icons/react";
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

type Status = "drawing" | "sending" | "received";

const STATUS_LABEL: Record<Status, string> = {
  drawing: "desenhando",
  sending: "enviando…",
  received: "recebido",
};

function Spinner({ size = 18 }: { size?: number }) {
  return (
    <CircleNotch
      aria-hidden="true"
      weight="bold"
      size={size}
      className="motion-safe:animate-spin"
    />
  );
}

function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 text-sm font-semibold ${
        status === "received"
          ? "bg-mint text-ink"
          : status === "sending"
            ? "bg-amber/60 text-ink"
            : "text-muted"
      }`}
    >
      {status === "received" && (
        <Check aria-hidden="true" weight="bold" size={16} />
      )}
      {status === "sending" && <Spinner size={16} />}
      {STATUS_LABEL[status]}
    </span>
  );
}

/**
 * The bottom of every drawing screen: who draws which part and whether the
 * server has each drawing yet, and the send button. "Recebido" only shows
 * once the server has confirmed it (`drawing-received`), never on sending.
 */
export function DrawingFooter({
  me,
  partner,
  submitted,
  timeUp,
  mineReceived,
  partnerReceived,
  waiting,
  onSubmit,
}: {
  me: DrawingPart;
  partner: DrawingPart;
  /** This page sent its drawing (it may not have arrived yet). */
  submitted: boolean;
  /** The server ended the turn and is collecting the drawings. */
  timeUp: boolean;
  mineReceived: boolean;
  partnerReceived: boolean;
  /** What to say once both drawings of this picture are in but the turn goes on (party). */
  waiting: string;
  onSubmit: () => void;
}) {
  const myStatus: Status = mineReceived
    ? "received"
    : submitted || timeUp
      ? "sending"
      : "drawing";
  const partnerStatus: Status = partnerReceived
    ? "received"
    : timeUp
      ? "sending"
      : "drawing";

  // What the box beside the chips says once there is no button to press.
  const status = !mineReceived ? (
    <>
      <Spinner size={22} />
      {timeUp
        ? "Tempo esgotado! Enviando seu desenho…"
        : "Enviando seu desenho…"}
    </>
  ) : !partnerReceived ? (
    <>
      {timeUp ? (
        <Spinner size={22} />
      ) : (
        <Check aria-hidden="true" weight="bold" size={22} />
      )}
      {timeUp
        ? `Tempo esgotado! Esperando o desenho de ${partner.name}…`
        : "Desenho enviado! Esperando parceiro..."}
    </>
  ) : (
    <>
      <Check aria-hidden="true" weight="bold" size={22} />
      {waiting}
    </>
  );

  return (
    // On a phone the toolbar rails push the footer below the fold: there the
    // send button sticks to the bottom of the screen, and the chips make way
    // for it (the status box below says what they would).
    <footer className="w-full max-w-[66rem] flex flex-wrap items-center justify-between gap-x-6 gap-y-4 max-sm:sticky max-sm:bottom-3 max-sm:z-10">
      <ul className="hidden sm:flex flex-wrap items-center gap-3">
        {(
          [
            [me, myStatus],
            [partner, partnerStatus],
          ] as const
        ).map(([p, st]) => (
          <li
            key={p.name}
            className="tag min-h-13 flex items-center gap-2.5 py-2 pl-2 pr-4"
          >
            <Avatar url={p.avatarUrl} name={p.name} size={36} />
            <div className="flex flex-col items-start gap-0.5">
              {p.part}
              <StatusBadge status={st} />
            </div>
          </li>
        ))}
      </ul>
      {!submitted && !timeUp ? (
        <button
          onClick={onSubmit}
          className="press max-sm:w-full flex-[0_1_22.5rem] min-h-15 sm:min-h-17 px-7 flex items-center justify-between gap-4 bg-brand text-white hover:bg-brand-dark font-display font-extrabold text-2xl sm:text-[1.75rem]"
        >
          Enviar desenho
          <Check aria-hidden="true" weight="bold" size={30} />
        </button>
      ) : (
        <p
          role="status"
          className={`tag max-sm:w-full flex items-center gap-2.5 px-5 py-4 font-display font-bold text-lg ${
            mineReceived && partnerReceived ? "text-go" : "text-ink"
          }`}
        >
          {status}
        </p>
      )}
    </footer>
  );
}
