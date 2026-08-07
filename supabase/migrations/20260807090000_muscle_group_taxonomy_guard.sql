-- RHCT-DATA-001 — prevent new muscle_group taxonomy contamination.
-- Historical workout rows are intentionally left untouched.

alter table public.workout_exercises
  add column if not exists movement_pattern text null;

alter table public.program_exercises
  add column if not exists primary_muscle_group text null;

alter table public.program_exercises
  drop constraint if exists program_exercises_primary_muscle_group_check;

alter table public.program_exercises
  add constraint program_exercises_primary_muscle_group_check
  check (
    primary_muscle_group is null or primary_muscle_group in (
      'Peito','Costas','Ombros','Bíceps','Tríceps','Quadríceps',
      'Posteriores','Glúteos','Panturrilhas','Core','Tibial','Adutores','Abdutores'
    )
  );

-- This updates program configuration only. It does NOT update workout history.
-- Movement patterns remain unchanged and continue to drive substitutions/progression.
with taxonomy(exercise_name, primary_muscle_group) as (
  values
    ('Supino Máquina Hammer','Peito'),
    ('Desenvolvimento máquina','Ombros'),
    ('Supino inclinado máquina','Peito'),
    ('Elevação lateral','Ombros'),
    ('Tríceps corda','Tríceps'),
    ('Remada Hammer','Costas'),
    ('Puxada frente','Costas'),
    ('Pullover','Costas'),
    ('Rosca máquina','Bíceps'),
    ('Face Pull','Ombros'),
    ('Hack Machine','Quadríceps'),
    ('Leg Press','Quadríceps'),
    ('Extensora','Quadríceps'),
    ('Panturrilha','Panturrilhas'),
    ('Abdômen','Core'),
    ('Hip Thrust','Glúteos'),
    ('Flexora','Posteriores'),
    ('Afundo Smith','Quadríceps'),
    ('Abdução','Abdutores'),
    ('Pallof Press','Core'),
    ('Barra fixa pronada','Costas'),
    ('Remada articulada','Costas'),
    ('Elevação lateral na máquina','Ombros'),
    ('Reverse Fly máquina','Ombros'),
    ('Rosca Scott máquina','Bíceps'),
    ('Tríceps máquina','Tríceps'),
    ('Panturrilha sentado','Panturrilhas'),
    ('Abdominal máquina','Core'),
    ('Prancha','Core')
)
update public.program_exercises pe
set primary_muscle_group = taxonomy.primary_muscle_group
from taxonomy
join public.program_sessions ps on true
join public.training_programs tp on true
where pe.session_id = ps.id
  and ps.program_id = tp.id
  and tp.slug = 'rhc-strength-12w'
  and pe.exercise_name = taxonomy.exercise_name;

-- Recreate the atomic save RPC so new payloads can persist movement_pattern.
-- Old callers remain compatible because the JSON property is optional.
create or replace function public.save_family_workout_session_atomic(
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
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_session public.workout_sessions;
  v_exercise jsonb;
  v_weight numeric;
  v_name text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not public.can_edit_profile(p_profile_id) then
    raise exception 'profile not found or access denied';
  end if;
  perform public.assert_workout_exercises_limit(p_exercises, 100);

  select p.user_id into v_user_id
  from public.profiles p
  where p.id = p_profile_id;

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
      session_id, exercise_name, muscle_group, movement_pattern,
      sets, reps, actual_reps, weight, completed, notes
    ) values (
      v_session.id,
      v_name,
      nullif(v_exercise->>'muscle_group', ''),
      nullif(v_exercise->>'movement_pattern', ''),
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
          then excluded.last_weight else public.exercise_records.last_weight end,
        best_weight = greatest(public.exercise_records.best_weight, excluded.best_weight),
        last_date = case
          when public.exercise_records.last_date is null
            or excluded.last_date >= public.exercise_records.last_date
          then excluded.last_date else public.exercise_records.last_date end,
        updated_at = excluded.updated_at;
    end if;
  end loop;

  return to_jsonb(v_session);
end;
$$;

revoke all on function public.save_family_workout_session_atomic(
  uuid, text, date, text, integer, numeric, numeric, text, jsonb
) from public;
grant execute on function public.save_family_workout_session_atomic(
  uuid, text, date, text, integer, numeric, numeric, text, jsonb
) to authenticated;
