export function MasculineTemplate({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 800 600" className={className} fill="none" stroke="#888" strokeWidth="2" strokeDasharray="8 4">
      <ellipse cx="400" cy="280" rx="200" ry="250" />
      <rect x="355" y="510" width="90" height="20" rx="4" />
      <line x1="370" y1="265" x2="420" y2="265" strokeWidth="1.5" strokeDasharray="none" opacity="0.3" />
    </svg>
  );
}
