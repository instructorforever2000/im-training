-- الحضور، وتقدّم التعلّم، وصور التمارين الحقيقية — training schema. Additive only (approved by the owner 2026-11-05).
create table training.attendance (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  session_id uuid not null references training.sessions(id) on delete cascade,
  player_id uuid not null references training.players(id),
  status text not null default 'present' check (status in ('present','late','absent','excused','injured')),
  rpe smallint check (rpe between 0 and 10),
  minutes smallint check (minutes between 0 and 300),
  note text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (session_id, player_id)
);
create index on training.attendance(org_id, player_id);
alter table training.attendance enable row level security;
create policy attendance_read on training.attendance for select using (is_owner() or private.training_staff(org_id));
create policy attendance_write on training.attendance for insert with check (is_owner() or private.training_staff(org_id, array['org_admin','technical_director','coach','fitness_coach']));
create policy attendance_update on training.attendance for update using (is_owner() or private.training_staff(org_id, array['org_admin','technical_director','coach','fitness_coach'])) with check (is_owner() or private.training_staff(org_id, array['org_admin','technical_director','coach','fitness_coach']));
create policy attendance_delete on training.attendance for delete using (is_owner() or private.training_staff(org_id, array['org_admin','technical_director','coach','fitness_coach']));
grant select, insert, update, delete on training.attendance to authenticated;

-- Learning progress: each signed-in person owns their own rows.
create table training.learning_progress (
  user_id uuid not null default auth.uid(),
  unit_id text not null check (length(unit_id) between 2 and 60),
  best smallint not null check (best between 0 and 100),
  updated_at timestamptz not null default now(),
  primary key (user_id, unit_id)
);
create table training.learning_profiles (
  user_id uuid primary key default auth.uid(),
  cert_name text check (length(cert_name) <= 80),
  updated_at timestamptz not null default now()
);
alter table training.learning_progress enable row level security;
alter table training.learning_profiles enable row level security;
create policy learning_progress_own on training.learning_progress for all using (user_id = auth.uid() or is_owner()) with check (user_id = auth.uid());
create policy learning_profiles_own on training.learning_profiles for all using (user_id = auth.uid() or is_owner()) with check (user_id = auth.uid());
grant select, insert, update on training.learning_progress, training.learning_profiles to authenticated;

-- Real photos / videos of drills and exercises, uploaded by the owner; shown to everyone in the library.
create table training.drill_media (
  id uuid primary key default gen_random_uuid(),
  drill_id text not null,
  kind text not null check (kind in ('image','video')),
  path text not null,
  caption text,
  sort smallint not null default 0,
  is_active boolean not null default true,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index on training.drill_media(drill_id);
alter table training.drill_media enable row level security;
create policy drill_media_read on training.drill_media for select using (is_active or is_owner());
create policy drill_media_write on training.drill_media for insert with check (is_owner());
create policy drill_media_update on training.drill_media for update using (is_owner()) with check (is_owner());
grant usage on schema training to anon;
grant select on training.drill_media to anon, authenticated;
grant insert, update on training.drill_media to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('drill-media', 'drill-media', true, 52428800, array['image/jpeg','image/png','image/webp','video/mp4','video/webm'])
on conflict (id) do nothing;
create policy drill_media_files_owner_insert on storage.objects for insert to authenticated with check (bucket_id = 'drill-media' and public.is_owner());
create policy drill_media_files_owner_update on storage.objects for update to authenticated using (bucket_id = 'drill-media' and public.is_owner());

-- Follow-up applied 2026-11-05 (owner approved): visitors (anon) cannot run is_owner(), so the read
-- policy is limited to signed-in users and visitors get their own policy (no policy dropped).
alter policy drill_media_read on training.drill_media to authenticated;
create policy drill_media_read_public on training.drill_media for select to anon using (is_active);
