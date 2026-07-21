-- PR #41 — Publicacao administrativa de programas.
-- Ajusta a ativacao para usar a mesma autoridade administrativa do app.

create or replace function public.activate_rhc_strength_12w(
  p_profile_id uuid,
  p_start_date date default current_date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_program uuid;
  v_enrollment uuid;
  v_profile_name text;
  v_group_id uuid;
  v_can_manage boolean := false;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select name, family_group_id
  into v_profile_name, v_group_id
  from public.profiles
  where id = p_profile_id;

  if v_profile_name is null then
    raise exception 'profile not found or access denied';
  end if;

  v_can_manage := public.can_manage_profile(p_profile_id)
    or (v_group_id is not null and public.is_family_admin(v_group_id));

  if not v_can_manage then
    raise exception 'profile not found or access denied';
  end if;

  if p_start_date > current_date + 30 then
    raise exception 'invalid start date';
  end if;

  if lower(trim(coalesce(v_profile_name, ''))) <> 'henrique' then
    raise exception 'RHC Strength 12W pilot is restricted to Henrique';
  end if;

  select id
  into v_program
  from public.training_programs
  where slug = 'rhc-strength-12w'
    and status = 'published';

  if v_program is null then
    raise exception 'program not available';
  end if;

  -- Se o mesmo programa ja estiver ativo, apenas confirma/publica o enrollment atual.
  select id
  into v_enrollment
  from public.profile_program_enrollments
  where profile_id = p_profile_id
    and program_id = v_program
    and status = 'active'
  order by created_at desc
  limit 1;

  if v_enrollment is not null then
    update public.profile_program_enrollments
    set start_date = coalesce(start_date, p_start_date),
        current_week = greatest(1, current_week),
        updated_at = now()
    where id = v_enrollment;

    return v_enrollment;
  end if;

  update public.profile_program_enrollments
  set status = 'archived', archived_at = now(), updated_at = now()
  where profile_id = p_profile_id
    and status = 'active';

  if not exists (
    select 1
    from public.profile_training_archives
    where profile_id = p_profile_id
      and source = 'legacy'
      and metadata ->> 'transition' = 'rhc-strength-12w'
  ) then
    insert into public.profile_training_archives(
      profile_id,
      label,
      source,
      history_through,
      metadata,
      created_by
    )
    values (
      p_profile_id,
      'Ciclo anterior — Treino tradicional',
      'legacy',
      least(p_start_date, current_date),
      jsonb_build_object('transition','rhc-strength-12w','preserves_history',true),
      auth.uid()
    );
  end if;

  insert into public.profile_program_enrollments(
    profile_id,
    program_id,
    status,
    start_date,
    current_week,
    running_baseline
  )
  values (
    p_profile_id,
    v_program,
    'active',
    p_start_date,
    1,
    '{"distance_km":10,"time_minutes":50,"pace_min_km":5.0}'::jsonb
  )
  returning id into v_enrollment;

  return v_enrollment;
end;
$$;

revoke all on function public.activate_rhc_strength_12w(uuid,date) from public;
grant execute on function public.activate_rhc_strength_12w(uuid,date) to authenticated;
