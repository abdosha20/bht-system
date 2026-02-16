-- LOCAL TEST SEED ONLY - DO NOT USE IN PRODUCTION
-- Replace UUID literals with real auth.users IDs from your local Supabase instance.

-- Example users
-- director: 00000000-0000-0000-0000-000000000001
-- manager:  00000000-0000-0000-0000-000000000002
-- staff:    00000000-0000-0000-0000-000000000003

insert into public.profiles (id, role) values
  ('00000000-0000-0000-0000-000000000001', 'DIRECTOR'),
  ('00000000-0000-0000-0000-000000000002', 'MANAGER'),
  ('00000000-0000-0000-0000-000000000003', 'STAFF')
on conflict (id) do nothing;

insert into public.manager_staff_assignment (manager_id, staff_id) values
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003')
on conflict do nothing;

insert into public.client_manager_assignment (client_id, manager_id) values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000002')
on conflict do nothing;

insert into public.documents (
  doc_uid, doc_type, version, title, description, tags,
  classification_level, staff_id, client_id, supplier_id,
  retention_class, retention_trigger_date, disposal_due_date,
  legal_hold, legal_hold_reason, file_hash_sha256, file_size,
  mime_type, storage_path, created_by
)
values (
  'sample-doc-uid-001', 'STAFF', 1, 'Sample Staff Record', 'Local seed document', array['seed','local'],
  'INTERNAL', '00000000-0000-0000-0000-000000000003', null, null,
  'DEFAULT_7Y', current_date, current_date + interval '365 days',
  false, null, null, 1024,
  'application/pdf', '2026/sample-doc-uid-001/v1.pdf', '00000000-0000-0000-0000-000000000002'
)
on conflict (doc_uid) do nothing;