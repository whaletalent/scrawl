export function ChildSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 400" className={className} fill="#000">
      <ellipse cx="100" cy="55" rx="32" ry="38" />
      <rect x="92" y="90" width="16" height="12" />
      <path d="M78,102 L122,102 L118,180 L82,180 Z" />
      <path d="M78,105 L58,150 L66,153 L82,112 Z" />
      <path d="M122,105 L142,150 L134,153 L118,112 Z" />
      <path d="M85,180 L88,270 L100,270 L100,180 Z" />
      <path d="M100,180 L100,270 L112,270 L115,180 Z" />
      <path d="M85,270 L82,288 L103,288 L100,270 Z" />
      <path d="M100,270 L100,288 L120,288 L115,270 Z" />
    </svg>
  );
}
