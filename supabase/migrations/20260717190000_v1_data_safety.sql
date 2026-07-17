-- Correcoes nao destrutivas para a versao 1.0.
-- Esta migration nao remove tabelas, perfis, treinos, medidas ou fotos existentes.

-- Mantem o schema versionado compativel com os treinos D/E ja usados em producao.
alter table public.workout_sessions
  drop constraint if exists workout_sessions_workout_type_check;

alter table public.workout_sessions
  add constraint workout_sessions_workout_type_check
  check (workout_type in ('A', 'B', 'C', 'D', 'E')) not valid;

alter table public.workout_sessions
  validate constraint workout_sessions_workout_type_check;

-- Salva sessao, exercicios e recordes em uma unica transacao. Se qualquer etapa
-- falhar, o PostgreSQL desfaz toda a operacao e nao deixa treino parcial.
create or replace function public.save_workout_session_atomic(
  p_profile_id uuid,
  p_workout_type text,
  p_date date,
  p_gym_name text,
  p_duration_minutes integer,
  p_completion_percentage numeric,
  p_total_volume numeric,
  p_notes text,
  p_exercises jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.workout_sessions;
  v_exercise jsonb;
  v_weight numeric;
  v_name text;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = p_profile_id and user_id = v_user_id
  ) then
    raise exception 'profile not found or access denied';
  end if;

  if jsonb_typeof(p_exercises) is distinct from 'array' then
    raise exception 'exercises must be an array';
  end if;

  insert into public.workout_sessions (
    user_id, profile_id, workout_type, date, gym_name, duration_minutes,
    completion_percentage, total_volume, notes
  ) values (
    v_user_id, p_profile_id, p_workout_type, p_date, p_gym_name,
    p_duration_minutes, p_completion_percentage, p_total_volume, p_notes
  )
  returning * into v_session;

  for v_exercise in select value from jsonb_array_elements(p_exercises)
  loop
    v_name := v_exercise->>'exercise_name';
    v_weight := coalesce((v_exercise->>'weight')::numeric, 0);

    insert into public.workout_exercises (
      session_id, exercise_name, muscle_group, sets, reps, actual_reps,
      weight, completed, notes
    ) values (
      v_session.id,
      v_name,
      v_exercise->>'muscle_group',
      coalesce((v_exercise->>'sets')::integer, 0),
      coalesce(v_exercise->>'reps', ''),
      nullif(v_exercise->>'actual_reps', ''),
      v_weight,
      coalesce((v_exercise->>'completed')::boolean, false),
      nullif(v_exercise->>'notes', '')
    );

    if coalesce((v_exercise->>'completed')::boolean, false) then
      insert into public.exercise_records (
        user_id, profile_id, exercise_name, last_weight, best_weight,
        last_date, updated_at
      ) values (
        v_user_id, p_profile_id, v_name, v_weight, v_weight, p_date, now()
      )
      on conflict (user_id, profile_id, exercise_name) do update set
        last_weight = case
          when public.exercise_records.last_date is null
            or excluded.last_date >= public.exercise_records.last_date
          then excluded.last_weight
          else public.exercise_records.last_weight
        end,
        best_weight = greatest(public.exercise_records.best_weight, excluded.best_weight),
        last_date = case
          when public.exercise_records.last_date is null
            or excluded.last_date >= public.exercise_records.last_date
          then excluded.last_date
          else public.exercise_records.last_date
        end,
        updated_at = excluded.updated_at;
    end if;
  end loop;

  return to_jsonb(v_session);
end;
$$;

revoke all on function public.save_workout_session_atomic(
  uuid, text, date, text, integer, numeric, numeric, text, jsonb
) from public;

grant execute on function public.save_workout_session_atomic(
  uuid, text, date, text, integer, numeric, numeric, text, jsonb
) to authenticated;

-- Identificadores opcionais de origem tornam a restauracao repetivel sem
-- duplicar o mesmo backup. Colunas nulas nao alteram os registros atuais.
alter table public.workout_sessions
  add column if not exists source_session_id uuid;

alter table public.body_measurements
  add column if not exists source_measurement_id uuid;

create unique index if not exists uq_sessions_profile_source
  on public.workout_sessions(profile_id, source_session_id)
  where source_session_id is not null;

create unique index if not exists uq_measurements_profile_source
  on public.body_measurements(profile_id, source_measurement_id)
  where source_measurement_id is not null;

create or replace function public.import_profile_backup_atomic(
  p_profile_id uuid,
  p_backup jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_exercise jsonb;
  v_session_id uuid;
  v_source_id uuid;
  v_weight numeric;
  v_name text;
  v_sessions integer := 0;
  v_measurements integer := 0;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = p_profile_id and user_id = v_user_id
  ) then
    raise exception 'profile not found or access denied';
  end if;

  if coalesce((p_backup->>'version')::integer, 0) not in (1, 2) then
    raise exception 'unsupported backup version';
  end if;

  for v_item in
    select value from jsonb_array_elements(coalesce(p_backup->'sessions', '[]'::jsonb))
  loop
    v_source_id := (v_item->>'id')::uuid;
    v_session_id := null;

    -- Se o registro original ainda existe neste perfil, restaurar o proprio
    -- backup nao cria uma copia dele.
    if exists (
      select 1 from public.workout_sessions
      where id = v_source_id
        and profile_id = p_profile_id
        and user_id = v_user_id
    ) then
      continue;
    end if;

    insert into public.workout_sessions (
      user_id, profile_id, workout_type, date, gym_name, duration_minutes,
      completion_percentage, total_volume, notes, source_session_id
    ) values (
      v_user_id,
      p_profile_id,
      v_item->>'workout_type',
      (v_item->>'date')::date,
      v_item->>'gym_name',
      coalesce((v_item->>'duration_minutes')::integer, 0),
      coalesce((v_item->>'completion_percentage')::numeric, 0),
      coalesce((v_item->>'total_volume')::numeric, 0),
      nullif(v_item->>'notes', ''),
      v_source_id
    )
    on conflict (profile_id, source_session_id)
      where source_session_id is not null
      do nothing
    returning id into v_session_id;

    if v_session_id is null then
      continue;
    end if;

    for v_exercise in
      select value from jsonb_array_elements(coalesce(v_item->'workout_exercises', '[]'::jsonb))
    loop
      v_name := v_exercise->>'exercise_name';
      v_weight := coalesce((v_exercise->>'weight')::numeric, 0);

      insert into public.workout_exercises (
        session_id, exercise_name, muscle_group, sets, reps, actual_reps,
        weight, completed, notes
      ) values (
        v_session_id,
        v_name,
        v_exercise->>'muscle_group',
        coalesce((v_exercise->>'sets')::integer, 0),
        coalesce(v_exercise->>'reps', ''),
        nullif(v_exercise->>'actual_reps', ''),
        v_weight,
        coalesce((v_exercise->>'completed')::boolean, false),
        nullif(v_exercise->>'notes', '')
      );

      if coalesce((v_exercise->>'completed')::boolean, false) then
        insert into public.exercise_records (
          user_id, profile_id, exercise_name, last_weight, best_weight,
          last_date, updated_at
        ) values (
          v_user_id, p_profile_id, v_name, v_weight, v_weight,
          (v_item->>'date')::date, now()
        )
        on conflict (user_id, profile_id, exercise_name) do update set
          last_weight = case
            when public.exercise_records.last_date is null
              or excluded.last_date >= public.exercise_records.last_date
            then excluded.last_weight
            else public.exercise_records.last_weight
          end,
          best_weight = greatest(public.exercise_records.best_weight, excluded.best_weight),
          last_date = case
            when public.exercise_records.last_date is null
              or excluded.last_date >= public.exercise_records.last_date
            then excluded.last_date
            else public.exercise_records.last_date
          end,
          updated_at = excluded.updated_at;
      end if;
    end loop;

    v_sessions := v_sessions + 1;
  end loop;

  for v_item in
    select value from jsonb_array_elements(coalesce(p_backup->'measurements', '[]'::jsonb))
  loop
    v_source_id := (v_item->>'id')::uuid;

    if exists (
      select 1 from public.body_measurements
      where id = v_source_id
        and profile_id = p_profile_id
        and user_id = v_user_id
    ) then
      continue;
    end if;

    insert into public.body_measurements (
      user_id, profile_id, date, weight, waist, chest, arm, thigh, hip,
      notes, source_measurement_id
    ) values (
      v_user_id,
      p_profile_id,
      (v_item->>'date')::date,
      nullif(v_item->>'weight', '')::numeric,
      nullif(v_item->>'waist', '')::numeric,
      nullif(v_item->>'chest', '')::numeric,
      nullif(v_item->>'arm', '')::numeric,
      nullif(v_item->>'thigh', '')::numeric,
      nullif(v_item->>'hip', '')::numeric,
      nullif(v_item->>'notes', ''),
      v_source_id
    )
    on conflict (profile_id, source_measurement_id)
      where source_measurement_id is not null
      do nothing;

    if found then
      v_measurements := v_measurements + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'sessions', v_sessions,
    'measurements', v_measurements
  );
end;
$$;

revoke all on function public.import_profile_backup_atomic(uuid, jsonb) from public;
grant execute on function public.import_profile_backup_atomic(uuid, jsonb) to authenticated;

-- Tabela usada pela telemetria leve do app. O RLS mantem cada conta isolada.
create table if not exists public.event_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  event_name text not null check (length(event_name) between 1 and 80),
  event_data jsonb not null default '{}'::jsonb,
  page text check (page is null or length(page) <= 300),
  created_at timestamptz not null default now(),
  constraint event_logs_profile_owner_fk
    foreign key (profile_id, user_id)
    references public.profiles(id, user_id)
    on delete cascade
);

create index if not exists idx_event_logs_user_created
  on public.event_logs(user_id, created_at desc);

alter table public.event_logs enable row level security;

drop policy if exists "event_logs_insert_own" on public.event_logs;
create policy "event_logs_insert_own"
on public.event_logs for insert to authenticated
with check (
  auth.uid() = user_id
  and (
    profile_id is null
    or exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.user_id = auth.uid()
    )
  )
);

drop policy if exists "event_logs_select_own" on public.event_logs;
create policy "event_logs_select_own"
on public.event_logs for select to authenticated
using (auth.uid() = user_id);
