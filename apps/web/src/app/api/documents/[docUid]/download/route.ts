export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireBearerAuth } from "@/lib/security/auth";
import { canReadDocument } from "@/lib/security/rbac";

export async function GET(req: NextRequest, { params }: { params: { docUid: string } }) {
  const service = createServiceClient();
  const auth = await requireBearerAuth(req.headers.get("authorization"));
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const version = Number.parseInt(req.nextUrl.searchParams.get("version") ?? "1", 10);

  const { data: doc, error } = await service
    .from("documents")
    .select("doc_uid,doc_type,version,storage_path")
    .eq("doc_uid", params.docUid)
    .eq("version", version)
    .single();

  if (error || !doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allowed = await canReadDocument(auth.userId, auth.role, doc.doc_uid, doc.doc_type);
  if (!allowed) {
    await service.from("audit_log").insert({
      user_id: auth.userId,
      action: "DOWNLOAD_DOCUMENT",
      doc_uid: doc.doc_uid,
      outcome: "DENY",
      reason: "RBAC_SCOPE_MISMATCH",
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown",
      user_agent: req.headers.get("user-agent") ?? "unknown"
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const expirySeconds = 120;
  const { data: signed, error: signError } = await service.storage
    .from("records-private")
    .createSignedUrl(doc.storage_path, expirySeconds);

  await service.from("audit_log").insert({
    user_id: auth.userId,
    action: "DOWNLOAD_DOCUMENT",
    doc_uid: doc.doc_uid,
    outcome: signError ? "DENY" : "ALLOW",
    reason: signError ? signError.message : null,
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown",
    user_agent: req.headers.get("user-agent") ?? "unknown"
  });

  if (signError || !signed?.signedUrl) {
    return NextResponse.json({ error: "Unable to generate URL" }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl, expires_in: expirySeconds });
}
