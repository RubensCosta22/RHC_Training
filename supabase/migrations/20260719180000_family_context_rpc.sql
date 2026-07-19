-- Le somente o contexto familiar da sessao, sem expor a tabela de membros.
create or replace function public.get_my_family_context()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null then
    return null;
  end if;

  select jsonb_build_object(
    'group_id', m.group_id,
    'role', m.role,
    'family_groups', jsonb_build_object('id', g.id, 'name', g.name)
  )
  into v_result
  from public.family_members m
  join public.family_groups g on g.id = m.group_id
  where m.user_id = auth.uid()
  limit 1;

  return v_result;
end;
$$;

revoke all on function public.get_my_family_context() from public;
grant execute on function public.get_my_family_context() to authenticated;
