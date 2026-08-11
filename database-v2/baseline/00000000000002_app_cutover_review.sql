-- RHCT-DATA-002 — temporary app-cutover review patch
-- V2 ONLY. DO NOT APPLY TO LEGACY.
-- Must be squashed into 00000000000000_baseline_v2.sql after validation.

begin;

create table if not exists public.profile_invitations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  email text not null,
  status text not null default 'pending' check (status in ('pending','claimed','revoked')),
  claimed_by uuid references auth.users(id),
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_invitations_email_normalized check (email = lower(trim(email)))
);
create index if not exists profile_invitations_email_idx on public.profile_invitations(email) where status='pending';

create table if not exists public.profile_weekly_schedule (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  workout_code text check (workout_code is null or workout_code in ('A','B','C','D','E','F')),
  updated_at timestamptz not null default now(),
  primary key (profile_id, day_of_week)
);

alter table public.profile_invitations enable row level security;
alter table public.profile_weekly_schedule enable row level security;

revoke all on public.profile_invitations, public.profile_weekly_schedule from anon, authenticated;
grant select,insert,update,delete on public.profile_invitations to authenticated;
grant select,insert,update,delete on public.profile_weekly_schedule to authenticated;
grant insert on public.app_users to authenticated;
grant insert on public.profile_access to authenticated;
grant insert on public.profiles to authenticated;

create policy profile_invitations_admin_all on public.profile_invitations
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy profile_invitations_self_read on public.profile_invitations
for select to authenticated
using (status='pending' and email = lower(trim(coalesce(auth.jwt()->>'email',''))));

create policy profile_invitations_self_claim on public.profile_invitations
for update to authenticated
using (status='pending' and email = lower(trim(coalesce(auth.jwt()->>'email',''))))
with check (status='claimed' and claimed_by = auth.uid() and email = lower(trim(coalesce(auth.jwt()->>'email',''))));

create policy app_users_claim_invite on public.app_users
for insert to authenticated
with check (
  user_id = auth.uid() and role='user' and status='active'
  and exists (
    select 1 from public.profile_invitations i
    where i.status='pending' and i.email = lower(trim(coalesce(auth.jwt()->>'email','')))
  )
);

create policy profile_access_claim_invite on public.profile_access
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.profile_invitations i
    where i.profile_id=profile_access.profile_id
      and i.status='pending'
      and i.email=lower(trim(coalesce(auth.jwt()->>'email','')))
  )
);

create policy profiles_admin_insert on public.profiles
for insert to authenticated with check (private.is_admin());

create policy weekly_schedule_rw on public.profile_weekly_schedule
for all to authenticated
using (private.can_access_profile(profile_id) or private.can_admin_access_profile(profile_id))
with check (private.can_access_profile(profile_id) or private.can_admin_access_profile(profile_id));

create unique index if not exists program_exposures_one_per_session_exercise
on public.program_exercise_exposures(workout_session_id, program_exercise_id)
where workout_session_id is not null;

create or replace function public.save_workout_session_v2(
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
  p_activity_mode text default null
) returns public.workout_sessions
language plpgsql
security invoker
set search_path=pg_catalog,public,private
as $$
declare
  v_session public.workout_sessions;
  v_item jsonb;
  v_exercise_id uuid;
  v_sort integer := 0;
  v_name text;
  v_weight numeric;
  v_completed boolean;
begin
  if p_workout_code not in ('A','B','C','D','E','F') then raise exception 'invalid workout code'; end if;

  if p_source_draft_id is not null then
    select * into v_session from public.workout_sessions
    where client_operation_id=p_source_draft_id and profile_id=p_profile_id limit 1;
    if found then return v_session; end if;
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
    if v_name is null then raise exception 'exercise name missing at position %',v_sort; end if;
    select id into v_exercise_id from public.exercise_catalog
      where lower(name)=lower(v_name) and is_active order by id limit 1;
    if v_exercise_id is null then raise exception 'exercise not found in catalog: %',v_name; end if;
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

  if p_source_draft_id is not null then
    update public.workout_drafts set consumed_session_id=v_session.id,updated_at=now(),version=version+1
    where id=p_source_draft_id and profile_id=p_profile_id and consumed_session_id is null;
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

revoke all on function public.save_workout_session_v2(uuid,text,date,text,integer,numeric,numeric,text,jsonb,uuid,integer,integer,integer,text) from public,anon;
grant execute on function public.save_workout_session_v2(uuid,text,date,text,integer,numeric,numeric,text,jsonb,uuid,integer,integer,integer,text) to authenticated;

commit;
