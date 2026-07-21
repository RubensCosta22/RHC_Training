-- PR #33 — Motor de Programas.
-- Estritamente aditivo: nenhuma sessao, exercicio, recorde, medida ou foto existente
-- e movida, regravada, arquivada ou removida por esta migration.

create table if not exists public.training_programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  name text not null check (char_length(name) between 3 and 120),
  objective text not null check (objective in ('forca','hipertrofia','emagrecimento','condicionamento','hibrido','outro')),
  duration_weeks integer not null check (duration_weeks between 1 and 52),
  description text,
  status text not null default 'draft' check (status in ('draft','published','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.program_phases (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.training_programs(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  week_start integer not null check (week_start > 0),
  week_end integer not null check (week_end >= week_start),
  reps_min integer check (reps_min > 0),
  reps_max integer check (reps_max >= reps_min),
  target_rpe_min numeric(3,1) check (target_rpe_min between 1 and 10),
  target_rpe_max numeric(3,1) check (target_rpe_max between 1 and 10),
  volume_modifier numeric(4,2) not null default 1 check (volume_modifier > 0 and volume_modifier <= 2),
  load_modifier numeric(4,2) not null default 1 check (load_modifier > 0 and load_modifier <= 2),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  check (target_rpe_max is null or target_rpe_min is null or target_rpe_max >= target_rpe_min),
  unique(program_id, week_start, week_end)
);

create table if not exists public.program_sessions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.training_programs(id) on delete cascade,
  code text not null check (char_length(code) between 1 and 20),
  name text not null check (char_length(name) between 2 and 120),
  session_type text not null check (session_type in ('strength','running','recovery')),
  day_order integer not null check (day_order between 1 and 14),
  is_optional boolean not null default false,
  prescription jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(program_id, code)
);

create table if not exists public.program_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.program_sessions(id) on delete cascade,
  exercise_name text not null check (char_length(exercise_name) between 2 and 120),
  movement_pattern text not null check (char_length(movement_pattern) between 2 and 80),
  exercise_role text not null check (exercise_role in ('principal','secundario','acessorio')),
  sets integer not null check (sets between 1 and 20),
  reps_min integer not null check (reps_min between 1 and 100),
  reps_max integer not null check (reps_max between reps_min and 100),
  target_rpe_min numeric(3,1) check (target_rpe_min between 1 and 10),
  target_rpe_max numeric(3,1) check (target_rpe_max between 1 and 10),
  rest_seconds_min integer check (rest_seconds_min between 0 and 1800),
  rest_seconds_max integer check (rest_seconds_max between 0 and 1800),
  progression_type text not null default 'manual' check (progression_type in ('load','double_progression','manual')),
  default_load_increment numeric(7,2) check (default_load_increment is null or default_load_increment > 0),
  regression_percent numeric(5,2) not null default 7.5 check (regression_percent between 0 and 30),
  failures_before_regression integer not null default 2 check (failures_before_regression between 1 and 5),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  check (target_rpe_max is null or target_rpe_min is null or target_rpe_max >= target_rpe_min),
  check (rest_seconds_max is null or rest_seconds_min is null or rest_seconds_max >= rest_seconds_min)
);

create table if not exists public.program_exercise_substitutions (
  id uuid primary key default gen_random_uuid(),
  program_exercise_id uuid not null references public.program_exercises(id) on delete cascade,
  exercise_name text not null check (char_length(exercise_name) between 2 and 120),
  movement_pattern text not null check (char_length(movement_pattern) between 2 and 80),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique(program_exercise_id, exercise_name)
);

create table if not exists public.profile_program_enrollments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  program_id uuid not null references public.training_programs(id) on delete restrict,
  status text not null default 'planned' check (status in ('planned','active','completed','archived')),
  start_date date,
  current_week integer not null default 1 check (current_week between 1 and 52),
  completed_at timestamptz,
  archived_at timestamptz,
  running_baseline jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_profile_program_one_active
  on public.profile_program_enrollments(profile_id)
  where status = 'active';

create index if not exists idx_profile_program_enrollments_profile
  on public.profile_program_enrollments(profile_id, created_at desc);

create table if not exists public.profile_program_exercise_baselines (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.profile_program_enrollments(id) on delete cascade,
  program_exercise_id uuid not null references public.program_exercises(id) on delete cascade,
  variation_name text not null check (char_length(variation_name) between 2 and 120),
  starting_load numeric(8,2) check (starting_load is null or starting_load >= 0),
  load_increment numeric(8,2) check (load_increment is null or load_increment > 0),
  established_at timestamptz not null default now(),
  unique(enrollment_id, program_exercise_id, variation_name)
);

-- Arquivo de ciclo e apenas um marcador de historico. As sessoes antigas continuam
-- nas tabelas workout_sessions/workout_exercises, preservando IDs, cargas e estatisticas.
create table if not exists public.profile_training_archives (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  label text not null check (char_length(label) between 2 and 120),
  source text not null default 'legacy' check (source in ('legacy','program')),
  history_through date not null,
  metadata jsonb not null default '{}'::jsonb,
  archived_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete restrict
);

create index if not exists idx_profile_training_archives_profile
  on public.profile_training_archives(profile_id, archived_at desc);

alter table public.training_programs enable row level security;
alter table public.program_phases enable row level security;
alter table public.program_sessions enable row level security;
alter table public.program_exercises enable row level security;
alter table public.program_exercise_substitutions enable row level security;
alter table public.profile_program_enrollments enable row level security;
alter table public.profile_program_exercise_baselines enable row level security;
alter table public.profile_training_archives enable row level security;

-- Templates publicados sao somente leitura pelo cliente. A criacao/edicao dos
-- programas continua sendo feita por migrations/revisao de codigo.
create policy "programs_select_published"
  on public.training_programs for select to authenticated
  using (status = 'published');

create policy "program_phases_select_published"
  on public.program_phases for select to authenticated
  using (exists (select 1 from public.training_programs p where p.id = program_id and p.status = 'published'));

create policy "program_sessions_select_published"
  on public.program_sessions for select to authenticated
  using (exists (select 1 from public.training_programs p where p.id = program_id and p.status = 'published'));

create policy "program_exercises_select_published"
  on public.program_exercises for select to authenticated
  using (exists (
    select 1 from public.program_sessions s
    join public.training_programs p on p.id = s.program_id
    where s.id = session_id and p.status = 'published'
  ));

create policy "program_substitutions_select_published"
  on public.program_exercise_substitutions for select to authenticated
  using (exists (
    select 1 from public.program_exercises e
    join public.program_sessions s on s.id = e.session_id
    join public.training_programs p on p.id = s.program_id
    where e.id = program_exercise_id and p.status = 'published'
  ));

create policy "enrollments_select_by_profile"
  on public.profile_program_enrollments for select to authenticated
  using (public.can_view_profile(profile_id));

create policy "enrollments_insert_manager"
  on public.profile_program_enrollments for insert to authenticated
  with check (public.can_manage_profile(profile_id));

create policy "enrollments_update_manager"
  on public.profile_program_enrollments for update to authenticated
  using (public.can_manage_profile(profile_id))
  with check (public.can_manage_profile(profile_id));

create policy "baselines_select_by_profile"
  on public.profile_program_exercise_baselines for select to authenticated
  using (exists (
    select 1 from public.profile_program_enrollments e
    where e.id = enrollment_id and public.can_view_profile(e.profile_id)
  ));

create policy "baselines_insert_editor"
  on public.profile_program_exercise_baselines for insert to authenticated
  with check (exists (
    select 1 from public.profile_program_enrollments e
    where e.id = enrollment_id and public.can_edit_profile(e.profile_id)
  ));

create policy "baselines_update_editor"
  on public.profile_program_exercise_baselines for update to authenticated
  using (exists (
    select 1 from public.profile_program_enrollments e
    where e.id = enrollment_id and public.can_edit_profile(e.profile_id)
  ))
  with check (exists (
    select 1 from public.profile_program_enrollments e
    where e.id = enrollment_id and public.can_edit_profile(e.profile_id)
  ));

create policy "training_archives_select_by_profile"
  on public.profile_training_archives for select to authenticated
  using (public.can_view_profile(profile_id));

-- Nao ha policy de INSERT direto para arquivos: a RPC abaixo registra autoria
-- e evita que um cliente fabrique arquivos de outros perfis.
create or replace function public.archive_profile_training_history(
  p_profile_id uuid,
  p_label text,
  p_history_through date default current_date,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_label text := trim(p_label);
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not public.can_edit_profile(p_profile_id) then
    raise exception 'profile not found or access denied';
  end if;
  if char_length(v_label) not between 2 and 120 then raise exception 'invalid archive label'; end if;
  if p_history_through > current_date then raise exception 'invalid archive date'; end if;
  if pg_column_size(coalesce(p_metadata, '{}'::jsonb)) > 16384 then raise exception 'archive metadata too large'; end if;

  insert into public.profile_training_archives(profile_id, label, source, history_through, metadata, created_by)
  values (p_profile_id, v_label, 'legacy', p_history_through, coalesce(p_metadata, '{}'::jsonb), auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.archive_profile_training_history(uuid, text, date, jsonb) from public;
grant execute on function public.archive_profile_training_history(uuid, text, date, jsonb) to authenticated;

-- Nao concedemos DELETE em nenhuma tabela nova de historico/enrollment.
-- O ciclo antigo permanece consultavel no perfil e o novo programa usa referencias novas.
