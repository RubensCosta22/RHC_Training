-- Arquivamento reversivel. Nenhum registro ou arquivo e apagado.

alter table public.workout_sessions
  add column if not exists archived_at timestamptz;

alter table public.body_measurements
  add column if not exists archived_at timestamptz;

alter table public.progress_photos
  add column if not exists archived_at timestamptz;

create index if not exists idx_sessions_active_profile_date
  on public.workout_sessions(profile_id, date desc, created_at desc)
  where archived_at is null;

create index if not exists idx_measurements_active_profile_date
  on public.body_measurements(profile_id, date desc)
  where archived_at is null;

create index if not exists idx_photos_active_profile_date
  on public.progress_photos(profile_id, date desc)
  where archived_at is null;
