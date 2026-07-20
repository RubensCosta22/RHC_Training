-- Correcoes P0 da auditoria de seguranca.
-- Migration estritamente nao destrutiva para dados: nao remove nem altera
-- perfis, treinos, exercicios, medidas, fotos, convites ou historico.

-- Matriz central de autorizacao por perfil.
-- viewer: leitura
-- editor: leitura e escrita de dados de treino
-- owner/admin: leitura, escrita e gerenciamento do perfil
create or replace function public.can_view_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.profiles p
    where p.id = target_profile_id
      and (
        (p.family_group_id is null and p.user_id = auth.uid())
        or exists (
          select 1
          from public.profile_access a
          where a.profile_id = p.id
            and a.user_id = auth.uid()
            and a.role in ('viewer', 'editor', 'owner', 'admin')
        )
      )
  );
$$;

create or replace function public.can_edit_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.profiles p
    where p.id = target_profile_id
      and (
        (p.family_group_id is null and p.user_id = auth.uid())
        or exists (
          select 1
          from public.profile_access a
          where a.profile_id = p.id
            and a.user_id = auth.uid()
            and a.role in ('editor', 'owner', 'admin')
        )
      )
  );
$$;

create or replace function public.can_manage_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.profiles p
    where p.id = target_profile_id
      and (
        (p.family_group_id is null and p.user_id = auth.uid())
        or exists (
          select 1
          from public.profile_access a
          where a.profile_id = p.id
            and a.user_id = auth.uid()
            and a.role in ('owner', 'admin')
        )
      )
  );
$$;

-- Compatibilidade: chamadas existentes de leitura continuam funcionando,
-- agora com semantica explicita de visualizacao.
create or replace function public.can_access_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_view_profile(target_profile_id);
$$;

revoke all on function public.can_view_profile(uuid) from public;
revoke all on function public.can_edit_profile(uuid) from public;
revoke all on function public.can_manage_profile(uuid) from public;
revoke all on function public.can_access_profile(uuid) from public;
grant execute on function public.can_view_profile(uuid) to authenticated;
grant execute on function public.can_edit_profile(uuid) to authenticated;
grant execute on function public.can_manage_profile(uuid) to authenticated;
grant execute on function public.can_access_profile(uuid) to authenticated;

-- Reconstroi as policies das tabelas de perfil e historico. Somente policies
-- sao substituidas; nenhuma linha e removida ou regravada.
do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles',
        'workout_sessions',
        'workout_exercises',
        'exercise_records',
        'body_measurements',
        'progress_photos'
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      p.policyname,
      p.schemaname,
      p.tablename
    );
  end loop;
end;
$$;

-- O user_id historico autoriza apenas perfis individuais. Em perfis familiares,
-- a autorizacao vem exclusivamente de profile_access.
create policy "profiles_select_by_role"
on public.profiles for select to authenticated
using (public.can_view_profile(id));

create policy "profiles_insert_individual_own"
on public.profiles for insert to authenticated
with check (family_group_id is null and user_id = auth.uid());

-- UPDATE e DELETE diretos de perfil permanecem bloqueados. Alteracoes pontuais,
-- como avatar, passam por RPC que nao permite trocar user_id/family_group_id.

create policy "sessions_select_by_role"
on public.workout_sessions for select to authenticated
using (public.can_view_profile(profile_id));

create policy "sessions_insert_editor"
on public.workout_sessions for insert to authenticated
with check (
  public.can_edit_profile(profile_id)
  and user_id = (select p.user_id from public.profiles p where p.id = profile_id)
);

create policy "sessions_update_editor"
on public.workout_sessions for update to authenticated
using (public.can_edit_profile(profile_id))
with check (
  public.can_edit_profile(profile_id)
  and user_id = (select p.user_id from public.profiles p where p.id = profile_id)
);

-- Exclusao fisica nao e concedida. O app usa archived_at.

create policy "exercises_select_by_role"
on public.workout_exercises for select to authenticated
using (
  exists (
    select 1 from public.workout_sessions s
    where s.id = session_id and public.can_view_profile(s.profile_id)
  )
);

create policy "exercises_insert_editor"
on public.workout_exercises for insert to authenticated
with check (
  exists (
    select 1 from public.workout_sessions s
    where s.id = session_id and public.can_edit_profile(s.profile_id)
  )
);

create policy "exercises_update_editor"
on public.workout_exercises for update to authenticated
using (
  exists (
    select 1 from public.workout_sessions s
    where s.id = session_id and public.can_edit_profile(s.profile_id)
  )
)
with check (
  exists (
    select 1 from public.workout_sessions s
    where s.id = session_id and public.can_edit_profile(s.profile_id)
  )
);

-- Exercicios seguem a exclusao logica da sessao pai; DELETE direto e bloqueado.

create policy "records_select_by_role"
on public.exercise_records for select to authenticated
using (public.can_view_profile(profile_id));

create policy "records_insert_editor"
on public.exercise_records for insert to authenticated
with check (
  public.can_edit_profile(profile_id)
  and user_id = (select p.user_id from public.profiles p where p.id = profile_id)
);

create policy "records_update_editor"
on public.exercise_records for update to authenticated
using (public.can_edit_profile(profile_id))
with check (
  public.can_edit_profile(profile_id)
  and user_id = (select p.user_id from public.profiles p where p.id = profile_id)
);

create policy "measurements_select_by_role"
on public.body_measurements for select to authenticated
using (public.can_view_profile(profile_id));

create policy "measurements_insert_editor"
on public.body_measurements for insert to authenticated
with check (
  public.can_edit_profile(profile_id)
  and user_id = (select p.user_id from public.profiles p where p.id = profile_id)
);

create policy "measurements_update_editor"
on public.body_measurements for update to authenticated
using (public.can_edit_profile(profile_id))
with check (
  public.can_edit_profile(profile_id)
  and user_id = (select p.user_id from public.profiles p where p.id = profile_id)
);

create policy "photos_select_by_role"
on public.progress_photos for select to authenticated
using (public.can_view_profile(profile_id));

create policy "photos_insert_editor"
on public.progress_photos for insert to authenticated
with check (
  public.can_edit_profile(profile_id)
  and user_id = (select p.user_id from public.profiles p where p.id = profile_id)
  and photo_url like user_id::text || '/' || profile_id::text || '/%'
);

create policy "photos_update_editor"
on public.progress_photos for update to authenticated
using (public.can_edit_profile(profile_id))
with check (
  public.can_edit_profile(profile_id)
  and user_id = (select p.user_id from public.profiles p where p.id = profile_id)
  and photo_url like user_id::text || '/' || profile_id::text || '/%'
);

-- Medidas e fotos tambem usam arquivamento; DELETE direto permanece bloqueado.

-- Storage privado: visualizacao acompanha viewer; mutacoes exigem editor ou acima.
create or replace function public.can_view_progress_photo(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, storage
as $$
declare
  folders text[];
  profile_folder uuid;
  profile_owner uuid;
begin
  folders := storage.foldername(object_name);
  if array_length(folders, 1) < 3 then return false; end if;
  begin
    profile_owner := folders[1]::uuid;
    profile_folder := folders[2]::uuid;
  exception when others then
    return false;
  end;
  return exists (
    select 1 from public.profiles p
    where p.id = profile_folder
      and p.user_id = profile_owner
      and public.can_view_profile(p.id)
  );
end;
$$;

create or replace function public.can_edit_progress_photo(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, storage
as $$
declare
  folders text[];
  profile_folder uuid;
  profile_owner uuid;
begin
  folders := storage.foldername(object_name);
  if array_length(folders, 1) < 3 then return false; end if;
  begin
    profile_owner := folders[1]::uuid;
    profile_folder := folders[2]::uuid;
  exception when others then
    return false;
  end;
  return exists (
    select 1 from public.profiles p
    where p.id = profile_folder
      and p.user_id = profile_owner
      and public.can_edit_profile(p.id)
  );
end;
$$;

revoke all on function public.can_view_progress_photo(text) from public;
revoke all on function public.can_edit_progress_photo(text) from public;
grant execute on function public.can_view_progress_photo(text) to authenticated;
grant execute on function public.can_edit_progress_photo(text) to authenticated;

do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and (
        policyname like 'progress_photos_%'
        or policyname like 'progress photos %'
      )
  loop
    execute format('drop policy if exists %I on storage.objects', p.policyname);
  end loop;
end;
$$;

create policy "progress_photos_storage_select_by_role"
on storage.objects for select to authenticated
using (
  bucket_id = 'progress-photos'
  and public.can_view_progress_photo(name)
);

create policy "progress_photos_storage_insert_editor"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'progress-photos'
  and public.can_edit_progress_photo(name)
);

create policy "progress_photos_storage_update_editor"
on storage.objects for update to authenticated
using (
  bucket_id = 'progress-photos'
  and public.can_edit_progress_photo(name)
)
with check (
  bucket_id = 'progress-photos'
  and public.can_edit_progress_photo(name)
);

create policy "progress_photos_storage_delete_editor"
on storage.objects for delete to authenticated
using (
  bucket_id = 'progress-photos'
  and public.can_edit_progress_photo(name)
);

-- Avatar e salvo por RPC. Viewer nao pode alterar a imagem do perfil.
create or replace function public.update_profile_avatar(
  p_profile_id uuid,
  p_avatar_path text
)
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
  if not public.can_manage_profile(p_profile_id) then
    raise exception 'profile not found or access denied';
  end if;

  select p.user_id into v_owner
  from public.profiles p
  where p.id = p_profile_id;

  v_expected_prefix := v_owner::text || '/' || p_profile_id::text || '/avatars/';
  if p_avatar_path is null
    or p_avatar_path not like (v_expected_prefix || '%')
    or length(p_avatar_path) > 500
  then
    raise exception 'invalid avatar path';
  end if;

  update public.profiles
  set avatar_url = p_avatar_path
  where id = p_profile_id;
  return p_avatar_path;
end;
$$;

revoke all on function public.update_profile_avatar(uuid, text) from public;
grant execute on function public.update_profile_avatar(uuid, text) to authenticated;

-- Limites server-side contra payloads excessivos. Os limites sao avaliados antes
-- dos loops e nao alteram backups ou sessoes ja armazenados.
create or replace function public.assert_workout_exercises_limit(
  p_exercises jsonb,
  p_max_items integer default 100
)
returns void
language plpgsql
immutable
set search_path = public
as $$
begin
  if jsonb_typeof(p_exercises) is distinct from 'array' then
    raise exception 'exercises must be an array';
  end if;
  if jsonb_array_length(p_exercises) > p_max_items then
    raise exception 'exercise limit exceeded';
  end if;
  if pg_column_size(p_exercises) > 1048576 then
    raise exception 'exercise payload too large';
  end if;
end;
$$;

revoke all on function public.assert_workout_exercises_limit(jsonb, integer) from public;

create or replace function public.save_family_workout_session_atomic(
  p_profile_id uuid,
  p_workout_type text,
  p_date date,
  p_gym_name text,
  p_duration_minutes integer,
  p_completion_percentage numeric,
  p_total_volume numeric,
  p_notes text,
  p_exercises jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_session public.workout_sessions;
  v_exercise jsonb;
  v_weight numeric;
  v_name text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not public.can_edit_profile(p_profile_id) then
    raise exception 'profile not found or access denied';
  end if;
  perform public.assert_workout_exercises_limit(p_exercises, 100);

  select p.user_id into v_user_id
  from public.profiles p
  where p.id = p_profile_id;

  insert into public.workout_sessions (
    user_id, profile_id, workout_type, date, gym_name, duration_minutes,
    completion_percentage, total_volume, notes
  ) values (
    v_user_id, p_profile_id, p_workout_type, p_date, p_gym_name,
    p_duration_minutes, p_completion_percentage, p_total_volume, p_notes
  )
  returning * into v_session;

  for v_exercise in select value from jsonb_array_elements(p_exercises)
  loop
    v_name := v_exercise->>'exercise_name';
    v_weight := coalesce((v_exercise->>'weight')::numeric, 0);
    insert into public.workout_exercises (
      session_id, exercise_name, muscle_group, sets, reps, actual_reps,
      weight, completed, notes
    ) values (
      v_session.id, v_name, v_exercise->>'muscle_group',
      coalesce((v_exercise->>'sets')::integer, 0),
      coalesce(v_exercise->>'reps', ''),
      nullif(v_exercise->>'actual_reps', ''), v_weight,
      coalesce((v_exercise->>'completed')::boolean, false),
      nullif(v_exercise->>'notes', '')
    );

    if coalesce((v_exercise->>'completed')::boolean, false) then
      insert into public.exercise_records (
        user_id, profile_id, exercise_name, last_weight, best_weight,
        last_date, updated_at
      ) values (
        v_user_id, p_profile_id, v_name, v_weight, v_weight, p_date, now()
      )
      on conflict (user_id, profile_id, exercise_name) do update set
        last_weight = case
          when public.exercise_records.last_date is null
            or excluded.last_date >= public.exercise_records.last_date
          then excluded.last_weight else public.exercise_records.last_weight end,
        best_weight = greatest(public.exercise_records.best_weight, excluded.best_weight),
        last_date = case
          when public.exercise_records.last_date is null
            or excluded.last_date >= public.exercise_records.last_date
          then excluded.last_date else public.exercise_records.last_date end,
        updated_at = excluded.updated_at;
    end if;
  end loop;

  return to_jsonb(v_session);
end;
$$;

revoke all on function public.save_family_workout_session_atomic(
  uuid, text, date, text, integer, numeric, numeric, text, jsonb
) from public;
grant execute on function public.save_family_workout_session_atomic(
  uuid, text, date, text, integer, numeric, numeric, text, jsonb
) to authenticated;

-- A funcao de importacao original e mantida, mas recebe um validador executado
-- antes do processamento. O frontend deve chamar esta RPC segura.
create or replace function public.validate_profile_backup(
  p_backup jsonb
)
returns void
language plpgsql
immutable
set search_path = public
as $$
declare
  v_session jsonb;
begin
  if pg_column_size(p_backup) > 10485760 then
    raise exception 'backup payload too large';
  end if;
  if coalesce((p_backup->>'version')::integer, 0) not in (1, 2) then
    raise exception 'unsupported backup version';
  end if;
  if jsonb_typeof(p_backup->'sessions') is distinct from 'array'
    or jsonb_typeof(p_backup->'measurements') is distinct from 'array'
  then
    raise exception 'invalid backup structure';
  end if;
  if jsonb_array_length(p_backup->'sessions') > 5000
    or jsonb_array_length(p_backup->'measurements') > 5000
  then
    raise exception 'backup item limit exceeded';
  end if;
  for v_session in select value from jsonb_array_elements(p_backup->'sessions')
  loop
    perform public.assert_workout_exercises_limit(
      coalesce(v_session->'workout_exercises', '[]'::jsonb),
      100
    );
  end loop;
end;
$$;

revoke all on function public.validate_profile_backup(jsonb) from public;

create or replace function public.import_profile_backup_secure(
  p_profile_id uuid,
  p_backup jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_user_id uuid;
  v_item jsonb;
  v_exercise jsonb;
  v_session_id uuid;
  v_source_id uuid;
  v_weight numeric;
  v_name text;
  v_sessions integer := 0;
  v_measurements integer := 0;
begin
  if auth.uid() is null or not public.can_edit_profile(p_profile_id) then
    raise exception 'profile not found or access denied';
  end if;
  perform public.validate_profile_backup(p_backup);

  select p.user_id into v_owner_user_id
  from public.profiles p
  where p.id = p_profile_id;

  for v_item in
    select value from jsonb_array_elements(p_backup->'sessions')
  loop
    v_source_id := (v_item->>'id')::uuid;
    v_session_id := null;

    if exists (
      select 1 from public.workout_sessions s
      where s.id = v_source_id and s.profile_id = p_profile_id
    ) then
      continue;
    end if;

    insert into public.workout_sessions (
      user_id, profile_id, workout_type, date, gym_name, duration_minutes,
      completion_percentage, total_volume, notes, source_session_id
    ) values (
      v_owner_user_id, p_profile_id, v_item->>'workout_type',
      (v_item->>'date')::date, v_item->>'gym_name',
      coalesce((v_item->>'duration_minutes')::integer, 0),
      coalesce((v_item->>'completion_percentage')::numeric, 0),
      coalesce((v_item->>'total_volume')::numeric, 0),
      nullif(v_item->>'notes', ''), v_source_id
    )
    on conflict (profile_id, source_session_id)
      where source_session_id is not null
      do nothing
    returning id into v_session_id;

    if v_session_id is null then continue; end if;

    for v_exercise in
      select value from jsonb_array_elements(
        coalesce(v_item->'workout_exercises', '[]'::jsonb)
      )
    loop
      v_name := v_exercise->>'exercise_name';
      v_weight := coalesce((v_exercise->>'weight')::numeric, 0);
      insert into public.workout_exercises (
        session_id, exercise_name, muscle_group, sets, reps, actual_reps,
        weight, completed, notes
      ) values (
        v_session_id, v_name, v_exercise->>'muscle_group',
        coalesce((v_exercise->>'sets')::integer, 0),
        coalesce(v_exercise->>'reps', ''),
        nullif(v_exercise->>'actual_reps', ''), v_weight,
        coalesce((v_exercise->>'completed')::boolean, false),
        nullif(v_exercise->>'notes', '')
      );

      if coalesce((v_exercise->>'completed')::boolean, false) then
        insert into public.exercise_records (
          user_id, profile_id, exercise_name, last_weight, best_weight,
          last_date, updated_at
        ) values (
          v_owner_user_id, p_profile_id, v_name, v_weight, v_weight,
          (v_item->>'date')::date, now()
        )
        on conflict (user_id, profile_id, exercise_name) do update set
          last_weight = case
            when public.exercise_records.last_date is null
              or excluded.last_date >= public.exercise_records.last_date
            then excluded.last_weight else public.exercise_records.last_weight end,
          best_weight = greatest(public.exercise_records.best_weight, excluded.best_weight),
          last_date = case
            when public.exercise_records.last_date is null
              or excluded.last_date >= public.exercise_records.last_date
            then excluded.last_date else public.exercise_records.last_date end,
          updated_at = excluded.updated_at;
      end if;
    end loop;
    v_sessions := v_sessions + 1;
  end loop;

  for v_item in
    select value from jsonb_array_elements(p_backup->'measurements')
  loop
    v_source_id := (v_item->>'id')::uuid;
    if exists (
      select 1 from public.body_measurements m
      where m.id = v_source_id and m.profile_id = p_profile_id
    ) then
      continue;
    end if;

    insert into public.body_measurements (
      user_id, profile_id, date, weight, waist, chest, arm, thigh, hip,
      notes, source_measurement_id
    ) values (
      v_owner_user_id, p_profile_id, (v_item->>'date')::date,
      nullif(v_item->>'weight', '')::numeric,
      nullif(v_item->>'waist', '')::numeric,
      nullif(v_item->>'chest', '')::numeric,
      nullif(v_item->>'arm', '')::numeric,
      nullif(v_item->>'thigh', '')::numeric,
      nullif(v_item->>'hip', '')::numeric,
      nullif(v_item->>'notes', ''), v_source_id
    )
    on conflict (profile_id, source_measurement_id)
      where source_measurement_id is not null
      do nothing;

    if found then v_measurements := v_measurements + 1; end if;
  end loop;

  return jsonb_build_object(
    'sessions', v_sessions,
    'measurements', v_measurements
  );
end;
$$;

revoke all on function public.import_profile_backup_secure(uuid, jsonb) from public;
grant execute on function public.import_profile_backup_secure(uuid, jsonb) to authenticated;

-- A RPC antiga nao pode ser chamada diretamente depois da migracao.
revoke all on function public.import_profile_backup_atomic(uuid, jsonb) from public;
revoke all on function public.import_profile_backup_atomic(uuid, jsonb) from authenticated;

-- Limite nao retroativo para novos eventos. NOT VALID preserva integralmente
-- eventos historicos que eventualmente excedam o novo teto.
alter table public.event_logs
  drop constraint if exists event_logs_event_data_size_check;
alter table public.event_logs
  add constraint event_logs_event_data_size_check
  check (pg_column_size(event_data) <= 16384) not valid;
