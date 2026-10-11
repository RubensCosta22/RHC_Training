-- V2-only additive cycle evolution. Never deletes/rewrites historic sessions or exposures.
begin;
alter table public.program_exercises add column execution_mode text not null default 'external_load' check(execution_mode in ('external_load','bodyweight','timed'));
alter table public.program_exercises add column is_unilateral boolean not null default false;
alter table public.program_exercises add column execution_notes text;
alter table public.program_exercise_baselines add column source_session_id uuid references public.workout_sessions(id);
alter table public.program_exercise_baselines add column source_workout_date date;
create index program_baselines_source_session_idx on public.program_exercise_baselines(source_session_id);

create table public.exercise_aliases (
 alias_exercise_id uuid primary key references public.exercise_catalog(id),
 canonical_exercise_id uuid not null references public.exercise_catalog(id),
 confirmed_at timestamptz not null default now(),
 check(alias_exercise_id <> canonical_exercise_id)
);
create index exercise_aliases_canonical_idx on public.exercise_aliases(canonical_exercise_id);
alter table public.exercise_aliases enable row level security;
grant select on public.exercise_aliases to authenticated;
create policy exercise_aliases_read on public.exercise_aliases for select to authenticated using ((select private.is_active_app_user()));
-- Alias writes remain limited to migrations; snapshots/IDs and old records are retained.
insert into public.exercise_catalog(code,name) select 'cycle-abdominal-maquina','Abdominal máquina' where not exists(select 1 from public.exercise_catalog where name='Abdominal máquina');
insert into public.exercise_catalog(code,name) select 'cycle-barra-fixa-pronada','Barra fixa pronada' where not exists(select 1 from public.exercise_catalog where name='Barra fixa pronada');
insert into public.exercise_catalog(code,name) select 'cycle-belt-squat','Belt Squat' where not exists(select 1 from public.exercise_catalog where name='Belt Squat');
insert into public.exercise_catalog(code,name) select 'cycle-cadeira-extensora','Cadeira extensora' where not exists(select 1 from public.exercise_catalog where name='Cadeira extensora');
insert into public.exercise_catalog(code,name) select 'cycle-cadeira-extensora-articulada','Cadeira extensora articulada' where not exists(select 1 from public.exercise_catalog where name='Cadeira extensora articulada');
insert into public.exercise_catalog(code,name) select 'cycle-cadeira-flexora','Cadeira flexora' where not exists(select 1 from public.exercise_catalog where name='Cadeira flexora');
insert into public.exercise_catalog(code,name) select 'cycle-chest-press','Chest Press' where not exists(select 1 from public.exercise_catalog where name='Chest Press');
insert into public.exercise_catalog(code,name) select 'cycle-chest-press-inclinado','Chest Press inclinado' where not exists(select 1 from public.exercise_catalog where name='Chest Press inclinado');
insert into public.exercise_catalog(code,name) select 'cycle-crucifixo-inverso-no-cabo','Crucifixo inverso no cabo' where not exists(select 1 from public.exercise_catalog where name='Crucifixo inverso no cabo');
insert into public.exercise_catalog(code,name) select 'cycle-crunch-no-cabo','Crunch no cabo' where not exists(select 1 from public.exercise_catalog where name='Crunch no cabo');
insert into public.exercise_catalog(code,name) select 'cycle-desenvolvimento-articulado','Desenvolvimento articulado' where not exists(select 1 from public.exercise_catalog where name='Desenvolvimento articulado');
insert into public.exercise_catalog(code,name) select 'cycle-desenvolvimento-maquina','Desenvolvimento máquina' where not exists(select 1 from public.exercise_catalog where name='Desenvolvimento máquina');
insert into public.exercise_catalog(code,name) select 'cycle-elevacao-lateral','Elevação lateral' where not exists(select 1 from public.exercise_catalog where name='Elevação lateral');
insert into public.exercise_catalog(code,name) select 'cycle-elevacao-lateral-com-halteres','Elevação lateral com halteres' where not exists(select 1 from public.exercise_catalog where name='Elevação lateral com halteres');
insert into public.exercise_catalog(code,name) select 'cycle-elevacao-lateral-maquina','Elevação lateral máquina' where not exists(select 1 from public.exercise_catalog where name='Elevação lateral máquina');
insert into public.exercise_catalog(code,name) select 'cycle-elevacao-lateral-na-maquina','Elevação lateral na máquina' where not exists(select 1 from public.exercise_catalog where name='Elevação lateral na máquina');
insert into public.exercise_catalog(code,name) select 'cycle-elevacao-lateral-na-polia','Elevação lateral na polia' where not exists(select 1 from public.exercise_catalog where name='Elevação lateral na polia');
insert into public.exercise_catalog(code,name) select 'cycle-extensora','Extensora' where not exists(select 1 from public.exercise_catalog where name='Extensora');
insert into public.exercise_catalog(code,name) select 'cycle-face-pull','Face Pull' where not exists(select 1 from public.exercise_catalog where name='Face Pull');
insert into public.exercise_catalog(code,name) select 'cycle-face-pull-na-corda','Face Pull na corda' where not exists(select 1 from public.exercise_catalog where name='Face Pull na corda');
insert into public.exercise_catalog(code,name) select 'cycle-flexora','Flexora' where not exists(select 1 from public.exercise_catalog where name='Flexora');
insert into public.exercise_catalog(code,name) select 'cycle-flexora-deitada','Flexora deitada' where not exists(select 1 from public.exercise_catalog where name='Flexora deitada');
insert into public.exercise_catalog(code,name) select 'cycle-glute-drive','Glute Drive' where not exists(select 1 from public.exercise_catalog where name='Glute Drive');
insert into public.exercise_catalog(code,name) select 'cycle-hack-machine','Hack machine' where not exists(select 1 from public.exercise_catalog where name='Hack machine');
insert into public.exercise_catalog(code,name) select 'cycle-hip-thrust','Hip Thrust' where not exists(select 1 from public.exercise_catalog where name='Hip Thrust');
insert into public.exercise_catalog(code,name) select 'cycle-leg-press-45','Leg Press 45°' where not exists(select 1 from public.exercise_catalog where name='Leg Press 45°');
insert into public.exercise_catalog(code,name) select 'cycle-leg-press-horizontal','Leg Press horizontal' where not exists(select 1 from public.exercise_catalog where name='Leg Press horizontal');
insert into public.exercise_catalog(code,name) select 'cycle-leg-press-unilateral','Leg Press unilateral' where not exists(select 1 from public.exercise_catalog where name='Leg Press unilateral');
insert into public.exercise_catalog(code,name) select 'cycle-leg-press-vertical','Leg Press vertical' where not exists(select 1 from public.exercise_catalog where name='Leg Press vertical');
insert into public.exercise_catalog(code,name) select 'cycle-leg-press','Leg press' where not exists(select 1 from public.exercise_catalog where name='Leg press');
insert into public.exercise_catalog(code,name) select 'cycle-pallof-press','Pallof Press' where not exists(select 1 from public.exercise_catalog where name='Pallof Press');
insert into public.exercise_catalog(code,name) select 'cycle-panturrilha','Panturrilha' where not exists(select 1 from public.exercise_catalog where name='Panturrilha');
insert into public.exercise_catalog(code,name) select 'cycle-panturrilha-maquina-em-pe','Panturrilha máquina em pé' where not exists(select 1 from public.exercise_catalog where name='Panturrilha máquina em pé');
insert into public.exercise_catalog(code,name) select 'cycle-panturrilha-no-leg-press','Panturrilha no leg press' where not exists(select 1 from public.exercise_catalog where name='Panturrilha no leg press');
insert into public.exercise_catalog(code,name) select 'cycle-panturrilha-sentada','Panturrilha sentada' where not exists(select 1 from public.exercise_catalog where name='Panturrilha sentada');
insert into public.exercise_catalog(code,name) select 'cycle-panturrilha-sentado','Panturrilha sentado' where not exists(select 1 from public.exercise_catalog where name='Panturrilha sentado');
insert into public.exercise_catalog(code,name) select 'cycle-peck-deck-invertido','Peck Deck invertido' where not exists(select 1 from public.exercise_catalog where name='Peck Deck invertido');
insert into public.exercise_catalog(code,name) select 'cycle-peck-deck-inverso','Peck deck inverso' where not exists(select 1 from public.exercise_catalog where name='Peck deck inverso');
insert into public.exercise_catalog(code,name) select 'cycle-pendulum-squat','Pendulum Squat' where not exists(select 1 from public.exercise_catalog where name='Pendulum Squat');
insert into public.exercise_catalog(code,name) select 'cycle-prancha','Prancha' where not exists(select 1 from public.exercise_catalog where name='Prancha');
insert into public.exercise_catalog(code,name) select 'cycle-pulldown-convergente','Pulldown convergente' where not exists(select 1 from public.exercise_catalog where name='Pulldown convergente');
insert into public.exercise_catalog(code,name) select 'cycle-puxada-frente','Puxada frente' where not exists(select 1 from public.exercise_catalog where name='Puxada frente');
insert into public.exercise_catalog(code,name) select 'cycle-remada-hammer','Remada Hammer' where not exists(select 1 from public.exercise_catalog where name='Remada Hammer');
insert into public.exercise_catalog(code,name) select 'cycle-remada-iso-lateral','Remada Iso-Lateral' where not exists(select 1 from public.exercise_catalog where name='Remada Iso-Lateral');
insert into public.exercise_catalog(code,name) select 'cycle-remada-articulada','Remada articulada' where not exists(select 1 from public.exercise_catalog where name='Remada articulada');
insert into public.exercise_catalog(code,name) select 'cycle-remada-baixa','Remada baixa' where not exists(select 1 from public.exercise_catalog where name='Remada baixa');
insert into public.exercise_catalog(code,name) select 'cycle-reverse-fly-maquina','Reverse Fly máquina' where not exists(select 1 from public.exercise_catalog where name='Reverse Fly máquina');
insert into public.exercise_catalog(code,name) select 'cycle-rosca-scott-com-barra','Rosca Scott com barra' where not exists(select 1 from public.exercise_catalog where name='Rosca Scott com barra');
insert into public.exercise_catalog(code,name) select 'cycle-rosca-scott-maquina','Rosca Scott máquina' where not exists(select 1 from public.exercise_catalog where name='Rosca Scott máquina');
insert into public.exercise_catalog(code,name) select 'cycle-rosca-maquina','Rosca máquina' where not exists(select 1 from public.exercise_catalog where name='Rosca máquina');
insert into public.exercise_catalog(code,name) select 'cycle-rosca-na-polia','Rosca na polia' where not exists(select 1 from public.exercise_catalog where name='Rosca na polia');
insert into public.exercise_catalog(code,name) select 'cycle-shoulder-press-hammer','Shoulder Press Hammer' where not exists(select 1 from public.exercise_catalog where name='Shoulder Press Hammer');
insert into public.exercise_catalog(code,name) select 'cycle-smith-hip-thrust','Smith Hip Thrust' where not exists(select 1 from public.exercise_catalog where name='Smith Hip Thrust');
insert into public.exercise_catalog(code,name) select 'cycle-smith-squat','Smith Squat' where not exists(select 1 from public.exercise_catalog where name='Smith Squat');
insert into public.exercise_catalog(code,name) select 'cycle-supino-maquina-hammer','Supino Máquina Hammer' where not exists(select 1 from public.exercise_catalog where name='Supino Máquina Hammer');
insert into public.exercise_catalog(code,name) select 'cycle-supino-articulado','Supino articulado' where not exists(select 1 from public.exercise_catalog where name='Supino articulado');
insert into public.exercise_catalog(code,name) select 'cycle-supino-convergente','Supino convergente' where not exists(select 1 from public.exercise_catalog where name='Supino convergente');
insert into public.exercise_catalog(code,name) select 'cycle-supino-inclinado-smith','Supino inclinado Smith' where not exists(select 1 from public.exercise_catalog where name='Supino inclinado Smith');
insert into public.exercise_catalog(code,name) select 'cycle-supino-inclinado-com-halteres','Supino inclinado com halteres' where not exists(select 1 from public.exercise_catalog where name='Supino inclinado com halteres');
insert into public.exercise_catalog(code,name) select 'cycle-supino-inclinado-maquina','Supino inclinado máquina' where not exists(select 1 from public.exercise_catalog where name='Supino inclinado máquina');
insert into public.exercise_catalog(code,name) select 'cycle-terra-romeno','Terra romeno' where not exists(select 1 from public.exercise_catalog where name='Terra romeno');
insert into public.exercise_catalog(code,name) select 'cycle-triceps-barra-v','Tríceps barra V' where not exists(select 1 from public.exercise_catalog where name='Tríceps barra V');
insert into public.exercise_catalog(code,name) select 'cycle-triceps-corda','Tríceps corda' where not exists(select 1 from public.exercise_catalog where name='Tríceps corda');
insert into public.exercise_catalog(code,name) select 'cycle-triceps-maquina','Tríceps máquina' where not exists(select 1 from public.exercise_catalog where name='Tríceps máquina');
insert into public.exercise_aliases(alias_exercise_id,canonical_exercise_id) select a.id,c.id from public.exercise_catalog a cross join public.exercise_catalog c where a.name='Flexora' and c.name='Cadeira flexora' on conflict(alias_exercise_id) do nothing;
insert into public.exercise_aliases(alias_exercise_id,canonical_exercise_id) select a.id,c.id from public.exercise_catalog a cross join public.exercise_catalog c where a.name='Extensora' and c.name='Cadeira extensora' on conflict(alias_exercise_id) do nothing;
insert into public.exercise_aliases(alias_exercise_id,canonical_exercise_id) select a.id,c.id from public.exercise_catalog a cross join public.exercise_catalog c where a.name='Panturrilha' and c.name='Panturrilha máquina em pé' on conflict(alias_exercise_id) do nothing;
insert into public.exercise_aliases(alias_exercise_id,canonical_exercise_id) select a.id,c.id from public.exercise_catalog a cross join public.exercise_catalog c where a.name='Elevação lateral máquina' and c.name='Elevação lateral na máquina' on conflict(alias_exercise_id) do nothing;
insert into public.exercise_aliases(alias_exercise_id,canonical_exercise_id) select a.id,c.id from public.exercise_catalog a cross join public.exercise_catalog c where a.name='Panturrilha sentada' and c.name='Panturrilha sentado' on conflict(alias_exercise_id) do nothing;
insert into public.exercise_aliases(alias_exercise_id,canonical_exercise_id) select a.id,c.id from public.exercise_catalog a cross join public.exercise_catalog c where a.name='Peck Deck invertido' and c.name='Peck deck inverso' on conflict(alias_exercise_id) do nothing;
insert into public.exercise_aliases(alias_exercise_id,canonical_exercise_id) select a.id,c.id from public.exercise_catalog a cross join public.exercise_catalog c where a.name='Face Pull na corda' and c.name='Face Pull' on conflict(alias_exercise_id) do nothing;
insert into public.exercise_aliases(alias_exercise_id,canonical_exercise_id) select a.id,c.id from public.exercise_catalog a cross join public.exercise_catalog c where a.name='Elevação lateral' and c.name='Elevação lateral com halteres' on conflict(alias_exercise_id) do nothing;

-- Enable G in every constrained route and both draft/session RPCs.
do $$ declare c record; begin
 for c in select conrelid::regclass as tbl,conname,pg_get_constraintdef(oid) as def from pg_constraint
 where connamespace='public'::regnamespace and contype='c' and pg_get_constraintdef(oid) like '%workout_code%' and pg_get_constraintdef(oid) like '%''F''%' loop
  execute format('alter table %s drop constraint %I',c.tbl,c.conname);
  execute format('alter table %s add constraint %I %s',c.tbl,c.conname,replace(c.def,$q$'F'::text$q$,$q$'F'::text, 'G'::text$q$));
 end loop;
end $$;
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
  if p_workout_code not in ('A','B','C','D','E','F','G') then
    raise exception 'invalid workout code';
  end if;

  if jsonb_typeof(coalesce(p_exercises, '[]'::jsonb)) <> 'array' then
    raise exception 'exercises must be an array';
  end if;

  if jsonb_typeof(coalesce(p_program_exposures, '[]'::jsonb)) <> 'array' then
    raise exception 'program exposures must be an array';
  end if;

  if not private.can_access_profile(p_profile_id) then raise exception 'profile access denied' using errcode='42501'; end if;
  if p_source_draft_id is not null then
    perform pg_advisory_xact_lock(hashtextextended(p_source_draft_id::text, 0));
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

    select coalesce((select canonical_exercise_id from public.exercise_aliases where alias_exercise_id=v_exercise_id),v_exercise_id) into v_exercise_id;

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
        last_weight=case when excluded.last_date >= public.exercise_records.last_date then excluded.last_weight else public.exercise_records.last_weight end,
        best_weight=greatest(public.exercise_records.best_weight,excluded.best_weight),
        last_date=greatest(public.exercise_records.last_date,excluded.last_date),
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
create or replace function public.save_workout_draft_v2(
  p_draft_id uuid,
  p_profile_id uuid,
  p_workout_code text,
  p_program_enrollment_id uuid,
  p_plan_fingerprint text,
  p_payload jsonb
)
returns public.workout_drafts
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
declare
  v_row public.workout_drafts;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if not private.can_access_profile(p_profile_id) then
    raise exception 'profile access denied' using errcode = '42501';
  end if;

  if p_workout_code not in ('A','B','C','D','E','F','G') then
    raise exception 'invalid workout code' using errcode = '22023';
  end if;

  insert into public.workout_drafts (
    id, profile_id, workout_code, program_enrollment_id,
    plan_fingerprint, payload, version, client_operation_id,
    consumed_session_id, created_at, updated_at
  ) values (
    p_draft_id, p_profile_id, p_workout_code, p_program_enrollment_id,
    p_plan_fingerprint, coalesce(p_payload, '{}'::jsonb), 1, p_draft_id,
    null, now(), now()
  )
  on conflict (id) do update
    set profile_id = excluded.profile_id,
        workout_code = excluded.workout_code,
        program_enrollment_id = excluded.program_enrollment_id,
        plan_fingerprint = excluded.plan_fingerprint,
        payload = excluded.payload,
        version = public.workout_drafts.version + 1,
        updated_at = now()
  where public.workout_drafts.profile_id = excluded.profile_id
    and public.workout_drafts.consumed_session_id is null
  returning * into v_row;

  if v_row.id is null then
    raise exception 'draft is no longer writable' using errcode = '55000';
  end if;

  return v_row;
end;
$$;

insert into public.training_programs(slug,name,objective,duration_weeks,description,status)
values('rhc-evolution-8w','RHC Evolução A–G • 8 semanas','Força e hipertrofia com foco abdominal',8,
'Ciclo após deload, sem readaptação. 69 séries de musculação/semana. Cargas históricas exatas, sem aumento inicial automático. Corridas registradas manualmente no Adidas Running. Rever recuperação e desempenho ao final do ciclo.','published')
on conflict(slug) do nothing;
insert into public.program_phases(program_id,name,week_start,week_end,volume_modifier,load_modifier,sort_order)
select id,'Evolução',1,8,1,1,1 from public.training_programs where slug='rhc-evolution-8w'
and not exists(select 1 from public.program_phases where program_id=training_programs.id);
insert into public.program_sessions(program_id,code,name,session_type,day_order,prescription) select id,'A','Empurrar','strength',1,'{}'::jsonb from public.training_programs where slug='rhc-evolution-8w' on conflict(program_id,code) do nothing;
insert into public.program_sessions(program_id,code,name,session_type,day_order,prescription) select id,'B','Posterior','strength',2,'{}'::jsonb from public.training_programs where slug='rhc-evolution-8w' on conflict(program_id,code) do nothing;
insert into public.program_sessions(program_id,code,name,session_type,day_order,prescription) select id,'C','Puxar','strength',3,'{}'::jsonb from public.training_programs where slug='rhc-evolution-8w' on conflict(program_id,code) do nothing;
insert into public.program_sessions(program_id,code,name,session_type,day_order,prescription) select id,'D','Pernas','strength',4,'{}'::jsonb from public.training_programs where slug='rhc-evolution-8w' on conflict(program_id,code) do nothing;
insert into public.program_sessions(program_id,code,name,session_type,day_order,prescription) select id,'E','Corrida leve','running',5,'{"mode":"manual","source":"Adidas Running","guidance":"Ritmo confortável; manter distância e duração já toleradas. Não aumentar volume automaticamente."}'::jsonb from public.training_programs where slug='rhc-evolution-8w' on conflict(program_id,code) do nothing;
insert into public.program_sessions(program_id,code,name,session_type,day_order,prescription) select id,'F','Complementar','strength',6,'{}'::jsonb from public.training_programs where slug='rhc-evolution-8w' on conflict(program_id,code) do nothing;
insert into public.program_sessions(program_id,code,name,session_type,day_order,prescription) select id,'G','Longão','running',7,'{"mode":"manual","source":"Adidas Running","guidance":"Ritmo confortável; manter distância e duração já toleradas. Não aumentar volume automaticamente."}'::jsonb from public.training_programs where slug='rhc-evolution-8w' on conflict(program_id,code) do nothing;
insert into public.program_exercises(session_id,program_id,exercise_id,exercise_role,sets,reps_min,reps_max,target_rpe_min,target_rpe_max,rest_seconds_min,rest_seconds_max,progression_type,default_load_increment,sort_order,execution_mode,is_unilateral,execution_notes)
select ps.id,ps.program_id,ec.id,'principal',3,4,6,8,8,120,180,'double_progression',
(select pe.default_load_increment from public.program_exercises pe left join public.exercise_aliases a on a.alias_exercise_id=pe.exercise_id where coalesce(a.canonical_exercise_id,pe.exercise_id)=ec.id and pe.program_id<>ps.program_id order by pe.created_at desc limit 1),1,'external_load',false,'Progressão dupla: só aumentar após atingir o topo em todas as séries com RPE alvo; confirmar o menor incremento disponível.'
from public.program_sessions ps join public.training_programs tp on tp.id=ps.program_id cross join public.exercise_catalog ec where tp.slug='rhc-evolution-8w' and ps.code='A' and ec.name='Supino Máquina Hammer' on conflict(session_id,sort_order) do nothing;
insert into public.program_exercises(session_id,program_id,exercise_id,exercise_role,sets,reps_min,reps_max,target_rpe_min,target_rpe_max,rest_seconds_min,rest_seconds_max,progression_type,default_load_increment,sort_order,execution_mode,is_unilateral,execution_notes)
select ps.id,ps.program_id,ec.id,'acessorio',2,8,12,8,8,90,150,'double_progression',
(select pe.default_load_increment from public.program_exercises pe left join public.exercise_aliases a on a.alias_exercise_id=pe.exercise_id where coalesce(a.canonical_exercise_id,pe.exercise_id)=ec.id and pe.program_id<>ps.program_id order by pe.created_at desc limit 1),2,'external_load',false,'Progressão dupla: só aumentar após atingir o topo em todas as séries com RPE alvo; confirmar o menor incremento disponível.'
from public.program_sessions ps join public.training_programs tp on tp.id=ps.program_id cross join public.exercise_catalog ec where tp.slug='rhc-evolution-8w' and ps.code='A' and ec.name='Supino inclinado máquina' on conflict(session_id,sort_order) do nothing;
insert into public.program_exercises(session_id,program_id,exercise_id,exercise_role,sets,reps_min,reps_max,target_rpe_min,target_rpe_max,rest_seconds_min,rest_seconds_max,progression_type,default_load_increment,sort_order,execution_mode,is_unilateral,execution_notes)
select ps.id,ps.program_id,ec.id,'acessorio',2,6,10,8,8,90,150,'double_progression',
(select pe.default_load_increment from public.program_exercises pe left join public.exercise_aliases a on a.alias_exercise_id=pe.exercise_id where coalesce(a.canonical_exercise_id,pe.exercise_id)=ec.id and pe.program_id<>ps.program_id order by pe.created_at desc limit 1),3,'external_load',false,'Progressão dupla: só aumentar após atingir o topo em todas as séries com RPE alvo; confirmar o menor incremento disponível.'
from public.program_sessions ps join public.training_programs tp on tp.id=ps.program_id cross join public.exercise_catalog ec where tp.slug='rhc-evolution-8w' and ps.code='A' and ec.name='Desenvolvimento máquina' on conflict(session_id,sort_order) do nothing;
insert into public.program_exercises(session_id,program_id,exercise_id,exercise_role,sets,reps_min,reps_max,target_rpe_min,target_rpe_max,rest_seconds_min,rest_seconds_max,progression_type,default_load_increment,sort_order,execution_mode,is_unilateral,execution_notes)
select ps.id,ps.program_id,ec.id,'acessorio',3,10,15,8,9,60,90,'double_progression',
(select pe.default_load_increment from public.program_exercises pe left join public.exercise_aliases a on a.alias_exercise_id=pe.exercise_id where coalesce(a.canonical_exercise_id,pe.exercise_id)=ec.id and pe.program_id<>ps.program_id order by pe.created_at desc limit 1),4,'external_load',false,'Progressão dupla: só aumentar após atingir o topo em todas as séries com RPE alvo; confirmar o menor incremento disponível.'
from public.program_sessions ps join public.training_programs tp on tp.id=ps.program_id cross join public.exercise_catalog ec where tp.slug='rhc-evolution-8w' and ps.code='A' and ec.name='Elevação lateral com halteres' on conflict(session_id,sort_order) do nothing;
insert into public.program_exercises(session_id,program_id,exercise_id,exercise_role,sets,reps_min,reps_max,target_rpe_min,target_rpe_max,rest_seconds_min,rest_seconds_max,progression_type,default_load_increment,sort_order,execution_mode,is_unilateral,execution_notes)
select ps.id,ps.program_id,ec.id,'acessorio',2,8,12,8,9,60,90,'double_progression',
(select pe.default_load_increment from public.program_exercises pe left join public.exercise_aliases a on a.alias_exercise_id=pe.exercise_id where coalesce(a.canonical_exercise_id,pe.exercise_id)=ec.id and pe.program_id<>ps.program_id order by pe.created_at desc limit 1),5,'external_load',false,'Progressão dupla: só aumentar após atingir o topo em todas as séries com RPE alvo; confirmar o menor incremento disponível.'
from public.program_sessions ps join public.training_programs tp on tp.id=ps.program_id cross join public.exercise_catalog ec where tp.slug='rhc-evolution-8w' and ps.code='A' and ec.name='Tríceps corda' on conflict(session_id,sort_order) do nothing;
insert into public.program_exercises(session_id,program_id,exercise_id,exercise_role,sets,reps_min,reps_max,target_rpe_min,target_rpe_max,rest_seconds_min,rest_seconds_max,progression_type,default_load_increment,sort_order,execution_mode,is_unilateral,execution_notes)
select ps.id,ps.program_id,ec.id,'principal',3,6,8,7,8,120,180,'double_progression',
(select pe.default_load_increment from public.program_exercises pe left join public.exercise_aliases a on a.alias_exercise_id=pe.exercise_id where coalesce(a.canonical_exercise_id,pe.exercise_id)=ec.id and pe.program_id<>ps.program_id order by pe.created_at desc limit 1),1,'external_load',false,'Progressão dupla: só aumentar após atingir o topo em todas as séries com RPE alvo; confirmar o menor incremento disponível.'
from public.program_sessions ps join public.training_programs tp on tp.id=ps.program_id cross join public.exercise_catalog ec where tp.slug='rhc-evolution-8w' and ps.code='B' and ec.name='Terra romeno' on conflict(session_id,sort_order) do nothing;
insert into public.program_exercises(session_id,program_id,exercise_id,exercise_role,sets,reps_min,reps_max,target_rpe_min,target_rpe_max,rest_seconds_min,rest_seconds_max,progression_type,default_load_increment,sort_order,execution_mode,is_unilateral,execution_notes)
select ps.id,ps.program_id,ec.id,'acessorio',2,8,12,8,8,90,150,'double_progression',
(select pe.default_load_increment from public.program_exercises pe left join public.exercise_aliases a on a.alias_exercise_id=pe.exercise_id where coalesce(a.canonical_exercise_id,pe.exercise_id)=ec.id and pe.program_id<>ps.program_id order by pe.created_at desc limit 1),2,'external_load',false,'Progressão dupla: só aumentar após atingir o topo em todas as séries com RPE alvo; confirmar o menor incremento disponível.'
from public.program_sessions ps join public.training_programs tp on tp.id=ps.program_id cross join public.exercise_catalog ec where tp.slug='rhc-evolution-8w' and ps.code='B' and ec.name='Hip Thrust' on conflict(session_id,sort_order) do nothing;
insert into public.program_exercises(session_id,program_id,exercise_id,exercise_role,sets,reps_min,reps_max,target_rpe_min,target_rpe_max,rest_seconds_min,rest_seconds_max,progression_type,default_load_increment,sort_order,execution_mode,is_unilateral,execution_notes)
select ps.id,ps.program_id,ec.id,'acessorio',3,8,12,8,9,90,120,'double_progression',
(select pe.default_load_increment from public.program_exercises pe left join public.exercise_aliases a on a.alias_exercise_id=pe.exercise_id where coalesce(a.canonical_exercise_id,pe.exercise_id)=ec.id and pe.program_id<>ps.program_id order by pe.created_at desc limit 1),3,'external_load',false,'Progressão dupla: só aumentar após atingir o topo em todas as séries com RPE alvo; confirmar o menor incremento disponível.'
from public.program_sessions ps join public.training_programs tp on tp.id=ps.program_id cross join public.exercise_catalog ec where tp.slug='rhc-evolution-8w' and ps.code='B' and ec.name='Cadeira flexora' on conflict(session_id,sort_order) do nothing;
insert into public.program_exercises(session_id,program_id,exercise_id,exercise_role,sets,reps_min,reps_max,target_rpe_min,target_rpe_max,rest_seconds_min,rest_seconds_max,progression_type,default_load_increment,sort_order,execution_mode,is_unilateral,execution_notes)
select ps.id,ps.program_id,ec.id,'acessorio',2,8,12,8,8,90,150,'double_progression',
(select pe.default_load_increment from public.program_exercises pe left join public.exercise_aliases a on a.alias_exercise_id=pe.exercise_id where coalesce(a.canonical_exercise_id,pe.exercise_id)=ec.id and pe.program_id<>ps.program_id order by pe.created_at desc limit 1),4,'external_load',true,'2 séries por perna. Registrar carga da mesma máquina; não copiar a bilateral.'
from public.program_sessions ps join public.training_programs tp on tp.id=ps.program_id cross join public.exercise_catalog ec where tp.slug='rhc-evolution-8w' and ps.code='B' and ec.name='Leg Press unilateral' on conflict(session_id,sort_order) do nothing;
insert into public.program_exercises(session_id,program_id,exercise_id,exercise_role,sets,reps_min,reps_max,target_rpe_min,target_rpe_max,rest_seconds_min,rest_seconds_max,progression_type,default_load_increment,sort_order,execution_mode,is_unilateral,execution_notes)
select ps.id,ps.program_id,ec.id,'acessorio',3,8,12,8,9,60,120,'double_progression',
(select pe.default_load_increment from public.program_exercises pe left join public.exercise_aliases a on a.alias_exercise_id=pe.exercise_id where coalesce(a.canonical_exercise_id,pe.exercise_id)=ec.id and pe.program_id<>ps.program_id order by pe.created_at desc limit 1),5,'external_load',false,'Progressão dupla: só aumentar após atingir o topo em todas as séries com RPE alvo; confirmar o menor incremento disponível.'
from public.program_sessions ps join public.training_programs tp on tp.id=ps.program_id cross join public.exercise_catalog ec where tp.slug='rhc-evolution-8w' and ps.code='B' and ec.name='Panturrilha máquina em pé' on conflict(session_id,sort_order) do nothing;
insert into public.program_exercises(session_id,program_id,exercise_id,exercise_role,sets,reps_min,reps_max,target_rpe_min,target_rpe_max,rest_seconds_min,rest_seconds_max,progression_type,default_load_increment,sort_order,execution_mode,is_unilateral,execution_notes)
select ps.id,ps.program_id,ec.id,'acessorio',2,10,15,7,8,60,90,'manual',
(select pe.default_load_increment from public.program_exercises pe left join public.exercise_aliases a on a.alias_exercise_id=pe.exercise_id where coalesce(a.canonical_exercise_id,pe.exercise_id)=ec.id and pe.program_id<>ps.program_id order by pe.created_at desc limit 1),6,'external_load',true,'10–15 por lado. Priorizar estabilidade e técnica, sem progressão automática.'
from public.program_sessions ps join public.training_programs tp on tp.id=ps.program_id cross join public.exercise_catalog ec where tp.slug='rhc-evolution-8w' and ps.code='B' and ec.name='Pallof Press' on conflict(session_id,sort_order) do nothing;
insert into public.program_exercises(session_id,program_id,exercise_id,exercise_role,sets,reps_min,reps_max,target_rpe_min,target_rpe_max,rest_seconds_min,rest_seconds_max,progression_type,default_load_increment,sort_order,execution_mode,is_unilateral,execution_notes)
select ps.id,ps.program_id,ec.id,'principal',3,4,6,8,8,120,180,'double_progression',
(select pe.default_load_increment from public.program_exercises pe left join public.exercise_aliases a on a.alias_exercise_id=pe.exercise_id where coalesce(a.canonical_exercise_id,pe.exercise_id)=ec.id and pe.program_id<>ps.program_id order by pe.created_at desc limit 1),1,'external_load',false,'Progressão dupla: só aumentar após atingir o topo em todas as séries com RPE alvo; confirmar o menor incremento disponível.'
from public.program_sessions ps join public.training_programs tp on tp.id=ps.program_id cross join public.exercise_catalog ec where tp.slug='rhc-evolution-8w' and ps.code='C' and ec.name='Remada Hammer' on conflict(session_id,sort_order) do nothing;
insert into public.program_exercises(session_id,program_id,exercise_id,exercise_role,sets,reps_min,reps_max,target_rpe_min,target_rpe_max,rest_seconds_min,rest_seconds_max,progression_type,default_load_increment,sort_order,execution_mode,is_unilateral,execution_notes)
select ps.id,ps.program_id,ec.id,'acessorio',3,6,10,8,8,90,150,'double_progression',
(select pe.default_load_increment from public.program_exercises pe left join public.exercise_aliases a on a.alias_exercise_id=pe.exercise_id where coalesce(a.canonical_exercise_id,pe.exercise_id)=ec.id and pe.program_id<>ps.program_id order by pe.created_at desc limit 1),2,'external_load',false,'Progressão dupla: só aumentar após atingir o topo em todas as séries com RPE alvo; confirmar o menor incremento disponível.'
from public.program_sessions ps join public.training_programs tp on tp.id=ps.program_id cross join public.exercise_catalog ec where tp.slug='rhc-evolution-8w' and ps.code='C' and ec.name='Puxada frente' on conflict(session_id,sort_order) do nothing;
insert into public.program_exercises(session_id,program_id,exercise_id,exercise_role,sets,reps_min,reps_max,target_rpe_min,target_rpe_max,rest_seconds_min,rest_seconds_max,progression_type,default_load_increment,sort_order,execution_mode,is_unilateral,execution_notes)
select ps.id,ps.program_id,ec.id,'acessorio',2,10,15,8,9,60,90,'double_progression',
(select pe.default_load_increment from public.program_exercises pe left join public.exercise_aliases a on a.alias_exercise_id=pe.exercise_id where coalesce(a.canonical_exercise_id,pe.exercise_id)=ec.id and pe.program_id<>ps.program_id order by pe.created_at desc limit 1),3,'external_load',false,'Progressão dupla: só aumentar após atingir o topo em todas as séries com RPE alvo; confirmar o menor incremento disponível.'
from public.program_sessions ps join public.training_programs tp on tp.id=ps.program_id cross join public.exercise_catalog ec where tp.slug='rhc-evolution-8w' and ps.code='C' and ec.name='Reverse Fly máquina' on conflict(session_id,sort_order) do nothing;
insert into public.program_exercises(session_id,program_id,exercise_id,exercise_role,sets,reps_min,reps_max,target_rpe_min,target_rpe_max,rest_seconds_min,rest_seconds_max,progression_type,default_load_increment,sort_order,execution_mode,is_unilateral,execution_notes)
select ps.id,ps.program_id,ec.id,'acessorio',2,8,12,8,9,60,90,'double_progression',
(select pe.default_load_increment from public.program_exercises pe left join public.exercise_aliases a on a.alias_exercise_id=pe.exercise_id where coalesce(a.canonical_exercise_id,pe.exercise_id)=ec.id and pe.program_id<>ps.program_id order by pe.created_at desc limit 1),4,'external_load',false,'Progressão dupla: só aumentar após atingir o topo em todas as séries com RPE alvo; confirmar o menor incremento disponível.'
from public.program_sessions ps join public.training_programs tp on tp.id=ps.program_id cross join public.exercise_catalog ec where tp.slug='rhc-evolution-8w' and ps.code='C' and ec.name='Rosca máquina' on conflict(session_id,sort_order) do nothing;
insert into public.program_exercises(session_id,program_id,exercise_id,exercise_role,sets,reps_min,reps_max,target_rpe_min,target_rpe_max,rest_seconds_min,rest_seconds_max,progression_type,default_load_increment,sort_order,execution_mode,is_unilateral,execution_notes)
select ps.id,ps.program_id,ec.id,'acessorio',3,8,12,8,9,60,120,'double_progression',
(select pe.default_load_increment from public.program_exercises pe left join public.exercise_aliases a on a.alias_exercise_id=pe.exercise_id where coalesce(a.canonical_exercise_id,pe.exercise_id)=ec.id and pe.program_id<>ps.program_id order by pe.created_at desc limit 1),5,'external_load',false,'Progressão dupla: só aumentar após atingir o topo em todas as séries com RPE alvo; confirmar o menor incremento disponível.'
from public.program_sessions ps join public.training_programs tp on tp.id=ps.program_id cross join public.exercise_catalog ec where tp.slug='rhc-evolution-8w' and ps.code='C' and ec.name='Abdominal máquina' on conflict(session_id,sort_order) do nothing;
insert into public.program_exercises(session_id,program_id,exercise_id,exercise_role,sets,reps_min,reps_max,target_rpe_min,target_rpe_max,rest_seconds_min,rest_seconds_max,progression_type,default_load_increment,sort_order,execution_mode,is_unilateral,execution_notes)
select ps.id,ps.program_id,ec.id,'principal',3,4,6,8,8,120,180,'double_progression',
(select pe.default_load_increment from public.program_exercises pe left join public.exercise_aliases a on a.alias_exercise_id=pe.exercise_id where coalesce(a.canonical_exercise_id,pe.exercise_id)=ec.id and pe.program_id<>ps.program_id order by pe.created_at desc limit 1),1,'external_load',false,'Progressão dupla: só aumentar após atingir o topo em todas as séries com RPE alvo; confirmar o menor incremento disponível.'
from public.program_sessions ps join public.training_programs tp on tp.id=ps.program_id cross join public.exercise_catalog ec where tp.slug='rhc-evolution-8w' and ps.code='D' and ec.name='Hack machine' on conflict(session_id,sort_order) do nothing;
insert into public.program_exercises(session_id,program_id,exercise_id,exercise_role,sets,reps_min,reps_max,target_rpe_min,target_rpe_max,rest_seconds_min,rest_seconds_max,progression_type,default_load_increment,sort_order,execution_mode,is_unilateral,execution_notes)
select ps.id,ps.program_id,ec.id,'acessorio',2,8,12,8,8,90,150,'double_progression',
(select pe.default_load_increment from public.program_exercises pe left join public.exercise_aliases a on a.alias_exercise_id=pe.exercise_id where coalesce(a.canonical_exercise_id,pe.exercise_id)=ec.id and pe.program_id<>ps.program_id order by pe.created_at desc limit 1),2,'external_load',false,'Progressão dupla: só aumentar após atingir o topo em todas as séries com RPE alvo; confirmar o menor incremento disponível.'
from public.program_sessions ps join public.training_programs tp on tp.id=ps.program_id cross join public.exercise_catalog ec where tp.slug='rhc-evolution-8w' and ps.code='D' and ec.name='Leg press' on conflict(session_id,sort_order) do nothing;
insert into public.program_exercises(session_id,program_id,exercise_id,exercise_role,sets,reps_min,reps_max,target_rpe_min,target_rpe_max,rest_seconds_min,rest_seconds_max,progression_type,default_load_increment,sort_order,execution_mode,is_unilateral,execution_notes)
select ps.id,ps.program_id,ec.id,'acessorio',2,10,15,8,9,60,120,'double_progression',
(select pe.default_load_increment from public.program_exercises pe left join public.exercise_aliases a on a.alias_exercise_id=pe.exercise_id where coalesce(a.canonical_exercise_id,pe.exercise_id)=ec.id and pe.program_id<>ps.program_id order by pe.created_at desc limit 1),3,'external_load',false,'Progressão dupla: só aumentar após atingir o topo em todas as séries com RPE alvo; confirmar o menor incremento disponível.'
from public.program_sessions ps join public.training_programs tp on tp.id=ps.program_id cross join public.exercise_catalog ec where tp.slug='rhc-evolution-8w' and ps.code='D' and ec.name='Cadeira extensora' on conflict(session_id,sort_order) do nothing;
insert into public.program_exercises(session_id,program_id,exercise_id,exercise_role,sets,reps_min,reps_max,target_rpe_min,target_rpe_max,rest_seconds_min,rest_seconds_max,progression_type,default_load_increment,sort_order,execution_mode,is_unilateral,execution_notes)
select ps.id,ps.program_id,ec.id,'acessorio',2,10,15,8,8,90,120,'double_progression',
(select pe.default_load_increment from public.program_exercises pe left join public.exercise_aliases a on a.alias_exercise_id=pe.exercise_id where coalesce(a.canonical_exercise_id,pe.exercise_id)=ec.id and pe.program_id<>ps.program_id order by pe.created_at desc limit 1),4,'external_load',false,'Progressão dupla: só aumentar após atingir o topo em todas as séries com RPE alvo; confirmar o menor incremento disponível.'
from public.program_sessions ps join public.training_programs tp on tp.id=ps.program_id cross join public.exercise_catalog ec where tp.slug='rhc-evolution-8w' and ps.code='D' and ec.name='Cadeira flexora' on conflict(session_id,sort_order) do nothing;
insert into public.program_exercises(session_id,program_id,exercise_id,exercise_role,sets,reps_min,reps_max,target_rpe_min,target_rpe_max,rest_seconds_min,rest_seconds_max,progression_type,default_load_increment,sort_order,execution_mode,is_unilateral,execution_notes)
select ps.id,ps.program_id,ec.id,'acessorio',3,12,20,8,9,60,120,'double_progression',
(select pe.default_load_increment from public.program_exercises pe left join public.exercise_aliases a on a.alias_exercise_id=pe.exercise_id where coalesce(a.canonical_exercise_id,pe.exercise_id)=ec.id and pe.program_id<>ps.program_id order by pe.created_at desc limit 1),5,'external_load',false,'Progressão dupla: só aumentar após atingir o topo em todas as séries com RPE alvo; confirmar o menor incremento disponível.'
from public.program_sessions ps join public.training_programs tp on tp.id=ps.program_id cross join public.exercise_catalog ec where tp.slug='rhc-evolution-8w' and ps.code='D' and ec.name='Panturrilha sentado' on conflict(session_id,sort_order) do nothing;
insert into public.program_exercises(session_id,program_id,exercise_id,exercise_role,sets,reps_min,reps_max,target_rpe_min,target_rpe_max,rest_seconds_min,rest_seconds_max,progression_type,default_load_increment,sort_order,execution_mode,is_unilateral,execution_notes)
select ps.id,ps.program_id,ec.id,'acessorio',2,20,40,null,null,60,90,'manual',
(select pe.default_load_increment from public.program_exercises pe left join public.exercise_aliases a on a.alias_exercise_id=pe.exercise_id where coalesce(a.canonical_exercise_id,pe.exercise_id)=ec.id and pe.program_id<>ps.program_id order by pe.created_at desc limit 1),6,'timed',false,'20–40 segundos por série. Progredir tempo com controle, depois dificuldade; sem carga obrigatória.'
from public.program_sessions ps join public.training_programs tp on tp.id=ps.program_id cross join public.exercise_catalog ec where tp.slug='rhc-evolution-8w' and ps.code='D' and ec.name='Prancha' on conflict(session_id,sort_order) do nothing;
insert into public.program_exercises(session_id,program_id,exercise_id,exercise_role,sets,reps_min,reps_max,target_rpe_min,target_rpe_max,rest_seconds_min,rest_seconds_max,progression_type,default_load_increment,sort_order,execution_mode,is_unilateral,execution_notes)
select ps.id,ps.program_id,ec.id,'principal',3,6,8,7,8,120,180,'double_progression',
(select pe.default_load_increment from public.program_exercises pe left join public.exercise_aliases a on a.alias_exercise_id=pe.exercise_id where coalesce(a.canonical_exercise_id,pe.exercise_id)=ec.id and pe.program_id<>ps.program_id order by pe.created_at desc limit 1),1,'external_load',false,'Progressão dupla: só aumentar após atingir o topo em todas as séries com RPE alvo; confirmar o menor incremento disponível.'
from public.program_sessions ps join public.training_programs tp on tp.id=ps.program_id cross join public.exercise_catalog ec where tp.slug='rhc-evolution-8w' and ps.code='F' and ec.name='Supino Máquina Hammer' on conflict(session_id,sort_order) do nothing;
insert into public.program_exercises(session_id,program_id,exercise_id,exercise_role,sets,reps_min,reps_max,target_rpe_min,target_rpe_max,rest_seconds_min,rest_seconds_max,progression_type,default_load_increment,sort_order,execution_mode,is_unilateral,execution_notes)
select ps.id,ps.program_id,ec.id,'acessorio',3,6,10,8,8,120,180,'manual',
(select pe.default_load_increment from public.program_exercises pe left join public.exercise_aliases a on a.alias_exercise_id=pe.exercise_id where coalesce(a.canonical_exercise_id,pe.exercise_id)=ec.id and pe.program_id<>ps.program_id order by pe.created_at desc limit 1),2,'bodyweight',false,'Pegada pronada, sem assistência. Registrar apenas lastro extra; 0 kg significa peso corporal.'
from public.program_sessions ps join public.training_programs tp on tp.id=ps.program_id cross join public.exercise_catalog ec where tp.slug='rhc-evolution-8w' and ps.code='F' and ec.name='Barra fixa pronada' on conflict(session_id,sort_order) do nothing;
insert into public.program_exercises(session_id,program_id,exercise_id,exercise_role,sets,reps_min,reps_max,target_rpe_min,target_rpe_max,rest_seconds_min,rest_seconds_max,progression_type,default_load_increment,sort_order,execution_mode,is_unilateral,execution_notes)
select ps.id,ps.program_id,ec.id,'acessorio',2,12,20,8,9,60,90,'double_progression',
(select pe.default_load_increment from public.program_exercises pe left join public.exercise_aliases a on a.alias_exercise_id=pe.exercise_id where coalesce(a.canonical_exercise_id,pe.exercise_id)=ec.id and pe.program_id<>ps.program_id order by pe.created_at desc limit 1),3,'external_load',false,'Progressão dupla: só aumentar após atingir o topo em todas as séries com RPE alvo; confirmar o menor incremento disponível.'
from public.program_sessions ps join public.training_programs tp on tp.id=ps.program_id cross join public.exercise_catalog ec where tp.slug='rhc-evolution-8w' and ps.code='F' and ec.name='Elevação lateral com halteres' on conflict(session_id,sort_order) do nothing;
insert into public.program_exercises(session_id,program_id,exercise_id,exercise_role,sets,reps_min,reps_max,target_rpe_min,target_rpe_max,rest_seconds_min,rest_seconds_max,progression_type,default_load_increment,sort_order,execution_mode,is_unilateral,execution_notes)
select ps.id,ps.program_id,ec.id,'acessorio',2,12,20,8,9,60,90,'double_progression',
(select pe.default_load_increment from public.program_exercises pe left join public.exercise_aliases a on a.alias_exercise_id=pe.exercise_id where coalesce(a.canonical_exercise_id,pe.exercise_id)=ec.id and pe.program_id<>ps.program_id order by pe.created_at desc limit 1),4,'external_load',false,'Progressão dupla: só aumentar após atingir o topo em todas as séries com RPE alvo; confirmar o menor incremento disponível.'
from public.program_sessions ps join public.training_programs tp on tp.id=ps.program_id cross join public.exercise_catalog ec where tp.slug='rhc-evolution-8w' and ps.code='F' and ec.name='Reverse Fly máquina' on conflict(session_id,sort_order) do nothing;
insert into public.program_exercises(session_id,program_id,exercise_id,exercise_role,sets,reps_min,reps_max,target_rpe_min,target_rpe_max,rest_seconds_min,rest_seconds_max,progression_type,default_load_increment,sort_order,execution_mode,is_unilateral,execution_notes)
select ps.id,ps.program_id,ec.id,'acessorio',2,10,15,8,9,60,90,'double_progression',
(select pe.default_load_increment from public.program_exercises pe left join public.exercise_aliases a on a.alias_exercise_id=pe.exercise_id where coalesce(a.canonical_exercise_id,pe.exercise_id)=ec.id and pe.program_id<>ps.program_id order by pe.created_at desc limit 1),5,'external_load',false,'Progressão dupla: só aumentar após atingir o topo em todas as séries com RPE alvo; confirmar o menor incremento disponível.'
from public.program_sessions ps join public.training_programs tp on tp.id=ps.program_id cross join public.exercise_catalog ec where tp.slug='rhc-evolution-8w' and ps.code='F' and ec.name='Tríceps máquina' on conflict(session_id,sort_order) do nothing;
insert into public.program_exercises(session_id,program_id,exercise_id,exercise_role,sets,reps_min,reps_max,target_rpe_min,target_rpe_max,rest_seconds_min,rest_seconds_max,progression_type,default_load_increment,sort_order,execution_mode,is_unilateral,execution_notes)
select ps.id,ps.program_id,ec.id,'acessorio',3,10,15,8,8,60,120,'double_progression',
(select pe.default_load_increment from public.program_exercises pe left join public.exercise_aliases a on a.alias_exercise_id=pe.exercise_id where coalesce(a.canonical_exercise_id,pe.exercise_id)=ec.id and pe.program_id<>ps.program_id order by pe.created_at desc limit 1),6,'external_load',false,'Progressão dupla: só aumentar após atingir o topo em todas as séries com RPE alvo; confirmar o menor incremento disponível.'
from public.program_sessions ps join public.training_programs tp on tp.id=ps.program_id cross join public.exercise_catalog ec where tp.slug='rhc-evolution-8w' and ps.code='F' and ec.name='Abdominal máquina' on conflict(session_id,sort_order) do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,1 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='A' and ec.name='Supino Máquina Hammer' and a.name='Chest Press' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,2 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='A' and ec.name='Supino Máquina Hammer' and a.name='Supino articulado' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,3 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='A' and ec.name='Supino Máquina Hammer' and a.name='Supino convergente' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,1 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='A' and ec.name='Supino inclinado máquina' and a.name='Chest Press inclinado' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,2 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='A' and ec.name='Supino inclinado máquina' and a.name='Supino inclinado Smith' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,3 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='A' and ec.name='Supino inclinado máquina' and a.name='Supino inclinado com halteres' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,1 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='A' and ec.name='Desenvolvimento máquina' and a.name='Shoulder Press Hammer' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,2 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='A' and ec.name='Desenvolvimento máquina' and a.name='Desenvolvimento articulado' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,1 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='A' and ec.name='Elevação lateral com halteres' and a.name='Elevação lateral na máquina' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,2 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='A' and ec.name='Elevação lateral com halteres' and a.name='Elevação lateral na polia' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,1 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='A' and ec.name='Tríceps corda' and a.name='Tríceps barra V' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,2 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='A' and ec.name='Tríceps corda' and a.name='Tríceps máquina' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,1 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='B' and ec.name='Hip Thrust' and a.name='Glute Drive' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,2 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='B' and ec.name='Hip Thrust' and a.name='Smith Hip Thrust' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,1 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='B' and ec.name='Cadeira flexora' and a.name='Flexora deitada' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,1 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='B' and ec.name='Panturrilha máquina em pé' and a.name='Panturrilha no leg press' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,1 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='C' and ec.name='Remada Hammer' and a.name='Remada baixa' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,2 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='C' and ec.name='Remada Hammer' and a.name='Remada Iso-Lateral' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,3 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='C' and ec.name='Remada Hammer' and a.name='Remada articulada' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,1 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='C' and ec.name='Puxada frente' and a.name='Pulldown convergente' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,1 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='C' and ec.name='Reverse Fly máquina' and a.name='Peck deck inverso' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,2 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='C' and ec.name='Reverse Fly máquina' and a.name='Crucifixo inverso no cabo' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,1 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='C' and ec.name='Rosca máquina' and a.name='Rosca Scott máquina' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,2 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='C' and ec.name='Rosca máquina' and a.name='Rosca na polia' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,3 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='C' and ec.name='Rosca máquina' and a.name='Rosca Scott com barra' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,1 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='C' and ec.name='Abdominal máquina' and a.name='Crunch no cabo' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,1 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='D' and ec.name='Hack machine' and a.name='Pendulum Squat' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,2 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='D' and ec.name='Hack machine' and a.name='Belt Squat' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,3 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='D' and ec.name='Hack machine' and a.name='Smith Squat' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,1 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='D' and ec.name='Leg press' and a.name='Leg Press 45°' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,2 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='D' and ec.name='Leg press' and a.name='Leg Press horizontal' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,3 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='D' and ec.name='Leg press' and a.name='Leg Press vertical' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,1 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='D' and ec.name='Cadeira extensora' and a.name='Cadeira extensora articulada' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,1 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='D' and ec.name='Cadeira flexora' and a.name='Flexora deitada' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,1 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='D' and ec.name='Panturrilha sentado' and a.name='Panturrilha no leg press' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,1 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='F' and ec.name='Supino Máquina Hammer' and a.name='Chest Press' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,2 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='F' and ec.name='Supino Máquina Hammer' and a.name='Supino articulado' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,3 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='F' and ec.name='Supino Máquina Hammer' and a.name='Supino convergente' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,1 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='F' and ec.name='Elevação lateral com halteres' and a.name='Elevação lateral na máquina' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,2 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='F' and ec.name='Elevação lateral com halteres' and a.name='Elevação lateral na polia' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,1 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='F' and ec.name='Reverse Fly máquina' and a.name='Peck deck inverso' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,2 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='F' and ec.name='Reverse Fly máquina' and a.name='Crucifixo inverso no cabo' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,1 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='F' and ec.name='Tríceps máquina' and a.name='Tríceps corda' on conflict do nothing;
insert into public.program_exercise_substitutions(program_exercise_id,alternative_exercise_id,sort_order) select pe.id,a.id,1 from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id join public.training_programs tp on tp.id=ps.program_id join public.exercise_catalog ec on ec.id=pe.exercise_id cross join public.exercise_catalog a where tp.slug='rhc-evolution-8w' and ps.code='F' and ec.name='Abdominal máquina' and a.name='Crunch no cabo' on conflict do nothing;

-- Activation is explicit and atomic. A published template alone does not change a profile.
create or replace function private.activate_training_program_v2_impl(p_profile_id uuid,p_program_slug text,p_start_date date,p_baseline_before date default null)
returns uuid language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare v_program public.training_programs; v_enrollment uuid; v_existing public.program_enrollments; v_cutoff date;
begin
 if not private.is_admin() then raise exception 'admin required' using errcode='42501'; end if;
 if p_start_date is null then raise exception 'start date required'; end if;
 perform 1 from public.profiles where id=p_profile_id and is_active for update;
 if not found then raise exception 'active profile required'; end if;
 select * into v_program from public.training_programs where slug=p_program_slug and status='published';
 if not found then raise exception 'published program required'; end if;
 select * into v_existing from public.program_enrollments where profile_id=p_profile_id and status='active' for update;
 if found and v_existing.program_id=v_program.id and v_existing.start_date=p_start_date then return v_existing.id; end if;
 -- Default excludes the previous program's deload by calendar, unless caller supplies the observed cutoff.
 select coalesce(p_baseline_before, min(v_existing.start_date+(ph.week_start-1)*7) filter(where ph.name ilike '%deload%'),p_start_date)
 into v_cutoff from public.program_phases ph where ph.program_id=v_existing.program_id;
 update public.program_enrollments set status='completed',completed_at=now(),updated_at=now() where profile_id=p_profile_id and status='active';
 insert into public.program_enrollments(profile_id,program_id,status,start_date,current_week,running_baseline)
 values(p_profile_id,v_program.id,'active',p_start_date,1,coalesce(v_existing.running_baseline,'{}'::jsonb)) returning id into v_enrollment;
 insert into public.program_exercise_baselines(enrollment_id,program_exercise_id,program_id,variation_exercise_id,starting_load,load_increment,source_session_id,source_workout_date)
 select v_enrollment,pe.id,pe.program_id,pe.exercise_id,
 case when pe.execution_mode in ('bodyweight','timed') then 0 else last_set.weight end,
 pe.default_load_increment,last_set.session_id,last_set.workout_date
 from public.program_exercises pe
 left join lateral (
  select we.weight,we.session_id,ws.workout_date from public.workout_exercises we
  join public.workout_sessions ws on ws.id=we.session_id
  left join public.exercise_aliases a on a.alias_exercise_id=we.exercise_id
  where ws.profile_id=p_profile_id and ws.archived_at is null and we.completed and ws.workout_date<v_cutoff
   and coalesce(a.canonical_exercise_id,we.exercise_id)=pe.exercise_id
  order by ws.workout_date desc,ws.created_at desc,we.sort_order desc limit 1
 ) last_set on true where pe.program_id=v_program.id;
 insert into public.profile_training_state(profile_id,active_program_enrollment_id,current_workout_code,next_workout_code,updated_at)
 values(p_profile_id,v_enrollment,'A','A',now()) on conflict(profile_id) do update set active_program_enrollment_id=v_enrollment,current_workout_code='A',next_workout_code='A',version=public.profile_training_state.version+1,updated_at=now();
 insert into public.profile_weekly_schedule(profile_id,day_of_week,workout_code)
 select p_profile_id,ps.day_order % 7,ps.code from public.program_sessions ps where ps.program_id=v_program.id and ps.day_order between 1 and 7
 on conflict(profile_id,day_of_week) do update set workout_code=excluded.workout_code,updated_at=now();
 return v_enrollment;
end $$;
revoke all on function private.activate_training_program_v2_impl(uuid,text,date,date) from public,anon;
grant execute on function private.activate_training_program_v2_impl(uuid,text,date,date) to authenticated;
create or replace function public.activate_training_program_v2(p_profile_id uuid,p_program_slug text,p_start_date date,p_baseline_before date default null)
returns uuid language sql security invoker set search_path=pg_catalog,public,private as $$
 select private.activate_training_program_v2_impl(p_profile_id,p_program_slug,p_start_date,p_baseline_before);
$$;
revoke all on function public.activate_training_program_v2(uuid,text,date,date) from public,anon;
grant execute on function public.activate_training_program_v2(uuid,text,date,date) to authenticated;
commit;
