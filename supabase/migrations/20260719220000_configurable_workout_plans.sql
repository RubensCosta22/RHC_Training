create table if not exists public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  workout_type text not null check (workout_type in ('A','B','C','D','E')),
  title text not null check (length(title) between 1 and 120),
  description text check (description is null or length(description) <= 500),
  exercises jsonb not null default '[]'::jsonb check (jsonb_typeof(exercises) = 'array'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(profile_id, workout_type)
);

alter table public.workout_plans enable row level security;

create policy "plans_read_profile_access" on public.workout_plans
for select to authenticated using (public.can_access_profile(profile_id));

create policy "plans_admin_insert" on public.workout_plans
for insert to authenticated with check (
  exists(select 1 from public.profiles p where p.id=profile_id and public.is_family_admin(p.family_group_id))
);
create policy "plans_admin_update" on public.workout_plans
for update to authenticated using (
  exists(select 1 from public.profiles p where p.id=profile_id and public.is_family_admin(p.family_group_id))
) with check (
  exists(select 1 from public.profiles p where p.id=profile_id and public.is_family_admin(p.family_group_id))
);
create policy "plans_admin_delete" on public.workout_plans
for delete to authenticated using (
  exists(select 1 from public.profiles p where p.id=profile_id and public.is_family_admin(p.family_group_id))
);

grant select, insert, update, delete on public.workout_plans to authenticated;

create index if not exists idx_workout_plans_profile_active
  on public.workout_plans(profile_id, active, workout_type);
