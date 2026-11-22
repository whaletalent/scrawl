-- Scrawl gallery: finished drawings that players chose to make public.
-- Run after 0001_accounts.sql. Safe to re-run.
--
-- Rows and images are written only by the game server (secret key, which
-- bypasses row-level security). Browsers read, and remove what is theirs.

create table if not exists public.drawings (
  id uuid primary key default gen_random_uuid(),
  -- File name inside the `gallery` bucket.
  image_path text not null unique,
  game_mode text not null check (game_mode in ('party', 'split-body', 'face-builder')),
  -- Party mode only.
  theme text,
  -- The two players, as named in the game...
  author_names text[] not null,
  -- ...and, in the same order, their account ids (null for a guest).
  author_ids uuid[] not null,
  saved_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists drawings_created_at_idx
  on public.drawings (created_at desc);
create index if not exists drawings_saved_by_idx
  on public.drawings (saved_by, created_at desc);

alter table public.drawings enable row level security;

drop policy if exists "The gallery is public" on public.drawings;
create policy "The gallery is public"
  on public.drawings for select
  to anon, authenticated
  using (true);

-- "My partner published our drawing and I don't want it public": an author,
-- or whoever saved it, can take it down.
drop policy if exists "Authors and savers remove drawings" on public.drawings;
create policy "Authors and savers remove drawings"
  on public.drawings for delete
  to authenticated
  using (
    (select auth.uid()) = any (author_ids)
    or (select auth.uid()) = saved_by
  );

-- No insert or update policy, and no such privilege for browsers either.
-- Privileges in full, for the same reason as in 0001.
revoke all on public.drawings from anon, authenticated, service_role;
grant select on public.drawings to anon, authenticated;
grant delete on public.drawings to authenticated;
-- The game server: count a player's saves, add a drawing, undo a failed save.
grant select, insert, delete on public.drawings to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gallery', 'gallery', true, 2097152, array['image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Removing a drawing must remove its image too, so the same people who may
-- delete the row may delete the file it points at. (The browser deletes the
-- file first, while the row that proves the right still exists.)
drop policy if exists "Remove the image of a drawing you can remove" on storage.objects;
create policy "Remove the image of a drawing you can remove"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'gallery'
    and exists (
      select 1
      from public.drawings d
      where d.image_path = objects.name
        and (
          (select auth.uid()) = any (d.author_ids)
          or (select auth.uid()) = d.saved_by
        )
    )
  );

-- Storage only deletes objects the caller can also see.
drop policy if exists "Gallery images are visible" on storage.objects;
create policy "Gallery images are visible"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'gallery');
