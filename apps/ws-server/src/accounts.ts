/** What the game server knows about a player who joined with an account. */
export interface Profile {
  userId: string;
  username: string;
  avatarUrl: string;
}

/** The game server's only view of the account system; tests swap in a fake. */
export interface Accounts {
  /** Resolves null for anything that isn't a valid, complete account. Never rejects. */
  profileFromToken(accessToken: string): Promise<Profile | null>;
}

let current: Accounts | null = null;

/** `null` turns accounts off: every player is a guest. */
export function setAccounts(accounts: Accounts | null) {
  current = accounts;
}

export function getAccounts(): Accounts | null {
  return current;
}
