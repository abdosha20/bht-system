export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireBearerAuth } from "@/lib/security/auth";
import { canReadDocument } from "@/lib/security/rbac";

export async function GET(req: Request) {
  const auth = await requireBearerAuth(req.headers.get("authorization"));
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();

  const { data: docs, error: docsError } = await service
    .from("documents")
    .select(
      "doc_uid,doc_type,version,title,classification_level,retention_class,disposal_due_date,legal_hold,created_at,created_by"
    )
    .order("created_at", { ascending: false })
    .limit(400);

  if (docsError) {
    return NextResponse.json({ error: docsError.message }, { status: 500 });
  }

  const visibleDocs = [];
  for (const doc of docs ?? []) {
    const allowed = await canReadDocument(auth.userId, auth.role, doc.doc_uid, doc.doc_type);
    if (allowed) {
      visibleDocs.push(doc);
    }
  }

  const docUids = visibleDocs.map((d) => d.doc_uid);
  if (docUids.length === 0) {
    return NextResponse.json({ documents: [], audits: [] });
  }

  const { data: audits, error: auditsError } = await service
    .from("audit_log")
    .select("id,action,doc_uid,outcome,reason,created_at,user_id")
    .in("doc_uid", docUids)
    .order("created_at", { ascending: false })
    .limit(500);

  if (auditsError) {
    return NextResponse.json({ error: auditsError.message }, { status: 500 });
  }

  return NextResponse.json({ documents: visibleDocs, audits: audits ?? [] });
}
