-- RHCT-DATA-002 — temporary real-project hardening review
-- V2 ONLY. DO NOT APPLY TO LEGACY.
-- Must be squashed into 00000000000000_baseline_v2.sql after validation.

begin;

-- -----------------------------------------------------------------------------
-- Admin RPC hardening
-- Public RPCs remain exposed API entrypoints but run as SECURITY INVOKER.
-- Privileged mutations live in the non-exposed private schema.
-- -----------------------------------------------------------------------------

create or replace function private.admin_set_user_role_impl(
  target_user_id uuid,
  target_role text,
  target_status text default 'active'
) returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if not private.is_admin() then
    raise exception 'admin required' using errcode='42501';
  end if;
  if target_role not in ('user','admin') or target_status not in ('active','disabled') then
    raise exception 'invalid role/status';
  end if;
  if not exists(select 1 from auth.users where id=target_user_id) then
    raise exception 'auth user does not exist';
  end if;
  insert into public.app_users(user_id,role,status)
  values(target_user_id,target_role,target_status)
  on conflict(user_id) do update
    set role=excluded.role,status=excluded.status,updated_at=now();
  if target_role='admin' then
    delete from public.profile_access where user_id=target_user_id;
  end if;
end;
$$;

create or replace function private.admin_assign_profile_access_impl(
  target_user_id uuid,
  target_profile_id uuid
) returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare r text; s text;
begin
  if not private.is_admin() then
    raise exception 'admin required' using errcode='42501';
  end if;
  select role,status into r,s from public.app_users where user_id=target_user_id;
  if r is null then raise exception 'app user does not exist'; end if;
  if r<>'user' or s<>'active' then raise exception 'mapping requires an active normal user'; end if;
  if not exists(select 1 from public.profiles where id=target_profile_id and is_active) then
    raise exception 'active profile does not exist';
  end if;
  if exists(select 1 from public.profile_access where user_id=target_user_id) then
    raise exception 'user already mapped';
  end if;
  if exists(select 1 from public.profile_access where profile_id=target_profile_id) then
    raise exception 'profile already mapped';
  end if;
  insert into public.profile_access(user_id,profile_id) values(target_user_id,target_profile_id);
end;
$$;

create or replace function private.admin_revoke_profile_access_impl(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if not private.is_admin() then
    raise exception 'admin required' using errcode='42501';
  end if;
  delete from public.profile_access where user_id=target_user_id;
end;
$$;

revoke execute on function private.admin_set_user_role_impl(uuid,text,text) from public, anon;
revoke execute on function private.admin_assign_profile_access_impl(uuid,uuid) from public, anon;
revoke execute on function private.admin_revoke_profile_access_impl(uuid) from public, anon;
grant execute on function private.admin_set_user_role_impl(uuid,text,text) to authenticated;
grant execute on function private.admin_assign_profile_access_impl(uuid,uuid) to authenticated;
grant execute on function private.admin_revoke_profile_access_impl(uuid) to authenticated;

create or replace function public.admin_set_user_role(
  target_user_id uuid,
  target_role text,
  target_status text default 'active'
) returns void
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.admin_set_user_role_impl(target_user_id,target_role,target_status);
$$;

create or replace function public.admin_assign_profile_access(
  target_user_id uuid,
  target_profile_id uuid
) returns void
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.admin_assign_profile_access_impl(target_user_id,target_profile_id);
$$;

create or replace function public.admin_revoke_profile_access(target_user_id uuid)
returns void
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.admin_revoke_profile_access_impl(target_user_id);
$$;

revoke all on function public.admin_set_user_role(uuid,text,text) from public,anon;
revoke all on function public.admin_assign_profile_access(uuid,uuid) from public,anon;
revoke all on function public.admin_revoke_profile_access(uuid) from public,anon;
grant execute on function public.admin_set_user_role(uuid,text,text) to authenticated;
grant execute on function public.admin_assign_profile_access(uuid,uuid) to authenticated;
grant execute on function public.admin_revoke_profile_access(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- RLS init-plan optimization
-- -----------------------------------------------------------------------------

drop policy if exists app_users_read_self on public.app_users;
create policy app_users_read_self on public.app_users
for select to authenticated
using (user_id = (select auth.uid()) and private.is_active_app_user());

-- -----------------------------------------------------------------------------
-- Cover foreign-key access paths reported by Supabase Performance Advisor.
-- -----------------------------------------------------------------------------

create index if not exists body_measurements_profile_id_idx on public.body_measurements(profile_id);
create index if not exists event_logs_actor_user_id_idx on public.event_logs(actor_user_id);
create index if not exists event_logs_target_profile_id_idx on public.event_logs(target_profile_id);
create index if not exists exercise_catalog_category_idx on public.exercise_catalog(exercise_category_id);
create index if not exists exercise_catalog_movement_idx on public.exercise_catalog(movement_pattern_id);
create index if not exists exercise_catalog_muscle_idx on public.exercise_catalog(primary_muscle_group_id);
create index if not exists exercise_records_exercise_id_idx on public.exercise_records(exercise_id);
create index if not exists profile_training_state_enrollment_profile_idx on public.profile_training_state(active_program_enrollment_id,profile_id);
create index if not exists profile_training_state_session_profile_idx on public.profile_training_state(last_completed_session_id,profile_id);
create index if not exists program_enrollments_program_id_idx on public.program_enrollments(program_id);
create index if not exists program_baselines_enrollment_program_idx on public.program_exercise_baselines(enrollment_id,program_id);
create index if not exists program_baselines_exercise_program_idx on public.program_exercise_baselines(program_exercise_id,program_id);
create index if not exists program_baselines_variation_idx on public.program_exercise_baselines(variation_exercise_id);
create index if not exists program_exposures_profile_idx on public.program_exercise_exposures(profile_id);
create index if not exists program_exposures_enrollment_profile_program_idx on public.program_exercise_exposures(enrollment_id,profile_id,program_id);
create index if not exists program_exposures_exercise_program_idx on public.program_exercise_exposures(program_exercise_id,program_id);
create index if not exists program_exposures_session_profile_idx on public.program_exercise_exposures(workout_session_id,profile_id);
create index if not exists program_exposures_variation_idx on public.program_exercise_exposures(variation_exercise_id);
create index if not exists program_substitutions_alternative_idx on public.program_exercise_substitutions(alternative_exercise_id);
create index if not exists program_exercises_exercise_idx on public.program_exercises(exercise_id);
create index if not exists program_exercises_program_idx on public.program_exercises(program_id);
create index if not exists program_exercises_session_program_idx on public.program_exercises(session_id,program_id);
create index if not exists program_phases_program_idx on public.program_phases(program_id);
create index if not exists progress_photos_profile_idx on public.progress_photos(profile_id);
create index if not exists workout_drafts_consumed_session_profile_idx on public.workout_drafts(consumed_session_id,profile_id);
create index if not exists workout_drafts_enrollment_profile_idx on public.workout_drafts(program_enrollment_id,profile_id);
create index if not exists workout_exercises_exercise_idx on public.workout_exercises(exercise_id);
create index if not exists workout_plan_alternatives_exercise_idx on public.workout_plan_exercise_alternatives(alternative_exercise_id);
create index if not exists workout_plan_exercises_exercise_idx on public.workout_plan_exercises(exercise_id);

commit;
