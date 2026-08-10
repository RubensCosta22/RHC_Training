\set ON_ERROR_STOP on
begin;

-- Deterministic test identities.
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
values
('00000000-0000-0000-0000-000000000000','10000000-0000-0000-0000-000000000001','authenticated','authenticated','admin-v2@test.local','',now(),'{}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','10000000-0000-0000-0000-000000000002','authenticated','authenticated','user-a-v2@test.local','',now(),'{}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','10000000-0000-0000-0000-000000000003','authenticated','authenticated','user-b-v2@test.local','',now(),'{}','{}',now(),now(),'','','','');

select private.bootstrap_first_admin('10000000-0000-0000-0000-000000000001');
insert into public.app_users(user_id,role,status) values
('10000000-0000-0000-0000-000000000002','user','active'),
('10000000-0000-0000-0000-000000000003','user','active');

insert into public.profiles(id,name) values
('20000000-0000-0000-0000-000000000001','Profile A'),
('20000000-0000-0000-0000-000000000002','Profile B');
insert into public.profile_access(user_id,profile_id) values
('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001'),
('10000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000002');

-- Build two separate program contexts.
insert into public.training_programs(id,slug,name,objective,duration_weeks,status) values
('30000000-0000-0000-0000-000000000001','program-a','Program A','test',12,'published'),
('30000000-0000-0000-0000-000000000002','program-b','Program B','test',12,'published');
insert into public.program_sessions(id,program_id,code,name,session_type,day_order) values
('31000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','A','A','strength',1),
('31000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002','B','B','strength',1);
insert into public.exercise_catalog(id,code,name) values('40000000-0000-0000-0000-000000000001','test_exercise','Test Exercise');
insert into public.program_exercises(id,session_id,exercise_id,exercise_role,sets,reps_min,reps_max,program_id) values
('41000000-0000-0000-0000-000000000001','31000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','principal',3,8,10,'30000000-0000-0000-0000-000000000001'),
('41000000-0000-0000-0000-000000000002','31000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000001','principal',3,8,10,'30000000-0000-0000-0000-000000000002');
insert into public.program_enrollments(id,profile_id,program_id,status) values
('50000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','active'),
('50000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002','active');
insert into public.workout_sessions(id,profile_id,workout_code,workout_date) values
('60000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','A',current_date),
('60000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','B',current_date);

-- Composite integrity must reject cross-profile/program combinations.
do $$ begin
  begin
    insert into public.program_exercise_exposures(profile_id,enrollment_id,program_exercise_id,workout_session_id,variation_name_snapshot,program_id)
    values('20000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000002','41000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000001','bad','30000000-0000-0000-0000-000000000002');
    raise exception 'expected cross-context exposure rejection';
  exception when foreign_key_violation then null; end;
end $$;

do $$ begin
  begin
    insert into public.profile_training_state(profile_id,active_program_enrollment_id,last_completed_session_id)
    values('20000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000001');
    raise exception 'expected cross-profile training state rejection';
  exception when foreign_key_violation then null; end;
end $$;

do $$ begin
  begin
    insert into public.workout_drafts(profile_id,workout_code,program_enrollment_id,client_operation_id)
    values('20000000-0000-0000-0000-000000000001','A','50000000-0000-0000-0000-000000000002',gen_random_uuid());
    raise exception 'expected cross-profile draft rejection';
  exception when foreign_key_violation then null; end;
end $$;

-- Last active admin cannot be disabled.
do $$ begin
  begin
    update public.app_users set status='disabled' where user_id='10000000-0000-0000-0000-000000000001';
    raise exception 'expected last-admin protection';
  exception when check_violation then null; end;
end $$;

-- RLS: User A sees only Profile A and cannot write a session for Profile B.
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);

do $$ declare n bigint; begin
  select count(*) into n from public.profiles;
  if n<>1 then raise exception 'RLS expected exactly one visible profile, got %',n; end if;
end $$;

do $$ begin
  begin
    insert into public.workout_sessions(profile_id,workout_code,workout_date)
    values('20000000-0000-0000-0000-000000000002','A',current_date);
    raise exception 'expected cross-profile RLS rejection';
  exception when insufficient_privilege then null;
           when check_violation then null; end;
end $$;

-- Non-admin cannot call admin RPC successfully.
do $$ begin
  begin
    perform public.admin_revoke_profile_access('10000000-0000-0000-0000-000000000003');
    raise exception 'expected admin RPC denial';
  exception when insufficient_privilege then null; end;
end $$;

reset role;

-- Disabled user fails closed even with an existing mapping.
update public.app_users set status='disabled' where user_id='10000000-0000-0000-0000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
do $$ declare n bigint; begin
  select count(*) into n from public.profiles;
  if n<>0 then raise exception 'disabled user must see zero profiles, got %',n; end if;
end $$;
reset role;

rollback;
