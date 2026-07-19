-- Perfis familiares usam somente acessos explicitos; user_id permanece historico.
create or replace function public.can_access_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = target_profile_id
      and (
        (p.family_group_id is null and p.user_id = auth.uid())
        or exists (
          select 1 from public.profile_access a
          where a.profile_id = p.id and a.user_id = auth.uid()
        )
      )
  );
$$;

-- Converte a conta tecnica em titular quando houver convite owner para seu email.
create or replace function public.normalize_my_family_access()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(auth.jwt()->>'email', ''));
  v_group_id uuid;
  v_profile_id uuid;
begin
  if auth.uid() is null or v_email = '' then return 0; end if;

  select m.group_id into v_group_id
  from public.family_members m
  where m.user_id = auth.uid() and m.role = 'bootstrap'
  limit 1;

  if v_group_id is null then return 0; end if;

  select i.profile_id into v_profile_id
  from public.family_invitations i
  where i.group_id = v_group_id
    and i.email = v_email
    and i.role = 'owner'
  limit 1;

  if v_profile_id is null then return 0; end if;

  delete from public.profile_access a
  using public.profiles p
  where a.profile_id = p.id
    and p.family_group_id = v_group_id
    and a.user_id = auth.uid();

  insert into public.profile_access(profile_id, user_id, role)
  values(v_profile_id, auth.uid(), 'owner')
  on conflict(profile_id, user_id) do update set role = 'owner';

  update public.family_members
  set role = 'member'
  where group_id = v_group_id and user_id = auth.uid();

  update public.family_invitations
  set accepted_at = coalesce(accepted_at, now())
  where group_id = v_group_id and profile_id = v_profile_id and email = v_email;

  return 1;
end;
$$;

revoke all on function public.normalize_my_family_access() from public;
grant execute on function public.normalize_my_family_access() to authenticated;
