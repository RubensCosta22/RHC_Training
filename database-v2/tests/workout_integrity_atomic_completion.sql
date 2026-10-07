\set ON_ERROR_STOP on
begin;

insert into auth.users(
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
  confirmation_token,email_change,email_change_token_new,recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '13000000-0000-0000-0000-000000000001',
  'authenticated','authenticated','workout-integrity@test.local','',now(),
  '{}','{}',now(),now(),'','','',''
);

select private.bootstrap_first_admin('13000000-0000-0000-0000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub','13000000-0000-0000-0000-000000000001',true);
select set_config(
  'request.jwt.claims',
  '{"sub":"13000000-0000-0000-0000-000000000001","email":"workout-integrity@test.local","role":"authenticated"}',
  true
);

insert into public.profiles(id,name)
values('23000000-0000-0000-0000-000000000001','Workout Integrity');

reset role;
insert into public.exercise_catalog(id,code,name)
values('43000000-0000-0000-0000-000000000001','workout_integrity_exercise','Workout Integrity Exercise');

set local role authenticated;
select set_config('request.jwt.claim.sub','13000000-0000-0000-0000-000000000001',true);
select set_config(
  'request.jwt.claims',
  '{"sub":"13000000-0000-0000-0000-000000000001","email":"workout-integrity@test.local","role":"authenticated"}',
  true
);

do $$
declare
  v_draft uuid := '73000000-0000-0000-0000-000000000001';
  v_session public.workout_sessions;
  v_count integer;
begin
  select * into v_session from public.save_workout_session_v3(
    '23000000-0000-0000-0000-000000000001',
    'A',
    current_date,
    'CI',
    1,
    100,
    0,
    'atomic success',
    '[{"exercise_name":"Workout Integrity Exercise","muscle_group":"core","sets":1,"reps":"1","actual_reps":"1","weight":0,"completed":true,"notes":""}]'::jsonb,
    v_draft,
    null,
    null,
    null,
    null,
    '[]'::jsonb
  );

  if v_session.id is null then
    raise exception 'v3 must return the saved session';
  end if;

  select count(*) into v_count
  from public.workout_sessions
  where client_operation_id=v_draft;

  if v_count<>1 then
    raise exception 'expected exactly one idempotent session, got %',v_count;
  end if;
end $$;

do $$
declare
  v_draft uuid := '73000000-0000-0000-0000-000000000002';
  v_count integer;
begin
  begin
    perform public.save_workout_session_v3(
      '23000000-0000-0000-0000-000000000001',
      'A',
      current_date,
      'CI',
      1,
      100,
      0,
      'atomic rollback',
      '[{"exercise_name":"Workout Integrity Exercise","muscle_group":"core","sets":1,"reps":"1","actual_reps":"1","weight":0,"completed":true,"notes":""}]'::jsonb,
      v_draft,
      null,
      null,
      null,
      null,
      '[{"enrollment_id":"93000000-0000-0000-0000-000000000001","program_exercise_id":"93000000-0000-0000-0000-000000000002","program_id":"93000000-0000-0000-0000-000000000003","variation_exercise_id":"43000000-0000-0000-0000-000000000001","variation_name_snapshot":"Workout Integrity Exercise","load":0,"reps":[1],"completed_sets":1,"progression_action":"manual"}]'::jsonb
    );
    raise exception 'expected invalid exposure foreign key to fail';
  exception
    when foreign_key_violation then null;
  end;

  select count(*) into v_count
  from public.workout_sessions
  where client_operation_id=v_draft;

  if v_count<>0 then
    raise exception 'atomic rollback failed: session persisted';
  end if;
end $$;

rollback;
