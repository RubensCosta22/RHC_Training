-- PR #38 — Execucao Inteligente.
-- Estritamente aditivo: nao altera sessoes/exercicios historicos existentes.

create table if not exists public.program_exercise_exposures (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  enrollment_id uuid not null references public.profile_program_enrollments(id) on delete cascade,
  program_exercise_id uuid not null references public.program_exercises(id) on delete restrict,
  workout_session_id uuid references public.workout_sessions(id) on delete set null,
  variation_name text not null check (char_length(variation_name) between 2 and 120),
  load numeric(8,2) not null default 0 check (load >= 0),
  reps jsonb not null default '[]'::jsonb,
  completed_sets integer not null default 0 check (completed_sets between 0 and 20),
  observed_rpe numeric(3,1) check (observed_rpe between 1 and 10),
  progression_action text not null default 'hold' check (progression_action in ('increase','hold','regress','manual')),
  suggested_load numeric(8,2) check (suggested_load is null or suggested_load >= 0),
  suggestion_reason text check (suggestion_reason is null or char_length(suggestion_reason) <= 500),
  accepted_action boolean,
  created_at timestamptz not null default now()
);

create index if not exists idx_program_exposures_profile_created
  on public.program_exercise_exposures(profile_id, created_at desc);

create index if not exists idx_program_exposures_exercise_created
  on public.program_exercise_exposures(enrollment_id, program_exercise_id, variation_name, created_at desc);

alter table public.program_exercise_exposures enable row level security;

create policy "program_exposures_select_by_profile"
  on public.program_exercise_exposures for select to authenticated
  using (public.can_view_profile(profile_id));

create policy "program_exposures_insert_editor"
  on public.program_exercise_exposures for insert to authenticated
  with check (
    public.can_edit_profile(profile_id)
    and exists (
      select 1
      from public.profile_program_enrollments e
      where e.id = enrollment_id
        and e.profile_id = profile_id
        and e.status = 'active'
    )
    and exists (
      select 1
      from public.program_exercises pe
      join public.program_sessions ps on ps.id = pe.session_id
      join public.profile_program_enrollments e on e.id = enrollment_id
      where pe.id = program_exercise_id
        and ps.program_id = e.program_id
    )
    and (
      workout_session_id is null
      or exists (
        select 1
        from public.workout_sessions ws
        where ws.id = workout_session_id
          and ws.profile_id = profile_id
      )
    )
  );

-- Nao ha UPDATE ou DELETE direto. Exposicoes sao historico append-only do programa.
