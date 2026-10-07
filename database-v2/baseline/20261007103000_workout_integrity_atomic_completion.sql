create or replace function public.save_workout_session_v3(
  p_profile_id uuid,
  p_workout_code text,
  p_workout_date date,
  p_gym_name text,
  p_duration_minutes integer,
  p_completion_percentage numeric,
  p_total_volume numeric,
  p_notes text,
  p_exercises jsonb,
  p_source_draft_id uuid default null,
  p_distance_meters integer default null,
  p_duration_seconds integer default null,
  p_average_pace_seconds_per_km integer default null,
  p_activity_mode text default null,
  p_program_exposures jsonb default '[]'::jsonb
) returns public.workout_sessions
language plpgsql
security invoker
set search_path=pg_catalog,public,private
as $$
declare
  v_session public.workout_sessions;
  v_item jsonb;
  v_exposure jsonb;
  v_exercise_id uuid;
  v_sort integer := 0;
  v_name text;
  v_weight numeric;
  v_completed boolean;
begin
  if p_workout_code not in ('A','B','C','D','E','F') then
    raise exception 'invalid workout code';
  end if;

  if jsonb_typeof(coalesce(p_exercises, '[]'::jsonb)) <> 'array' then
    raise exception 'exercises must be an array';
  end if;

  if jsonb_typeof(coalesce(p_program_exposures, '[]'::jsonb)) <> 'array' then
    raise exception 'program exposures must be an array';
  end if;

  if p_source_draft_id is not null then
    select * into v_session
    from public.workout_sessions
    where client_operation_id=p_source_draft_id
      and profile_id=p_profile_id
    limit 1;
    if found then
      return v_session;
    end if;
  end if;

  insert into public.workout_sessions(
    profile_id,workout_code,workout_date,gym_name,duration_minutes,completion_percentage,
    total_volume,notes,distance_meters,duration_seconds,average_pace_seconds_per_km,
    activity_mode,client_operation_id,completed_at,source_system
  ) values (
    p_profile_id,p_workout_code,p_workout_date,nullif(trim(p_gym_name),''),coalesce(p_duration_minutes,0),
    coalesce(p_completion_percentage,0),coalesce(p_total_volume,0),nullif(trim(p_notes),''),p_distance_meters,
    p_duration_seconds,p_average_pace_seconds_per_km,p_activity_mode,p_source_draft_id,now(),'v2'
  ) returning * into v_session;

  for v_item in select value from jsonb_array_elements(coalesce(p_exercises,'[]'::jsonb)) loop
    v_sort := v_sort + 1;
    v_name := nullif(trim(coalesce(v_item->>'exercise_name',v_item->>'name')),'');
    if v_name is null then
      raise exception 'exercise name missing at position %',v_sort;
    end if;

    select id into v_exercise_id
    from public.exercise_catalog
    where lower(name)=lower(v_name) and is_active
    order by id
    limit 1;

    if v_exercise_id is null then
      raise exception 'exercise not found in catalog: %',v_name;
    end if;

    v_weight := greatest(coalesce((v_item->>'weight')::numeric,0),0);
    v_completed := coalesce((v_item->>'completed')::boolean,false);

    insert into public.workout_exercises(
      session_id,exercise_id,sort_order,exercise_name_snapshot,muscle_group_snapshot,
      prescribed_sets,prescribed_reps,actual_reps,weight,completed,notes
    ) values (
      v_session.id,v_exercise_id,v_sort,v_name,nullif(trim(v_item->>'muscle_group'),''),
      nullif(v_item->>'sets','')::integer,nullif(trim(v_item->>'reps'),''),nullif(trim(v_item->>'actual_reps'),''),
      v_weight,v_completed,nullif(trim(v_item->>'notes'),'')
    );

    if v_completed then
      insert into public.exercise_records(profile_id,exercise_id,last_weight,best_weight,last_date,updated_at)
      values(p_profile_id,v_exercise_id,v_weight,v_weight,p_workout_date,now())
      on conflict(profile_id,exercise_id) do update set
        last_weight=excluded.last_weight,
        best_weight=greatest(public.exercise_records.best_weight,excluded.best_weight),
        last_date=excluded.last_date,
        updated_at=excluded.updated_at;
    end if;
  end loop;

  for v_exposure in select value from jsonb_array_elements(coalesce(p_program_exposures,'[]'::jsonb)) loop
    insert into public.program_exercise_exposures(
      profile_id,enrollment_id,program_exercise_id,program_id,workout_session_id,
      variation_exercise_id,variation_name_snapshot,load,reps,completed_sets,
      observed_rpe,progression_action,suggested_load,suggestion_reason,accepted_action
    ) values (
      p_profile_id,
      (v_exposure->>'enrollment_id')::uuid,
      (v_exposure->>'program_exercise_id')::uuid,
      (v_exposure->>'program_id')::uuid,
      v_session.id,
      nullif(v_exposure->>'variation_exercise_id','')::uuid,
      nullif(trim(v_exposure->>'variation_name_snapshot'),''),
      greatest(coalesce((v_exposure->>'load')::numeric,0),0),
      coalesce(v_exposure->'reps','[]'::jsonb),
      greatest(coalesce((v_exposure->>'completed_sets')::integer,0),0),
      nullif(v_exposure->>'observed_rpe','')::numeric,
      coalesce(nullif(v_exposure->>'progression_action',''),'manual'),
      nullif(v_exposure->>'suggested_load','')::numeric,
      nullif(trim(v_exposure->>'suggestion_reason'),''),
      nullif(v_exposure->>'accepted_action','')::boolean
    );
  end loop;

  if p_source_draft_id is not null then
    update public.workout_drafts
    set consumed_session_id=v_session.id,updated_at=now(),version=version+1
    where id=p_source_draft_id
      and profile_id=p_profile_id
      and consumed_session_id is null;
  end if;

  insert into public.profile_training_state(profile_id,last_completed_session_id,updated_at)
  values(p_profile_id,v_session.id,now())
  on conflict(profile_id) do update set
    last_completed_session_id=excluded.last_completed_session_id,
    updated_at=excluded.updated_at,
    version=public.profile_training_state.version+1;

  return v_session;
end;
$$;

revoke all on function public.save_workout_session_v3(uuid,text,date,text,integer,numeric,numeric,text,jsonb,uuid,integer,integer,integer,text,jsonb) from public,anon;
grant execute on function public.save_workout_session_v3(uuid,text,date,text,integer,numeric,numeric,text,jsonb,uuid,integer,integer,integer,text,jsonb) to authenticated;
