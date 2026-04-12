export function AlienFaceTemplate({ className, fillColor }: { className?: string; fillColor?: string }) {
  return (
    <svg viewBox="0 0 800 600" className={className} fill={fillColor ?? "none"} stroke={fillColor ? "none" : "#888"} strokeWidth="2" strokeDasharray="8 4">
      <ellipse cx="400" cy="290" rx="180" ry="260" />
      <rect x="365" y="520" width="70" height="16" rx="4" />
    </svg>
  );
}
