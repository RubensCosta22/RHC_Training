-- Convites concedem papeis owner/admin e, portanto, so podem ser aceitos por
-- uma conta cujo e-mail esteja confirmado no Supabase Auth. Esta migration
-- substitui funcoes; nao executa alteracoes sobre dados ou acessos existentes.

create or replace function public.claim_family_profile()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_count integer := 0;
  r record;
begin
  if auth.uid() is null then return 0; end if;

  select lower(u.email) into v_email
  from auth.users u
  where u.id = auth.uid()
    and u.email is not null
    and u.email_confirmed_at is not null;

  if v_email is null or v_email = '' then return 0; end if;

  for r in
    select i.*
    from public.family_invitations i
    where lower(i.email) = v_email and i.accepted_at is null
    order by i.created_at, i.id
  loop
    if r.role = 'owner' and (
      r.profile_id is null or not exists (
        select 1 from public.profiles p
        where p.id = r.profile_id and p.family_group_id = r.group_id
      )
    ) then
      raise exception 'Convite de perfil invalido';
    end if;

    insert into public.family_members (group_id, user_id, role)
    values (
      r.group_id,
      auth.uid(),
      case when r.role = 'admin' then 'admin' else 'member' end
    )
    on conflict (user_id) do update set
      role = case
        when r.role = 'admin' then 'admin'
        else public.family_members.role
      end;

    if not exists (
      select 1 from public.family_members m
      where m.group_id = r.group_id and m.user_id = auth.uid()
    ) then
      raise exception 'Conta pertence a outro grupo';
    end if;

    if r.role = 'admin' then
      insert into public.profile_access (profile_id, user_id, role)
      select p.id, auth.uid(), 'admin'
      from public.profiles p
      where p.family_group_id = r.group_id
      on conflict (profile_id, user_id) do update set role = 'admin';
    else
      delete from public.profile_access a
      where a.profile_id = r.profile_id
        and a.role = 'owner'
        and a.user_id <> auth.uid();

      insert into public.profile_access (profile_id, user_id, role)
      values (r.profile_id, auth.uid(), 'owner')
      on conflict (profile_id, user_id) do update set role = 'owner';
    end if;

    update public.family_invitations
    set accepted_at = now()
    where id = r.id and accepted_at is null;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function public.normalize_my_family_access()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_group_id uuid;
  v_profile_id uuid;
begin
  if auth.uid() is null then return 0; end if;

  select lower(u.email) into v_email
  from auth.users u
  where u.id = auth.uid()
    and u.email is not null
    and u.email_confirmed_at is not null;

  if v_email is null or v_email = '' then return 0; end if;

  select m.group_id into v_group_id
  from public.family_members m
  where m.user_id = auth.uid() and m.role = 'bootstrap'
  limit 1;

  if v_group_id is null then return 0; end if;

  select i.profile_id into v_profile_id
  from public.family_invitations i
  join public.profiles p
    on p.id = i.profile_id and p.family_group_id = i.group_id
  where i.group_id = v_group_id
    and lower(i.email) = v_email
    and i.role = 'owner'
  limit 1;

  if v_profile_id is null then return 0; end if;

  delete from public.profile_access a
  using public.profiles p
  where a.profile_id = p.id
    and p.family_group_id = v_group_id
    and a.user_id = auth.uid();

  insert into public.profile_access (profile_id, user_id, role)
  values (v_profile_id, auth.uid(), 'owner')
  on conflict (profile_id, user_id) do update set role = 'owner';

  update public.family_members
  set role = 'member'
  where group_id = v_group_id and user_id = auth.uid();

  update public.family_invitations
  set accepted_at = coalesce(accepted_at, now())
  where group_id = v_group_id
    and profile_id = v_profile_id
    and lower(email) = v_email;

  return 1;
end;
$$;

revoke all on function public.claim_family_profile() from public;
revoke all on function public.normalize_my_family_access() from public;
grant execute on function public.claim_family_profile() to authenticated;
grant execute on function public.normalize_my_family_access() to authenticated;
