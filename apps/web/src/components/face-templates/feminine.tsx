export function FeminineTemplate({ className, fillColor }: { className?: string; fillColor?: string }) {
  return (
    <svg viewBox="0 0 800 600" className={className} fill={fillColor ?? "none"} stroke={fillColor ? "none" : "#888"} strokeWidth="2" strokeDasharray="8 4">
      <ellipse cx="400" cy="280" rx="190" ry="245" />
      <rect x="360" y="508" width="80" height="18" rx="4" />
    </svg>
  );
}
