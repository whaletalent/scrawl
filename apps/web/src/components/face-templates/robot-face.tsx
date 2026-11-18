export function RobotFaceTemplate({
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
      <rect x="210" y="50" width="380" height="470" rx="30" />
      <rect x="355" y="510" width="90" height="30" rx="4" />
      <path d="M355,535 Q355,555 180,570 L180,600 Q400,585 620,600 L620,570 Q445,555 445,535 Z" />
      {!fillColor && (
        <circle cx="400" cy="30" r="10" strokeWidth="1.5" opacity="0.3" />
      )}
      {!fillColor && (
        <line
          x1="400"
          y1="15"
          x2="400"
          y2="5"
          strokeWidth="1.5"
          opacity="0.3"
        />
      )}
    </svg>
  );
}
