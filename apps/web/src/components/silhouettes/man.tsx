export function ManSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 400" className={className} fill="#000">
      <ellipse cx="100" cy="45" rx="28" ry="32" />
      <rect x="90" y="75" width="20" height="18" />
      <path d="M70,93 L130,93 L125,200 L75,200 Z" />
      <path d="M70,96 L45,155 L55,158 L78,105 Z" />
      <path d="M130,96 L155,155 L145,158 L122,105 Z" />
      <path d="M78,200 L85,310 L100,310 L100,200 Z" />
      <path d="M100,200 L100,310 L115,310 L122,200 Z" />
      <path d="M82,310 L78,330 L103,330 L100,310 Z" />
      <path d="M100,310 L100,330 L125,330 L118,310 Z" />
    </svg>
  );
}
