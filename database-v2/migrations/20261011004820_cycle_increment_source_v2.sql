-- The evolution template inherits configured increments only from its predecessor,
-- never from another profile's newer program using the same catalog exercise.
begin;
update public.program_exercises next_exercise
set default_load_increment = (
 select previous.default_load_increment
 from public.program_exercises previous
 join public.training_programs predecessor on predecessor.id=previous.program_id
 left join public.exercise_aliases aliases on aliases.alias_exercise_id=previous.exercise_id
 where predecessor.slug='rhc-strength-12w'
   and coalesce(aliases.canonical_exercise_id,previous.exercise_id)=next_exercise.exercise_id
 order by previous.created_at desc,previous.sort_order limit 1
)
from public.training_programs next_program
where next_program.id=next_exercise.program_id and next_program.slug='rhc-evolution-8w';
commit;
