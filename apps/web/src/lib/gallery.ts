/**
 * The public gallery, read straight from Supabase. Drawings get there
 * through the game server (`save-drawing`); a browser can only look, and
 * remove what its own account drew or saved.
 */
import { supabase } from "./supabase";
import { withTimeout } from "./account";
import { projectAvatarUrl } from "./account-rules";
import type { GameMode } from "@/types/game";

export interface GalleryAuthor {
  name: string;
  /** Null for someone who played as a guest. */
  userId: string | null;
  avatarUrl: string | null;
}

export interface GalleryDrawing {
  id: string;
  imagePath: string;
  imageUrl: string;
  gameMode: GameMode;
  /** Party mode only. */
  theme: string | null;
  authors: GalleryAuthor[];
  createdAt: string;
}

interface Row {
  id: string;
  image_path: string;
  game_mode: GameMode;
  theme: string | null;
  author_names: string[];
  author_ids: (string | null)[];
  created_at: string;
}

export const GALLERY_PAGE_SIZE = 24;

export const MODE_LABEL: Record<GameMode, string> = {
  party: "Racha-tema",
  "split-body": "Monstrinho",
  "face-builder": "Caricatura a dois",
};

/** "Ana + Bia" — also the image's alt text. */
export function authorsLabel(d: GalleryDrawing): string {
  return d.authors.map((a) => a.name).join(" + ");
}

/** Turns rows into drawings, looking up the avatars of the authors who have accounts. */
async function hydrate(rows: Row[]): Promise<GalleryDrawing[]> {
  if (!supabase) return [];
  const client = supabase;
  const ids = [
    ...new Set(rows.flatMap((r) => r.author_ids).filter((id) => id !== null)),
  ];
  const avatars = new Map<string, string>();
  if (ids.length > 0) {
    const profiles = await withTimeout(
      client
        .from("profiles")
        .select("id, avatar_url")
        .in("id", ids)
        .then((result) => result.data),
      null,
    );
    // Without them the drawings still show, with placeholder avatars.
    for (const p of profiles ?? []) {
      // The row is written by its owner's browser: show only an avatar that
      // really is this project's file, never an address of their choosing.
      const url = projectAvatarUrl(
        p.avatar_url,
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        p.id,
      );
      if (url) avatars.set(p.id, url);
    }
  }

  return rows.map((r) => ({
    id: r.id,
    imagePath: r.image_path,
    imageUrl: client.storage.from("gallery").getPublicUrl(r.image_path).data
      .publicUrl,
    gameMode: r.game_mode,
    theme: r.theme,
    createdAt: r.created_at,
    authors: r.author_names.map((name, i) => {
      const userId = r.author_ids[i] ?? null;
      return {
        name,
        userId,
        avatarUrl: (userId && avatars.get(userId)) || null,
      };
    }),
  }));
}

/** Newest first. Null when the gallery can't be read (accounts off, Supabase down). */
export async function listDrawings({
  offset = 0,
  limit = GALLERY_PAGE_SIZE,
} = {}): Promise<GalleryDrawing[] | null> {
  if (!supabase) return null;
  const rows = await withTimeout(
    supabase
      .from("drawings")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)
      .then((result) => (result.error ? null : (result.data as Row[]))),
    null,
  );
  return rows && hydrate(rows);
}

/** The drawings this account drew or saved, newest first. */
export async function listOwnDrawings(
  userId: string,
): Promise<GalleryDrawing[] | null> {
  if (!supabase) return null;
  const rows = await withTimeout(
    supabase
      .from("drawings")
      .select("*")
      .or(`author_ids.cs.{${userId}},saved_by.eq.${userId}`)
      .order("created_at", { ascending: false })
      .then((result) => (result.error ? null : (result.data as Row[]))),
    null,
  );
  return rows && hydrate(rows);
}

/**
 * Takes a drawing out of the gallery for good. The image goes first: the
 * right to delete it is proven by the row, so the row must still be there.
 */
export async function removeDrawing(d: GalleryDrawing): Promise<boolean> {
  if (!supabase) return false;
  const file = await supabase.storage.from("gallery").remove([d.imagePath]);
  if (file.error) return false;
  // Storage answers "ok, nothing deleted" when its policy says no. Deleting
  // the row then would leave a public image nobody can ever remove, so the
  // row only goes once the image is known to be gone.
  if (!file.data?.some((f) => f.name === d.imagePath)) {
    const stillThere = await fetch(d.imageUrl, {
      method: "HEAD",
      cache: "no-store",
    }).then(
      (res) => res.ok,
      () => true,
    );
    if (stillThere) return false;
  }
  const row = await supabase.from("drawings").delete().eq("id", d.id);
  return !row.error;
}
