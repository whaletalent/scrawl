export function AlienSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 400" className={className} fill="#000">
      <ellipse cx="100" cy="50" rx="40" ry="45" />
      <rect x="94" y="93" width="12" height="15" />
      <path d="M82,108 L118,108 L114,195 L86,195 Z" />
      <path d="M82,112 L58,160 L65,164 L86,120 Z" />
      <path d="M118,112 L142,160 L135,164 L114,120 Z" />
      <path d="M88,195 L90,300 L100,300 L100,195 Z" />
      <path d="M100,195 L100,300 L110,300 L112,195 Z" />
      <path d="M86,300 L82,320 L103,320 L100,300 Z" />
      <path d="M100,300 L100,320 L120,320 L115,300 Z" />
    </svg>
  );
}
