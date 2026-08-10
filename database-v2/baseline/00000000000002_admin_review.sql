-- RHCT-DATA-002 review-only admin patch.
-- DO NOT APPLY TO LEGACY. Must be squashed into baseline after review.
begin;

create or replace function private.protect_last_active_admin()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare remaining_admins bigint;
begin
  if (tg_op='DELETE' and old.role='admin' and old.status='active')
     or (tg_op='UPDATE' and old.role='admin' and old.status='active' and (new.role<>'admin' or new.status<>'active')) then
    select count(*) into remaining_admins from public.app_users
    where role='admin' and status='active' and user_id<>old.user_id;
    if remaining_admins=0 then
      raise exception 'cannot remove, demote or disable the last active admin' using errcode='23514';
    end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;
revoke execute on function private.protect_last_active_admin() from public, anon, authenticated;

drop trigger if exists app_users_protect_last_admin on public.app_users;
create trigger app_users_protect_last_admin
before update of role,status or delete on public.app_users
for each row execute function private.protect_last_active_admin();

create or replace function private.bootstrap_first_admin(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if exists(select 1 from public.app_users where role='admin' and status='active') then
    raise exception 'an active admin already exists';
  end if;
  if not exists(select 1 from auth.users where id=target_user_id) then
    raise exception 'auth user does not exist';
  end if;
  insert into public.app_users(user_id,role,status) values(target_user_id,'admin','active')
  on conflict(user_id) do update set role='admin',status='active',updated_at=now();
end;
$$;
revoke execute on function private.bootstrap_first_admin(uuid) from public, anon, authenticated;
grant execute on function private.bootstrap_first_admin(uuid) to service_role;

create or replace function public.admin_set_user_role(target_user_id uuid,target_role text,target_status text default 'active')
returns void language plpgsql security definer set search_path=pg_catalog,public,private as $$
begin
  if not private.is_admin() then raise exception 'admin required' using errcode='42501'; end if;
  if target_role not in ('user','admin') or target_status not in ('active','disabled') then raise exception 'invalid role/status'; end if;
  if not exists(select 1 from auth.users where id=target_user_id) then raise exception 'auth user does not exist'; end if;
  insert into public.app_users(user_id,role,status) values(target_user_id,target_role,target_status)
  on conflict(user_id) do update set role=excluded.role,status=excluded.status,updated_at=now();
  if target_role='admin' then delete from public.profile_access where user_id=target_user_id; end if;
end;
$$;

create or replace function public.admin_assign_profile_access(target_user_id uuid,target_profile_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare r text; s text;
begin
  if not private.is_admin() then raise exception 'admin required' using errcode='42501'; end if;
  select role,status into r,s from public.app_users where user_id=target_user_id;
  if r is null then raise exception 'app user does not exist'; end if;
  if r<>'user' or s<>'active' then raise exception 'mapping requires an active normal user'; end if;
  if not exists(select 1 from public.profiles where id=target_profile_id and is_active) then raise exception 'active profile does not exist'; end if;
  if exists(select 1 from public.profile_access where user_id=target_user_id) then raise exception 'user already mapped'; end if;
  if exists(select 1 from public.profile_access where profile_id=target_profile_id) then raise exception 'profile already mapped'; end if;
  insert into public.profile_access(user_id,profile_id) values(target_user_id,target_profile_id);
end;
$$;

create or replace function public.admin_revoke_profile_access(target_user_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog,public,private as $$
begin
  if not private.is_admin() then raise exception 'admin required' using errcode='42501'; end if;
  delete from public.profile_access where user_id=target_user_id;
end;
$$;

revoke all on function public.admin_set_user_role(uuid,text,text) from public,anon;
revoke all on function public.admin_assign_profile_access(uuid,uuid) from public,anon;
revoke all on function public.admin_revoke_profile_access(uuid) from public,anon;
grant execute on function public.admin_set_user_role(uuid,text,text) to authenticated;
grant execute on function public.admin_assign_profile_access(uuid,uuid) to authenticated;
grant execute on function public.admin_revoke_profile_access(uuid) to authenticated;

commit;