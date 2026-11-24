"use client";
import type { FaceTemplateOption, GameMode } from "@/types/game";
import { FACE_TEMPLATE_LABELS, SKIN_TONES } from "@/components/face-templates";
import { art, type ArtName } from "@/components/brand/art";

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

const MODES: {
  id: GameMode;
  name: string;
  players: string;
  count: string;
  text: string;
  toy: ArtName;
}[] = [
  {
    id: "party",
    name: "Racha-tema",
    players: "De 4 a 10 jogadores",
    count: "4-10",
    text: "Cada um escreve um tema e as duplas desenham meio a meio.",
    toy: "mode-party",
  },
  {
    id: "split-body",
    name: "Monstrinho",
    players: "2 jogadores",
    count: "2",
    text: "Um faz a cabeça e o tronco, o outro faz as pernas.",
    toy: "mode-split-body",
  },
  {
    id: "face-builder",
    name: "Caricatura a dois",
    players: "2 jogadores",
    count: "2",
    text: "As seis partes de um rosto, três para cada um.",
    toy: "mode-face-builder",
  },
  {
    id: "seam",
    name: "Emenda",
    players: "De 2 a 10 jogadores",
    count: "2-10",
    text: "Cada um desenha escondido na sua faixa. Na emenda com o vizinho, vocês se veem ao vivo. No fim, o desenho aparece inteiro.",
    toy: "mode-seam",
  },
];

const LABEL = "font-display font-bold text-lg";
const CHIP = "min-h-11 px-3.5 border-[3px] border-ink font-display font-bold";

export function ModeSelector({
  gameMode,
  totalRounds,
  turnDuration,
  faceTemplate,
  skinTone,
  onModeChange,
  onRoundsChange,
  onDurationChange,
  onFaceTemplateChange,
  onSkinToneChange,
}: ModeSelectorProps) {
  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] gap-5">
        {MODES.map((m) => {
          const on = gameMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onModeChange(m.id)}
              aria-pressed={on}
              aria-label={`${m.name} (${m.count}): ${m.text}`}
              className={`press text-left flex sm:flex-col items-start gap-x-4 gap-y-2 p-4 sm:p-5 ${
                on ? "bg-brand text-white" : "bg-paper text-ink"
              }`}
            >
              <img
                src={art(m.toy)}
                alt=""
                className="flex-none w-16 h-16 sm:w-24 sm:h-24 object-contain"
              />
              <span className="flex flex-col gap-1.5 sm:gap-2">
                <span className="font-display font-extrabold text-2xl sm:text-3xl leading-none">
                  {m.name}
                </span>
                <span className="font-semibold">{m.players}</span>
                <span className="leading-snug">{m.text}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-x-8 gap-y-6">
        {gameMode !== "party" && (
          <div className="flex flex-col gap-2.5">
            <span className={LABEL}>Rodadas</span>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => onRoundsChange(n)}
                  aria-pressed={totalRounds === n}
                  className={`w-12 h-12 border-[3px] border-ink font-display font-extrabold text-xl ${
                    totalRounds === n ? "bg-amber" : "bg-paper hover:bg-soft"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        <label className={`flex flex-col gap-2.5 ${LABEL}`}>
          Tempo por turno
          <select
            value={turnDuration}
            onChange={(e) => onDurationChange(Number(e.target.value))}
            className="h-12 px-3.5 bg-paper border-b-4 border-ink font-sans font-semibold text-lg text-ink focus:outline-none focus:border-brand"
          >
            {DURATION_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s < 60
                  ? `${s} s`
                  : s % 60
                    ? `${Math.floor(s / 60)} min ${s % 60} s`
                    : `${s / 60} min`}
              </option>
            ))}
          </select>
        </label>

        {gameMode === "face-builder" && (
          <div className="flex flex-col gap-2.5">
            <span className={LABEL}>Moldura</span>
            <div className="flex flex-wrap gap-2">
              {(
                Object.entries(FACE_TEMPLATE_LABELS) as [
                  FaceTemplateOption,
                  string,
                ][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => onFaceTemplateChange(id)}
                  aria-pressed={faceTemplate === id}
                  className={`${CHIP} ${
                    faceTemplate === id ? "bg-amber" : "bg-paper hover:bg-soft"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {gameMode === "face-builder" && faceTemplate !== "random" && (
          <div className="flex flex-col gap-2.5">
            <span className={LABEL}>Tom de pele</span>
            <div className="flex flex-wrap gap-2">
              {SKIN_TONES.map((tone) => (
                <button
                  key={tone.id}
                  onClick={() => onSkinToneChange(tone.color)}
                  title={tone.label}
                  aria-label={tone.label}
                  aria-pressed={skinTone === tone.color}
                  className={`w-11 h-11 rounded-full border-[3px] border-paper ${
                    skinTone === tone.color
                      ? "ring-4 ring-brand"
                      : "ring-2 ring-ink/25"
                  }`}
                  style={{ backgroundColor: tone.color }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
