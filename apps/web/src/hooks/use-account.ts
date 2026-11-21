"use client";
import { useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase";
import {
  completeOAuthRedirect,
  fetchProfile,
  type Profile,
} from "@/lib/account";

/**
 * - `off`: no Supabase project configured (or it can't be reached) — the site behaves as it did before accounts.
 * - `needs-profile`: signed in, but hasn't picked a username and drawn an avatar yet.
 */
export type AccountStatus =
  "off" | "loading" | "signed-out" | "needs-profile" | "ready";

interface AccountState {
  status: AccountStatus;
  profile: Profile | null;
}

const SERVER_STATE: AccountState = {
  status: supabase ? "loading" : "off",
  profile: null,
};

// One state for the whole app, shared by every component that calls the hook.
let state = SERVER_STATE;
let userId: string | null = null;
let started = false;
const listeners = new Set<() => void>();

function set(next: AccountState) {
  state = next;
  listeners.forEach((l) => l());
}

async function loadProfile(forUser: string) {
  const { profile, failed } = await fetchProfile(forUser);
  if (userId !== forUser) return; // signed out (or switched) meanwhile
  if (failed) {
    // Supabase is unreachable: don't send a real account to onboarding, just
    // let the player carry on as a guest until the next page load.
    set({ status: "off", profile: null });
    return;
  }
  set({ status: profile ? "ready" : "needs-profile", profile });
}

function start() {
  if (started || !supabase) return;
  started = true;
  const client = supabase;

  void completeOAuthRedirect().then(() => {
    client.auth.onAuthStateChange((_event, session) => {
      const next = session?.user.id ?? null;
      if (next === userId && state.status !== "loading") return; // token refresh
      userId = next;
      if (!next) {
        set({ status: "signed-out", profile: null });
        return;
      }
      set({ status: "loading", profile: null });
      // Supabase forbids calling it back from inside this callback.
      setTimeout(() => void loadProfile(next), 0);
    });
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  start();
  return () => {
    listeners.delete(listener);
  };
}

/** Re-reads the profile, e.g. right after creating it or changing the avatar. */
async function refresh() {
  if (userId) await loadProfile(userId);
}

export function useAccount() {
  const current = useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE,
  );
  return { ...current, refresh };
}
