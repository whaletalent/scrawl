import { art } from "./art";

/** The app icon and the name, on a paper tag set a little crooked. */
export function Wordmark({ large = false }: { large?: boolean }) {
  const size = large ? 44 : 36;
  return (
    <span
      className={`tag inline-flex items-center gap-3 py-2 pl-2 pr-5 -rotate-1 font-display font-extrabold tracking-tight text-ink ${large ? "text-3xl" : "text-2xl"}`}
    >
      <img
        src={art("logo")}
        alt=""
        width={size}
        height={size}
        className="rounded-[28%]"
      />
      Scrawl
    </span>
  );
}
