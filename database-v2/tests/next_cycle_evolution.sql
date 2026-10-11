\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email) values ('14000000-0000-0000-0000-000000000001','cycle-admin@test.local'),('14000000-0000-0000-0000-000000000002','cycle-user@test.local');
select private.bootstrap_first_admin('14000000-0000-0000-0000-000000000001');
insert into public.app_users(user_id) values ('14000000-0000-0000-0000-000000000002');
insert into public.profiles(id,name) values ('14000000-0000-0000-0000-000000000003','Cycle test'),('14000000-0000-0000-0000-000000000004','Other test');
insert into public.profile_access(user_id,profile_id) values ('14000000-0000-0000-0000-000000000002','14000000-0000-0000-0000-000000000004');
insert into public.training_programs(slug,name,objective,duration_weeks,status) values ('cycle-old','Old cycle','test',12,'published');
insert into public.program_phases(program_id,name,week_start,week_end,volume_modifier) select id,'Deload',12,12,0.55 from public.training_programs where slug='cycle-old';
insert into public.program_enrollments(profile_id,program_id,status,start_date) select '14000000-0000-0000-0000-000000000003',id,'active','2026-07-21' from public.training_programs where slug='cycle-old';
insert into public.workout_sessions(id,profile_id,workout_code,workout_date) values ('14000000-0000-0000-0000-000000000005','14000000-0000-0000-0000-000000000003','D','2026-10-03'),('14000000-0000-0000-0000-000000000006','14000000-0000-0000-0000-000000000003','D','2026-10-09');
insert into public.workout_exercises(session_id,exercise_id,sort_order,exercise_name_snapshot,weight,completed,actual_reps)
select '14000000-0000-0000-0000-000000000005',id,1,name,65,true,'5/5/5' from public.exercise_catalog where name='Flexora';
insert into public.workout_exercises(session_id,exercise_id,sort_order,exercise_name_snapshot,weight,completed,actual_reps)
select '14000000-0000-0000-0000-000000000006',id,1,name,45,true,'5/5' from public.exercise_catalog where name='Flexora';
create temp table preserved as select md5(string_agg(row_to_json(we)::text,'' order by id)) fingerprint,count(*) n from public.workout_exercises we;
set local role authenticated;
select set_config('request.jwt.claim.sub','14000000-0000-0000-0000-000000000002',true);
do $$begin
 begin
  perform public.activate_training_program_v2('14000000-0000-0000-0000-000000000003','rhc-evolution-8w','2026-10-12',null);
  raise exception 'normal user activated a program';
 exception when insufficient_privilege then null; end;
end$$;
select set_config('request.jwt.claim.sub','14000000-0000-0000-0000-000000000001',true);
select public.activate_training_program_v2('14000000-0000-0000-0000-000000000003','rhc-evolution-8w','2026-10-12',null);
select public.activate_training_program_v2('14000000-0000-0000-0000-000000000003','rhc-evolution-8w','2026-10-12',null);
reset role;
select 1 / case when (select count(*) from public.program_enrollments where profile_id='14000000-0000-0000-0000-000000000003')=2 then 1 else 0 end activation_idempotent;
select 1 / case when (select sum(sets) from public.program_exercises pe join public.training_programs tp on tp.id=pe.program_id where tp.slug='rhc-evolution-8w')=69 then 1 else 0 end volume_69;
select 1 / case when (select count(*) from public.program_exercise_baselines b join public.program_exercises pe on pe.id=b.program_exercise_id join public.exercise_catalog ec on ec.id=pe.exercise_id where ec.name='Cadeira flexora' and starting_load=65)=2 then 1 else 0 end preserves_pre_deload_alias_load;
select 1 / case when (select md5(string_agg(row_to_json(we)::text,'' order by id)) from public.workout_exercises we)=(select fingerprint from preserved) then 1 else 0 end history_unchanged;
select 1 / case when exists(select 1 from public.program_exercise_baselines b join public.program_exercises pe on pe.id=b.program_exercise_id where pe.execution_mode='bodyweight' and b.starting_load=0) then 1 else 0 end bodyweight_is_not_legacy_kg;
select 1 / case when not has_function_privilege('anon','public.activate_training_program_v2(uuid,text,date,date)','EXECUTE') then 1 else 0 end anon_denied;
set local role authenticated;
select set_config('request.jwt.claim.sub','14000000-0000-0000-0000-000000000001',true);
select public.save_workout_session_v3('14000000-0000-0000-0000-000000000003','G','2026-10-18','',50,100,0,'','[]','14000000-0000-0000-0000-000000000007',10000,3000,300,'manual','[]');
select public.save_workout_session_v3('14000000-0000-0000-0000-000000000003','G','2026-10-18','',50,100,0,'','[]','14000000-0000-0000-0000-000000000007',10000,3000,300,'manual','[]');
select 1 / case when (select count(*) from public.workout_sessions where client_operation_id='14000000-0000-0000-0000-000000000007')=1 then 1 else 0 end run_g_idempotent;
rollback;
