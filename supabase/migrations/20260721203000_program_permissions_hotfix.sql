-- Hotfix de permissões do Motor de Programas.
-- Não altera dados nem policies; apenas explicita privilégios SQL mínimos.

-- Leitura dos templates e vínculos visíveis via RLS.
grant select on table public.training_programs to authenticated;
grant select on table public.program_phases to authenticated;
grant select on table public.program_sessions to authenticated;
grant select on table public.program_exercises to authenticated;
grant select on table public.program_exercise_substitutions to authenticated;
grant select on table public.profile_program_enrollments to authenticated;
grant select on table public.profile_program_exercise_baselines to authenticated;
grant select on table public.profile_training_archives to authenticated;
grant select on table public.program_exercise_exposures to authenticated;

-- Escrita somente onde já existe policy RLS correspondente.
grant insert, update on table public.profile_program_enrollments to authenticated;
grant insert, update on table public.profile_program_exercise_baselines to authenticated;
grant insert on table public.program_exercise_exposures to authenticated;

-- Nenhum DELETE é concedido.
