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

  if p_workout_code not in ('A','B','C','D','E','F') then
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

revoke all on function public.save_workout_draft_v2(uuid, uuid, text, uuid, text, jsonb) from public, anon;
grant execute on function public.save_workout_draft_v2(uuid, uuid, text, uuid, text, jsonb) to authenticated;
