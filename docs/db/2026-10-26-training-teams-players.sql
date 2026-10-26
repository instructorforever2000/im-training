-- APPLIED 2026-10-26 12:18 (owner approved) as migration training_teams_players.
-- Lives in its own schema "training" inside the shared parent project (decision 2026-10-24).
-- Rules: no delete policies (suspend instead) · staff-only access (players/parents can't browse rosters)
--        · the owner sees everything · each row belongs to exactly one organization.
create schema if not exists training;
grant usage on schema training to authenticated;

-- staff of an org on the training platform, by role
create or replace function private.training_staff(p_org uuid, p_roles text[] default null) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships m
    where m.org_id = p_org and m.user_id = (select auth.uid()) and m.platform_id = 'training'
      and m.status = 'approved'
      and m.role::text = any(coalesce(p_roles, array['org_admin','technical_director','coach','fitness_coach','supervisor'])));
$$;
revoke all on function private.training_staff(uuid, text[]) from public;
grant execute on function private.training_staff(uuid, text[]) to authenticated;

create table training.teams (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  name text not null check (length(trim(name)) > 0),
  sport text not null,                       -- id from the app's sport registry (football, basketball…)
  gender text not null default 'm' check (gender in ('m','f','x')),
  age_group text,                            -- U6…U23 / senior
  grade_from smallint, grade_to smallint,    -- schools
  play_format text,                          -- e.g. 11, 7, 5
  color text not null default '#1FB5A8',
  head_coach uuid references auth.users(id),
  is_active boolean not null default true,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table training.players (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  team_id uuid not null references training.teams(id),
  full_name text not null check (length(trim(full_name)) > 0),
  shirt_number smallint check (shirt_number between 0 and 99),
  position text,
  birth_date date,
  strong_foot text check (strong_foot in ('R','L','B')),
  height_cm numeric(5,1), weight_kg numeric(5,1),
  status text not null default 'ready' check (status in ('ready','limited','injured','absent')),
  guardian_consent_on date,
  coach_notes text,
  is_active boolean not null default true,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on training.teams(org_id);
create index on training.players(team_id);
create index on training.players(org_id);

-- a player's org must match its team's org
create or replace function private.player_org_matches() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.org_id <> (select t.org_id from training.teams t where t.id = new.team_id) then
    raise exception 'player and team belong to different organizations' using errcode = '23514';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger players_org_check before insert or update on training.players
  for each row execute function private.player_org_matches();
create trigger teams_touch before update on training.teams
  for each row execute function public.set_updated_at();

alter table training.teams enable row level security;
alter table training.players enable row level security;
grant select, insert, update on training.teams, training.players to authenticated;

create policy teams_read on training.teams for select to authenticated
  using (public.is_owner() or private.training_staff(org_id));
create policy teams_write on training.teams for insert to authenticated
  with check (public.is_owner() or private.training_staff(org_id, array['org_admin','technical_director']));
create policy teams_update on training.teams for update to authenticated
  using (public.is_owner() or private.training_staff(org_id, array['org_admin','technical_director']))
  with check (public.is_owner() or private.training_staff(org_id, array['org_admin','technical_director']));

create policy players_read on training.players for select to authenticated
  using (public.is_owner() or private.training_staff(org_id));
create policy players_write on training.players for insert to authenticated
  with check (public.is_owner() or private.training_staff(org_id, array['org_admin','technical_director','coach']));
create policy players_update on training.players for update to authenticated
  using (public.is_owner() or private.training_staff(org_id, array['org_admin','technical_director','coach','fitness_coach']))
  with check (public.is_owner() or private.training_staff(org_id, array['org_admin','technical_director','coach','fitness_coach']));
