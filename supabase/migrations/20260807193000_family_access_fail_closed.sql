-- P0 SECURITY HOTFIX — family access must fail closed.
--
-- Root cause: legacy profiles may share profiles.user_id while family_group_id is NULL.
-- The previous authorization fallback treated every such profile as an individual profile,
-- allowing a family member to see unrelated legacy profiles when profiles.user_id = auth.uid().
--
-- This migration changes authorization functions only. It does NOT update/delete any profile,
-- workout, record, measurement, photo, invitation, membership or historical owner id.
--
-- Rule after this migration:
--   1) If the authenticated account belongs to family_members, profile_access is the ONLY
--      authorization source for profile access.
--   2) Only accounts that do NOT belong to any family group may use the legacy
--      individual-profile fallback (family_group_id IS NULL AND profiles.user_id = auth.uid()).

create or replace function public.can_view_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.profiles p
    where p.id = target_profile_id
      and (
        exists (
          select 1
          from public.profile_access a
          where a.profile_id = p.id
            and a.user_id = auth.uid()
            and a.role in ('viewer', 'editor', 'owner', 'admin')
        )
        or (
          p.family_group_id is null
          and p.user_id = auth.uid()
          and not exists (
            select 1
            from public.family_members m
            where m.user_id = auth.uid()
          )
        )
      )
  );
$$;

create or replace function public.can_edit_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.profiles p
    where p.id = target_profile_id
      and (
        exists (
          select 1
          from public.profile_access a
          where a.profile_id = p.id
            and a.user_id = auth.uid()
            and a.role in ('editor', 'owner', 'admin')
        )
        or (
          p.family_group_id is null
          and p.user_id = auth.uid()
          and not exists (
            select 1
            from public.family_members m
            where m.user_id = auth.uid()
          )
        )
      )
  );
$$;

create or replace function public.can_manage_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.profiles p
    where p.id = target_profile_id
      and (
        exists (
          select 1
          from public.profile_access a
          where a.profile_id = p.id
            and a.user_id = auth.uid()
            and a.role in ('owner', 'admin')
        )
        or (
          p.family_group_id is null
          and p.user_id = auth.uid()
          and not exists (
            select 1
            from public.family_members m
            where m.user_id = auth.uid()
          )
        )
      )
  );
$$;

-- Compatibility alias used by older code paths.
create or replace function public.can_access_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_view_profile(target_profile_id);
$$;

revoke all on function public.can_view_profile(uuid) from public;
revoke all on function public.can_edit_profile(uuid) from public;
revoke all on function public.can_manage_profile(uuid) from public;
revoke all on function public.can_access_profile(uuid) from public;

grant execute on function public.can_view_profile(uuid) to authenticated;
grant execute on function public.can_edit_profile(uuid) to authenticated;
grant execute on function public.can_manage_profile(uuid) to authenticated;
grant execute on function public.can_access_profile(uuid) to authenticated;
