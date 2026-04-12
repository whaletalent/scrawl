export function MasculineTemplate({ className, fillColor }: { className?: string; fillColor?: string }) {
  return (
    <svg viewBox="0 0 800 600" className={className} fill={fillColor ?? "none"} stroke={fillColor ? "none" : "#888"} strokeWidth="2" strokeDasharray="8 4">
      <ellipse cx="400" cy="280" rx="200" ry="250" />
      <rect x="355" y="510" width="90" height="20" rx="4" />
    </svg>
  );
}
