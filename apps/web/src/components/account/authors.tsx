import { Avatar } from "./avatar";

interface Author {
  name: string;
  avatarUrl?: string | null;
}

/** "(avatar) Ana + (avatar) Bia" — who made a drawing. Guests get the initial placeholder. */
export function Authors({
  authors,
  className = "",
}: {
  authors: Author[];
  className?: string;
}) {
  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      {authors.map((a, i) => (
        <span key={i} className="inline-flex items-center gap-1.5">
          {i > 0 && <span className="text-gray-500">+</span>}
          <Avatar url={a.avatarUrl} name={a.name} size={22} />
          {a.name}
        </span>
      ))}
    </span>
  );
}

/** The two authors of a party drawing, from the server's parallel name/avatar arrays. */
export function resultAuthors(d: {
  playerNames: [string, string];
  playerAvatars?: [string | null, string | null];
}): Author[] {
  return d.playerNames.map((name, i) => ({
    name,
    avatarUrl: d.playerAvatars?.[i],
  }));
}
