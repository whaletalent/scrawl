"use client";
import type { CanvasTool, ToolType } from "@/hooks/use-canvas";

const COLORS = [
  "#000000", "#ffffff", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280",
  "#92400e", "#0891b2",
];

const SIZES = [2, 4, 8, 16];

const SHAPE_TOOLS: { type: ToolType; label: string; icon: string }[] = [
  { type: "fill", label: "Balde", icon: "🪣" },
  { type: "line", label: "Linha", icon: "╱" },
  { type: "rectangle", label: "Retângulo", icon: "▭" },
  { type: "circle", label: "Círculo", icon: "○" },
];

interface ToolbarProps {
  tool: CanvasTool;
  onToolChange: (tool: CanvasTool) => void;
  onClear: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export function Toolbar({ tool, onToolChange, onClear, onUndo, onRedo, canUndo, canRedo }: ToolbarProps) {
  const isBrushOrEraser = tool.type === "brush" || tool.type === "eraser";

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-800 rounded-xl">
      {/* Colors */}
      <div className="flex gap-1 flex-wrap">
        {COLORS.map((color) => (
          <button
            key={color}
            onClick={() => onToolChange({ ...tool, type: "brush", color })}
            className={`w-7 h-7 rounded-full border-2 transition-transform ${
              tool.type !== "eraser" && tool.color === color
                ? "border-white scale-110"
                : "border-gray-600"
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      <div className="w-px h-8 bg-gray-600" />

      {/* Sizes */}
      <div className="flex gap-1 items-center">
        {SIZES.map((size) => (
          <button
            key={size}
            onClick={() => onToolChange({ ...tool, size })}
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
              tool.size === size ? "bg-gray-600" : "hover:bg-gray-700"
            }`}
          >
            <div
              className="rounded-full bg-white"
              style={{ width: size + 2, height: size + 2 }}
            />
          </button>
        ))}
      </div>

      <div className="w-px h-8 bg-gray-600" />

      {/* Brush */}
      <button
        onClick={() => onToolChange({ ...tool, type: "brush" })}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          tool.type === "brush" ? "bg-purple-600" : "bg-gray-700 hover:bg-gray-600"
        }`}
      >
        Pincel
      </button>

      {/* Eraser */}
      <button
        onClick={() => onToolChange({ ...tool, type: "eraser" })}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          tool.type === "eraser" ? "bg-purple-600" : "bg-gray-700 hover:bg-gray-600"
        }`}
      >
        Borracha
      </button>

      <div className="w-px h-8 bg-gray-600" />

      {/* Shape tools */}
      <div className="flex gap-1">
        {SHAPE_TOOLS.map(({ type, label, icon }) => (
          <button
            key={type}
            onClick={() => onToolChange({ ...tool, type })}
            title={label}
            className={`flex items-center justify-center w-9 h-9 rounded-lg text-base transition-colors ${
              tool.type === type ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            {icon}
          </button>
        ))}
      </div>

      <div className="w-px h-8 bg-gray-600" />

      {/* Undo / Redo */}
      {onUndo && onRedo && (
        <>
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Desfazer (Ctrl+Z)"
            className={`flex items-center justify-center w-9 h-9 rounded-lg text-base transition-colors ${
              canUndo ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-800 text-gray-600 cursor-not-allowed"
            }`}
          >
            ↩
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Refazer (Ctrl+Y)"
            className={`flex items-center justify-center w-9 h-9 rounded-lg text-base transition-colors ${
              canRedo ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-800 text-gray-600 cursor-not-allowed"
            }`}
          >
            ↪
          </button>
          <div className="w-px h-8 bg-gray-600" />
        </>
      )}

      <button
        onClick={onClear}
        className="px-3 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg text-sm font-medium transition-colors"
      >
        Limpar
      </button>
    </div>
  );
}
