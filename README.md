# Budget

Personal budget app for two users. See `docs/superpowers/specs/2026-04-28-budget-app-design.md` for the full design and `CLAUDE.md` for engineering conventions.

## Quick start

```bash
pnpm install
pnpm db:start         # local Supabase via Docker
pnpm dev
```

## Database backup

Dump the linked production Supabase project to `backups/`:

```bash
pnpm db:backup
```

Produces three timestamped files under `backups/`:

- `budget-<UTC>-roles.sql` — cluster roles
- `budget-<UTC>-schema.sql` — schema
- `budget-<UTC>-data.sql` — data (COPY format)

Notes:

- Targets the **linked** project (production: `oseatsxiystwkjzbsnlj`). Verify with `pnpm supabase projects list` — the linked row has a dot.
- `backups/` is gitignored; dumps stay local.
- To restore: apply `roles.sql` → `schema.sql` → `data.sql` (in that order) via `psql` against a fresh database.
- For a local dump instead, edit `scripts/db-backup.sh` and swap `--linked` → `--local` (requires `pnpm db:start` running).
