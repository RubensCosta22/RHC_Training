\set ON_ERROR_STOP on
begin;

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
values
('00000000-0000-0000-0000-000000000000','12000000-0000-0000-0000-000000000001','authenticated','authenticated','draft-admin@test.local','',now(),'{}','{}',now(),now(),'','','',''),
('00000000-0000-0000-0000-000000000000','12000000-0000-0000-0000-000000000002','authenticated','authenticated','draft-denied@test.local','',now(),'{}','{}',now(),now(),'','','','');

select private.bootstrap_first_admin('12000000-0000-0000-0000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub','12000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"12000000-0000-0000-0000-000000000001","email":"draft-admin@test.local","role":"authenticated"}',true);

insert into public.profiles(id,name)
values('22000000-0000-0000-0000-000000000001','Draft Test Profile');

select public.save_workout_draft_v2(
  '32000000-0000-0000-0000-000000000001',
  '22000000-0000-0000-0000-000000000001',
  'D',null,'draft-test',
  '{"marker":"first","weight":61,"reps":5}'::jsonb
);

select public.save_workout_draft_v2(
  '32000000-0000-0000-0000-000000000001',
  '22000000-0000-0000-0000-000000000001',
  'D',null,'draft-test',
  '{"marker":"second","weight":62,"reps":6}'::jsonb
);

do $$
declare v_version integer; v_payload jsonb; v_count bigint;
begin
  select version,payload into v_version,v_payload
  from public.workout_drafts
  where id='32000000-0000-0000-0000-000000000001';

  if v_version <> 2 then
    raise exception 'expected version 2 after two saves, got %', v_version;
  end if;
  if v_payload->>'marker' <> 'second' or (v_payload->>'weight')::int <> 62 or (v_payload->>'reps')::int <> 6 then
    raise exception 'latest payload was not preserved: %', v_payload;
  end if;
  select count(*) into v_count from public.workout_drafts where profile_id='22000000-0000-0000-0000-000000000001';
  if v_count <> 1 then
    raise exception 'repeated saves must keep one draft row, got %', v_count;
  end if;
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','12000000-0000-0000-0000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"12000000-0000-0000-0000-000000000002","email":"draft-denied@test.local","role":"authenticated"}',true);

do $$ begin
  begin
    perform public.save_workout_draft_v2(
      '32000000-0000-0000-0000-000000000002',
      '22000000-0000-0000-0000-000000000001',
      'D',null,'draft-denied','{}'::jsonb
    );
    raise exception 'expected unauthorized draft save denial';
  exception when insufficient_privilege then null; end;
end $$;

rollback;
