import type { GameMode } from "./types.js";

/** What the game server knows about a player who joined with an account. */
export interface Profile {
  userId: string;
  username: string;
  avatarUrl: string;
}

/** A finished drawing on its way to the public gallery. Everything but `png` comes from the room's own state. */
export interface GalleryEntry {
  png: Buffer;
  gameMode: GameMode;
  /** Party only. */
  theme: string | null;
  authorNames: string[];
  /** Parallel to `authorNames`; null for an author who played as a guest. */
  authorIds: (string | null)[];
  savedBy: string;
}

/** The game server's only view of the account system; tests swap in a fake. */
export interface Accounts {
  /** Resolves null for anything that isn't a valid, complete account. Never rejects. */
  profileFromToken(accessToken: string): Promise<Profile | null>;
  /**
   * Stores the image and its gallery entry. "limit": this player has saved
   * too many today. Never rejects. Absent when there is no gallery.
   */
  saveDrawing?(entry: GalleryEntry): Promise<"saved" | "limit" | "failed">;
}

let current: Accounts | null = null;

/** `null` turns accounts off: every player is a guest. */
export function setAccounts(accounts: Accounts | null) {
  current = accounts;
}

export function getAccounts(): Accounts | null {
  return current;
}
