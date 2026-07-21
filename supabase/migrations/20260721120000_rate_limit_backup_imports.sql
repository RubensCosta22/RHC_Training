-- Protege importacoes pesadas sem alterar backups ou historicos existentes.
-- A implementacao atual e preservada como funcao interna; a RPC publica passa
-- a exigir autorizacao e consumir um limite atomico antes do processamento.

create or replace function public.enforce_security_rate_limit(p_action text)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer;
  v_window_seconds integer;
  v_window_started_at timestamptz;
  v_count integer;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;

  case p_action
    when 'avatar_upload' then v_limit := 10; v_window_seconds := 3600;
    when 'progress_photo_upload' then v_limit := 30; v_window_seconds := 3600;
    when 'telemetry_event' then v_limit := 120; v_window_seconds := 3600;
    when 'family_profile_create' then v_limit := 20; v_window_seconds := 86400;
    when 'family_invite' then v_limit := 30; v_window_seconds := 3600;
    when 'backup_import' then v_limit := 5; v_window_seconds := 3600;
    else raise exception 'unsupported rate limit action';
  end case;

  v_window_started_at := to_timestamp(
    floor(extract(epoch from now()) / v_window_seconds) * v_window_seconds
  );

  insert into public.security_rate_limits (
    user_id, action, window_started_at, request_count, updated_at
  ) values (
    v_user_id, p_action, v_window_started_at, 1, now()
  )
  on conflict (user_id, action, window_started_at)
  do update set
    request_count = public.security_rate_limits.request_count + 1,
    updated_at = now()
  returning request_count into v_count;

  if v_count > v_limit then raise exception 'rate limit exceeded'; end if;
end;
$$;

alter function public.import_profile_backup_secure(uuid, jsonb)
  rename to import_profile_backup_secure_internal;

revoke all on function public.import_profile_backup_secure_internal(uuid, jsonb) from public;
revoke all on function public.import_profile_backup_secure_internal(uuid, jsonb) from authenticated;

create function public.import_profile_backup_secure(
  p_profile_id uuid,
  p_backup jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.can_edit_profile(p_profile_id) then
    raise exception 'profile not found or access denied';
  end if;

  perform public.enforce_security_rate_limit('backup_import');
  return public.import_profile_backup_secure_internal(p_profile_id, p_backup);
end;
$$;

revoke all on function public.import_profile_backup_secure(uuid, jsonb) from public;
grant execute on function public.import_profile_backup_secure(uuid, jsonb) to authenticated;
