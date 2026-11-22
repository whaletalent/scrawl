"use client";
import { useRef, useState } from "react";
import { Check } from "@phosphor-icons/react";
import {
  FaceCanvas,
  type FaceCanvasHandle,
} from "@/components/canvas/face-canvas";
import { FACE_TEMPLATE_LABELS, SKIN_TONES } from "@/components/face-templates";
import { composeAvatar } from "@/lib/avatar";
import type { FaceTemplateId } from "@/types/game";

const TEMPLATES: FaceTemplateId[] = [
  "masculine",
  "feminine",
  "monster",
  "alien-face",
  "robot-face",
];

interface AvatarEditorProps {
  /** Receives the finished 256×256 PNG; resolves with an error message, or null when saved. */
  onSave: (png: Blob) => Promise<string | null>;
  saveLabel: string;
}

/** The Face Builder canvas used freely: pick a face, draw anywhere, no timer. */
export function AvatarEditor({ onSave, saveLabel }: AvatarEditorProps) {
  const canvasRef = useRef<FaceCanvasHandle>(null);
  const [faceTemplate, setFaceTemplate] = useState<FaceTemplateId>("masculine");
  const [skinTone, setSkinTone] = useState<string>(SKIN_TONES[0].color);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const drawing = canvasRef.current?.exportImage();
    if (!drawing || saving) return;
    setSaving(true);
    setError(null);
    try {
      const png = await composeAvatar(drawing, faceTemplate, skinTone);
      setError(await onSave(png));
    } catch {
      setError("Não deu para salvar o avatar. Tente de novo.");
    }
    setSaving(false);
  }

  return (
    <div className="flex flex-col items-start gap-5 w-full">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Rosto">
          {TEMPLATES.map((id) => (
            <button
              key={id}
              onClick={() => setFaceTemplate(id)}
              aria-pressed={faceTemplate === id}
              className={`min-h-11 px-3.5 border-[3px] border-ink font-display font-bold ${
                faceTemplate === id ? "bg-amber" : "bg-paper hover:bg-soft"
              }`}
            >
              {FACE_TEMPLATE_LABELS[id]}
            </button>
          ))}
        </div>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Tom de pele"
        >
          {SKIN_TONES.map((tone) => (
            <button
              key={tone.id}
              onClick={() => setSkinTone(tone.color)}
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

      {/* The canvas stays mounted when the face or skin tone changes, so the drawing is kept. */}
      <FaceCanvas
        ref={canvasRef}
        assignedRegions={[]}
        faceTemplate={faceTemplate}
        skinTone={skinTone}
        free
      />

      <button
        onClick={save}
        disabled={saving}
        className="press w-full max-w-md min-h-17 px-7 flex items-center justify-between gap-4 bg-brand text-white hover:bg-brand-dark disabled:bg-soft disabled:text-faint font-display font-extrabold text-2xl sm:text-3xl"
      >
        {saving ? "Salvando..." : saveLabel}
        <Check aria-hidden="true" weight="bold" size={30} />
      </button>
      {error && <p className="text-red-600 font-semibold">{error}</p>}
    </div>
  );
}
