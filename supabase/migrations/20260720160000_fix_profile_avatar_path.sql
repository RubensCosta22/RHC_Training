-- Corrige a validacao para aceitar arquivos dentro da pasta privada de avatars.
create or replace function public.update_profile_avatar(p_profile_id uuid, p_avatar_path text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_expected_prefix text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  select user_id into v_owner
  from public.profiles
  where id = p_profile_id and public.can_access_profile(id);

  if v_owner is null then raise exception 'profile not found or access denied'; end if;

  v_expected_prefix := v_owner::text || '/' || p_profile_id::text || '/avatars/';
  if p_avatar_path is null
    or p_avatar_path not like (v_expected_prefix || '%')
    or length(p_avatar_path) > 500
  then
    raise exception 'invalid avatar path';
  end if;

  update public.profiles set avatar_url = p_avatar_path where id = p_profile_id;
  return p_avatar_path;
end;
$$;

revoke all on function public.update_profile_avatar(uuid,text) from public;
grant execute on function public.update_profile_avatar(uuid,text) to authenticated;
