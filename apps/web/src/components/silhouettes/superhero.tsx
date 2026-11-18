export function SuperheroSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 400" className={className} fill="#000">
      <ellipse cx="100" cy="42" rx="26" ry="30" />
      <rect x="90" y="70" width="20" height="16" />
      <path d="M68,86 L132,86 L126,195 L74,195 Z" />
      <path d="M68,89 L38,155 L48,160 L74,98 Z" />
      <path d="M132,89 L162,155 L152,160 L126,98 Z" />
      <path d="M72,86 L50,200 L80,195 Z" opacity="0.7" />
      <path d="M128,86 L150,200 L120,195 Z" opacity="0.7" />
      <path d="M78,195 L72,310 L96,310 L100,195 Z" />
      <path d="M100,195 L104,310 L128,310 L122,195 Z" />
      <path d="M68,310 L65,332 L100,332 L96,310 Z" />
      <path d="M104,310 L100,332 L135,332 L132,310 Z" />
    </svg>
  );
}
