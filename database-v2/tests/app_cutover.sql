\set ON_ERROR_STOP on
begin;

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
values
('00000000-0000-0000-0000-000000000000','11000000-0000-0000-0000-000000000001','authenticated','authenticated','admin-cutover@test.local','',now(),'{}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','11000000-0000-0000-0000-000000000002','authenticated','authenticated','invitee-cutover@test.local','',now(),'{}','{}',now(),now(),'','','','');

select private.bootstrap_first_admin('11000000-0000-0000-0000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub','11000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"11000000-0000-0000-0000-000000000001","email":"admin-cutover@test.local","role":"authenticated"}',true);

insert into public.profiles(id,name) values('21000000-0000-0000-0000-000000000001','Invited Profile');
insert into public.profiles(id,name) values('21000000-0000-0000-0000-000000000002','Other Profile');
insert into public.profile_invitations(profile_id,email)
values('21000000-0000-0000-0000-000000000001','invitee-cutover@test.local');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','11000000-0000-0000-0000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"11000000-0000-0000-0000-000000000002","email":"invitee-cutover@test.local","role":"authenticated"}',true);

-- Direct provisioning must remain denied even when an invite exists.
do $$ begin
  begin
    insert into public.app_users(user_id,role,status)
    values('11000000-0000-0000-0000-000000000002','user','active');
    raise exception 'expected direct app_users provisioning denial';
  exception when insufficient_privilege then null; end;
end $$;

-- The atomic RPC provisions app_user + 1:1 access + claimed invitation together.
do $$ declare claimed uuid; begin
  select public.claim_profile_invitation() into claimed;
  if claimed <> '21000000-0000-0000-0000-000000000001'::uuid then
    raise exception 'unexpected claimed profile: %', claimed;
  end if;
end $$;

do $$ declare n bigint; begin
  select count(*) into n from public.profiles;
  if n<>1 then raise exception 'invitee must see exactly one profile, got %',n; end if;
end $$;

-- Repeated claim is idempotent: no pending invite returns null and creates nothing else.
do $$ declare claimed uuid; n bigint; begin
  select public.claim_profile_invitation() into claimed;
  if claimed is not null then raise exception 'repeat claim must return null'; end if;
  select count(*) into n from public.profile_access where user_id='11000000-0000-0000-0000-000000000002';
  if n<>1 then raise exception 'repeat claim changed access cardinality'; end if;
end $$;

-- Normal user cannot create arbitrary profiles.
do $$ begin
  begin
    insert into public.profiles(name) values('Unauthorized Profile');
    raise exception 'expected normal-user profile creation denial';
  exception when insufficient_privilege then null;
           when check_violation then null; end;
end $$;

-- Weekly schedule is writable only for the accessible profile.
insert into public.profile_weekly_schedule(profile_id,day_of_week,workout_code)
values('21000000-0000-0000-0000-000000000001',1,'E');

do $$ begin
  begin
    insert into public.profile_weekly_schedule(profile_id,day_of_week,workout_code)
    values('21000000-0000-0000-0000-000000000002',1,'F');
    raise exception 'expected cross-profile weekly-schedule denial';
  exception when insufficient_privilege then null;
           when check_violation then null; end;
end $$;

-- Running workout E is valid with no strength exercises.
select public.save_workout_session_v2(
  '21000000-0000-0000-0000-000000000001','E',current_date,'CI',30,100,0,'running test','[]'::jsonb,
  '71000000-0000-0000-0000-000000000001',5000,1800,360,'manual'
);

-- Strength workout F resolves exercises through the canonical catalog.
reset role;
insert into public.exercise_catalog(id,code,name)
values('41000000-0000-0000-0000-000000000010','cutover_test_exercise','Cutover Test Exercise');
set local role authenticated;
select set_config('request.jwt.claim.sub','11000000-0000-0000-0000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"11000000-0000-0000-0000-000000000002","email":"invitee-cutover@test.local","role":"authenticated"}',true);

select public.save_workout_session_v2(
  '21000000-0000-0000-0000-000000000001','F',current_date,'CI',60,100,300,'strength test',
  '[{"exercise_name":"Cutover Test Exercise","muscle_group":"core","sets":3,"reps":"10","actual_reps":"10","weight":10,"completed":true,"notes":""}]'::jsonb,
  '71000000-0000-0000-0000-000000000002',null,null,null,null
);

do $$ declare n bigint; begin
  select count(*) into n from public.workout_sessions where profile_id='21000000-0000-0000-0000-000000000001';
  if n<>2 then raise exception 'expected E and F sessions, got %',n; end if;
end $$;

rollback;
