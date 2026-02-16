-- Patch migration for projects where full 0001 migration was not applied.
-- Creates missing assignment/disposal tables and baseline RLS policies.

create table if not exists public.manager_staff_assignment (
  manager_id uuid not null references auth.users(id) on delete cascade,
  staff_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (manager_id, staff_id)
);

create table if not exists public.client_manager_assignment (
  client_id uuid not null,
  manager_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (client_id, manager_id)
);

create table if not exists public.disposal_certificate (
  id bigint generated always as identity primary key,
  doc_uid text not null,
  version integer not null,
  disposed_by uuid not null references auth.users(id),
  disposed_at timestamptz not null default now(),
  method text not null,
  notes text,
  cert_hash text
);

alter table public.manager_staff_assignment enable row level security;
alter table public.client_manager_assignment enable row level security;
alter table public.disposal_certificate enable row level security;

-- Policies are aligned with the RBAC helper function from 0001 migration.
-- If public.current_role() is missing, run 0001 migration first.
create policy if not exists "msa_select_director_or_manager"
on public.manager_staff_assignment
for select
to authenticated
using (public.current_role() = 'DIRECTOR' or manager_id = auth.uid());

create policy if not exists "msa_mutate_director"
on public.manager_staff_assignment
for all
to authenticated
using (public.current_role() = 'DIRECTOR')
with check (public.current_role() = 'DIRECTOR');

create policy if not exists "cma_select_director_or_manager"
on public.client_manager_assignment
for select
to authenticated
using (public.current_role() = 'DIRECTOR' or manager_id = auth.uid());

create policy if not exists "cma_mutate_director"
on public.client_manager_assignment
for all
to authenticated
using (public.current_role() = 'DIRECTOR')
with check (public.current_role() = 'DIRECTOR');

create policy if not exists "disposal_select_director"
on public.disposal_certificate
for select
to authenticated
using (public.current_role() = 'DIRECTOR');

create policy if not exists "disposal_insert_director"
on public.disposal_certificate
for insert
to authenticated
with check (public.current_role() = 'DIRECTOR');
