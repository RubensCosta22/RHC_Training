-- Meu Treino TotalPass - Supabase schema seguro
-- Execute este arquivo no SQL Editor do Supabase.
-- Nunca use service role key no frontend. Use apenas VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.

create extension if not exists pgcrypto;

-- =========================
-- Helpers de segurança
-- =========================
create or replace function public.is_safe_text(value text)
returns boolean
language sql
immutable
as $$
  select value is null or (
    length(value) <= 500
    and lower(value) not like '%<script%'
    and lower(value) not like '%javascript:%'
    and lower(value) not like '%onerror=%'
    and lower(value) not like '%onload=%'
  );
$$;

-- =========================
-- Tabelas
-- =========================
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 80 and public.is_safe_text(name)),
  age int not null check (age between 1 and 120),
  gender text not null check (gender in ('homem', 'mulher', 'outro')),
  goal text not null check (length(goal) <= 160 and public.is_safe_text(goal)),
  avatar_url text check (avatar_url is null or length(avatar_url) <= 500),
  created_at timestamptz not null default now(),
  unique (user_id, name),
  unique (id, user_id)
);

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  workout_type text not null check (workout_type in ('A', 'B', 'C', 'D', 'E')),
  date date not null default current_date,
  gym_name text not null check (length(gym_name) between 1 and 80 and public.is_safe_text(gym_name)),
  duration_minutes int not null default 0 check (duration_minutes >= 0 and duration_minutes <= 600),
  completion_percentage numeric not null default 0 check (completion_percentage >= 0 and completion_percentage <= 100),
  total_volume numeric not null default 0 check (total_volume >= 0),
  notes text check (public.is_safe_text(notes)),
  created_at timestamptz not null default now(),
  constraint workout_sessions_profile_owner_fk foreign key (profile_id, user_id) references public.profiles(id, user_id) on delete cascade
);

create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_name text not null check (length(exercise_name) between 1 and 120 and public.is_safe_text(exercise_name)),
  muscle_group text not null check (length(muscle_group) <= 80 and public.is_safe_text(muscle_group)),
  sets int not null check (sets >= 0 and sets <= 20),
  reps text not null check (length(reps) <= 40 and public.is_safe_text(reps)),
  actual_reps text check (actual_reps is null or (length(actual_reps) <= 40 and public.is_safe_text(actual_reps))),
  weight numeric not null default 0 check (weight >= 0),
  completed boolean not null default false,
  notes text check (public.is_safe_text(notes)),
  created_at timestamptz not null default now()
);

create table if not exists public.exercise_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  exercise_name text not null check (length(exercise_name) between 1 and 120 and public.is_safe_text(exercise_name)),
  last_weight numeric not null default 0 check (last_weight >= 0),
  best_weight numeric not null default 0 check (best_weight >= 0),
  last_date date,
  updated_at timestamptz not null default now(),
  unique (user_id, profile_id, exercise_name),
  constraint exercise_records_profile_owner_fk foreign key (profile_id, user_id) references public.profiles(id, user_id) on delete cascade
);

create table if not exists public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  date date not null default current_date,
  weight numeric check (weight is null or weight >= 0),
  waist numeric check (waist is null or waist >= 0),
  chest numeric check (chest is null or chest >= 0),
  arm numeric check (arm is null or arm >= 0),
  thigh numeric check (thigh is null or thigh >= 0),
  hip numeric check (hip is null or hip >= 0),
  notes text check (public.is_safe_text(notes)),
  created_at timestamptz not null default now(),
  constraint body_measurements_profile_owner_fk foreign key (profile_id, user_id) references public.profiles(id, user_id) on delete cascade
);

create table if not exists public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  date date not null default current_date,
  photo_type text not null check (photo_type in ('frente', 'lado', 'costas')),
  photo_url text not null check (length(photo_url) <= 700),
  notes text check (public.is_safe_text(notes)),
  created_at timestamptz not null default now(),
  constraint progress_photos_profile_owner_fk foreign key (profile_id, user_id) references public.profiles(id, user_id) on delete cascade
);

-- Índices úteis
create index if not exists idx_profiles_user on public.profiles(user_id);
create index if not exists idx_sessions_user_profile_date on public.workout_sessions(user_id, profile_id, date desc);
create index if not exists idx_exercises_session on public.workout_exercises(session_id);
create index if not exists idx_records_profile_exercise on public.exercise_records(profile_id, exercise_name);
create index if not exists idx_measurements_profile_date on public.body_measurements(profile_id, date desc);
create index if not exists idx_photos_profile_date on public.progress_photos(profile_id, date desc);

-- Compatibilidade para projetos que já executaram uma versão anterior do schema
alter table public.workout_exercises
  add column if not exists actual_reps text check (actual_reps is null or (length(actual_reps) <= 40 and public.is_safe_text(actual_reps)));

-- =========================
-- RLS obrigatório
-- =========================
alter table public.profiles enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.exercise_records enable row level security;
alter table public.body_measurements enable row level security;
alter table public.progress_photos enable row level security;

-- Remove políticas antigas para reaplicar com segurança
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('profiles','workout_sessions','workout_exercises','exercise_records','body_measurements','progress_photos') LOOP
    EXECUTE format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;

-- profiles
create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid() = user_id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "profiles_delete_own" on public.profiles for delete to authenticated using (auth.uid() = user_id);

-- workout_sessions com validação de ownership do profile_id
create policy "sessions_select_own" on public.workout_sessions for select to authenticated using (auth.uid() = user_id);
create policy "sessions_insert_own" on public.workout_sessions for insert to authenticated with check (
  auth.uid() = user_id
  and exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
);
create policy "sessions_update_own" on public.workout_sessions for update to authenticated using (auth.uid() = user_id) with check (
  auth.uid() = user_id
  and exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
);
create policy "sessions_delete_own" on public.workout_sessions for delete to authenticated using (auth.uid() = user_id);

-- workout_exercises sem user_id: ownership validado pela sessão pai
create policy "exercises_select_own" on public.workout_exercises for select to authenticated using (
  exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = auth.uid())
);
create policy "exercises_insert_own" on public.workout_exercises for insert to authenticated with check (
  exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = auth.uid())
);
create policy "exercises_update_own" on public.workout_exercises for update to authenticated using (
  exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = auth.uid())
) with check (
  exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = auth.uid())
);
create policy "exercises_delete_own" on public.workout_exercises for delete to authenticated using (
  exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = auth.uid())
);

-- exercise_records
create policy "records_select_own" on public.exercise_records for select to authenticated using (auth.uid() = user_id);
create policy "records_insert_own" on public.exercise_records for insert to authenticated with check (
  auth.uid() = user_id
  and exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
);
create policy "records_update_own" on public.exercise_records for update to authenticated using (auth.uid() = user_id) with check (
  auth.uid() = user_id
  and exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
);
create policy "records_delete_own" on public.exercise_records for delete to authenticated using (auth.uid() = user_id);

-- body_measurements
create policy "measurements_select_own" on public.body_measurements for select to authenticated using (auth.uid() = user_id);
create policy "measurements_insert_own" on public.body_measurements for insert to authenticated with check (
  auth.uid() = user_id
  and exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
);
create policy "measurements_update_own" on public.body_measurements for update to authenticated using (auth.uid() = user_id) with check (
  auth.uid() = user_id
  and exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
);
create policy "measurements_delete_own" on public.body_measurements for delete to authenticated using (auth.uid() = user_id);

-- progress_photos
create policy "photos_select_own" on public.progress_photos for select to authenticated using (auth.uid() = user_id);
create policy "photos_insert_own" on public.progress_photos for insert to authenticated with check (
  auth.uid() = user_id
  and exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
  and photo_url like auth.uid()::text || '/' || profile_id::text || '/%'
);
create policy "photos_update_own" on public.progress_photos for update to authenticated using (auth.uid() = user_id) with check (
  auth.uid() = user_id
  and exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
  and photo_url like auth.uid()::text || '/' || profile_id::text || '/%'
);
create policy "photos_delete_own" on public.progress_photos for delete to authenticated using (auth.uid() = user_id);

-- =========================
-- Storage privado
-- =========================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('progress-photos', 'progress-photos', false, 6291456, array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do update set public = false, file_size_limit = 6291456, allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_access_progress_photo(object_name text)
returns boolean
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  folders text[];
  profile_folder uuid;
begin
  folders := storage.foldername(object_name);

  -- caminho obrigatório: user_id/profile_id/data/tipo-foto.jpg
  if array_length(folders, 1) < 3 then
    return false;
  end if;

  if folders[1] <> auth.uid()::text then
    return false;
  end if;

  begin
    profile_folder := folders[2]::uuid;
  exception when others then
    return false;
  end;

  return exists (
    select 1
    from public.profiles p
    where p.id = profile_folder
      and p.user_id = auth.uid()
  );
end;
$$;

grant execute on function public.can_access_progress_photo(text) to authenticated;

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname like 'progress_photos_%' LOOP
    EXECUTE format('drop policy if exists %I on storage.objects', p.policyname);
  END LOOP;
END $$;

create policy "progress_photos_storage_select_own"
on storage.objects for select to authenticated
using (bucket_id = 'progress-photos' and public.can_access_progress_photo(name));

create policy "progress_photos_storage_insert_own"
on storage.objects for insert to authenticated
with check (bucket_id = 'progress-photos' and public.can_access_progress_photo(name));

create policy "progress_photos_storage_update_own"
on storage.objects for update to authenticated
using (bucket_id = 'progress-photos' and public.can_access_progress_photo(name))
with check (bucket_id = 'progress-photos' and public.can_access_progress_photo(name));

create policy "progress_photos_storage_delete_own"
on storage.objects for delete to authenticated
using (bucket_id = 'progress-photos' and public.can_access_progress_photo(name));

-- Checklist final:
-- [x] RLS ativado em todas as tabelas
-- [x] SELECT/INSERT/UPDATE/DELETE separados
-- [x] workout_exercises protegido pela sessão pai
-- [x] profile_id validado nas tabelas relacionadas
-- [x] bucket progress-photos privado
-- [x] storage restrito por user_id/profile_id no path
-- [x] signed URLs podem funcionar via SELECT policy, sem URL pública
