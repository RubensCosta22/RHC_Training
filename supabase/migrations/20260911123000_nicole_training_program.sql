-- Nicole — emagrecimento + foco em glúteos (16 semanas)
-- Template de programa. O enrollment será criado quando Nicole tiver perfil/acesso próprio.

begin;

-- Exercícios que ainda não existem no catálogo e variações domésticas.
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

insert into public.training_programs (
  slug,
  name,
  objective,
  duration_weeks,
  description,
  status
)
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

-- Recria somente a definição deste template; nenhum perfil é matriculado nesta migration.
do $$
declare
  v_program uuid;
  v_a uuid;
  v_b uuid;
  v_c uuid;
  v_d uuid;
  v_pe uuid;
  v_ex uuid;
  v_alt uuid;
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
      '{"priority":3,"cardio":{"duration_minutes":"20-30","intensity":"moderado","optional":false},"home_available":true}'::jsonb)
  returning id into v_a;

  select id into v_a from public.program_sessions where program_id=v_program and code='A';
  select id into v_b from public.program_sessions where program_id=v_program and code='B';
  select id into v_c from public.program_sessions where program_id=v_program and code='C';
  select id into v_d from public.program_sessions where program_id=v_program and code='D';

  -- A — Pernas + Glúteos
  select id into v_ex from public.exercise_catalog where code='ex_agachamento_maquina';
  insert into public.program_exercises
    (session_id, exercise_id, program_id, exercise_role, sets, reps_min, reps_max, target_rpe_min, target_rpe_max, rest_seconds_min, rest_seconds_max, progression_type, default_load_increment, regression_percent, failures_before_regression, sort_order)
  values (v_a, v_ex, v_program, 'principal', 4, 8, 12, 7.5, 9.0, 90, 120, 'double_progression', 5, 7.5, 2, 1)
  returning id into v_pe;
  select id into v_alt from public.exercise_catalog where name='Hack machine' limit 1;
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 1);
  select id into v_alt from public.exercise_catalog where name='Smith Squat' limit 1;
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 2);
  select id into v_alt from public.exercise_catalog where code='ex_agachamento_goblet_casa';
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 3);

  select id into v_ex from public.exercise_catalog where name='Cadeira extensora' limit 1;
  insert into public.program_exercises
  values (gen_random_uuid(), v_a, v_ex, v_program, 'secundario', 3, 10, 12, 8.0, 9.0, 60, 90, 'double_progression', 2.5, 7.5, 2, 2, now())
  returning id into v_pe;
  select id into v_alt from public.exercise_catalog where name='Cadeira extensora articulada' limit 1;
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 1);
  select id into v_alt from public.exercise_catalog where name='Cadeira extensora unilateral' limit 1;
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 2);
  select id into v_alt from public.exercise_catalog where code='ex_agachamento_calcanhar_elevado_casa';
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 3);

  select id into v_ex from public.exercise_catalog where name='Flexora' limit 1;
  insert into public.program_exercises
  values (gen_random_uuid(), v_a, v_ex, v_program, 'secundario', 3, 10, 12, 8.0, 9.0, 60, 90, 'double_progression', 2.5, 7.5, 2, 3, now())
  returning id into v_pe;
  select id into v_alt from public.exercise_catalog where name='Cadeira flexora' limit 1;
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 1);
  select id into v_alt from public.exercise_catalog where name='Flexora deitada' limit 1;
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 2);
  select id into v_alt from public.exercise_catalog where code='ex_stiff_halteres_casa';
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 3);

  select id into v_ex from public.exercise_catalog where code='ex_cadeira_adutora';
  insert into public.program_exercises
  values (gen_random_uuid(), v_a, v_ex, v_program, 'acessorio', 3, 12, 15, 8.0, 9.0, 60, 60, 'double_progression', 2.5, 7.5, 2, 4, now())
  returning id into v_pe;
  select id into v_alt from public.exercise_catalog where code='ex_agachamento_sumo_halter_casa';
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 1);

  select id into v_ex from public.exercise_catalog where name='Hip Thrust' limit 1;
  insert into public.program_exercises
  values (gen_random_uuid(), v_a, v_ex, v_program, 'principal', 3, 8, 12, 8.0, 9.0, 90, 90, 'double_progression', 5, 7.5, 2, 5, now())
  returning id into v_pe;
  select id into v_alt from public.exercise_catalog where name='Smith Hip Thrust' limit 1;
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 1);
  select id into v_alt from public.exercise_catalog where name='Glute Drive' limit 1;
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 2);
  select id into v_alt from public.exercise_catalog where code='ex_hip_thrust_halter_casa';
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 3);

  -- B — Costas + Ombros + Abdômen
  select id into v_ex from public.exercise_catalog where name='Puxada frente' limit 1;
  insert into public.program_exercises
  values (gen_random_uuid(), v_b, v_ex, v_program, 'principal', 4, 8, 12, 7.5, 9.0, 90, 90, 'double_progression', 2.5, 7.5, 2, 1, now())
  returning id into v_pe;
  select id into v_alt from public.exercise_catalog where name='Pulldown' limit 1;
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 1);
  select id into v_alt from public.exercise_catalog where name='Pullover halter' limit 1;
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 2);

  select id into v_ex from public.exercise_catalog where name='Remada baixa' limit 1;
  insert into public.program_exercises
  values (gen_random_uuid(), v_b, v_ex, v_program, 'principal', 4, 8, 12, 7.5, 9.0, 90, 90, 'double_progression', 2.5, 7.5, 2, 2, now())
  returning id into v_pe;
  select id into v_alt from public.exercise_catalog where name='Remada articulada' limit 1;
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 1);
  select id into v_alt from public.exercise_catalog where name='Remada unilateral' limit 1;
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 2);
  select id into v_alt from public.exercise_catalog where code='ex_remada_curvada_halteres_casa';
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 3);

  select id into v_ex from public.exercise_catalog where name='Desenvolvimento máquina' limit 1;
  insert into public.program_exercises
  values (gen_random_uuid(), v_b, v_ex, v_program, 'secundario', 3, 8, 12, 8.0, 9.0, 60, 90, 'double_progression', 2.5, 7.5, 2, 3, now())
  returning id into v_pe;
  select id into v_alt from public.exercise_catalog where name='Desenvolvimento articulado' limit 1;
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 1);
  select id into v_alt from public.exercise_catalog where name='Shoulder Press Hammer' limit 1;
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 2);
  select id into v_alt from public.exercise_catalog where code='ex_desenvolvimento_halteres_casa';
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 3);

  select id into v_ex from public.exercise_catalog where name='Abdominal máquina' limit 1;
  insert into public.program_exercises
  values (gen_random_uuid(), v_b, v_ex, v_program, 'acessorio', 3, 10, 15, 8.0, 9.0, 60, 60, 'double_progression', 2.5, 7.5, 2, 4, now())
  returning id into v_pe;
  select id into v_alt from public.exercise_catalog where name='Crunch no solo' limit 1;
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 1);
  select id into v_alt from public.exercise_catalog where code='ex_abdominal_halter_casa';
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 2);

  -- C — Glúteos prioritário
  select id into v_ex from public.exercise_catalog where name='Hip Thrust' limit 1;
  insert into public.program_exercises
  values (gen_random_uuid(), v_c, v_ex, v_program, 'principal', 4, 8, 12, 7.5, 9.0, 90, 120, 'double_progression', 5, 7.5, 2, 1, now())
  returning id into v_pe;
  select id into v_alt from public.exercise_catalog where name='Smith Hip Thrust' limit 1;
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 1);
  select id into v_alt from public.exercise_catalog where name='Glute Drive' limit 1;
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 2);
  select id into v_alt from public.exercise_catalog where code='ex_hip_thrust_halter_casa';
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 3);

  select id into v_ex from public.exercise_catalog where name='Agachamento búlgaro no Smith' limit 1;
  insert into public.program_exercises
  values (gen_random_uuid(), v_c, v_ex, v_program, 'principal', 3, 8, 12, 8.0, 9.0, 90, 90, 'double_progression', 2.5, 7.5, 2, 2, now())
  returning id into v_pe;
  select id into v_alt from public.exercise_catalog where name='Afundo Smith' limit 1;
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 1);
  select id into v_alt from public.exercise_catalog where code='ex_bulgaro_halteres_casa';
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 2);

  select id into v_ex from public.exercise_catalog where code='ex_coice_polia';
  insert into public.program_exercises
  values (gen_random_uuid(), v_c, v_ex, v_program, 'acessorio', 3, 10, 15, 8.0, 9.0, 60, 60, 'double_progression', 2.5, 7.5, 2, 3, now())
  returning id into v_pe;
  select id into v_alt from public.exercise_catalog where code='ex_extensao_quadril_chao_casa';
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 1);

  select id into v_ex from public.exercise_catalog where name='Flexora' limit 1;
  insert into public.program_exercises
  values (gen_random_uuid(), v_c, v_ex, v_program, 'secundario', 3, 10, 12, 8.0, 9.0, 60, 90, 'double_progression', 2.5, 7.5, 2, 4, now())
  returning id into v_pe;
  select id into v_alt from public.exercise_catalog where name='Cadeira flexora' limit 1;
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 1);
  select id into v_alt from public.exercise_catalog where name='Flexora deitada' limit 1;
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 2);
  select id into v_alt from public.exercise_catalog where code='ex_stiff_halteres_casa';
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 3);

  select id into v_ex from public.exercise_catalog where name='Cadeira abdutora' limit 1;
  insert into public.program_exercises
  values (gen_random_uuid(), v_c, v_ex, v_program, 'acessorio', 3, 12, 15, 8.0, 9.0, 60, 60, 'double_progression', 2.5, 7.5, 2, 5, now())
  returning id into v_pe;
  select id into v_alt from public.exercise_catalog where name='Abdução Máquina' limit 1;
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 1);
  select id into v_alt from public.exercise_catalog where name='Abdução na polia' limit 1;
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 2);
  select id into v_alt from public.exercise_catalog where code='ex_abducao_lateral_casa';
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 3);

  -- D — Peito + Braços
  select id into v_ex from public.exercise_catalog where name='Chest Press' limit 1;
  insert into public.program_exercises
  values (gen_random_uuid(), v_d, v_ex, v_program, 'principal', 3, 8, 12, 7.5, 9.0, 90, 90, 'double_progression', 2.5, 7.5, 2, 1, now())
  returning id into v_pe;
  select id into v_alt from public.exercise_catalog where name='Supino máquina' limit 1;
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 1);
  select id into v_alt from public.exercise_catalog where name='Supino inclinado com halteres' limit 1;
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 2);
  select id into v_alt from public.exercise_catalog where code='ex_supino_halteres_chao_casa';
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 3);

  select id into v_ex from public.exercise_catalog where code='ex_crucifixo';
  insert into public.program_exercises
  values (gen_random_uuid(), v_d, v_ex, v_program, 'secundario', 3, 10, 12, 8.0, 9.0, 60, 90, 'double_progression', 2.5, 7.5, 2, 2, now())
  returning id into v_pe;
  select id into v_alt from public.exercise_catalog where code='ex_crucifixo_halteres_chao_casa';
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 1);

  select id into v_ex from public.exercise_catalog where code='ex_rosca_direta';
  insert into public.program_exercises
  values (gen_random_uuid(), v_d, v_ex, v_program, 'acessorio', 3, 10, 12, 8.0, 9.0, 60, 60, 'double_progression', 2, 7.5, 2, 3, now())
  returning id into v_pe;
  select id into v_alt from public.exercise_catalog where name='Rosca máquina' limit 1;
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 1);
  select id into v_alt from public.exercise_catalog where name='Rosca martelo' limit 1;
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 2);
  select id into v_alt from public.exercise_catalog where code='ex_rosca_halteres_casa';
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 3);

  select id into v_ex from public.exercise_catalog where name='Tríceps máquina' limit 1;
  insert into public.program_exercises
  values (gen_random_uuid(), v_d, v_ex, v_program, 'acessorio', 3, 10, 12, 8.0, 9.0, 60, 60, 'double_progression', 2, 7.5, 2, 4, now())
  returning id into v_pe;
  select id into v_alt from public.exercise_catalog where name='Tríceps corda' limit 1;
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 1);
  select id into v_alt from public.exercise_catalog where code='ex_triceps_frances_halter_casa';
  insert into public.program_exercise_substitutions values (v_pe, v_alt, 2);
end $$;

commit;
