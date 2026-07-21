-- Telemetria passa por uma RPC autenticada e limitada. Eventos historicos nao
-- sao atualizados ou removidos; actor_user_id sera preenchido apenas no futuro.

alter table public.event_logs
  add column if not exists actor_user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_event_logs_actor_created
  on public.event_logs(actor_user_id, created_at desc);

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
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  case p_action
    when 'avatar_upload' then
      v_limit := 10;
      v_window_seconds := 3600;
    when 'progress_photo_upload' then
      v_limit := 30;
      v_window_seconds := 3600;
    when 'telemetry_event' then
      v_limit := 120;
      v_window_seconds := 3600;
    else
      raise exception 'unsupported rate limit action';
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

  if v_count > v_limit then
    raise exception 'rate limit exceeded';
  end if;
end;
$$;

create or replace function public.log_app_event(
  p_event_name text,
  p_event_data jsonb default '{}'::jsonb,
  p_profile_id uuid default null,
  p_page text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_owner uuid;
  v_event_id uuid;
  v_name text := trim(p_event_name);
  v_page text := nullif(trim(p_page), '');
  v_data jsonb := coalesce(p_event_data, '{}'::jsonb);
begin
  if v_actor is null then
    raise exception 'authentication required';
  end if;

  perform public.enforce_security_rate_limit('telemetry_event');

  if v_name !~ '^[a-z0-9_.:-]{1,80}$' then
    raise exception 'invalid event name';
  end if;
  if pg_column_size(v_data) > 16384 then
    raise exception 'event data too large';
  end if;
  if v_page is not null and (length(v_page) > 300 or left(v_page, 1) <> '/') then
    raise exception 'invalid event page';
  end if;

  if p_profile_id is null then
    v_owner := v_actor;
  else
    if not public.can_view_profile(p_profile_id) then
      raise exception 'profile not found or access denied';
    end if;

    select p.user_id into v_owner
    from public.profiles p
    where p.id = p_profile_id;
  end if;

  insert into public.event_logs (
    user_id, actor_user_id, profile_id, event_name, event_data, page
  ) values (
    v_owner, v_actor, p_profile_id, v_name, v_data, v_page
  ) returning id into v_event_id;

  return v_event_id;
end;
$$;

drop policy if exists "event_logs_insert_own" on public.event_logs;
drop policy if exists "event_logs_select_own" on public.event_logs;

create policy "event_logs_select_actor"
on public.event_logs for select to authenticated
using (coalesce(actor_user_id, user_id) = auth.uid());

revoke insert on table public.event_logs from authenticated;
revoke all on function public.log_app_event(text, jsonb, uuid, text) from public;
grant execute on function public.log_app_event(text, jsonb, uuid, text) to authenticated;

