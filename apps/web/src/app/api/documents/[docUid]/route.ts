export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireBearerAuth } from "@/lib/security/auth";

export async function DELETE(req: NextRequest, context: { params: Promise<{ docUid: string }> }) {
  const auth = await requireBearerAuth(req.headers.get("authorization"));
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { docUid } = await context.params;

  const service = createServiceClient();
  const { data: doc, error: fetchError } = await service
    .from("documents")
    .select("doc_uid,version,storage_path,legal_hold,created_by")
    .eq("doc_uid", docUid)
    .single();

  if (fetchError || !doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const canDelete = auth.role === "DIRECTOR" || doc.created_by === auth.userId;
  if (!canDelete) {
    await service.from("audit_log").insert({
      user_id: auth.userId,
      action: "DELETE_DOCUMENT",
      doc_uid: doc.doc_uid,
      outcome: "DENY",
      reason: "INSUFFICIENT_PRIVILEGE",
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown",
      user_agent: req.headers.get("user-agent") ?? "unknown"
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (doc.legal_hold) {
    await service.from("audit_log").insert({
      user_id: auth.userId,
      action: "DELETE_DOCUMENT",
      doc_uid: doc.doc_uid,
      outcome: "DENY",
      reason: "LEGAL_HOLD",
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown",
      user_agent: req.headers.get("user-agent") ?? "unknown"
    });
    return NextResponse.json({ error: "Document is under legal hold" }, { status: 409 });
  }

  const { error: storageError } = await service.storage.from("records-private").remove([doc.storage_path]);
  const storageMessage = storageError?.message?.toLowerCase() ?? "";
  const ignorableStorageError =
    storageMessage.includes("not found") ||
    storageMessage.includes("no such") ||
    storageMessage.includes("already");

  const { error: deleteError } = await service.from("documents").delete().eq("doc_uid", doc.doc_uid);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message, stage: "documents_delete" }, { status: 500 });
  }

  await service.from("audit_log").insert({
    user_id: auth.userId,
    action: "DELETE_DOCUMENT",
    doc_uid: doc.doc_uid,
    outcome: "ALLOW",
    reason: "MANUAL_UI_DELETE",
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown",
    user_agent: req.headers.get("user-agent") ?? "unknown"
  });

  // Best-effort disposal certificate entry.
  await service.from("disposal_certificate").insert({
    doc_uid: doc.doc_uid,
    version: doc.version,
    disposed_by: auth.userId,
    method: "MANUAL_UI_DELETE",
    notes: "Deleted from Records page",
    cert_hash: null
  });

  if (storageError && !ignorableStorageError) {
    return NextResponse.json({
      ok: true,
      doc_uid: doc.doc_uid,
      warning: `Metadata deleted, but storage cleanup reported: ${storageError.message}`
    });
  }

  return NextResponse.json({ ok: true, doc_uid: doc.doc_uid });
}
