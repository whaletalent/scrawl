export function RobotSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 400" className={className} fill="#000">
      <rect x="72" y="20" rx="8" ry="8" width="56" height="56" />
      <rect x="88" y="76" width="24" height="14" />
      <rect x="65" y="90" width="70" height="100" rx="5" />
      <rect x="45" y="95" width="18" height="70" rx="4" />
      <rect x="137" y="95" width="18" height="70" rx="4" />
      <rect x="72" y="192" width="24" height="110" rx="3" />
      <rect x="104" y="192" width="24" height="110" rx="3" />
      <rect x="68" y="300" width="32" height="18" rx="4" />
      <rect x="100" y="300" width="32" height="18" rx="4" />
    </svg>
  );
}
