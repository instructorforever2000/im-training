-- التقييم والحالة البدنية + الوحدة التدريبية والبرنامج اليومي — training schema. Additive only.
create table training.fitness_results (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  player_id uuid not null references training.players(id),
  test_key text not null,
  value numeric not null,
  measured_on date not null default current_date,
  note text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create table training.skill_ratings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  player_id uuid not null references training.players(id),
  skill_id text not null,
  rating smallint not null check (rating between 1 and 5),
  rated_on date not null default current_date,
  note text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create table training.sessions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  team_id uuid references training.teams(id),
  session_on date not null,
  starts_at time,
  title text not null check (length(title) between 2 and 120),
  goal text,
  blocks jsonb not null default '[]'::jsonb,
  status text not null default 'planned' check (status in ('planned','done','cancelled')),
  notes text,
  is_active boolean not null default true,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index on training.fitness_results(player_id);
create index on training.skill_ratings(player_id);
create index on training.sessions(org_id, session_on);
alter table training.fitness_results enable row level security;
alter table training.skill_ratings enable row level security;
alter table training.sessions enable row level security;
create policy fitness_results_read on training.fitness_results for select using (is_owner() or private.training_staff(org_id));
create policy fitness_results_write on training.fitness_results for insert with check (is_owner() or private.training_staff(org_id, array['org_admin','technical_director','coach','fitness_coach']));
create policy fitness_results_update on training.fitness_results for update using (is_owner() or private.training_staff(org_id, array['org_admin','technical_director','coach','fitness_coach'])) with check (is_owner() or private.training_staff(org_id, array['org_admin','technical_director','coach','fitness_coach']));
create policy skill_ratings_read on training.skill_ratings for select using (is_owner() or private.training_staff(org_id));
create policy skill_ratings_write on training.skill_ratings for insert with check (is_owner() or private.training_staff(org_id, array['org_admin','technical_director','coach']));
create policy skill_ratings_update on training.skill_ratings for update using (is_owner() or private.training_staff(org_id, array['org_admin','technical_director','coach'])) with check (is_owner() or private.training_staff(org_id, array['org_admin','technical_director','coach']));
create policy sessions_read on training.sessions for select using (is_owner() or private.training_staff(org_id));
create policy sessions_write on training.sessions for insert with check (is_owner() or private.training_staff(org_id, array['org_admin','technical_director','coach','fitness_coach']));
create policy sessions_update on training.sessions for update using (is_owner() or private.training_staff(org_id, array['org_admin','technical_director','coach','fitness_coach'])) with check (is_owner() or private.training_staff(org_id, array['org_admin','technical_director','coach','fitness_coach']));
grant select, insert, update on training.fitness_results, training.skill_ratings, training.sessions to authenticated;
