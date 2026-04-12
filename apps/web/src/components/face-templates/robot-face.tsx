export function RobotFaceTemplate({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 800 600" className={className} fill="none" stroke="#888" strokeWidth="2" strokeDasharray="8 4">
      <rect x="210" y="50" width="380" height="470" rx="30" />
      <rect x="355" y="510" width="90" height="25" rx="4" />
      <circle cx="400" cy="30" r="10" strokeWidth="1.5" opacity="0.3" />
      <line x1="400" y1="15" x2="400" y2="5" strokeWidth="1.5" opacity="0.3" />
    </svg>
  );
}
