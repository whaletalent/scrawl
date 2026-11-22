"use client";
import Link from "next/link";
import { signOut, type Profile } from "@/lib/account";
import { Avatar } from "./avatar";

/** Signing out also forgets the nickname this tab was playing under. */
export async function signOutHere() {
  sessionStorage.removeItem("scrawl-nickname");
  await signOut();
}

export function AccountMenu({ profile }: { profile: Profile }) {
  return (
    <div className="tag flex items-center gap-3 py-2 pl-2 pr-4">
      <Link
        href="/profile/"
        className="flex items-center gap-2 font-semibold text-lg hover:text-brand"
      >
        <Avatar url={profile.avatarUrl} name={profile.username} size={40} />
        {profile.username}
      </Link>
      <button
        onClick={signOutHere}
        className="min-h-11 px-2 text-muted underline hover:text-ink"
      >
        Sair
      </button>
    </div>
  );
}
