export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { parseAndValidateBarcode } from "@/lib/security/barcode";
import { requireBearerAuth } from "@/lib/security/auth";
import { canReadDocument } from "@/lib/security/rbac";

function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function POST(req: Request) {
  const service = createServiceClient();
  const auth = await requireBearerAuth(req.headers.get("authorization"));

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { payload } = (await req.json()) as { payload?: string };
  const salt = process.env.BHT_BARCODE_SECRET_SALT;
  if (!payload || !salt) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = parseAndValidateBarcode(payload, salt);
  if (!parsed) {
    await service.from("audit_log").insert({
      user_id: auth.userId,
      action: "RESOLVE_BARCODE",
      doc_uid: null,
      outcome: "DENY",
      reason: "INVALID_CHECKSUM_OR_FORMAT",
      ip: clientIp(req),
      user_agent: req.headers.get("user-agent") ?? "unknown"
    });

    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allowed = await canReadDocument(auth.userId, auth.role, parsed.docUid, parsed.docType);
  if (!allowed) {
    await service.from("audit_log").insert({
      user_id: auth.userId,
      action: "RESOLVE_BARCODE",
      doc_uid: parsed.docUid,
      outcome: "DENY",
      reason: "RBAC_SCOPE_MISMATCH",
      ip: clientIp(req),
      user_agent: req.headers.get("user-agent") ?? "unknown"
    });

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: document, error } = await service
    .from("documents")
    .select("doc_uid,doc_type,version,title,description,tags,classification_level,retention_class,retention_trigger_date,disposal_due_date,legal_hold")
    .eq("doc_uid", parsed.docUid)
    .eq("version", parsed.version)
    .single();

  if (error || !document) {
    await service.from("audit_log").insert({
      user_id: auth.userId,
      action: "RESOLVE_BARCODE",
      doc_uid: parsed.docUid,
      outcome: "DENY",
      reason: "DOCUMENT_NOT_FOUND",
      ip: clientIp(req),
      user_agent: req.headers.get("user-agent") ?? "unknown"
    });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await service.from("audit_log").insert({
    user_id: auth.userId,
    action: "RESOLVE_BARCODE",
    doc_uid: parsed.docUid,
    outcome: "ALLOW",
    reason: null,
    ip: clientIp(req),
    user_agent: req.headers.get("user-agent") ?? "unknown"
  });

  return NextResponse.json({ document });
}