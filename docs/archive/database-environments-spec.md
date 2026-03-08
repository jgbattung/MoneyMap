# Database Environments & Schema Sync Spec

## Goal

The current production database (Supabase) has experienced schema drift: the active `schema.prisma` file matches the production database table structure, but the local `prisma/migrations` folder is missing the migration file that added those missing columns. This prevents running `prisma migrate dev` locally. 

Additionally, we need a separate, isolated local database environment for safe development and future testing without risking production data.

This feature establishes a local PostgreSQL database using Docker Compose, applies existing migrations, generates the missing migration to capture the drift, and safely resolves the migration history in production so everything is perfectly synced without data loss.

## User Review Required

> [!WARNING]
> **CRITICAL DATA SAFETY WARNING:**
> Phase 2 explicitly interacts with the production Supabase database. 
> The very first step of Phase 2 **must** be a manual backup of the Supabase project from the Supabase dashboard. Do not proceed with migration resolution commands until the user confirms the backup is complete.

## Proposed Changes

### Configuration Files

#### [NEW] `docker-compose.yml`
Creates a local PostgreSQL service specifically for Money Map development.
- Exposes port `5432` locally.
- Sets up a persistent volume for database data.
- Configures default `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`.

#### [MODIFY] `.env.example`
Updates the environment template to include the new local database URL structure so other developers know how to configure their environments.

## Verification Plan

### Automated Tests
*N/A - This is an infrastructure and database coordination task.*

### Manual Verification
1. **Docker Container:** Verify the local Postgres container starts and accepts connections.
2. **Local Schema:** Verify `npx prisma studio` against the local database shows the exact schema defined in `schema.prisma`.
3. **Production Sync:** Verify running `npx prisma migrate status` while connected to the production Supabase database reports: `Database schema is up to date!`

---

## Handoff Note for Builder

**Feature:** Database Setup and Schema Sync
**Branch name suggestion:** `feature/database-environments-sync`
**Files most likely to be affected:**
- `docker-compose.yml`
- `.env`
- `.env.example`
- `prisma/migrations/`

**Watch out for:**
- You will need to instruct the user to configure their local `.env` file for the new Docker database.
- The `DATABASE_URL` for production points to Supabase and uses `pgbouncer=true` (port 6543). Direct connections for migrations usually require the Session mode (port 5432) via a `DIRECT_URL`. Ensure you understand how these URLs are mapped before running the `prisma migrate resolve` command.

**Verification focus:**
- **CRITICAL:** You MUST pause and ask the user to manually back up their Supabase database before you execute any migration commands against the production URL. Do not proceed until they confirm.
- Ensure the newly generated migration file accurately reflects the extra columns we detected earlier (e.g., `card_group` in `financial_accounts`, type changes to `date` fields).
