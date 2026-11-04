-- البطولات (Tournaments) — training schema of the shared parent project. Additive only.
create table training.tournaments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  name text not null check (length(name) between 2 and 120),
  sport text not null,
  system text not null check (system in ('league','knockout','mixed','ranking')),
  legs smallint not null default 1 check (legs in (1,2)),
  pts_win smallint not null default 3, pts_draw smallint not null default 1, pts_loss smallint not null default 0,
  groups_count smallint not null default 1 check (groups_count between 1 and 8),
  lower_better boolean not null default false,
  unit text,
  starts_on date, notes text,
  is_active boolean not null default true,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create table training.tournament_entries (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references training.tournaments(id),
  org_id uuid not null references public.organizations(id),
  team_id uuid references training.teams(id),
  name text not null check (length(name) between 1 and 80),
  grp smallint not null default 1,
  seed smallint,
  result numeric,
  created_at timestamptz not null default now()
);
create table training.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references training.tournaments(id),
  org_id uuid not null references public.organizations(id),
  stage text not null default 'league' check (stage in ('league','group','ko')),
  grp smallint not null default 1,
  round smallint not null,
  slot smallint not null default 0,
  home_id uuid references training.tournament_entries(id),
  away_id uuid references training.tournament_entries(id),
  home_score smallint check (home_score >= 0),
  away_score smallint check (away_score >= 0),
  home_pen smallint check (home_pen >= 0), away_pen smallint check (away_pen >= 0),
  played_on date,
  created_at timestamptz not null default now()
);
create index on training.tournaments(org_id);
create index on training.tournament_entries(tournament_id);
create index on training.tournament_matches(tournament_id);
alter table training.tournaments enable row level security;
alter table training.tournament_entries enable row level security;
alter table training.tournament_matches enable row level security;
-- same rules as teams/players: owner + the org's training staff read; owner/admin/technical director/coach write; no deletes (archive with is_active)
create policy tournaments_read on training.tournaments for select using (is_owner() or private.training_staff(org_id));
create policy tournaments_write on training.tournaments for insert with check (is_owner() or private.training_staff(org_id, array['org_admin','technical_director','coach']));
create policy tournaments_update on training.tournaments for update using (is_owner() or private.training_staff(org_id, array['org_admin','technical_director','coach'])) with check (is_owner() or private.training_staff(org_id, array['org_admin','technical_director','coach']));
create policy tournament_entries_read on training.tournament_entries for select using (is_owner() or private.training_staff(org_id));
create policy tournament_entries_write on training.tournament_entries for insert with check (is_owner() or private.training_staff(org_id, array['org_admin','technical_director','coach']));
create policy tournament_entries_update on training.tournament_entries for update using (is_owner() or private.training_staff(org_id, array['org_admin','technical_director','coach'])) with check (is_owner() or private.training_staff(org_id, array['org_admin','technical_director','coach']));
create policy tournament_matches_read on training.tournament_matches for select using (is_owner() or private.training_staff(org_id));
create policy tournament_matches_write on training.tournament_matches for insert with check (is_owner() or private.training_staff(org_id, array['org_admin','technical_director','coach']));
create policy tournament_matches_update on training.tournament_matches for update using (is_owner() or private.training_staff(org_id, array['org_admin','technical_director','coach'])) with check (is_owner() or private.training_staff(org_id, array['org_admin','technical_director','coach']));
grant select, insert, update on training.tournaments, training.tournament_entries, training.tournament_matches to authenticated;
