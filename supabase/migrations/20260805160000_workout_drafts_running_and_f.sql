-- RHCT-TRAIN-001 — additive persistence for drafts, running metrics and workout F.
-- No historical row is updated or deleted by this migration.

alter table public.workout_sessions
  drop constraint if exists workout_sessions_workout_type_check;

alter table public.workout_sessions
  add constraint workout_sessions_workout_type_check
  check (workout_type in ('A', 'B', 'C', 'D', 'E', 'F'));

alter table public.workout_sessions
  add column if not exists source_draft_id uuid,
  add column if not exists distance_meters integer check (distance_meters is null or distance_meters >= 0),
  add column if not exists duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  add column if not exists average_pace_seconds_per_km integer check (average_pace_seconds_per_km is null or average_pace_seconds_per_km > 0),
  add column if not exists activity_mode text check (activity_mode is null or activity_mode in ('manual', 'stopwatch', 'gps'));

create unique index if not exists uq_workout_sessions_source_draft
  on public.workout_sessions(source_draft_id)
  where source_draft_id is not null;

create table if not exists public.workout_drafts (
  draft_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  workout_type text not null check (workout_type in ('A', 'B', 'C', 'D', 'E', 'F')),
  program_enrollment_id uuid null,
  plan_fingerprint text null check (plan_fingerprint is null or length(plan_fingerprint) <= 160),
  payload jsonb not null default '{}'::jsonb,
  version bigint not null default 1 check (version > 0),
  consumed_session_id uuid null references public.workout_sessions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (pg_column_size(payload) <= 262144)
);

create index if not exists idx_workout_drafts_owner_profile
  on public.workout_drafts(user_id, profile_id, workout_type, updated_at desc);

alter table public.workout_drafts enable row level security;

drop policy if exists "workout_drafts_select_owner_editor" on public.workout_drafts;
drop policy if exists "workout_drafts_insert_owner_editor" on public.workout_drafts;
drop policy if exists "workout_drafts_update_owner_editor" on public.workout_drafts;
drop policy if exists "workout_drafts_delete_owner_editor" on public.workout_drafts;

create policy "workout_drafts_select_owner_editor"
on public.workout_drafts for select to authenticated
using (user_id = auth.uid() and public.can_edit_profile(profile_id));

create policy "workout_drafts_insert_owner_editor"
on public.workout_drafts for insert to authenticated
with check (user_id = auth.uid() and public.can_edit_profile(profile_id));

create policy "workout_drafts_update_owner_editor"
on public.workout_drafts for update to authenticated
using (user_id = auth.uid() and public.can_edit_profile(profile_id))
with check (user_id = auth.uid() and public.can_edit_profile(profile_id));

create policy "workout_drafts_delete_owner_editor"
on public.workout_drafts for delete to authenticated
using (user_id = auth.uid() and public.can_edit_profile(profile_id));

create or replace function public.save_family_workout_session_v2(
  p_profile_id uuid,
  p_workout_type text,
  p_date date,
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
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.workout_sessions;
  v_result jsonb;
  v_session_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not public.can_edit_profile(p_profile_id) then
    raise exception 'profile not found or access denied';
  end if;

  if p_source_draft_id is not null then
    select * into v_existing
    from public.workout_sessions
    where source_draft_id = p_source_draft_id
      and profile_id = p_profile_id;
    if found then return to_jsonb(v_existing); end if;
  end if;

  begin
    v_result := public.save_family_workout_session_atomic(
      p_profile_id, p_workout_type, p_date, p_gym_name,
      p_duration_minutes, p_completion_percentage, p_total_volume,
      p_notes, p_exercises
    );
    v_session_id := (v_result->>'id')::uuid;

    update public.workout_sessions
    set source_draft_id = p_source_draft_id,
        distance_meters = p_distance_meters,
        duration_seconds = p_duration_seconds,
        average_pace_seconds_per_km = p_average_pace_seconds_per_km,
        activity_mode = p_activity_mode
    where id = v_session_id
    returning to_jsonb(workout_sessions.*) into v_result;

    if p_source_draft_id is not null then
      update public.workout_drafts
      set consumed_session_id = v_session_id, updated_at = now(), version = version + 1
      where draft_id = p_source_draft_id
        and user_id = auth.uid()
        and profile_id = p_profile_id;
    end if;

    return v_result;
  exception when unique_violation then
    if p_source_draft_id is null then raise; end if;
    select * into v_existing
    from public.workout_sessions
    where source_draft_id = p_source_draft_id
      and profile_id = p_profile_id;
    if found then return to_jsonb(v_existing); end if;
    raise;
  end;
end;
$$;

revoke all on function public.save_family_workout_session_v2(
  uuid, text, date, text, integer, numeric, numeric, text, jsonb,
  uuid, integer, integer, integer, text
) from public;
grant execute on function public.save_family_workout_session_v2(
  uuid, text, date, text, integer, numeric, numeric, text, jsonb,
  uuid, integer, integer, integer, text
) to authenticated;
