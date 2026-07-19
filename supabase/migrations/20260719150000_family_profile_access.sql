-- Acesso familiar por perfil, sem mover ou apagar historicos existentes.
create table if not exists public.family_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 80),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.family_members (
  group_id uuid not null references public.family_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','member')),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id),
  unique (user_id)
);

alter table public.profiles add column if not exists family_group_id uuid references public.family_groups(id);

create table if not exists public.profile_access (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','owner')),
  created_at timestamptz not null default now(),
  primary key (profile_id, user_id)
);

create table if not exists public.family_invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.family_groups(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  email text not null,
  invited_by uuid not null references auth.users(id),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (profile_id),
  unique (group_id, email)
);

create or replace function public.can_access_profile(target_profile_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from public.profiles p
    where p.id=target_profile_id and (
      p.user_id=auth.uid() or exists (
        select 1 from public.profile_access a
        where a.profile_id=p.id and a.user_id=auth.uid()
      )
    )
  );
$$;

create or replace function public.is_family_admin(target_group_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.family_members m where m.group_id=target_group_id and m.user_id=auth.uid() and m.role='admin');
$$;

revoke all on function public.can_access_profile(uuid) from public;
revoke all on function public.is_family_admin(uuid) from public;
grant execute on function public.can_access_profile(uuid), public.is_family_admin(uuid) to authenticated;

alter table public.family_groups enable row level security;
alter table public.family_members enable row level security;
alter table public.profile_access enable row level security;
alter table public.family_invitations enable row level security;

create policy "groups_member_read" on public.family_groups for select to authenticated using (
  exists(select 1 from public.family_members m where m.group_id=id and m.user_id=auth.uid())
);
create policy "members_group_read" on public.family_members for select to authenticated using (
  user_id=auth.uid() or public.is_family_admin(group_id)
);
create policy "access_own_or_admin_read" on public.profile_access for select to authenticated using (
  user_id=auth.uid() or exists(select 1 from public.profiles p where p.id=profile_id and public.is_family_admin(p.family_group_id))
);
create policy "invitations_admin_read" on public.family_invitations for select to authenticated using (public.is_family_admin(group_id));

create or replace function public.create_family_group(p_name text default 'Minha familia')
returns uuid language plpgsql security definer set search_path=public as $$
declare v_group uuid;
begin
  if auth.uid() is null then raise exception 'Sessao invalida'; end if;
  if exists(select 1 from public.family_members where user_id=auth.uid()) then raise exception 'Conta ja pertence a um grupo'; end if;
  insert into public.family_groups(name,created_by) values(left(trim(p_name),80),auth.uid()) returning id into v_group;
  insert into public.family_members(group_id,user_id,role) values(v_group,auth.uid(),'admin');
  update public.profiles set family_group_id=v_group where user_id=auth.uid() and family_group_id is null;
  insert into public.profile_access(profile_id,user_id,role)
    select id,auth.uid(),'admin' from public.profiles where family_group_id=v_group
    on conflict(profile_id,user_id) do update set role='admin';
  return v_group;
end; $$;

create or replace function public.invite_profile_user(p_profile_id uuid, p_email text)
returns void language plpgsql security definer set search_path=public as $$
declare v_group uuid; v_email text:=lower(trim(p_email));
begin
  select family_group_id into v_group from public.profiles where id=p_profile_id;
  if v_group is null or not public.is_family_admin(v_group) then raise exception 'Acesso de administrador necessario'; end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then raise exception 'Email invalido'; end if;
  insert into public.family_invitations(group_id,profile_id,email,invited_by)
  values(v_group,p_profile_id,v_email,auth.uid())
  on conflict(profile_id) do update set email=excluded.email,invited_by=auth.uid(),accepted_at=null,created_at=now();
end; $$;

create or replace function public.claim_family_profile()
returns integer language plpgsql security definer set search_path=public as $$
declare v_email text:=lower(coalesce(auth.jwt()->>'email','')); v_count int:=0; r record;
begin
  if auth.uid() is null or v_email='' then return 0; end if;
  for r in select * from public.family_invitations where email=v_email and accepted_at is null loop
    insert into public.family_members(group_id,user_id,role) values(r.group_id,auth.uid(),'member') on conflict(user_id) do nothing;
    if not exists(select 1 from public.family_members where group_id=r.group_id and user_id=auth.uid()) then raise exception 'Conta pertence a outro grupo'; end if;
    delete from public.profile_access where profile_id=r.profile_id and role='owner' and user_id<>auth.uid();
    insert into public.profile_access(profile_id,user_id,role) values(r.profile_id,auth.uid(),'owner') on conflict(profile_id,user_id) do update set role='owner';
    update public.family_invitations set accepted_at=now() where id=r.id;
    v_count:=v_count+1;
  end loop;
  return v_count;
end; $$;

revoke all on function public.create_family_group(text), public.invite_profile_user(uuid,text), public.claim_family_profile() from public;
grant execute on function public.create_family_group(text), public.invite_profile_user(uuid,text), public.claim_family_profile() to authenticated;

-- Perfis ficam visiveis somente ao titular associado e aos administradores.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_access" on public.profiles for select to authenticated using (public.can_access_profile(id));

-- Dados filhos seguem o acesso do perfil, mantendo user_id legado inalterado.
drop policy if exists "sessions_select_own" on public.workout_sessions;
create policy "sessions_select_access" on public.workout_sessions for select to authenticated using (public.can_access_profile(profile_id));
drop policy if exists "records_select_own" on public.exercise_records;
create policy "records_select_access" on public.exercise_records for select to authenticated using (public.can_access_profile(profile_id));
drop policy if exists "measurements_select_own" on public.body_measurements;
create policy "measurements_select_access" on public.body_measurements for select to authenticated using (public.can_access_profile(profile_id));
drop policy if exists "photos_select_own" on public.progress_photos;
create policy "photos_select_access" on public.progress_photos for select to authenticated using (public.can_access_profile(profile_id));

create index if not exists idx_profile_access_user on public.profile_access(user_id);
create index if not exists idx_family_invitation_email on public.family_invitations(lower(email)) where accepted_at is null;

-- O caminho continua usando o proprietario historico, mas o acesso segue o perfil.
create or replace function public.can_access_progress_photo(object_name text)
returns boolean language plpgsql stable security definer set search_path=public,storage as $$
declare folders text[]; profile_folder uuid; profile_owner uuid;
begin
  folders:=storage.foldername(object_name);
  if array_length(folders,1)<3 then return false; end if;
  begin profile_folder:=folders[2]::uuid; profile_owner:=folders[1]::uuid;
  exception when others then return false; end;
  return exists(select 1 from public.profiles p where p.id=profile_folder and p.user_id=profile_owner and public.can_access_profile(p.id));
end; $$;

drop policy if exists "sessions_insert_own" on public.workout_sessions;
drop policy if exists "sessions_update_own" on public.workout_sessions;
drop policy if exists "sessions_delete_own" on public.workout_sessions;
create policy "sessions_insert_access" on public.workout_sessions for insert to authenticated with check (public.can_access_profile(profile_id) and user_id=(select user_id from public.profiles where id=profile_id));
create policy "sessions_update_access" on public.workout_sessions for update to authenticated using (public.can_access_profile(profile_id)) with check (public.can_access_profile(profile_id));
create policy "sessions_delete_access" on public.workout_sessions for delete to authenticated using (public.can_access_profile(profile_id));

drop policy if exists "records_insert_own" on public.exercise_records;
drop policy if exists "records_update_own" on public.exercise_records;
drop policy if exists "records_delete_own" on public.exercise_records;
create policy "records_insert_access" on public.exercise_records for insert to authenticated with check (public.can_access_profile(profile_id) and user_id=(select user_id from public.profiles where id=profile_id));
create policy "records_update_access" on public.exercise_records for update to authenticated using (public.can_access_profile(profile_id)) with check (public.can_access_profile(profile_id));
create policy "records_delete_access" on public.exercise_records for delete to authenticated using (public.can_access_profile(profile_id));

drop policy if exists "measurements_insert_own" on public.body_measurements;
drop policy if exists "measurements_update_own" on public.body_measurements;
drop policy if exists "measurements_delete_own" on public.body_measurements;
create policy "measurements_insert_access" on public.body_measurements for insert to authenticated with check (public.can_access_profile(profile_id) and user_id=(select user_id from public.profiles where id=profile_id));
create policy "measurements_update_access" on public.body_measurements for update to authenticated using (public.can_access_profile(profile_id)) with check (public.can_access_profile(profile_id));
create policy "measurements_delete_access" on public.body_measurements for delete to authenticated using (public.can_access_profile(profile_id));

drop policy if exists "photos_insert_own" on public.progress_photos;
drop policy if exists "photos_update_own" on public.progress_photos;
drop policy if exists "photos_delete_own" on public.progress_photos;
create policy "photos_insert_access" on public.progress_photos for insert to authenticated with check (public.can_access_profile(profile_id) and user_id=(select user_id from public.profiles where id=profile_id));
create policy "photos_update_access" on public.progress_photos for update to authenticated using (public.can_access_profile(profile_id)) with check (public.can_access_profile(profile_id));
create policy "photos_delete_access" on public.progress_photos for delete to authenticated using (public.can_access_profile(profile_id));

drop policy if exists "exercises_select_own" on public.workout_exercises;
drop policy if exists "exercises_insert_own" on public.workout_exercises;
drop policy if exists "exercises_update_own" on public.workout_exercises;
drop policy if exists "exercises_delete_own" on public.workout_exercises;
create policy "exercises_select_access" on public.workout_exercises for select to authenticated using (exists(select 1 from public.workout_sessions s where s.id=session_id and public.can_access_profile(s.profile_id)));
create policy "exercises_insert_access" on public.workout_exercises for insert to authenticated with check (exists(select 1 from public.workout_sessions s where s.id=session_id and public.can_access_profile(s.profile_id)));
create policy "exercises_update_access" on public.workout_exercises for update to authenticated using (exists(select 1 from public.workout_sessions s where s.id=session_id and public.can_access_profile(s.profile_id))) with check (exists(select 1 from public.workout_sessions s where s.id=session_id and public.can_access_profile(s.profile_id)));
create policy "exercises_delete_access" on public.workout_exercises for delete to authenticated using (exists(select 1 from public.workout_sessions s where s.id=session_id and public.can_access_profile(s.profile_id)));

-- Mantem os RPCs atomicos e troca somente a verificacao de dono por acesso ao perfil.
do $$
declare fn record; definition text;
begin
  for fn in
    select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('save_workout_session_atomic','import_profile_backup_atomic')
  loop
    definition:=pg_get_functiondef(fn.oid);
    definition:=replace(definition,
      'where id = p_profile_id and user_id = v_user_id',
      'where id = p_profile_id and public.can_access_profile(id)');
    definition:=replace(definition,
      'raise exception ''profile not found or access denied'';' || chr(10) || '  end if;',
      'raise exception ''profile not found or access denied'';' || chr(10) || '  end if;' || chr(10) || chr(10) ||
      '  select user_id into v_user_id from public.profiles where id = p_profile_id;');
    if position('select user_id into v_user_id from public.profiles where id = p_profile_id' in definition)=0
       or position('public.can_access_profile(id)' in definition)=0 then
      raise exception 'Nao foi possivel atualizar com seguranca a funcao atomica %', fn.oid;
    end if;
    execute definition;
  end loop;
end $$;
