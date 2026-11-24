-- Emenda (`seam`) drawings may go in the gallery too.
-- Run after 0002_gallery.sql. Safe to re-run.

alter table public.drawings
  drop constraint if exists drawings_game_mode_check;
alter table public.drawings
  add constraint drawings_game_mode_check
  check (game_mode in ('party', 'split-body', 'face-builder', 'seam'));
