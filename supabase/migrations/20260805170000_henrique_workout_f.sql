-- RHCT-TRAIN-001 — add workout F only to Henrique's plans/program.
-- Additive and idempotent: no historical workout row is modified.

alter table public.workout_plans
  drop constraint if exists workout_plans_workout_type_check;

alter table public.workout_plans
  add constraint workout_plans_workout_type_check
  check (workout_type in ('A','B','C','D','E','F'));

-- Configurable-plan fallback for every profile named Henrique.
insert into public.workout_plans (profile_id, workout_type, title, description, exercises, active)
select
  p.id,
  'F',
  'Complementar — Máquinas e Barra Fixa',
  'Treino complementar com prioridade para barra fixa, máquinas, ombros, braços, panturrilha e core.',
  jsonb_build_array(
    jsonb_build_object('id','barra-fixa-pronada','name','Barra fixa pronada','muscleGroup','Costas','sets',4,'reps','6-10','rest',120,'goal','Força e evolução na barra fixa','alternatives',jsonb_build_array('Barra fixa neutra','Graviton','Pulldown articulado'),'active',true),
    jsonb_build_object('id','remada-articulada','name','Remada articulada','muscleGroup','Costas','sets',3,'reps','10-12','rest',90,'goal','Controle e contração das costas','alternatives',jsonb_build_array('Remada Hammer','Remada baixa','Remada convergente'),'active',true),
    jsonb_build_object('id','elevacao-lateral-maquina','name','Elevação lateral na máquina','muscleGroup','Ombros','sets',4,'reps','12-15','rest',60,'goal','Deltoide lateral','alternatives',jsonb_build_array('Cabo unilateral','Elevação lateral com halteres'),'active',true),
    jsonb_build_object('id','reverse-fly-maquina','name','Reverse Fly máquina','muscleGroup','Ombros','sets',4,'reps','12-15','rest',60,'goal','Deltoide posterior e postura','alternatives',jsonb_build_array('Peck Deck invertido','Crucifixo inverso no cabo'),'active',true),
    jsonb_build_object('id','rosca-scott-maquina','name','Rosca Scott máquina','muscleGroup','Bíceps','sets',3,'reps','10-12','rest',75,'goal','Bíceps com execução controlada','alternatives',jsonb_build_array('Rosca Scott barra W','Scott unilateral'),'active',true),
    jsonb_build_object('id','triceps-maquina','name','Tríceps máquina','muscleGroup','Tríceps','sets',3,'reps','10-12','rest',75,'goal','Extensão de cotovelo','alternatives',jsonb_build_array('Tríceps corda','Paralelas assistidas'),'active',true),
    jsonb_build_object('id','panturrilha-sentado','name','Panturrilha sentado','muscleGroup','Panturrilha','sets',4,'reps','15','rest',60,'goal','Resistência e força da panturrilha','alternatives',jsonb_build_array('Panturrilha máquina em pé','Panturrilha no leg press'),'active',true),
    jsonb_build_object('id','abdominal-maquina','name','Abdominal máquina','muscleGroup','Core','sets',3,'reps','15','rest',45,'goal','Força de core','alternatives',jsonb_build_array('Crunch no cabo','Crunch'),'active',true),
    jsonb_build_object('id','prancha','name','Prancha','muscleGroup','Core','sets',3,'reps','45-60 segundos','rest',45,'goal','Estabilidade do tronco','alternatives',jsonb_build_array('Prancha com apoio','Pallof Press'),'active',true)
  ),
  true
from public.profiles p
where lower(trim(p.name)) = 'henrique'
on conflict (profile_id, workout_type) do update set
  title = excluded.title,
  description = excluded.description,
  exercises = excluded.exercises,
  active = true,
  updated_at = now();

-- Add F to the active RHC Strength 12W program when present.
with program as (
  select id from public.training_programs where slug = 'rhc-strength-12w'
)
insert into public.program_sessions (program_id, code, name, session_type, day_order, is_optional, prescription)
select id, 'F', 'Complementar — Máquinas e Barra Fixa', 'strength', 6, false,
  '{"focus":"complementary","preference":"machines_and_pullups"}'::jsonb
from program
on conflict (program_id, code) do update set
  name = excluded.name,
  session_type = excluded.session_type,
  day_order = excluded.day_order,
  is_optional = excluded.is_optional,
  prescription = excluded.prescription;

do $$
declare
  v_program uuid;
  v_session uuid;
  v_ex uuid;
  r record;
begin
  select id into v_program from public.training_programs where slug='rhc-strength-12w';
  if v_program is null then return; end if;
  select id into v_session from public.program_sessions where program_id=v_program and code='F';

  for r in select * from (values
    ('Barra fixa pronada','puxar_vertical','principal',4,6,10,120,180,'double_progression',1.0,1),
    ('Remada articulada','puxar_horizontal','secundario',3,10,12,75,120,'double_progression',2.5,2),
    ('Elevação lateral na máquina','abducao_ombro','acessorio',4,12,15,45,75,'double_progression',1.0,3),
    ('Reverse Fly máquina','puxar_face','acessorio',4,12,15,45,75,'double_progression',1.0,4),
    ('Rosca Scott máquina','flexao_cotovelo','acessorio',3,10,12,60,90,'double_progression',1.0,5),
    ('Tríceps máquina','extensao_cotovelo','acessorio',3,10,12,60,90,'double_progression',2.0,6),
    ('Panturrilha sentado','flexao_plantar','acessorio',4,15,15,45,75,'double_progression',2.5,7),
    ('Abdominal máquina','core','acessorio',3,15,15,45,60,'manual',null,8),
    ('Prancha','core','acessorio',3,45,60,45,60,'manual',null,9)
  ) as t(name,pattern,role,sets,rmin,rmax,restmin,restmax,ptype,increment,ord)
  loop
    select id into v_ex from public.program_exercises where session_id=v_session and exercise_name=r.name limit 1;
    if v_ex is null then
      insert into public.program_exercises(session_id,exercise_name,movement_pattern,exercise_role,sets,reps_min,reps_max,rest_seconds_min,rest_seconds_max,progression_type,default_load_increment,regression_percent,failures_before_regression,sort_order)
      values(v_session,r.name,r.pattern,r.role,r.sets,r.rmin,r.rmax,r.restmin,r.restmax,r.ptype,r.increment,7.5,2,r.ord);
    else
      update public.program_exercises set movement_pattern=r.pattern,exercise_role=r.role,sets=r.sets,reps_min=r.rmin,reps_max=r.rmax,rest_seconds_min=r.restmin,rest_seconds_max=r.restmax,progression_type=r.ptype,default_load_increment=r.increment,sort_order=r.ord where id=v_ex;
    end if;
    v_ex := null;
  end loop;
end $$;

-- Substitutions also drive the existing "Ver execução" YouTube links.
do $$
declare v_program uuid; v_ex uuid; r record;
begin
  select id into v_program from public.training_programs where slug='rhc-strength-12w';
  if v_program is null then return; end if;
  for r in select * from (values
    ('Barra fixa pronada','Barra fixa neutra','puxar_vertical',1),('Barra fixa pronada','Graviton','puxar_vertical',2),('Barra fixa pronada','Pulldown articulado','puxar_vertical',3),
    ('Remada articulada','Remada Hammer','puxar_horizontal',1),('Remada articulada','Remada baixa','puxar_horizontal',2),('Remada articulada','Remada convergente','puxar_horizontal',3),
    ('Elevação lateral na máquina','Cabo unilateral','abducao_ombro',1),('Elevação lateral na máquina','Elevação lateral com halteres','abducao_ombro',2),
    ('Reverse Fly máquina','Peck Deck invertido','puxar_face',1),('Reverse Fly máquina','Crucifixo inverso no cabo','puxar_face',2),
    ('Rosca Scott máquina','Rosca Scott barra W','flexao_cotovelo',1),('Rosca Scott máquina','Scott unilateral','flexao_cotovelo',2),
    ('Tríceps máquina','Tríceps corda','extensao_cotovelo',1),('Tríceps máquina','Paralelas assistidas','extensao_cotovelo',2),
    ('Panturrilha sentado','Panturrilha máquina em pé','flexao_plantar',1),('Panturrilha sentado','Panturrilha no leg press','flexao_plantar',2),
    ('Abdominal máquina','Crunch no cabo','core',1),('Abdominal máquina','Crunch','core',2),
    ('Prancha','Pallof Press','core',1)
  ) t(base_name,alt_name,pattern,ord)
  loop
    select pe.id into v_ex from public.program_exercises pe join public.program_sessions ps on ps.id=pe.session_id where ps.program_id=v_program and ps.code='F' and pe.exercise_name=r.base_name limit 1;
    if v_ex is not null then
      insert into public.program_exercise_substitutions(program_exercise_id,exercise_name,movement_pattern,sort_order)
      values(v_ex,r.alt_name,r.pattern,r.ord)
      on conflict(program_exercise_id,exercise_name) do update set movement_pattern=excluded.movement_pattern,sort_order=excluded.sort_order;
    end if;
  end loop;
end $$;
