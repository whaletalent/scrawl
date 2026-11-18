"use client";
import { useTimer } from "@/hooks/use-timer";

interface TimerBarProps {
  endsAt: number;
}

export function TimerBar({ endsAt }: TimerBarProps) {
  const { secondsLeft } = useTimer(endsAt);
  const isUrgent = secondsLeft <= 5;

  return (
    <div className="flex items-center gap-2">
      <span
        className={`text-lg font-bold tabular-nums ${isUrgent ? "text-red-400" : "text-white"}`}
      >
        {secondsLeft}s
      </span>
    </div>
  );
}
