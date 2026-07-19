-- Compatibilidade com a tabela profile_access preexistente.
-- Preserva viewer/editor e adiciona os papeis usados pelo grupo familiar.
alter table public.profile_access
  drop constraint if exists profile_access_role_check;

alter table public.profile_access
  add constraint profile_access_role_check
  check (role in ('viewer', 'editor', 'owner', 'admin'));
