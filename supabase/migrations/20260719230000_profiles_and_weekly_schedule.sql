create table if not exists public.workout_weekly_schedule (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  workout_type text check (workout_type is null or workout_type in ('A','B','C','D','E')),
  updated_at timestamptz not null default now(),
  primary key(profile_id, day_of_week)
);

alter table public.workout_weekly_schedule enable row level security;
create policy "schedule_read_access" on public.workout_weekly_schedule for select to authenticated using (public.can_access_profile(profile_id));
create policy "schedule_admin_insert" on public.workout_weekly_schedule for insert to authenticated with check (exists(select 1 from public.profiles p where p.id=profile_id and public.is_family_admin(p.family_group_id)));
create policy "schedule_admin_update" on public.workout_weekly_schedule for update to authenticated using (exists(select 1 from public.profiles p where p.id=profile_id and public.is_family_admin(p.family_group_id))) with check (exists(select 1 from public.profiles p where p.id=profile_id and public.is_family_admin(p.family_group_id)));
create policy "schedule_admin_delete" on public.workout_weekly_schedule for delete to authenticated using (exists(select 1 from public.profiles p where p.id=profile_id and public.is_family_admin(p.family_group_id)));
grant select,insert,update,delete on public.workout_weekly_schedule to authenticated;

create or replace function public.create_family_profile(p_name text,p_age int,p_gender text,p_goal text,p_email text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_group uuid; v_owner uuid; v_profile uuid; v_email text:=lower(trim(p_email));
begin
  select m.group_id into v_group from public.family_members m where m.user_id=auth.uid() and m.role='admin' limit 1;
  if v_group is null then raise exception 'Acesso de administrador necessario'; end if;
  if p_age not between 1 and 120 or p_gender not in ('homem','mulher','outro') then raise exception 'Dados do perfil invalidos'; end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then raise exception 'Email invalido'; end if;
  select created_by into v_owner from public.family_groups where id=v_group;
  insert into public.profiles(user_id,name,age,gender,goal,avatar_url,family_group_id)
  values(v_owner,left(trim(p_name),80),p_age,p_gender,left(trim(p_goal),160),upper(left(trim(p_name),1)),v_group)
  on conflict(user_id,name) do update set age=excluded.age,gender=excluded.gender,goal=excluded.goal,family_group_id=v_group
  returning id into v_profile;
  insert into public.profile_access(profile_id,user_id,role) values(v_profile,auth.uid(),'admin') on conflict(profile_id,user_id) do update set role='admin';
  insert into public.family_invitations(group_id,profile_id,email,role,invited_by)
  values(v_group,v_profile,v_email,'owner',auth.uid()) on conflict(profile_id) do update set email=excluded.email,accepted_at=null,created_at=now();
  return v_profile;
end $$;
revoke all on function public.create_family_profile(text,int,text,text,text) from public;
grant execute on function public.create_family_profile(text,int,text,text,text) to authenticated;
