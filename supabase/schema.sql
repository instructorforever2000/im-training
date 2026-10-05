-- ============================================================
-- Instructor Motion — Supabase schema (Phase E, cloud sync)
-- Mirrors the app's existing sync model: every record is a JSON
-- document addressed by a path "<collection>/<id>", exactly as the
-- in-Claude version stores it. Roles match the app:
--   owner · coach (all teams) · scoped (listed teams) · viewer · parent (portal)
-- Run once in Supabase → SQL Editor.
-- ============================================================

create extension if not exists pgcrypto;

-- 1) Organisations (club, academy, school, university, sports centre)
create table if not exists orgs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  type        text not null check (type in ('club','academy','school','uni','center')),
  country     text not null default 'SA',
  owner_id    uuid not null references auth.users(id) on delete restrict,
  created_at  timestamptz not null default now()
);

-- 2) Members and their role — only the owner manages this table
create table if not exists members (
  org_id   uuid not null references orgs(id) on delete cascade,
  user_id  uuid not null references auth.users(id) on delete cascade,
  role     text not null check (role in ('owner','coach','scoped','viewer')),
  teams    text[] not null default '{}',          -- used when role = 'scoped'
  email    text,
  added_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- 3) Access requests (someone opened the link and asked to join)
create table if not exists join_requests (
  org_id     uuid not null references orgs(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  email      text,
  name       text,
  note       text,
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- 4) All app data: one row per document (teams/…, players/…, sessions/…, cups/…)
create table if not exists records (
  org_id     uuid not null references orgs(id) on delete cascade,
  path       text not null,                        -- e.g. 'players/p_ab12'
  col        text generated always as (split_part(path, '/', 1)) stored,
  team_id    text,                                 -- set for team-owned docs (players, sessions…)
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  primary key (org_id, path)
);
create index if not exists records_col_idx  on records (org_id, col);
create index if not exists records_team_idx on records (org_id, team_id);

-- 5) Parent / player portal: read-only summary per player, written by the owner
create table if not exists portal (
  org_id     uuid not null references orgs(id) on delete cascade,
  player_id  text not null,
  user_id    uuid not null references auth.users(id) on delete cascade,   -- the parent's account
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (org_id, player_id, user_id)
);

-- ---------- helper functions (security definer to avoid RLS recursion) ----------
create or replace function im_role(o uuid) returns text language sql stable security definer set search_path = public as $$
  select case when exists (select 1 from orgs where id = o and owner_id = auth.uid()) then 'owner'
              else (select role from members where org_id = o and user_id = auth.uid()) end $$;
create or replace function im_teams(o uuid) returns text[] language sql stable security definer set search_path = public as $$
  select coalesce((select teams from members where org_id = o and user_id = auth.uid()), '{}') $$;
create or replace function im_can_see(o uuid, t text) returns boolean language sql stable as $$
  select im_role(o) in ('owner','coach','viewer') or (im_role(o) = 'scoped' and (t is null or t = any(im_teams(o)))) $$;
create or replace function im_can_write(o uuid, t text) returns boolean language sql stable as $$
  select im_role(o) in ('owner','coach') or (im_role(o) = 'scoped' and t is not null and t = any(im_teams(o))) $$;

-- ---------- row-level security ----------
alter table orgs          enable row level security;
alter table members       enable row level security;
alter table join_requests enable row level security;
alter table records       enable row level security;
alter table portal        enable row level security;

create policy orgs_read   on orgs for select using (im_role(id) is not null);
create policy orgs_insert on orgs for insert with check (owner_id = auth.uid());
create policy orgs_update on orgs for update using (owner_id = auth.uid());

create policy members_read  on members for select using (im_role(org_id) is not null);
create policy members_write on members for all    using (im_role(org_id) = 'owner') with check (im_role(org_id) = 'owner');

create policy req_self  on join_requests for insert with check (user_id = auth.uid());
-- a person who knows the organisation code (its id) may read its name only, to confirm the request
create or replace function im_org_name(o uuid) returns text language sql stable security definer set search_path = public as $$ select name from orgs where id = o $$;
create policy req_read  on join_requests for select using (user_id = auth.uid() or im_role(org_id) = 'owner');
create policy req_owner on join_requests for delete using (im_role(org_id) = 'owner');

-- settings / meta documents are owner-only to change
create policy rec_read   on records for select using (im_can_see(org_id, team_id));
create policy rec_insert on records for insert with check (im_can_write(org_id, team_id) and (col <> 'meta' or im_role(org_id) = 'owner'));
create policy rec_update on records for update using (im_can_write(org_id, team_id) and (col <> 'meta' or im_role(org_id) = 'owner'));
create policy rec_delete on records for delete using (im_can_write(org_id, team_id) and (col <> 'meta' or im_role(org_id) = 'owner'));

create policy portal_parent on portal for select using (user_id = auth.uid() or im_role(org_id) = 'owner');
create policy portal_owner  on portal for all    using (im_role(org_id) = 'owner') with check (im_role(org_id) = 'owner');

-- ---------- keep updated_at / updated_by honest ----------
create or replace function im_touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); new.updated_by := auth.uid(); return new; end $$;
drop trigger if exists records_touch on records;
create trigger records_touch before insert or update on records for each row execute function im_touch();

-- ---------- live updates for open devices ----------
alter publication supabase_realtime add table records;
