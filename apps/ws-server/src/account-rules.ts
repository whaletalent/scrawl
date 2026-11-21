/** Same rule as the web app's `lib/account-rules.ts`. */
export const USERNAME_PATTERN = /^[A-Za-z0-9_.]{3,16}$/;

/**
 * A profile row is written by the browser, so its `avatar_url` could point
 * anywhere. Only a file directly inside this project's public
 * `avatars/<userId>/` folder is relayed to other players.
 */
export function isOwnAvatarUrl(
  url: unknown,
  supabaseUrl: string,
  userId: string,
): url is string {
  if (typeof url !== "string") return false;
  const prefix = `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/avatars/${userId}/`;
  if (!url.startsWith(prefix)) return false;
  return /^[A-Za-z0-9_-]+\.png$/.test(url.slice(prefix.length));
}
