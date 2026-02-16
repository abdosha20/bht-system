-- Secure Records Archive schema and access controls
-- Strategy: profiles table-based RBAC (auth.users.id -> public.profiles.id)

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('DIRECTOR', 'MANAGER', 'STAFF')),
  created_at timestamptz not null default now()
);

create table if not exists public.healthcheck_public (
  id integer primary key default 1,
  ok boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.healthcheck_public (id, ok)
values (1, true)
on conflict (id) do update set ok = excluded.ok, updated_at = now();

create table if not exists public.documents (
  doc_uid text primary key,
  doc_type text not null,
  version integer not null check (version >= 1),
  title text not null,
  description text,
  tags text[] not null default '{}',
  classification_level text not null,
  staff_id uuid,
  client_id uuid,
  supplier_id uuid,
  retention_class text not null,
  retention_trigger_date date not null,
  disposal_due_date date not null,
  legal_hold boolean not null default false,
  legal_hold_reason text,
  file_hash_sha256 text,
  file_size bigint,
  mime_type text,
  storage_path text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  user_id uuid,
  action text not null,
  doc_uid text,
  outcome text not null check (outcome in ('ALLOW', 'DENY', 'ERROR')),
  reason text,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

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

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_documents_updated_at on public.documents;
create trigger trg_documents_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

create or replace function public.current_role()
returns text
language sql
stable
as $$
  select p.role from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.can_read_document(d public.documents)
returns boolean
language plpgsql
stable
as $$
declare
  role_name text;
begin
  role_name := public.current_role();

  if role_name = 'DIRECTOR' then
    return true;
  end if;

  if role_name = 'MANAGER' then
    if d.doc_type = 'GENERAL' and d.created_by = auth.uid() then
      return true;
    end if;

    if d.doc_type = 'STAFF' and exists (
      select 1
      from public.manager_staff_assignment msa
      where msa.manager_id = auth.uid()
        and msa.staff_id = d.staff_id
    ) then
      return true;
    end if;

    if d.doc_type = 'CLIENT' and exists (
      select 1
      from public.client_manager_assignment cma
      where cma.manager_id = auth.uid()
        and cma.client_id = d.client_id
    ) then
      return true;
    end if;

    return false;
  end if;

  if role_name = 'STAFF' then
    return d.doc_type = 'GENERAL' and d.created_by = auth.uid();
  end if;

  return false;
end;
$$;

alter table public.profiles enable row level security;
alter table public.healthcheck_public enable row level security;
alter table public.documents enable row level security;
alter table public.audit_log enable row level security;
alter table public.manager_staff_assignment enable row level security;
alter table public.client_manager_assignment enable row level security;
alter table public.disposal_certificate enable row level security;

-- Profiles: each user can read their own profile; only directors can update roles.
create policy if not exists "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy if not exists "profiles_update_director"
on public.profiles
for update
to authenticated
using (public.current_role() = 'DIRECTOR')
with check (public.current_role() = 'DIRECTOR');

-- Public setup check table
create policy if not exists "healthcheck_public_read"
on public.healthcheck_public
for select
to anon, authenticated
using (true);

-- Documents: read strictly by role + scope function
create policy if not exists "documents_select_scoped"
on public.documents
for select
to authenticated
using (public.can_read_document(documents));

create policy if not exists "documents_insert_self"
on public.documents
for insert
to authenticated
with check (created_by = auth.uid());

create policy if not exists "documents_update_owner_or_director"
on public.documents
for update
to authenticated
using (created_by = auth.uid() or public.current_role() = 'DIRECTOR')
with check (created_by = auth.uid() or public.current_role() = 'DIRECTOR');

-- Audit log: append-only insert for authenticated; read restricted to DIRECTOR
create policy if not exists "audit_insert_authenticated"
on public.audit_log
for insert
to authenticated
with check (true);

create policy if not exists "audit_select_director_only"
on public.audit_log
for select
to authenticated
using (public.current_role() = 'DIRECTOR');

-- Assignment tables and disposal certificate are director-managed
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

-- Storage bucket must be private and not publicly listable.
insert into storage.buckets (id, name, public)
values ('records-private', 'records-private', false)
on conflict (id) do update set public = false;

-- Storage policies: no direct anon access.
create policy if not exists "objects_no_anon_select"
on storage.objects
for select
to anon
using (false);

-- Authenticated reads/writes only in controlled bucket; app server should still gate with RBAC.
create policy if not exists "objects_auth_rw_records_private"
on storage.objects
for all
to authenticated
using (bucket_id = 'records-private')
with check (bucket_id = 'records-private');