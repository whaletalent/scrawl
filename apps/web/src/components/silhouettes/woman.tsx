export function WomanSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 400" className={className} fill="#000">
      <ellipse cx="100" cy="42" rx="25" ry="30" />
      <rect x="92" y="70" width="16" height="16" />
      <path d="M75,86 L125,86 L120,150 L80,150 Z" />
      <path d="M80,150 L60,220 L140,220 L120,150 Z" />
      <path d="M75,89 L50,145 L60,148 L80,98 Z" />
      <path d="M125,89 L150,145 L140,148 L120,98 Z" />
      <path d="M80,220 L85,315 L100,315 L98,220 Z" />
      <path d="M102,220 L100,315 L115,315 L120,220 Z" />
      <path d="M82,315 L78,335 L103,335 L100,315 Z" />
      <path d="M100,315 L100,335 L125,335 L118,315 Z" />
    </svg>
  );
}
