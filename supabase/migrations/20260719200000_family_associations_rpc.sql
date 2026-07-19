-- Lista associacoes somente para administrador ou bootstrap do grupo.
create or replace function public.get_family_profile_associations()
returns table (
  id uuid,
  name text,
  family_group_id uuid,
  invitation_email text,
  invitation_accepted_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
begin
  select m.group_id into v_group_id
  from public.family_members m
  where m.user_id = auth.uid()
    and m.role in ('admin', 'bootstrap')
  limit 1;

  if v_group_id is null then
    raise exception 'Acesso de administrador necessario';
  end if;

  return query
  select p.id, p.name, p.family_group_id, i.email, i.accepted_at
  from public.profiles p
  left join public.family_invitations i
    on i.profile_id = p.id and i.role = 'owner'
  where p.family_group_id = v_group_id
  order by p.name;
end;
$$;

revoke all on function public.get_family_profile_associations() from public;
grant execute on function public.get_family_profile_associations() to authenticated;
