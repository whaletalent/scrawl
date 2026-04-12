export function MonsterTemplate({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 800 600" className={className} fill="none" stroke="#888" strokeWidth="2" strokeDasharray="8 4">
      <ellipse cx="400" cy="280" rx="210" ry="260" />
      <rect x="350" y="515" width="100" height="22" rx="4" />
      <circle cx="320" cy="60" r="15" strokeWidth="1.5" opacity="0.3" />
      <circle cx="480" cy="60" r="15" strokeWidth="1.5" opacity="0.3" />
    </svg>
  );
}
