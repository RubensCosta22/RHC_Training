-- PR #39 — RHC Strength 12W.
-- Seed idempotente do primeiro programa oficial e RPC de ativacao segura.

insert into public.training_programs (slug, name, objective, duration_weeks, description, status)
values (
  'rhc-strength-12w',
  'RHC Strength 12W',
  'forca',
  12,
  'Programa de 12 semanas focado em força para academias comerciais, com progressão orientada por RPE, substituições equivalentes e corrida estruturada.',
  'published'
)
on conflict (slug) do update set
  name = excluded.name,
  objective = excluded.objective,
  duration_weeks = excluded.duration_weeks,
  description = excluded.description,
  status = 'published',
  updated_at = now();

-- Fases
with p as (select id from public.training_programs where slug = 'rhc-strength-12w')
insert into public.program_phases (program_id, name, week_start, week_end, reps_min, reps_max, target_rpe_min, target_rpe_max, volume_modifier, load_modifier, sort_order)
select p.id, x.name, x.ws, x.we, x.rmin, x.rmax, x.rpemin, x.rpemax, x.vm, x.lm, x.ord
from p cross join (values
  ('Base', 1, 3, 5, 7, 6.0, 7.0, 1.00, 0.90, 1),
  ('Desenvolvimento', 4, 7, 5, 5, 7.0, 8.0, 1.00, 1.00, 2),
  ('Intensificação', 8, 10, 3, 5, 7.5, 9.0, 0.90, 1.05, 3),
  ('Consolidação', 11, 11, 3, 5, 7.0, 8.5, 0.80, 1.00, 4),
  ('Deload', 12, 12, 5, 8, 4.0, 6.5, 0.55, 0.85, 5)
) as x(name, ws, we, rmin, rmax, rpemin, rpemax, vm, lm, ord)
on conflict (program_id, week_start, week_end) do update set
  name=excluded.name, reps_min=excluded.reps_min, reps_max=excluded.reps_max,
  target_rpe_min=excluded.target_rpe_min, target_rpe_max=excluded.target_rpe_max,
  volume_modifier=excluded.volume_modifier, load_modifier=excluded.load_modifier, sort_order=excluded.sort_order;

-- Sessoes A-E
with p as (select id from public.training_programs where slug='rhc-strength-12w')
insert into public.program_sessions (program_id, code, name, session_type, day_order, is_optional, prescription)
select p.id, x.code, x.name, x.kind, x.ord, x.optional, x.rx::jsonb
from p cross join (values
 ('A','Empurrar — Força','strength',1,false,'{}'),
 ('B','Puxar — Força','strength',2,false,'{}'),
 ('C','Pernas — Força','strength',3,false,'{}'),
 ('D','Posterior — Força','strength',4,false,'{}'),
 ('E','Corrida estruturada','running',5,false,'{"baseline":{"distance_km":10,"time_minutes":50,"pace_min_km":5.0},"weeks":{"1-3":{"type":"easy","duration_minutes":"30-40","rpe":"5-6"},"4-7":{"type":"interval","warmup_minutes":10,"blocks":4,"work_minutes":4,"recovery_minutes":2,"rpe":"7-8"},"8":{"type":"easy","duration_minutes":"35-45","rpe":"5-6"},"9":{"type":"interval","blocks":5,"work_minutes":3,"recovery_minutes":2,"rpe":"8"},"10":{"type":"easy","duration_minutes":"30-40","rpe":"5-6"},"11":{"type":"tempo","distance_km":5,"rpe":"7-8"},"12":{"type":"easy","duration_minutes":"25-30","rpe":"4-5"}},"optional_second_run":{"duration_minutes":"25-40","rpe":"4-5"}}')
) x(code,name,kind,ord,optional,rx)
on conflict (program_id, code) do update set name=excluded.name, session_type=excluded.session_type, day_order=excluded.day_order, is_optional=excluded.is_optional, prescription=excluded.prescription;

-- Helper local para upsert dos exercicios por sessao/nome via bloco anonimo.
do $$
declare
  v_program uuid;
  v_session uuid;
  v_ex uuid;
  r record;
begin
  select id into v_program from public.training_programs where slug='rhc-strength-12w';

  for r in select * from (values
    ('A','Supino Máquina Hammer','empurrar_horizontal','principal',5,5,5,180,300,'load',2.5,1),
    ('A','Desenvolvimento máquina','empurrar_vertical','secundario',5,5,5,150,240,'load',2.5,2),
    ('A','Supino inclinado máquina','empurrar_inclinado','acessorio',3,6,8,90,150,'double_progression',2.5,3),
    ('A','Elevação lateral','abducao_ombro','acessorio',3,10,12,60,90,'double_progression',1.0,4),
    ('A','Tríceps corda','extensao_cotovelo','acessorio',3,8,10,60,90,'double_progression',2.5,5),

    ('B','Remada Hammer','puxar_horizontal','principal',5,5,5,180,300,'load',2.5,1),
    ('B','Puxada frente','puxar_vertical','secundario',5,5,5,150,240,'load',2.5,2),
    ('B','Pullover','extensao_ombro','acessorio',3,8,10,60,120,'double_progression',2.5,3),
    ('B','Rosca máquina','flexao_cotovelo','acessorio',3,8,10,60,120,'double_progression',2.0,4),
    ('B','Face Pull','puxar_face','acessorio',3,10,15,60,90,'double_progression',2.0,5),

    ('C','Hack Machine','agachamento','principal',5,5,5,180,300,'load',5.0,1),
    ('C','Leg Press','dominante_joelho','secundario',5,5,5,180,300,'load',5.0,2),
    ('C','Extensora','extensao_joelho','acessorio',3,8,10,60,120,'double_progression',2.5,3),
    ('C','Panturrilha','flexao_plantar','acessorio',3,10,15,60,90,'double_progression',2.5,4),
    ('C','Abdômen','core','acessorio',3,10,15,45,90,'manual',null,5),

    ('D','Hip Thrust','extensao_quadril','principal',5,5,5,180,300,'load',5.0,1),
    ('D','Flexora','flexao_joelho','secundario',5,6,6,120,180,'load',2.5,2),
    ('D','Afundo Smith','unilateral_joelho','acessorio',3,6,8,90,150,'double_progression',2.5,3),
    ('D','Abdução','abducao_quadril','acessorio',3,10,15,60,90,'double_progression',2.5,4),
    ('D','Pallof Press','anti_rotacao','acessorio',3,10,15,45,90,'manual',null,5)
  ) as t(code,name,pattern,role,sets,rmin,rmax,restmin,restmax,ptype,increment,ord)
  loop
    select id into v_session from public.program_sessions where program_id=v_program and code=r.code;
    select id into v_ex from public.program_exercises where session_id=v_session and exercise_name=r.name limit 1;
    if v_ex is null then
      insert into public.program_exercises(session_id,exercise_name,movement_pattern,exercise_role,sets,reps_min,reps_max,rest_seconds_min,rest_seconds_max,progression_type,default_load_increment,regression_percent,failures_before_regression,sort_order)
      values(v_session,r.name,r.pattern,r.role,r.sets,r.rmin,r.rmax,r.restmin,r.restmax,r.ptype,r.increment,7.5,2,r.ord)
      returning id into v_ex;
    else
      update public.program_exercises set movement_pattern=r.pattern,exercise_role=r.role,sets=r.sets,reps_min=r.rmin,reps_max=r.rmax,rest_seconds_min=r.restmin,rest_seconds_max=r.restmax,progression_type=r.ptype,default_load_increment=r.increment,sort_order=r.ord where id=v_ex;
    end if;
    v_ex := null;
  end loop;
end $$;

-- Substituicoes oficiais.
do $$
declare v_program uuid; v_ex uuid; r record;
begin
 select id into v_program from public.training_programs where slug='rhc-strength-12w';
 for r in select * from (values
 ('Supino Máquina Hammer','Chest Press','empurrar_horizontal',1),('Supino Máquina Hammer','Supino articulado','empurrar_horizontal',2),('Supino Máquina Hammer','Supino convergente','empurrar_horizontal',3),
 ('Desenvolvimento máquina','Shoulder Press Hammer','empurrar_vertical',1),('Desenvolvimento máquina','Desenvolvimento articulado','empurrar_vertical',2),('Desenvolvimento máquina','Máquina convergente','empurrar_vertical',3),
 ('Remada Hammer','Remada baixa','puxar_horizontal',1),('Remada Hammer','Remada Iso-Lateral','puxar_horizontal',2),('Remada Hammer','Remada articulada','puxar_horizontal',3),
 ('Puxada frente','Pulldown convergente','puxar_vertical',1),('Puxada frente','High Row','puxar_vertical',2),('Puxada frente','Barra assistida','puxar_vertical',3),
 ('Hack Machine','Pendulum Squat','agachamento',1),('Hack Machine','Belt Squat','agachamento',2),('Hack Machine','Smith Squat','agachamento',3),
 ('Leg Press','Leg Press 45°','dominante_joelho',1),('Leg Press','Leg Press horizontal','dominante_joelho',2),('Leg Press','Leg Press vertical','dominante_joelho',3),
 ('Hip Thrust','Glute Drive','extensao_quadril',1),('Hip Thrust','Smith Hip Thrust','extensao_quadril',2),
 ('Flexora','Flexora deitada','flexao_joelho',1),('Flexora','Flexora unilateral','flexao_joelho',2)
 ) t(base_name,alt_name,pattern,ord)
 loop
   select pe.id into v_ex from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id where ps.program_id=v_program and pe.exercise_name=r.base_name limit 1;
   insert into public.program_exercise_substitutions(program_exercise_id,exercise_name,movement_pattern,sort_order)
   values(v_ex,r.alt_name,r.pattern,r.ord)
   on conflict(program_exercise_id,exercise_name) do update set movement_pattern=excluded.movement_pattern,sort_order=excluded.sort_order;
 end loop;
end $$;

-- Ativacao transacional. Arquiva apenas como marcador; nenhuma sessao antiga e alterada.
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
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if not public.can_manage_profile(p_profile_id) then raise exception 'profile not found or access denied'; end if;
  if p_start_date > current_date + 30 then raise exception 'invalid start date'; end if;

  select name into v_profile_name from public.profiles where id=p_profile_id;
  if lower(trim(coalesce(v_profile_name,''))) <> 'henrique' then
    raise exception 'RHC Strength 12W pilot is restricted to Henrique';
  end if;

  select id into v_program from public.training_programs where slug='rhc-strength-12w' and status='published';
  if v_program is null then raise exception 'program not available'; end if;

  update public.profile_program_enrollments
  set status='archived', archived_at=now(), updated_at=now()
  where profile_id=p_profile_id and status='active';

  if not exists (
    select 1 from public.profile_training_archives
    where profile_id=p_profile_id and source='legacy' and metadata->>'transition'='rhc-strength-12w'
  ) then
    insert into public.profile_training_archives(profile_id,label,source,history_through,metadata,created_by)
    values(p_profile_id,'Ciclo anterior — Treino tradicional','legacy',least(p_start_date,current_date),jsonb_build_object('transition','rhc-strength-12w','preserves_history',true),auth.uid());
  end if;

  insert into public.profile_program_enrollments(profile_id,program_id,status,start_date,current_week,running_baseline)
  values(p_profile_id,v_program,'active',p_start_date,1,'{"distance_km":10,"time_minutes":50,"pace_min_km":5.0}'::jsonb)
  returning id into v_enrollment;

  return v_enrollment;
end;
$$;

revoke all on function public.activate_rhc_strength_12w(uuid,date) from public;
grant execute on function public.activate_rhc_strength_12w(uuid,date) to authenticated;
