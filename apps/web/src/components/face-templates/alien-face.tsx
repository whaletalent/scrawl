export function AlienFaceTemplate({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 800 600" className={className} fill="none" stroke="#888" strokeWidth="2" strokeDasharray="8 4">
      <ellipse cx="400" cy="290" rx="180" ry="260" />
      <rect x="365" y="520" width="70" height="16" rx="4" />
      <ellipse cx="400" cy="50" rx="100" ry="20" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}
