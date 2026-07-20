-- Impede que a criacao de um perfil familiar reaproveite um perfil historico
-- com o mesmo (user_id, name). Esta migration substitui apenas a funcao; nao
-- altera, move ou remove nenhuma linha existente.
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

  select g.created_by into v_owner
  from public.family_groups g
  where g.id = v_group;

  if v_owner is null then
    raise exception 'Grupo familiar invalido';
  end if;

  -- Nunca converte um perfil existente em perfil familiar. Isso preserva o
  -- escopo e todos os vinculos historicos do perfil original.
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

revoke all on function public.create_family_profile(text, int, text, text, text) from public;
grant execute on function public.create_family_profile(text, int, text, text, text) to authenticated;
