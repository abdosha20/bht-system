-- Ensure RLS is enabled on public tables exposed via PostgREST.
-- This is idempotent and safe to run on existing environments.

alter table if exists public.documents enable row level security;
alter table if exists public.audit_log enable row level security;
alter table if exists public.profiles enable row level security;

-- Force RLS so table owners do not bypass policies unintentionally.
alter table if exists public.documents force row level security;
alter table if exists public.audit_log force row level security;
alter table if exists public.profiles force row level security;
