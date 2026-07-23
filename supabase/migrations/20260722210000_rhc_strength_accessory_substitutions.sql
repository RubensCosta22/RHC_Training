-- PR #53 — Completa as substituições equivalentes do RHC Strength 12W.
-- Mantém o mesmo padrão de movimento e não altera histórico, progressão ou prescrições.

do $$
declare
  v_program uuid;
  v_ex uuid;
  r record;
begin
  select id into v_program
  from public.training_programs
  where slug = 'rhc-strength-12w';

  if v_program is null then
    raise exception 'RHC Strength 12W não encontrado';
  end if;

  for r in select * from (values
    ('Supino inclinado máquina','Chest Press inclinado','empurrar_inclinado',1),
    ('Supino inclinado máquina','Supino inclinado Smith','empurrar_inclinado',2),
    ('Supino inclinado máquina','Supino inclinado com halteres','empurrar_inclinado',3),

    ('Elevação lateral','Elevação lateral máquina','abducao_ombro',1),
    ('Elevação lateral','Elevação lateral na polia','abducao_ombro',2),
    ('Elevação lateral','Elevação lateral com halteres','abducao_ombro',3),

    ('Tríceps corda','Tríceps barra V','extensao_cotovelo',1),
    ('Tríceps corda','Tríceps máquina','extensao_cotovelo',2),
    ('Tríceps corda','Tríceps unilateral na polia','extensao_cotovelo',3),

    ('Pullover','Pullover máquina','extensao_ombro',1),
    ('Pullover','Puxada com braços estendidos','extensao_ombro',2),
    ('Pullover','Pullover na polia','extensao_ombro',3),

    ('Rosca máquina','Rosca Scott máquina','flexao_cotovelo',1),
    ('Rosca máquina','Rosca na polia','flexao_cotovelo',2),
    ('Rosca máquina','Rosca Scott com barra','flexao_cotovelo',3),

    ('Face Pull','Face Pull na corda','puxar_face',1),
    ('Face Pull','Peck deck inverso','puxar_face',2),
    ('Face Pull','Crucifixo inverso na polia','puxar_face',3),

    ('Extensora','Cadeira extensora unilateral','extensao_joelho',1),
    ('Extensora','Cadeira extensora articulada','extensao_joelho',2),
    ('Extensora','Extensora 90-60','extensao_joelho',3),

    ('Panturrilha','Panturrilha em pé máquina','flexao_plantar',1),
    ('Panturrilha','Panturrilha sentada','flexao_plantar',2),
    ('Panturrilha','Panturrilha no Leg Press','flexao_plantar',3),

    ('Abdômen','Abdominal máquina','core',1),
    ('Abdômen','Crunch na polia','core',2),
    ('Abdômen','Crunch no solo','core',3),

    ('Afundo Smith','Passada no Smith','unilateral_joelho',1),
    ('Afundo Smith','Agachamento búlgaro no Smith','unilateral_joelho',2),
    ('Afundo Smith','Leg Press unilateral','unilateral_joelho',3),

    ('Abdução','Cadeira abdutora','abducao_quadril',1),
    ('Abdução','Abdução na polia','abducao_quadril',2),
    ('Abdução','Abdução máquina em pé','abducao_quadril',3),

    ('Pallof Press','Pallof Press unilateral','anti_rotacao',1),
    ('Pallof Press','Pallof Press ajoelhado','anti_rotacao',2),
    ('Pallof Press','Anti-rotação na polia','anti_rotacao',3)
  ) as t(base_name, alt_name, pattern, ord)
  loop
    select pe.id into v_ex
    from public.program_exercises pe
    join public.program_sessions ps on ps.id = pe.session_id
    where ps.program_id = v_program
      and pe.exercise_name = r.base_name
    limit 1;

    if v_ex is not null then
      insert into public.program_exercise_substitutions (
        program_exercise_id,
        exercise_name,
        movement_pattern,
        sort_order
      )
      values (v_ex, r.alt_name, r.pattern, r.ord)
      on conflict (program_exercise_id, exercise_name)
      do update set
        movement_pattern = excluded.movement_pattern,
        sort_order = excluded.sort_order;
    end if;

    v_ex := null;
  end loop;
end $$;
