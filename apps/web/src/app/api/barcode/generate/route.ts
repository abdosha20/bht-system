export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireBearerAuth } from "@/lib/security/auth";
import { buildBarcodePayload } from "@/lib/security/barcode";
import { canReadDocument } from "@/lib/security/rbac";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const auth = await requireBearerAuth(req.headers.get("authorization"));
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { doc_uid, version } = (await req.json()) as { doc_uid?: string; version?: number };
  if (!doc_uid) {
    return NextResponse.json({ error: "doc_uid is required" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: doc, error } = await service
    .from("documents")
    .select("doc_uid,doc_type,version")
    .eq("doc_uid", doc_uid)
    .single();

  if (error || !doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allowed = await canReadDocument(auth.userId, auth.role, doc.doc_uid, doc.doc_type);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const salt = process.env.BHT_BARCODE_SECRET_SALT;
  if (!salt) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const payload = buildBarcodePayload(doc.doc_uid, doc.doc_type, version ?? doc.version, salt);
  return NextResponse.json({ payload, doc_uid: doc.doc_uid, doc_type: doc.doc_type, version: version ?? doc.version });
}