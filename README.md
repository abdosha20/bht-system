# BHT Secure Records Archive MVP

## Project structure
- `apps/web`: Next.js frontend + API routes (backend-for-frontend)
- `supabase/migrations`: SQL schema, RLS policies, and local seed SQL

## Environment variables
Create `apps/web/.env.local` from `apps/web/.env.local.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BHT_BARCODE_SECRET_SALT`
- `RETENTION_JOB_SECRET`

Fallback variable names are also supported for deployments:
- `SUPABASE_URL` (fallback for `NEXT_PUBLIC_SUPABASE_URL`)
- `SUPABASE_ANON_KEY` or `SUPABASE_PUBLISHABLE_KEY` (fallback for `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

Never commit real secrets. `apps/web/.env.local` is gitignored.

## Run migrations
Option A: Supabase CLI
1. `supabase db push` (from repository root with Supabase linked)
2. Optionally run `supabase/migrations/0002_local_seed.sql` for local-only test data.

Option B: Supabase Dashboard SQL editor
1. Run `supabase/migrations/0001_secure_records_archive.sql`
2. Optionally run `supabase/migrations/0002_local_seed.sql` in non-production environments only.

## Run dev server
1. Install dependencies:
   - from repo root: `npm install`
   - or from app only: `cd apps/web && npm install`
2. Start web app:
   - from app directory: `cd apps/web && npm run dev`
3. If you changed `.env.local` while dev server was already running, restart `next dev` to reload public env values.

## Security notes
- UK GDPR by design: data minimisation is enforced by schema and code paths.
- PDF417 barcode payload contains only a pointer and checksum; no personal data in barcode.
- Checksum format: first 10 chars of `SHA-256(doc_uid + doc_type + version + BHT_BARCODE_SECRET_SALT)`.
- RLS is required and enabled on all core tables; access is deny-by-default until policies allow.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and never exposed in browser bundles.
- Storage access uses server routes and short-lived signed URLs (90 seconds by default).
