-- RHCT-DATA-002 review-only integrity patch.
-- DO NOT APPLY TO LEGACY. Must be squashed into baseline after review.
begin;

alter table public.workout_sessions
  add constraint workout_sessions_id_profile_unique unique (id, profile_id);

alter table public.program_sessions
  add constraint program_sessions_id_program_unique unique (id, program_id);

alter table public.program_enrollments
  add constraint program_enrollments_id_profile_unique unique (id, profile_id),
  add constraint program_enrollments_id_profile_program_unique unique (id, profile_id, program_id),
  add constraint program_enrollments_id_program_unique unique (id, program_id);

alter table public.program_exercises add column program_id uuid;
update public.program_exercises pe set program_id=ps.program_id
from public.program_sessions ps where ps.id=pe.session_id;
alter table public.program_exercises
  alter column program_id set not null,
  add constraint program_exercises_program_fk foreign key(program_id) references public.training_programs(id),
  add constraint program_exercises_session_program_fk foreign key(session_id,program_id) references public.program_sessions(id,program_id),
  add constraint program_exercises_id_program_unique unique(id,program_id);

alter table public.program_exercise_baselines add column program_id uuid;
update public.program_exercise_baselines b set program_id=e.program_id
from public.program_enrollments e where e.id=b.enrollment_id;
alter table public.program_exercise_baselines
  alter column program_id set not null,
  add constraint program_baselines_enrollment_program_fk foreign key(enrollment_id,program_id) references public.program_enrollments(id,program_id),
  add constraint program_baselines_exercise_program_fk foreign key(program_exercise_id,program_id) references public.program_exercises(id,program_id);

alter table public.program_exercise_exposures add column program_id uuid;
update public.program_exercise_exposures x set program_id=e.program_id
from public.program_enrollments e where e.id=x.enrollment_id;
alter table public.program_exercise_exposures
  alter column program_id set not null,
  add constraint program_exposures_enrollment_profile_program_fk foreign key(enrollment_id,profile_id,program_id) references public.program_enrollments(id,profile_id,program_id),
  add constraint program_exposures_exercise_program_fk foreign key(program_exercise_id,program_id) references public.program_exercises(id,program_id),
  add constraint program_exposures_session_profile_fk foreign key(workout_session_id,profile_id) references public.workout_sessions(id,profile_id);

alter table public.profile_training_state
  add constraint training_state_enrollment_profile_fk foreign key(active_program_enrollment_id,profile_id) references public.program_enrollments(id,profile_id),
  add constraint training_state_session_profile_fk foreign key(last_completed_session_id,profile_id) references public.workout_sessions(id,profile_id);

alter table public.workout_drafts
  add constraint drafts_enrollment_profile_fk foreign key(program_enrollment_id,profile_id) references public.program_enrollments(id,profile_id),
  add constraint drafts_consumed_session_profile_fk foreign key(consumed_session_id,profile_id) references public.workout_sessions(id,profile_id);

commit;