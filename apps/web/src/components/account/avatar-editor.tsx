"use client";
import { useRef, useState } from "react";
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
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        <div className="flex gap-1.5" role="group" aria-label="Rosto">
          {TEMPLATES.map((id) => (
            <button
              key={id}
              onClick={() => setFaceTemplate(id)}
              aria-pressed={faceTemplate === id}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                faceTemplate === id
                  ? "bg-green-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {FACE_TEMPLATE_LABELS[id]}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5" role="group" aria-label="Tom de pele">
          {SKIN_TONES.map((tone) => (
            <button
              key={tone.id}
              onClick={() => setSkinTone(tone.color)}
              title={tone.label}
              aria-label={tone.label}
              aria-pressed={skinTone === tone.color}
              className={`w-7 h-7 rounded-full border-2 transition-transform ${
                skinTone === tone.color
                  ? "border-white scale-110"
                  : "border-gray-600"
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
        className="px-8 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl font-bold text-lg transition-colors"
      >
        {saving ? "Salvando..." : saveLabel}
      </button>
      {error && <p className="text-red-400 text-sm text-center">{error}</p>}
    </div>
  );
}
