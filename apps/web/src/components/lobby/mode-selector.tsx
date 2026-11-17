"use client";
import type { FaceTemplateOption, GameMode } from "@/types/game";
import { FACE_TEMPLATE_LABELS, SKIN_TONES } from "@/components/face-templates";

interface ModeSelectorProps {
  gameMode: GameMode;
  totalRounds: number;
  turnDuration: number;
  faceTemplate: FaceTemplateOption;
  skinTone: string;
  onModeChange: (mode: GameMode) => void;
  onRoundsChange: (rounds: number) => void;
  onDurationChange: (seconds: number) => void;
  onFaceTemplateChange: (template: FaceTemplateOption) => void;
  onSkinToneChange: (tone: string) => void;
}

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 180];

export function ModeSelector({ gameMode, totalRounds, turnDuration, faceTemplate, skinTone, onModeChange, onRoundsChange, onDurationChange, onFaceTemplateChange, onSkinToneChange }: ModeSelectorProps) {
  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex gap-2">
        <button
          onClick={() => onModeChange("party")}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            gameMode === "party"
              ? "bg-purple-600 text-white"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          Party (4-10)
        </button>
        <button
          onClick={() => onModeChange("split-body")}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            gameMode === "split-body"
              ? "bg-blue-600 text-white"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          Split Body (2)
        </button>
        <button
          onClick={() => onModeChange("face-builder")}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            gameMode === "face-builder"
              ? "bg-green-600 text-white"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          Face Builder (2)
        </button>
      </div>

      {(gameMode === "split-body" || gameMode === "face-builder") && (
        <div className="flex items-center justify-between px-2">
          <span className="text-sm text-gray-400">Rounds</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => onRoundsChange(n)}
                className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
                  totalRounds === n
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {gameMode === "face-builder" && (
        <div className="flex items-center justify-between px-2">
          <span className="text-sm text-gray-400">Moldura</span>
          <div className="flex gap-1">
            {(Object.entries(FACE_TEMPLATE_LABELS) as [FaceTemplateOption, string][]).map(([id, label]) => (
              <button
                key={id}
                onClick={() => onFaceTemplateChange(id)}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  faceTemplate === id
                    ? "bg-green-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {gameMode === "face-builder" && faceTemplate !== "random" && (
        <div className="flex items-center justify-between px-2">
          <span className="text-sm text-gray-400">Tom de pele</span>
          <div className="flex gap-1.5">
            {SKIN_TONES.map((tone) => (
              <button
                key={tone.id}
                onClick={() => onSkinToneChange(tone.color)}
                title={tone.label}
                className={`w-7 h-7 rounded-full border-2 transition-transform ${
                  skinTone === tone.color ? "border-white scale-110" : "border-gray-600"
                }`}
                style={{ backgroundColor: tone.color }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between px-2">
        <span className="text-sm text-gray-400">Tempo por turno</span>
        <select
          value={turnDuration}
          onChange={(e) => onDurationChange(Number(e.target.value))}
          className="bg-gray-800 text-white text-sm rounded-lg px-3 py-1.5 border border-gray-700 focus:outline-none focus:border-purple-500"
        >
          {DURATION_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s >= 60 ? `${s / 60}min` : `${s}s`}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
