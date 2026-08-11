-- RHCT-DATA-002 — Gate 1A Legacy structural inventory
-- READ ONLY: catalog and metadata SELECTs only.
-- Run against the current Legacy Supabase production database.

-- 1. Public relations and RLS state
select
  n.nspname as schema_name,
  c.relname as relation_name,
  case c.relkind
    when 'r' then 'table'
    when 'p' then 'partitioned_table'
    when 'v' then 'view'
    when 'm' then 'materialized_view'
    else c.relkind::text
  end as relation_type,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced,
  coalesce(s.n_live_tup, 0) as estimated_live_rows
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_stat_user_tables s
  on s.relid = c.oid
where n.nspname = 'public'
  and c.relkind in ('r','p','v','m')
order by c.relname;

-- 2. Public columns
select
  table_name,
  ordinal_position,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;

-- 3. PK / UNIQUE / FK / CHECK constraints with definitions
select
  n.nspname as schema_name,
  c.relname as table_name,
  con.conname as constraint_name,
  case con.contype
    when 'p' then 'PRIMARY KEY'
    when 'u' then 'UNIQUE'
    when 'f' then 'FOREIGN KEY'
    when 'c' then 'CHECK'
    when 'x' then 'EXCLUDE'
    else con.contype::text
  end as constraint_type,
  pg_get_constraintdef(con.oid, true) as definition
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
order by c.relname, constraint_type, con.conname;

-- 4. Indexes
select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;

-- 5. RLS policies
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname in ('public','storage')
order by schemaname, tablename, policyname;

-- 6. Public functions: signature, security mode, volatility and configured search_path
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as returns,
  case when p.prosecdef then 'SECURITY DEFINER' else 'SECURITY INVOKER' end as security_mode,
  p.provolatile as volatility,
  p.proconfig as function_config
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname, arguments;

-- 7. Trigger inventory
select
  n.nspname as schema_name,
  c.relname as table_name,
  t.tgname as trigger_name,
  pg_get_triggerdef(t.oid, true) as trigger_definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and not t.tgisinternal
order by c.relname, t.tgname;

-- 8. Storage buckets
select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at,
  updated_at
from storage.buckets
order by id;

-- 9. Current profiles with legacy ownership fields when present in current schema
-- This query assumes profiles still contains user_id, which repository evidence indicates Legacy does.
select
  p.id as profile_id,
  p.name as profile_name,
  p.user_id as legacy_user_id,
  u.email as legacy_owner_email,
  p.created_at
from public.profiles p
left join auth.users u on u.id = p.user_id
order by p.name, p.created_at, p.id;

-- 10. Auth identities for controlled mapping; no credential/password material is selected.
select
  id as auth_user_id,
  email,
  created_at,
  last_sign_in_at
from auth.users
order by email nulls last, created_at;

-- 11. Tables containing direct profile_id columns
select
  table_name,
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and column_name = 'profile_id'
order by table_name;

-- 12. Foreign keys ultimately pointing directly to public.profiles(id)
select
  con.conname as constraint_name,
  rel_ns.nspname as table_schema,
  rel.relname as table_name,
  att.attname as column_name,
  ref_rel.relname as referenced_table,
  ref_att.attname as referenced_column,
  pg_get_constraintdef(con.oid, true) as definition
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace rel_ns on rel_ns.oid = rel.relnamespace
join pg_class ref_rel on ref_rel.oid = con.confrelid
join pg_namespace ref_ns on ref_ns.oid = ref_rel.relnamespace
join lateral unnest(con.conkey) with ordinality as ck(attnum, ord) on true
join lateral unnest(con.confkey) with ordinality as fk(attnum, ord) on fk.ord = ck.ord
join pg_attribute att on att.attrelid = rel.oid and att.attnum = ck.attnum
join pg_attribute ref_att on ref_att.attrelid = ref_rel.oid and ref_att.attnum = fk.attnum
where con.contype = 'f'
  and rel_ns.nspname = 'public'
  and ref_ns.nspname = 'public'
  and ref_rel.relname = 'profiles'
  and ref_att.attname = 'id'
order by rel.relname, att.attname, con.conname;
