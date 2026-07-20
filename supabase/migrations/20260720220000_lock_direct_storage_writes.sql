-- Aplique somente depois de publicar a Edge Function secure-image-upload e o
-- frontend que a utiliza. Nenhum objeto existente no Storage e removido.
drop policy if exists "progress_photos_storage_insert_editor" on storage.objects;
drop policy if exists "progress_photos_storage_update_editor" on storage.objects;
drop policy if exists "progress_photos_storage_delete_editor" on storage.objects;

-- SELECT permanece protegido por progress_photos_storage_select_by_role.
-- Novas mutacoes passam exclusivamente pela Edge Function autenticada.
