/**
 * The app is a static export, so it can't have a dynamic `/room/[code]`
 * segment: the room code travels in the query string instead.
 */

/** Path prefix the site is served under (e.g. `/scrawl` on GitHub Pages). */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Sentinel "code" meaning "create a new room". */
export const NEW_ROOM = "new";

/** In-app path of a room, for `router.push` / `<Link>` (Next adds the base path). */
export function roomPath(code: string): string {
  return `/room/?code=${encodeURIComponent(code)}`;
}

/** Full shareable URL of a room. Browser only. */
export function roomUrl(code: string): string {
  return `${window.location.origin}${BASE_PATH}${roomPath(code)}`;
}
