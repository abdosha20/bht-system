export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireBearerAuth } from "@/lib/security/auth";

function randomUid() {
  return crypto.randomUUID().replace(/-/g, "");
}

function normalizeDocType(input: string) {
  return input.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 48);
}

export async function POST(req: Request) {
  try {
    const auth = await requireBearerAuth(req.headers.get("authorization"));
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = createServiceClient();
    const form = await req.formData();
    const file = form.get("file");
    const docType = normalizeDocType(String(form.get("doc_type") || "GENERAL"));
    const title = String(form.get("title") || "");
    const version = Number.parseInt(String(form.get("version") || "1"), 10);

    if (!(file instanceof File) || file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF uploads are allowed" }, { status: 400 });
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max upload size is 20MB." }, { status: 413 });
    }
    if (!docType) {
      return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
    }

    const docUid = randomUid();
    const year = new Date().getUTCFullYear();
    const path = `${year}/${docUid}/v${version}.pdf`;

    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await service.storage.from("records-private").upload(path, bytes, {
      contentType: "application/pdf",
      upsert: false
    });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message, stage: "storage_upload" }, { status: 500 });
    }

    const { error: dbError } = await service.from("documents").insert({
      doc_uid: docUid,
      doc_type: docType,
      version,
      title,
      description: null,
      tags: [],
      classification_level: "INTERNAL",
      staff_id: null,
      client_id: null,
      supplier_id: null,
      retention_class: "DEFAULT_7Y",
      retention_trigger_date: new Date().toISOString().slice(0, 10),
      disposal_due_date: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      legal_hold: false,
      legal_hold_reason: null,
      file_hash_sha256: null,
      file_size: file.size,
      mime_type: file.type,
      storage_path: path,
      created_by: auth.userId
    });

    if (dbError) {
      return NextResponse.json({ error: dbError.message, stage: "documents_insert" }, { status: 500 });
    }

    await service.from("audit_log").insert({
      user_id: auth.userId,
      action: "UPLOAD_DOCUMENT",
      doc_uid: docUid,
      outcome: "ALLOW",
      reason: null,
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown",
      user_agent: req.headers.get("user-agent") ?? "unknown"
    });

    return NextResponse.json({ ok: true, doc_uid: docUid, storage_path: path });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Upload route failed unexpectedly.",
        stage: "unhandled_upload_route_error"
      },
      { status: 500 }
    );
  }
}
