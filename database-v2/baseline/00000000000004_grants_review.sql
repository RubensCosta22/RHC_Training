-- RHCT-DATA-002 — review patch: least-privilege table grants
-- DRAFT REVIEW PATCH. Will be squashed into the final V2 baseline after approval.

begin;

-- Reset generic privileges first. RLS remains the authorization boundary for
-- rows, while these grants define which operations can reach that boundary.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- Identity/profile surface.
grant select on public.app_users to authenticated;
grant select, update on public.profiles to authenticated;
-- profile_access intentionally has NO direct authenticated grants.

-- Read-only reference/catalog data.
grant select on public.muscle_groups to authenticated;
grant select on public.movement_patterns to authenticated;
grant select on public.exercise_categories to authenticated;
grant select on public.exercise_catalog to authenticated;
grant select on public.training_programs to authenticated;
grant select on public.program_phases to authenticated;
grant select on public.program_sessions to authenticated;
grant select on public.program_exercises to authenticated;
grant select on public.program_exercise_substitutions to authenticated;

-- Profile-owned editable configuration/state.
grant select, insert, update, delete on public.workout_plans to authenticated;
grant select, insert, update, delete on public.workout_plan_exercises to authenticated;
grant select, insert, update, delete on public.workout_plan_exercise_alternatives to authenticated;
grant select, insert, update, delete on public.exercise_records to authenticated;
grant select, insert, update, delete on public.body_measurements to authenticated;
grant select, insert, update, delete on public.progress_photos to authenticated;
grant select, insert, update, delete on public.program_enrollments to authenticated;
grant select, insert, update, delete on public.program_exercise_baselines to authenticated;
grant select, insert, update, delete on public.profile_training_state to authenticated;
grant select, insert, update, delete on public.workout_drafts to authenticated;

-- Completed workout history is append-oriented from the generic client path.
-- UPDATE/DELETE remain intentionally unavailable until a protected correction
-- operation is specified and tested.
grant select, insert on public.workout_sessions to authenticated;
grant select, insert on public.workout_exercises to authenticated;
grant select, insert on public.program_exercise_exposures to authenticated;

-- event_logs intentionally has NO generic authenticated grant. Audit emission
-- belongs to protected/admin/security paths.

-- No generic anon access to V2 domain tables.

commit;
