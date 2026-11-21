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
    <div className="flex items-center gap-3">
      <Link
        href="/profile/"
        className="flex items-center gap-2 font-semibold hover:text-purple-300"
      >
        <Avatar url={profile.avatarUrl} name={profile.username} size={36} />
        {profile.username}
      </Link>
      <button
        onClick={signOutHere}
        className="text-sm text-gray-500 hover:text-gray-300"
      >
        Sair
      </button>
    </div>
  );
}
