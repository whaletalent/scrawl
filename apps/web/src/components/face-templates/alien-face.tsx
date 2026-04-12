export function AlienFaceTemplate({ className, fillColor }: { className?: string; fillColor?: string }) {
  return (
    <svg viewBox="0 0 800 600" className={className} fill={fillColor ?? "none"} stroke={fillColor ? "none" : "#888"} strokeWidth="2" strokeDasharray="8 4">
      <ellipse cx="400" cy="290" rx="180" ry="260" />
      <rect x="370" y="520" width="60" height="24" rx="4" />
      <path d="M370,536 Q370,560 240,570 L240,590 Q400,578 560,590 L560,570 Q430,560 430,536 Z" />
    </svg>
  );
}
