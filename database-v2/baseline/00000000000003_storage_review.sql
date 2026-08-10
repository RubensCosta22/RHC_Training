-- RHCT-DATA-002 review-only storage patch.
-- DO NOT APPLY TO LEGACY. Must be squashed into baseline after review.
begin;

create or replace function private.storage_profile_id(object_name text)
returns uuid
language plpgsql
immutable
security definer
set search_path=pg_catalog,storage,private
as $$
declare parts text[];
begin
  parts:=storage.foldername(object_name);
  if coalesce(array_length(parts,1),0)<2 or parts[1]<>'profiles' then return null; end if;
  begin return parts[2]::uuid; exception when invalid_text_representation then return null; end;
end;
$$;
revoke execute on function private.storage_profile_id(text) from public,anon;
grant execute on function private.storage_profile_id(text) to authenticated;

create policy v2_progress_photos_select on storage.objects for select to authenticated
using(bucket_id='progress-photos' and private.can_access_profile(private.storage_profile_id(name)));
create policy v2_progress_photos_insert on storage.objects for insert to authenticated
with check(bucket_id='progress-photos' and private.can_access_profile(private.storage_profile_id(name)));
create policy v2_progress_photos_update on storage.objects for update to authenticated
using(bucket_id='progress-photos' and private.can_access_profile(private.storage_profile_id(name)))
with check(bucket_id='progress-photos' and private.can_access_profile(private.storage_profile_id(name)));
create policy v2_progress_photos_delete on storage.objects for delete to authenticated
using(bucket_id='progress-photos' and private.can_access_profile(private.storage_profile_id(name)));

commit;