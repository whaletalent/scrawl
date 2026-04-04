"use client";
import type { CanvasTool } from "@/hooks/use-canvas";

const COLORS = [
  "#000000", "#ffffff", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280",
  "#92400e", "#0891b2",
];

const SIZES = [2, 4, 8, 16];

interface ToolbarProps {
  tool: CanvasTool;
  onToolChange: (tool: CanvasTool) => void;
  onClear: () => void;
}

export function Toolbar({ tool, onToolChange, onClear }: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-800 rounded-xl">
      <div className="flex gap-1 flex-wrap">
        {COLORS.map((color) => (
          <button
            key={color}
            onClick={() => onToolChange({ ...tool, type: "brush", color })}
            className={`w-7 h-7 rounded-full border-2 transition-transform ${
              tool.type === "brush" && tool.color === color
                ? "border-white scale-110"
                : "border-gray-600"
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      <div className="w-px h-8 bg-gray-600" />

      <div className="flex gap-1 items-center">
        {SIZES.map((size) => (
          <button
            key={size}
            onClick={() => onToolChange({ ...tool, size })}
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
              tool.size === size && tool.type === "brush" ? "bg-gray-600" : "hover:bg-gray-700"
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

      <button
        onClick={() => onToolChange({ ...tool, type: tool.type === "eraser" ? "brush" : "eraser" })}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          tool.type === "eraser" ? "bg-purple-600" : "bg-gray-700 hover:bg-gray-600"
        }`}
      >
        Eraser
      </button>

      <button
        onClick={onClear}
        className="px-3 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg text-sm font-medium transition-colors"
      >
        Clear
      </button>
    </div>
  );
}
