"use client";
import { useTimer } from "@/hooks/use-timer";

interface TimerBarProps {
  endsAt: number;
}

export function TimerBar({ endsAt }: TimerBarProps) {
  const { secondsLeft } = useTimer(endsAt);
  const isUrgent = secondsLeft <= 5;

  return (
    <div
      role="timer"
      className={`tag taped rotate-2 flex items-baseline gap-1 px-5 py-2 ${isUrgent ? "bg-red-600 text-white" : "bg-amber text-ink"}`}
    >
      <span className="font-display font-extrabold text-3xl leading-none tabular-nums">
        {secondsLeft}s
      </span>
    </div>
  );
}
