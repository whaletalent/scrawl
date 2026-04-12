export function MonsterTemplate({ className, fillColor }: { className?: string; fillColor?: string }) {
  return (
    <svg viewBox="0 0 800 600" className={className} fill={fillColor ?? "none"} stroke={fillColor ? "none" : "#888"} strokeWidth="2" strokeDasharray="8 4">
      <ellipse cx="400" cy="280" rx="210" ry="260" />
      <rect x="350" y="515" width="100" height="22" rx="4" />
      <circle cx="320" cy="60" r="15" />
      <circle cx="480" cy="60" r="15" />
    </svg>
  );
}
