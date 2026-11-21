-- Scrawl accounts: public profiles and the avatars bucket.
-- Run once in the Supabase SQL editor (or with `supabase db push`). Safe to re-run.
--
-- Sign-in itself (e-mail + password, Google) is Supabase Auth and is set up in
-- the dashboard — see docs/supabase-setup.md. E-mail addresses stay in
-- auth.users; nothing here stores or exposes them.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- Same rule as apps/web/src/lib/account-rules.ts and apps/ws-server/src/account-rules.ts.
  username text not null check (username ~ '^[A-Za-z0-9_.]{3,16}$'),
  -- Must be a PNG directly inside the owner's own avatars/<id>/ folder. The
  -- host isn't checked here (SQL doesn't know the project URL); the game
  -- server checks it before showing an avatar to other players.
  avatar_url text not null check (
    avatar_url ~ ('/storage/v1/object/public/avatars/' || id::text || '/[A-Za-z0-9_-]+\.png$')
  ),
  created_at timestamptz not null default now()
);

-- "Ana" and "ana" are the same username.
create unique index if not exists profiles_username_lower_key
  on public.profiles (lower(username));

alter table public.profiles enable row level security;

drop policy if exists "Profiles are public" on public.profiles;
create policy "Profiles are public"
  on public.profiles for select
  to anon, authenticated
  using (true);

drop policy if exists "Users create their own profile" on public.profiles;
create policy "Users create their own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Usernames are permanent: the only column a player may change is the avatar.
-- No delete policy: accounts are removed by the owner from the dashboard.
revoke update, delete on public.profiles from anon, authenticated;
grant update (avatar_url) on public.profiles to authenticated;
revoke insert on public.profiles from anon;

-- Avatars: public to read, 200 KB PNGs, each user writes only inside their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 204800, array['image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users upload avatars to their own folder" on storage.objects;
create policy "Users upload avatars to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
-- No update or delete policy: every new avatar is a new file, old ones stay
-- until the owner cleans them up.
