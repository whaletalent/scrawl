"use client";
import {
  ArrowUUpLeft,
  ArrowUUpRight,
  Circle,
  Eraser,
  LineSegment,
  PaintBrush,
  PaintBucket,
  Rectangle,
  Trash,
  type Icon,
} from "@phosphor-icons/react";
import type { CanvasTool, ToolType } from "@/hooks/use-canvas";

const COLORS = [
  "#000000",
  "#ffffff",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#6b7280",
  "#92400e",
  "#0891b2",
];

const SIZES = [2, 4, 8, 16];

const TOOLS: { type: ToolType; label: string; icon: Icon }[] = [
  { type: "brush", label: "Pincel", icon: PaintBrush },
  { type: "eraser", label: "Borracha", icon: Eraser },
  { type: "fill", label: "Balde", icon: PaintBucket },
  { type: "line", label: "Linha", icon: LineSegment },
  { type: "rectangle", label: "Retângulo", icon: Rectangle },
  { type: "circle", label: "Círculo", icon: Circle },
];

const TOOL_BUTTON =
  "flex items-center justify-center w-12 h-12 transition-colors";

interface ToolbarProps {
  tool: CanvasTool;
  onToolChange: (tool: CanvasTool) => void;
  onClear: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  /** The canvas: it sits between the two rails, on its own sheet of paper. */
  children: React.ReactNode;
  /** False where the canvas already lies on a sheet (the avatar editor). */
  framed?: boolean;
}

/**
 * The drawing desk: a rail of tools on one side of the paper, a rail of
 * colours and brush sizes on the other. On a narrow screen the paper comes
 * first and both rails lie under it.
 */
export function Toolbar({
  tool,
  onToolChange,
  onClear,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  children,
  framed = true,
}: ToolbarProps) {
  return (
    <div className="w-full flex flex-wrap lg:flex-nowrap items-start justify-center gap-4">
      <div
        role="toolbar"
        aria-label="Ferramentas"
        className="tag order-2 lg:order-1 flex lg:flex-col flex-wrap justify-center gap-1.5 p-2.5"
      >
        {TOOLS.map(({ type, label, icon: ToolIcon }) => {
          const on = tool.type === type;
          return (
            <button
              key={type}
              onClick={() => onToolChange({ ...tool, type })}
              title={label}
              aria-label={label}
              aria-pressed={on}
              className={`${TOOL_BUTTON} ${on ? "bg-brand text-white" : "hover:bg-soft"}`}
            >
              <ToolIcon aria-hidden="true" weight="bold" size={26} />
            </button>
          );
        })}

        <span
          aria-hidden="true"
          className="self-stretch w-[3px] lg:w-auto lg:h-[3px] bg-line my-1"
        />

        {onUndo && onRedo && (
          <>
            <button
              onClick={onUndo}
              disabled={!canUndo}
              title="Desfazer (Ctrl+Z)"
              aria-label="Desfazer"
              className={`${TOOL_BUTTON} ${canUndo ? "hover:bg-soft" : "text-faint cursor-not-allowed"}`}
            >
              <ArrowUUpLeft aria-hidden="true" weight="bold" size={26} />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              title="Refazer (Ctrl+Y)"
              aria-label="Refazer"
              className={`${TOOL_BUTTON} ${canRedo ? "hover:bg-soft" : "text-faint cursor-not-allowed"}`}
            >
              <ArrowUUpRight aria-hidden="true" weight="bold" size={26} />
            </button>
          </>
        )}

        <button
          onClick={onClear}
          title="Limpar"
          aria-label="Limpar"
          className={`${TOOL_BUTTON} text-red-700 hover:bg-red-600/15`}
        >
          <Trash aria-hidden="true" weight="bold" size={26} />
        </button>
      </div>

      <div
        className={`order-1 lg:order-2 basis-full lg:basis-auto lg:flex-1 min-w-0 w-full ${framed ? "bg-paper shadow-hard-lg p-3 sm:p-5" : ""}`}
        // As wide as the paper allows, but never so tall that the button
        // under it leaves the screen (the paper is 4:3).
        style={{
          maxWidth: framed
            ? "min(848px, max(320px, (100svh - 19rem) * 1.333))"
            : "min(800px, max(320px, (100svh - 10rem) * 1.333))",
        }}
      >
        {children}
      </div>

      <div className="tag order-3 flex lg:flex-col flex-wrap items-center justify-center gap-3 p-3">
        <div
          role="group"
          aria-label="Cores"
          className="flex flex-wrap lg:grid lg:grid-cols-2 justify-center gap-2.5"
        >
          {COLORS.map((color) => (
            <button
              key={color}
              onClick={() => onToolChange({ ...tool, type: "brush", color })}
              aria-label={`Cor ${color}`}
              aria-pressed={tool.type !== "eraser" && tool.color === color}
              className={`w-9 h-9 rounded-full border-2 ${
                tool.type !== "eraser" && tool.color === color
                  ? "border-ink ring-4 ring-brand"
                  : "border-line-strong"
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        <span
          aria-hidden="true"
          className="self-stretch w-[3px] lg:w-auto lg:h-[3px] bg-line"
        />

        <div
          role="group"
          aria-label="Espessura do traço"
          className="flex lg:grid lg:grid-cols-2 items-center justify-center gap-1.5"
        >
          {SIZES.map((size) => (
            <button
              key={size}
              onClick={() => onToolChange({ ...tool, size })}
              aria-label={`Traço de ${size} pixels`}
              aria-pressed={tool.size === size}
              className={`flex items-center justify-center w-10 h-10 rounded-full ${
                tool.size === size ? "bg-amber" : "hover:bg-soft"
              }`}
            >
              <div
                className="rounded-full bg-ink"
                style={{ width: size + 2, height: size + 2 }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
