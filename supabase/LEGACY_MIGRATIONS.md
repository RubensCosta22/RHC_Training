# Legacy Supabase migrations

The files under `supabase/migrations/` belong to the retired RHC Training Legacy database lineage.

They are preserved only for historical audit, rollback investigation, and migration evidence. **Do not apply, replay, reset, or diff these migrations against Database V2.** They include the retired family/team authorization model and other schema objects that no longer exist in the active architecture.

## Canonical Database V2 source

The current production database contract is:

- `database-v2/baseline/00000000000000_baseline_v2.sql`
- tests under `database-v2/tests/`
- CI gate `.github/workflows/database-v2-ci.yml`

New Database V2 schema work must evolve from that canonical baseline/process and must not resume the Legacy migration chain.

Production cutover to Database V2 was completed on 2026-08-11. The Legacy Supabase project is retained temporarily only as a rollback source during the observation window.
