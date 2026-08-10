-- RHCT-DATA-002 — RHC Training Database V2 baseline
-- FINAL CANDIDATE. Intentionally stored outside supabase/migrations.
-- DO NOT APPLY TO THE LEGACY/PRODUCTION PROJECT.

begin;

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
grant usage on schema private to authenticated;

-- Identity
create table public.app_users (
  user_id uuid primary key references auth.users(id),
  role text not null check (role in ('user','admin')) default 'user',
  status text not null check (status in ('active','disabled')) default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  birth_date date,
  gender text check (gender is null or gender in ('homem','mulher','outro')),
  goal text check (goal is null or char_length(goal) <= 200),
  avatar_path text check (avatar_path is null or char_length(avatar_path) <= 700),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profile_access (
  user_id uuid primary key references public.app_users(user_id),
  profile_id uuid not null unique references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Exercise taxonomy/catalog
create table public.muscle_groups (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_\-]{2,80}$'),
  name text not null unique check (char_length(name) between 2 and 80),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.movement_patterns (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_\-]{2,80}$'),
  name text not null unique check (char_length(name) between 2 and 80),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.exercise_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_\-]{2,80}$'),
  name text not null unique check (char_length(name) between 2 and 80),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.exercise_catalog (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_\-]{2,120}$'),
  name text not null check (char_length(name) between 2 and 120),
  primary_muscle_group_id uuid references public.muscle_groups(id),
  movement_pattern_id uuid references public.movement_patterns(id),
  exercise_category_id uuid references public.exercise_categories(id),
  execution_video_url text check (execution_video_url is null or char_length(execution_video_url) <= 1000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Plans
create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id),
  workout_code text not null check (workout_code in ('A','B','C','D','E','F')),
  title text not null check (char_length(title) between 1 and 120),
  description text check (description is null or char_length(description) <= 1000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index workout_plans_one_active_per_code on public.workout_plans(profile_id, workout_code) where is_active;

create table public.workout_plan_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_plan_id uuid not null references public.workout_plans(id) on delete cascade,
  exercise_id uuid not null references public.exercise_catalog(id),
  sort_order integer not null check (sort_order >= 0),
  prescribed_sets integer check (prescribed_sets is null or prescribed_sets between 1 and 20),
  prescribed_reps text check (prescribed_reps is null or char_length(prescribed_reps) <= 60),
  rest_seconds integer check (rest_seconds is null or rest_seconds between 0 and 3600),
  goal text check (goal is null or char_length(goal) <= 300),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(workout_plan_id, sort_order)
);

create table public.workout_plan_exercise_alternatives (
  workout_plan_exercise_id uuid not null references public.workout_plan_exercises(id) on delete cascade,
  alternative_exercise_id uuid not null references public.exercise_catalog(id),
  sort_order integer not null check (sort_order >= 0),
  primary key(workout_plan_exercise_id, alternative_exercise_id),
  unique(workout_plan_exercise_id, sort_order)
);

-- Workout history
create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id),
  workout_code text not null check (workout_code in ('A','B','C','D','E','F')),
  workout_date date not null default current_date,
  gym_name text check (gym_name is null or char_length(gym_name) <= 120),
  duration_minutes integer not null default 0 check (duration_minutes between 0 and 1440),
  completion_percentage numeric(5,2) not null default 0 check (completion_percentage between 0 and 100),
  total_volume numeric(14,3) not null default 0 check (total_volume >= 0),
  notes text check (notes is null or char_length(notes) <= 2000),
  distance_meters integer check (distance_meters is null or distance_meters >= 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  average_pace_seconds_per_km integer check (average_pace_seconds_per_km is null or average_pace_seconds_per_km > 0),
  activity_mode text check (activity_mode is null or activity_mode in ('manual','stopwatch','gps')),
  client_operation_id uuid unique,
  started_at timestamptz,
  completed_at timestamptz,
  archived_at timestamptz,
  source_system text check (source_system is null or source_system in ('legacy_v1','v2')),
  source_legacy_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, profile_id)
);
create unique index workout_sessions_legacy_source_unique on public.workout_sessions(source_system, source_legacy_id) where source_system is not null and source_legacy_id is not null;
create index workout_sessions_profile_date_idx on public.workout_sessions(profile_id, workout_date desc);

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id uuid not null references public.exercise_catalog(id),
  sort_order integer not null check (sort_order >= 0),
  exercise_name_snapshot text not null check (char_length(exercise_name_snapshot) between 1 and 120),
  muscle_group_snapshot text,
  movement_pattern_snapshot text,
  prescribed_sets integer check (prescribed_sets is null or prescribed_sets between 0 and 20),
  prescribed_reps text check (prescribed_reps is null or char_length(prescribed_reps) <= 60),
  actual_reps text check (actual_reps is null or char_length(actual_reps) <= 60),
  weight numeric(10,3) not null default 0 check (weight >= 0),
  completed boolean not null default false,
  notes text check (notes is null or char_length(notes) <= 1000),
  source_legacy_id uuid,
  created_at timestamptz not null default now(),
  unique(session_id, sort_order)
);
create unique index workout_exercises_legacy_source_unique on public.workout_exercises(source_legacy_id) where source_legacy_id is not null;

create table public.exercise_records (
  profile_id uuid not null references public.profiles(id),
  exercise_id uuid not null references public.exercise_catalog(id),
  last_weight numeric(10,3) not null default 0 check (last_weight >= 0),
  best_weight numeric(10,3) not null default 0 check (best_weight >= 0),
  last_date date,
  updated_at timestamptz not null default now(),
  primary key(profile_id, exercise_id)
);

create table public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id),
  measured_on date not null default current_date,
  weight numeric(8,3) check (weight is null or weight >= 0),
  waist numeric(8,3) check (waist is null or waist >= 0),
  chest numeric(8,3) check (chest is null or chest >= 0),
  arm numeric(8,3) check (arm is null or arm >= 0),
  thigh numeric(8,3) check (thigh is null or thigh >= 0),
  hip numeric(8,3) check (hip is null or hip >= 0),
  notes text check (notes is null or char_length(notes) <= 1000),
  archived_at timestamptz,
  source_legacy_id uuid unique,
  created_at timestamptz not null default now()
);

create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id),
  photo_date date not null default current_date,
  photo_type text not null check (photo_type in ('frente','lado','costas')),
  object_path text not null unique check (char_length(object_path) <= 700),
  byte_size bigint check (byte_size is null or byte_size >= 0),
  sha256 text check (sha256 is null or sha256 ~ '^[a-f0-9]{64}$'),
  notes text check (notes is null or char_length(notes) <= 1000),
  archived_at timestamptz,
  source_legacy_id uuid unique,
  created_at timestamptz not null default now()
);

-- Programs
create table public.training_programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9\-]{3,80}$'),
  name text not null check (char_length(name) between 3 and 120),
  objective text not null,
  duration_weeks integer not null check (duration_weeks between 1 and 104),
  description text,
  status text not null default 'draft' check (status in ('draft','published','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.program_phases (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.training_programs(id) on delete cascade,
  name text not null,
  week_start integer not null check (week_start > 0),
  week_end integer not null check (week_end >= week_start),
  reps_min integer,
  reps_max integer,
  target_rpe_min numeric(3,1),
  target_rpe_max numeric(3,1),
  volume_modifier numeric(5,2) not null default 1,
  load_modifier numeric(5,2) not null default 1,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.program_sessions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.training_programs(id) on delete cascade,
  code text not null,
  name text not null,
  session_type text not null check (session_type in ('strength','running','recovery')),
  day_order integer not null check (day_order between 1 and 14),
  is_optional boolean not null default false,
  prescription jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(program_id, code),
  unique(id, program_id)
);

create table public.program_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.program_sessions(id) on delete cascade,
  exercise_id uuid not null references public.exercise_catalog(id),
  program_id uuid not null references public.training_programs(id),
  exercise_role text not null check (exercise_role in ('principal','secundario','acessorio')),
  sets integer not null check (sets between 1 and 20),
  reps_min integer not null check (reps_min between 1 and 100),
  reps_max integer not null check (reps_max >= reps_min and reps_max <= 100),
  target_rpe_min numeric(3,1),
  target_rpe_max numeric(3,1),
  rest_seconds_min integer,
  rest_seconds_max integer,
  progression_type text not null default 'manual' check (progression_type in ('load','double_progression','manual')),
  default_load_increment numeric(8,3),
  regression_percent numeric(5,2) not null default 7.5,
  failures_before_regression integer not null default 2,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique(session_id, sort_order),
  unique(id, program_id),
  foreign key(session_id,program_id) references public.program_sessions(id,program_id)
);

create table public.program_exercise_substitutions (
  program_exercise_id uuid not null references public.program_exercises(id) on delete cascade,
  alternative_exercise_id uuid not null references public.exercise_catalog(id),
  sort_order integer not null default 0,
  primary key(program_exercise_id, alternative_exercise_id),
  unique(program_exercise_id, sort_order)
);

create table public.program_enrollments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id),
  program_id uuid not null references public.training_programs(id),
  status text not null default 'planned' check (status in ('planned','active','completed','archived')),
  start_date date,
  current_week integer not null default 1 check (current_week between 1 and 104),
  running_baseline jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  archived_at timestamptz,
  source_legacy_id uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id,profile_id),
  unique(id,program_id),
  unique(id,profile_id,program_id)
);
create unique index program_enrollments_one_active_per_profile on public.program_enrollments(profile_id) where status = 'active';

create table public.program_exercise_baselines (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.program_enrollments(id) on delete cascade,
  program_exercise_id uuid not null references public.program_exercises(id),
  program_id uuid not null,
  variation_exercise_id uuid references public.exercise_catalog(id),
  starting_load numeric(10,3) check (starting_load is null or starting_load >= 0),
  load_increment numeric(10,3) check (load_increment is null or load_increment > 0),
  established_at timestamptz not null default now(),
  unique(enrollment_id, program_exercise_id),
  foreign key(enrollment_id,program_id) references public.program_enrollments(id,program_id),
  foreign key(program_exercise_id,program_id) references public.program_exercises(id,program_id)
);

create table public.program_exercise_exposures (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id),
  enrollment_id uuid not null references public.program_enrollments(id),
  program_exercise_id uuid not null references public.program_exercises(id),
  program_id uuid not null,
  workout_session_id uuid references public.workout_sessions(id),
  variation_exercise_id uuid references public.exercise_catalog(id),
  variation_name_snapshot text not null,
  load numeric(10,3) not null default 0 check (load >= 0),
  reps jsonb not null default '[]'::jsonb,
  completed_sets integer not null default 0 check (completed_sets between 0 and 20),
  observed_rpe numeric(3,1) check (observed_rpe is null or observed_rpe between 1 and 10),
  progression_action text not null default 'hold' check (progression_action in ('increase','hold','regress','manual')),
  suggested_load numeric(10,3) check (suggested_load is null or suggested_load >= 0),
  suggestion_reason text,
  accepted_action boolean,
  source_legacy_id uuid unique,
  created_at timestamptz not null default now(),
  foreign key(enrollment_id,profile_id,program_id) references public.program_enrollments(id,profile_id,program_id),
  foreign key(program_exercise_id,program_id) references public.program_exercises(id,program_id),
  foreign key(workout_session_id,profile_id) references public.workout_sessions(id,profile_id)
);

-- State/autosave/audit
create table public.profile_training_state (
  profile_id uuid primary key references public.profiles(id),
  current_workout_code text check (current_workout_code is null or current_workout_code in ('A','B','C','D','E','F')),
  next_workout_code text check (next_workout_code is null or next_workout_code in ('A','B','C','D','E','F')),
  active_program_enrollment_id uuid references public.program_enrollments(id),
  last_completed_session_id uuid references public.workout_sessions(id),
  version bigint not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  foreign key(active_program_enrollment_id,profile_id) references public.program_enrollments(id,profile_id),
  foreign key(last_completed_session_id,profile_id) references public.workout_sessions(id,profile_id)
);

create table public.workout_drafts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id),
  workout_code text not null check (workout_code in ('A','B','C','D','E','F')),
  program_enrollment_id uuid references public.program_enrollments(id),
  plan_fingerprint text,
  payload jsonb not null default '{}'::jsonb check (pg_column_size(payload) <= 262144),
  version bigint not null default 1 check (version > 0),
  client_operation_id uuid not null unique,
  consumed_session_id uuid references public.workout_sessions(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(program_enrollment_id,profile_id) references public.program_enrollments(id,profile_id),
  foreign key(consumed_session_id,profile_id) references public.workout_sessions(id,profile_id)
);
create unique index workout_drafts_one_open_context on public.workout_drafts(profile_id, workout_code) where consumed_session_id is null;

create table public.event_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (char_length(event_type) between 2 and 120),
  actor_user_id uuid references auth.users(id),
  target_profile_id uuid references public.profiles(id),
  target_entity_type text,
  target_entity_id uuid,
  request_id uuid,
  metadata jsonb not null default '{}'::jsonb check (pg_column_size(metadata) <= 16384),
  created_at timestamptz not null default now()
);

-- Authorization helpers
create or replace function private.is_active_app_user() returns boolean language sql stable security definer set search_path = pg_catalog, public, private as $$
  select exists (select 1 from public.app_users au where au.user_id = auth.uid() and au.status = 'active');
$$;
create or replace function private.is_admin() returns boolean language sql stable security definer set search_path = pg_catalog, public, private as $$
  select exists (select 1 from public.app_users au where au.user_id = auth.uid() and au.status = 'active' and au.role = 'admin');
$$;
create or replace function private.can_access_profile(target_profile_id uuid) returns boolean language sql stable security definer set search_path = pg_catalog, public, private as $$
  select private.is_active_app_user()
    and exists (select 1 from public.profiles p where p.id = target_profile_id and p.is_active)
    and (private.is_admin() or exists (select 1 from public.profile_access pa where pa.user_id = auth.uid() and pa.profile_id = target_profile_id));
$$;
create or replace function private.can_admin_access_profile(target_profile_id uuid) returns boolean language sql stable security definer set search_path = pg_catalog, public, private as $$
  select private.is_admin() and exists (select 1 from public.profiles p where p.id = target_profile_id);
$$;
revoke execute on all functions in schema private from public, anon;
grant execute on function private.is_active_app_user() to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.can_access_profile(uuid) to authenticated;
grant execute on function private.can_admin_access_profile(uuid) to authenticated;

-- Admin lifecycle
create or replace function private.protect_last_active_admin() returns trigger language plpgsql security definer set search_path = pg_catalog, public, private as $$
declare remaining_admins bigint;
begin
  if (tg_op='DELETE' and old.role='admin' and old.status='active') or (tg_op='UPDATE' and old.role='admin' and old.status='active' and (new.role<>'admin' or new.status<>'active')) then
    select count(*) into remaining_admins from public.app_users where role='admin' and status='active' and user_id<>old.user_id;
    if remaining_admins=0 then raise exception 'cannot remove, demote or disable the last active admin' using errcode='23514'; end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end; $$;
revoke execute on function private.protect_last_active_admin() from public, anon, authenticated;
create trigger app_users_protect_last_admin before update of role,status or delete on public.app_users for each row execute function private.protect_last_active_admin();

create or replace function private.bootstrap_first_admin(target_user_id uuid) returns void language plpgsql security definer set search_path = pg_catalog, public, private as $$
begin
  if exists(select 1 from public.app_users where role='admin' and status='active') then raise exception 'an active admin already exists'; end if;
  if not exists(select 1 from auth.users where id=target_user_id) then raise exception 'auth user does not exist'; end if;
  insert into public.app_users(user_id,role,status) values(target_user_id,'admin','active') on conflict(user_id) do update set role='admin',status='active',updated_at=now();
end; $$;
revoke execute on function private.bootstrap_first_admin(uuid) from public, anon, authenticated;
grant execute on function private.bootstrap_first_admin(uuid) to service_role;

create or replace function public.admin_set_user_role(target_user_id uuid,target_role text,target_status text default 'active') returns void language plpgsql security definer set search_path=pg_catalog,public,private as $$
begin
  if not private.is_admin() then raise exception 'admin required' using errcode='42501'; end if;
  if target_role not in ('user','admin') or target_status not in ('active','disabled') then raise exception 'invalid role/status'; end if;
  if not exists(select 1 from auth.users where id=target_user_id) then raise exception 'auth user does not exist'; end if;
  insert into public.app_users(user_id,role,status) values(target_user_id,target_role,target_status) on conflict(user_id) do update set role=excluded.role,status=excluded.status,updated_at=now();
  if target_role='admin' then delete from public.profile_access where user_id=target_user_id; end if;
end; $$;
create or replace function public.admin_assign_profile_access(target_user_id uuid,target_profile_id uuid) returns void language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare r text; s text;
begin
  if not private.is_admin() then raise exception 'admin required' using errcode='42501'; end if;
  select role,status into r,s from public.app_users where user_id=target_user_id;
  if r is null then raise exception 'app user does not exist'; end if;
  if r<>'user' or s<>'active' then raise exception 'mapping requires an active normal user'; end if;
  if not exists(select 1 from public.profiles where id=target_profile_id and is_active) then raise exception 'active profile does not exist'; end if;
  if exists(select 1 from public.profile_access where user_id=target_user_id) then raise exception 'user already mapped'; end if;
  if exists(select 1 from public.profile_access where profile_id=target_profile_id) then raise exception 'profile already mapped'; end if;
  insert into public.profile_access(user_id,profile_id) values(target_user_id,target_profile_id);
end; $$;
create or replace function public.admin_revoke_profile_access(target_user_id uuid) returns void language plpgsql security definer set search_path=pg_catalog,public,private as $$
begin
  if not private.is_admin() then raise exception 'admin required' using errcode='42501'; end if;
  delete from public.profile_access where user_id=target_user_id;
end; $$;
revoke all on function public.admin_set_user_role(uuid,text,text) from public,anon;
revoke all on function public.admin_assign_profile_access(uuid,uuid) from public,anon;
revoke all on function public.admin_revoke_profile_access(uuid) from public,anon;
grant execute on function public.admin_set_user_role(uuid,text,text) to authenticated;
grant execute on function public.admin_assign_profile_access(uuid,uuid) to authenticated;
grant execute on function public.admin_revoke_profile_access(uuid) to authenticated;

-- RLS enablement
alter table public.app_users enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_access enable row level security;
alter table public.muscle_groups enable row level security;
alter table public.movement_patterns enable row level security;
alter table public.exercise_categories enable row level security;
alter table public.exercise_catalog enable row level security;
alter table public.workout_plans enable row level security;
alter table public.workout_plan_exercises enable row level security;
alter table public.workout_plan_exercise_alternatives enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.exercise_records enable row level security;
alter table public.body_measurements enable row level security;
alter table public.progress_photos enable row level security;
alter table public.training_programs enable row level security;
alter table public.program_phases enable row level security;
alter table public.program_sessions enable row level security;
alter table public.program_exercises enable row level security;
alter table public.program_exercise_substitutions enable row level security;
alter table public.program_enrollments enable row level security;
alter table public.program_exercise_baselines enable row level security;
alter table public.program_exercise_exposures enable row level security;
alter table public.profile_training_state enable row level security;
alter table public.workout_drafts enable row level security;
alter table public.event_logs enable row level security;

-- RLS policies
create policy app_users_read_self on public.app_users for select to authenticated using (user_id = auth.uid() and private.is_active_app_user());
create policy profiles_select on public.profiles for select to authenticated using (private.can_access_profile(id) or private.can_admin_access_profile(id));
create policy profiles_update_active on public.profiles for update to authenticated using (private.can_access_profile(id)) with check (private.can_access_profile(id));
create policy muscle_groups_read on public.muscle_groups for select to authenticated using (private.is_active_app_user());
create policy movement_patterns_read on public.movement_patterns for select to authenticated using (private.is_active_app_user());
create policy exercise_categories_read on public.exercise_categories for select to authenticated using (private.is_active_app_user());
create policy exercise_catalog_read on public.exercise_catalog for select to authenticated using (private.is_active_app_user());
create policy workout_plans_read on public.workout_plans for select to authenticated using (private.can_access_profile(profile_id));
create policy workout_plans_write on public.workout_plans for all to authenticated using (private.can_access_profile(profile_id)) with check (private.can_access_profile(profile_id));
create policy workout_sessions_read on public.workout_sessions for select to authenticated using (private.can_access_profile(profile_id));
create policy workout_sessions_insert on public.workout_sessions for insert to authenticated with check (private.can_access_profile(profile_id));
create policy exercise_records_read on public.exercise_records for select to authenticated using (private.can_access_profile(profile_id));
create policy exercise_records_write on public.exercise_records for all to authenticated using (private.can_access_profile(profile_id)) with check (private.can_access_profile(profile_id));
create policy body_measurements_read on public.body_measurements for select to authenticated using (private.can_access_profile(profile_id));
create policy body_measurements_write on public.body_measurements for all to authenticated using (private.can_access_profile(profile_id)) with check (private.can_access_profile(profile_id));
create policy progress_photos_read on public.progress_photos for select to authenticated using (private.can_access_profile(profile_id));
create policy progress_photos_write on public.progress_photos for all to authenticated using (private.can_access_profile(profile_id)) with check (private.can_access_profile(profile_id));
create policy program_enrollments_read on public.program_enrollments for select to authenticated using (private.can_access_profile(profile_id));
create policy program_enrollments_write on public.program_enrollments for all to authenticated using (private.can_access_profile(profile_id)) with check (private.can_access_profile(profile_id));
create policy program_exposures_read on public.program_exercise_exposures for select to authenticated using (private.can_access_profile(profile_id));
create policy program_exposures_insert on public.program_exercise_exposures for insert to authenticated with check (private.can_access_profile(profile_id));
create policy training_state_read on public.profile_training_state for select to authenticated using (private.can_access_profile(profile_id));
create policy training_state_write on public.profile_training_state for all to authenticated using (private.can_access_profile(profile_id)) with check (private.can_access_profile(profile_id));
create policy drafts_read on public.workout_drafts for select to authenticated using (private.can_access_profile(profile_id));
create policy drafts_write on public.workout_drafts for all to authenticated using (private.can_access_profile(profile_id)) with check (private.can_access_profile(profile_id));
create policy workout_plan_exercises_read on public.workout_plan_exercises for select to authenticated using (exists (select 1 from public.workout_plans p where p.id=workout_plan_id and private.can_access_profile(p.profile_id)));
create policy workout_plan_exercises_write on public.workout_plan_exercises for all to authenticated using (exists (select 1 from public.workout_plans p where p.id=workout_plan_id and private.can_access_profile(p.profile_id))) with check (exists (select 1 from public.workout_plans p where p.id=workout_plan_id and private.can_access_profile(p.profile_id)));
create policy plan_alternatives_read on public.workout_plan_exercise_alternatives for select to authenticated using (exists (select 1 from public.workout_plan_exercises pe join public.workout_plans p on p.id=pe.workout_plan_id where pe.id=workout_plan_exercise_id and private.can_access_profile(p.profile_id)));
create policy plan_alternatives_write on public.workout_plan_exercise_alternatives for all to authenticated using (exists (select 1 from public.workout_plan_exercises pe join public.workout_plans p on p.id=pe.workout_plan_id where pe.id=workout_plan_exercise_id and private.can_access_profile(p.profile_id))) with check (exists (select 1 from public.workout_plan_exercises pe join public.workout_plans p on p.id=pe.workout_plan_id where pe.id=workout_plan_exercise_id and private.can_access_profile(p.profile_id)));
create policy workout_exercises_read on public.workout_exercises for select to authenticated using (exists (select 1 from public.workout_sessions s where s.id=session_id and private.can_access_profile(s.profile_id)));
create policy workout_exercises_insert on public.workout_exercises for insert to authenticated with check (exists (select 1 from public.workout_sessions s where s.id=session_id and private.can_access_profile(s.profile_id)));
create policy training_programs_read on public.training_programs for select to authenticated using (private.is_active_app_user() and status='published');
create policy program_phases_read on public.program_phases for select to authenticated using (private.is_active_app_user() and exists(select 1 from public.training_programs p where p.id=program_id and p.status='published'));
create policy program_sessions_read on public.program_sessions for select to authenticated using (private.is_active_app_user() and exists(select 1 from public.training_programs p where p.id=program_id and p.status='published'));
create policy program_exercises_read on public.program_exercises for select to authenticated using (private.is_active_app_user() and exists(select 1 from public.program_sessions s join public.training_programs p on p.id=s.program_id where s.id=session_id and p.status='published'));
create policy program_substitutions_read on public.program_exercise_substitutions for select to authenticated using (private.is_active_app_user() and exists(select 1 from public.program_exercises pe join public.program_sessions s on s.id=pe.session_id join public.training_programs p on p.id=s.program_id where pe.id=program_exercise_id and p.status='published'));
create policy program_baselines_read on public.program_exercise_baselines for select to authenticated using (exists(select 1 from public.program_enrollments e where e.id=enrollment_id and private.can_access_profile(e.profile_id)));
create policy program_baselines_write on public.program_exercise_baselines for all to authenticated using (exists(select 1 from public.program_enrollments e where e.id=enrollment_id and private.can_access_profile(e.profile_id))) with check (exists(select 1 from public.program_enrollments e where e.id=enrollment_id and private.can_access_profile(e.profile_id)));

-- Storage
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('progress-photos','progress-photos',false,6291456,array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create or replace function private.storage_profile_id(object_name text) returns uuid language plpgsql immutable security definer set search_path=pg_catalog,storage,private as $$
declare parts text[];
begin
  parts:=storage.foldername(object_name);
  if coalesce(array_length(parts,1),0)<2 or parts[1]<>'profiles' then return null; end if;
  begin return parts[2]::uuid; exception when invalid_text_representation then return null; end;
end; $$;
revoke execute on function private.storage_profile_id(text) from public,anon;
grant execute on function private.storage_profile_id(text) to authenticated;
create policy v2_progress_photos_select on storage.objects for select to authenticated using(bucket_id='progress-photos' and private.can_access_profile(private.storage_profile_id(name)));
create policy v2_progress_photos_insert on storage.objects for insert to authenticated with check(bucket_id='progress-photos' and private.can_access_profile(private.storage_profile_id(name)));
create policy v2_progress_photos_update on storage.objects for update to authenticated using(bucket_id='progress-photos' and private.can_access_profile(private.storage_profile_id(name))) with check(bucket_id='progress-photos' and private.can_access_profile(private.storage_profile_id(name)));
create policy v2_progress_photos_delete on storage.objects for delete to authenticated using(bucket_id='progress-photos' and private.can_access_profile(private.storage_profile_id(name)));

-- Least-privilege grants
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant select on public.app_users to authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.muscle_groups, public.movement_patterns, public.exercise_categories, public.exercise_catalog, public.training_programs, public.program_phases, public.program_sessions, public.program_exercises, public.program_exercise_substitutions to authenticated;
grant select, insert, update, delete on public.workout_plans, public.workout_plan_exercises, public.workout_plan_exercise_alternatives, public.exercise_records, public.body_measurements, public.progress_photos, public.program_enrollments, public.program_exercise_baselines, public.profile_training_state, public.workout_drafts to authenticated;
grant select, insert on public.workout_sessions, public.workout_exercises, public.program_exercise_exposures to authenticated;

commit;
