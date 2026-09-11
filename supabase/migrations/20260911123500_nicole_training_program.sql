-- Nicole — emagrecimento + foco em glúteos (16 semanas)
-- Template de programa; o enrollment será criado quando Nicole tiver perfil/acesso próprio.

begin;

insert into public.exercise_catalog (code, name, is_active)
values
  ('ex_agachamento_maquina', 'Agachamento máquina', true),
  ('ex_cadeira_adutora', 'Cadeira adutora', true),
  ('ex_coice_polia', 'Coice na polia', true),
  ('ex_crucifixo', 'Crucifixo', true),
  ('ex_rosca_direta', 'Rosca direta', true),
  ('ex_agachamento_goblet_casa', 'Agachamento goblet — Casa', true),
  ('ex_agachamento_calcanhar_elevado_casa', 'Agachamento com calcanhar elevado — Casa', true),
  ('ex_stiff_halteres_casa', 'Stiff com halteres — Casa', true),
  ('ex_agachamento_sumo_halter_casa', 'Agachamento sumô com halter — Casa', true),
  ('ex_hip_thrust_halter_casa', 'Hip Thrust com halter — Casa', true),
  ('ex_remada_curvada_halteres_casa', 'Remada curvada com halteres — Casa', true),
  ('ex_desenvolvimento_halteres_casa', 'Desenvolvimento com halteres — Casa', true),
  ('ex_abdominal_halter_casa', 'Abdominal com halter — Casa', true),
  ('ex_bulgaro_halteres_casa', 'Búlgaro com halteres — Casa', true),
  ('ex_extensao_quadril_chao_casa', 'Extensão de quadril no chão — Casa', true),
  ('ex_abducao_lateral_casa', 'Abdução lateral — Casa', true),
  ('ex_supino_halteres_chao_casa', 'Supino com halteres no chão — Casa', true),
  ('ex_crucifixo_halteres_chao_casa', 'Crucifixo com halteres no chão — Casa', true),
  ('ex_rosca_halteres_casa', 'Rosca com halteres — Casa', true),
  ('ex_triceps_frances_halter_casa', 'Tríceps francês com halter — Casa', true)
on conflict (code) do update
set name = excluded.name,
    is_active = true,
    updated_at = now();

insert into public.training_programs (slug, name, objective, duration_weeks, description, status)
values (
  'nicole-emagrecimento-gluteos-16w',
  'Nicole — Emagrecimento + Glúteos',
  'Emagrecimento com prioridade para glúteos, manutenção de força e aderência em semanas de 3 ou 4 sessões.',
  16,
  'Programa A–D até dezembro. Mantém exercícios familiares, usa progressão dupla por faixa de repetições/RPE, cardio de até 30 min e inclui alternativas domésticas com dois halteres. Em semanas com apenas 3 sessões, priorizar A, B e C; D retorna na sequência.',
  'published'
)
on conflict (slug) do update
set name = excluded.name,
    objective = excluded.objective,
    duration_weeks = excluded.duration_weeks,
    description = excluded.description,
    status = excluded.status,
    updated_at = now();

do $$
declare
  v_program uuid;
  v_session uuid;
  v_exercise uuid;
  v_program_exercise uuid;
  v_alt uuid;
  r record;
begin
  select id into v_program
  from public.training_programs
  where slug = 'nicole-emagrecimento-gluteos-16w';

  delete from public.program_phases where program_id = v_program;
  delete from public.program_sessions where program_id = v_program;

  insert into public.program_phases
    (program_id, name, week_start, week_end, target_rpe_min, target_rpe_max, volume_modifier, load_modifier, sort_order)
  values
    (v_program, 'Base e adaptação', 1, 4, 7.5, 8.5, 1.00, 1.00, 1),
    (v_program, 'Progressão', 5, 12, 8.0, 9.0, 1.00, 1.00, 2),
    (v_program, 'Consolidação', 13, 16, 7.5, 9.0, 1.00, 1.00, 3);

  insert into public.program_sessions (program_id, code, name, session_type, day_order, is_optional, prescription)
  values
    (v_program, 'A', 'Pernas + Glúteos', 'strength', 1, false,
      '{"priority":1,"cardio":{"duration_minutes":"20-30","intensity":"moderado","optional":false},"home_available":true}'::jsonb),
    (v_program, 'B', 'Costas + Ombros + Abdômen', 'strength', 2, false,
      '{"priority":2,"cardio":{"duration_minutes":"20-30","intensity":"moderado","optional":false},"home_available":true}'::jsonb),
    (v_program, 'C', 'Glúteos — Prioritário', 'strength', 3, false,
      '{"priority":1,"cardio":{"duration_minutes":"10-20","intensity":"leve-moderado","optional":true},"home_available":true}'::jsonb),
    (v_program, 'D', 'Peito + Braços', 'strength', 4, false,
      '{"priority":3,"cardio":{"duration_minutes":"20-30","intensity":"moderado","optional":false},"home_available":true}'::jsonb);

  for r in
    select * from (values
      ('A','code:ex_agachamento_maquina','principal',4,8,12,7.5,9.0,90,120,5.0,1),
      ('A','Cadeira extensora','secundario',3,10,12,8.0,9.0,60,90,2.5,2),
      ('A','Flexora','secundario',3,10,12,8.0,9.0,60,90,2.5,3),
      ('A','code:ex_cadeira_adutora','acessorio',3,12,15,8.0,9.0,60,60,2.5,4),
      ('A','Hip Thrust','principal',3,8,12,8.0,9.0,90,90,5.0,5),

      ('B','Puxada frente','principal',4,8,12,7.5,9.0,90,90,2.5,1),
      ('B','Remada baixa','principal',4,8,12,7.5,9.0,90,90,2.5,2),
      ('B','Desenvolvimento máquina','secundario',3,8,12,8.0,9.0,60,90,2.5,3),
      ('B','Abdominal máquina','acessorio',3,10,15,8.0,9.0,60,60,2.5,4),

      ('C','Hip Thrust','principal',4,8,12,7.5,9.0,90,120,5.0,1),
      ('C','Agachamento búlgaro no Smith','principal',3,8,12,8.0,9.0,90,90,2.5,2),
      ('C','code:ex_coice_polia','acessorio',3,10,15,8.0,9.0,60,60,2.5,3),
      ('C','Flexora','secundario',3,10,12,8.0,9.0,60,90,2.5,4),
      ('C','Cadeira abdutora','acessorio',3,12,15,8.0,9.0,60,60,2.5,5),

      ('D','Chest Press','principal',3,8,12,7.5,9.0,90,90,2.5,1),
      ('D','code:ex_crucifixo','secundario',3,10,12,8.0,9.0,60,90,2.5,2),
      ('D','code:ex_rosca_direta','acessorio',3,10,12,8.0,9.0,60,60,2.0,3),
      ('D','Tríceps máquina','acessorio',3,10,12,8.0,9.0,60,60,2.0,4)
    ) as x(session_code, exercise_ref, exercise_role, sets, reps_min, reps_max, rpe_min, rpe_max, rest_min, rest_max, increment, sort_order)
  loop
    select id into v_session
    from public.program_sessions
    where program_id = v_program and code = r.session_code;

    if left(r.exercise_ref, 5) = 'code:' then
      select id into v_exercise
      from public.exercise_catalog
      where code = substring(r.exercise_ref from 6)
      limit 1;
    else
      select id into v_exercise
      from public.exercise_catalog
      where name = r.exercise_ref
      limit 1;
    end if;

    if v_exercise is null then
      raise exception 'Exercício não encontrado: %', r.exercise_ref;
    end if;

    insert into public.program_exercises (
      session_id, exercise_id, program_id, exercise_role, sets, reps_min, reps_max,
      target_rpe_min, target_rpe_max, rest_seconds_min, rest_seconds_max,
      progression_type, default_load_increment, regression_percent,
      failures_before_regression, sort_order
    ) values (
      v_session, v_exercise, v_program, r.exercise_role, r.sets, r.reps_min, r.reps_max,
      r.rpe_min, r.rpe_max, r.rest_min, r.rest_max,
      'double_progression', r.increment, 7.5, 2, r.sort_order
    );
  end loop;

  for r in
    select * from (values
      ('A',1,'Hack machine',1),
      ('A',1,'Smith Squat',2),
      ('A',1,'code:ex_agachamento_goblet_casa',3),
      ('A',2,'Cadeira extensora articulada',1),
      ('A',2,'Cadeira extensora unilateral',2),
      ('A',2,'code:ex_agachamento_calcanhar_elevado_casa',3),
      ('A',3,'Cadeira flexora',1),
      ('A',3,'Flexora deitada',2),
      ('A',3,'code:ex_stiff_halteres_casa',3),
      ('A',4,'code:ex_agachamento_sumo_halter_casa',1),
      ('A',5,'Smith Hip Thrust',1),
      ('A',5,'Glute Drive',2),
      ('A',5,'code:ex_hip_thrust_halter_casa',3),

      ('B',1,'Pulldown',1),
      ('B',1,'Pullover halter',2),
      ('B',2,'Remada articulada',1),
      ('B',2,'Remada unilateral',2),
      ('B',2,'code:ex_remada_curvada_halteres_casa',3),
      ('B',3,'Desenvolvimento articulado',1),
      ('B',3,'Shoulder Press Hammer',2),
      ('B',3,'code:ex_desenvolvimento_halteres_casa',3),
      ('B',4,'Crunch no solo',1),
      ('B',4,'code:ex_abdominal_halter_casa',2),

      ('C',1,'Smith Hip Thrust',1),
      ('C',1,'Glute Drive',2),
      ('C',1,'code:ex_hip_thrust_halter_casa',3),
      ('C',2,'Afundo Smith',1),
      ('C',2,'code:ex_bulgaro_halteres_casa',2),
      ('C',3,'code:ex_extensao_quadril_chao_casa',1),
      ('C',4,'Cadeira flexora',1),
      ('C',4,'Flexora deitada',2),
      ('C',4,'code:ex_stiff_halteres_casa',3),
      ('C',5,'Abdução Máquina',1),
      ('C',5,'Abdução na polia',2),
      ('C',5,'code:ex_abducao_lateral_casa',3),

      ('D',1,'Supino máquina',1),
      ('D',1,'Supino inclinado com halteres',2),
      ('D',1,'code:ex_supino_halteres_chao_casa',3),
      ('D',2,'code:ex_crucifixo_halteres_chao_casa',1),
      ('D',3,'Rosca máquina',1),
      ('D',3,'Rosca martelo',2),
      ('D',3,'code:ex_rosca_halteres_casa',3),
      ('D',4,'Tríceps corda',1),
      ('D',4,'code:ex_triceps_frances_halter_casa',2)
    ) as x(session_code, exercise_sort_order, alternative_ref, alternative_sort_order)
  loop
    select pe.id into v_program_exercise
    from public.program_exercises pe
    join public.program_sessions ps on ps.id = pe.session_id
    where pe.program_id = v_program
      and ps.code = r.session_code
      and pe.sort_order = r.exercise_sort_order;

    if left(r.alternative_ref, 5) = 'code:' then
      select id into v_alt
      from public.exercise_catalog
      where code = substring(r.alternative_ref from 6)
      limit 1;
    else
      select id into v_alt
      from public.exercise_catalog
      where name = r.alternative_ref
      limit 1;
    end if;

    if v_alt is null then
      raise exception 'Alternativa não encontrada: %', r.alternative_ref;
    end if;

    insert into public.program_exercise_substitutions
      (program_exercise_id, alternative_exercise_id, sort_order)
    values
      (v_program_exercise, v_alt, r.alternative_sort_order);
  end loop;
end $$;

commit;
