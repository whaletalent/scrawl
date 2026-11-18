export function FeminineTemplate({
  className,
  fillColor,
}: {
  className?: string;
  fillColor?: string;
}) {
  return (
    <svg
      viewBox="0 0 800 600"
      className={className}
      fill={fillColor ?? "none"}
      stroke={fillColor ? "none" : "#888"}
      strokeWidth="2"
      strokeDasharray="8 4"
    >
      <ellipse cx="400" cy="280" rx="190" ry="245" />
      <rect x="365" y="508" width="70" height="28" rx="4" />
      <path d="M365,528 Q365,558 220,568 L220,590 Q400,578 580,590 L580,568 Q435,558 435,528 Z" />
    </svg>
  );
}
