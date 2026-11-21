interface AvatarProps {
  /** Missing for guests, who get a circle with their initial instead. */
  url?: string | null;
  name: string;
  /** Diameter in pixels. */
  size?: number;
}

export function Avatar({ url, name, size = 32 }: AvatarProps) {
  const style = { width: size, height: size };
  if (url)
    return (
      <img
        src={url}
        alt={`Avatar de ${name}`}
        style={style}
        className="rounded-full bg-white object-cover shrink-0"
      />
    );
  return (
    <span
      aria-hidden
      style={{ ...style, fontSize: size * 0.45 }}
      className="rounded-full bg-gray-700 text-gray-300 font-bold shrink-0 inline-flex items-center justify-center uppercase"
    >
      {name.trim().charAt(0) || "?"}
    </span>
  );
}
