-- Limita mutacoes administrativas que criam perfis ou reatribuem convites.
-- A migration substitui funcoes e nao altera dados ou historicos existentes.

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
    when 'family_profile_create' then
      v_limit := 20;
      v_window_seconds := 86400;
    when 'family_invite' then
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

create or replace function public.create_family_profile(
  p_name text,
  p_age int,
  p_gender text,
  p_goal text,
  p_email text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group uuid;
  v_owner uuid;
  v_profile uuid;
  v_name text := trim(p_name);
  v_goal text := trim(p_goal);
  v_email text := lower(trim(p_email));
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select m.group_id into v_group
  from public.family_members m
  where m.user_id = auth.uid() and m.role = 'admin'
  limit 1;

  if v_group is null then
    raise exception 'Acesso de administrador necessario';
  end if;
  if v_name = '' or length(v_name) > 80
    or v_goal = '' or length(v_goal) > 160
    or p_age not between 1 and 120
    or p_gender not in ('homem', 'mulher', 'outro')
  then
    raise exception 'Dados do perfil invalidos';
  end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then
    raise exception 'Email invalido';
  end if;

  perform public.enforce_security_rate_limit('family_profile_create');

  select g.created_by into v_owner
  from public.family_groups g
  where g.id = v_group;

  if v_owner is null then
    raise exception 'Grupo familiar invalido';
  end if;

  if exists (
    select 1 from public.profiles p
    where p.user_id = v_owner and p.name = v_name
  ) then
    raise exception 'Ja existe um perfil com este nome';
  end if;

  insert into public.profiles (
    user_id, name, age, gender, goal, avatar_url, family_group_id
  ) values (
    v_owner, v_name, p_age, p_gender, v_goal, upper(left(v_name, 1)), v_group
  ) returning id into v_profile;

  insert into public.profile_access (profile_id, user_id, role)
  values (v_profile, auth.uid(), 'admin');

  insert into public.family_invitations (
    group_id, profile_id, email, role, invited_by
  ) values (
    v_group, v_profile, v_email, 'owner', auth.uid()
  );

  return v_profile;
end;
$$;

create or replace function public.invite_profile_user(
  p_profile_id uuid,
  p_email text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group uuid;
  v_email text := lower(trim(p_email));
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select p.family_group_id into v_group
  from public.profiles p
  where p.id = p_profile_id;

  if v_group is null or not public.is_family_admin(v_group) then
    raise exception 'Acesso de administrador necessario';
  end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then
    raise exception 'Email invalido';
  end if;

  perform public.enforce_security_rate_limit('family_invite');

  insert into public.family_invitations (
    group_id, profile_id, email, role, invited_by
  ) values (
    v_group, p_profile_id, v_email, 'owner', auth.uid()
  )
  on conflict (profile_id) do update set
    email = excluded.email,
    role = 'owner',
    invited_by = auth.uid(),
    accepted_at = null,
    created_at = now();
end;
$$;

revoke all on function public.create_family_profile(text, int, text, text, text) from public;
revoke all on function public.invite_profile_user(uuid, text) from public;
grant execute on function public.create_family_profile(text, int, text, text, text) to authenticated;
grant execute on function public.invite_profile_user(uuid, text) to authenticated;

