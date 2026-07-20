-- Rate limiting atomico para operacoes server-side.
-- Nao altera nem remove dados de negocio ou historico do aplicativo.
create table if not exists public.security_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, action, window_started_at)
);

alter table public.security_rate_limits enable row level security;
revoke all on table public.security_rate_limits from anon, authenticated;

create index if not exists idx_security_rate_limits_updated_at
  on public.security_rate_limits(updated_at);

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

revoke all on function public.enforce_security_rate_limit(text) from public;
grant execute on function public.enforce_security_rate_limit(text) to authenticated;
