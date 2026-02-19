export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { requireBearerAuth } from "@/lib/security/auth";
import { createServiceClient } from "@/lib/supabase/server";

const BUCKET = "records-private";

type CompletePayload = {
  uid: string;
  path: string;
  userId: string;
  title: string;
  docType: string;
  version: number;
  fileSize: number;
  mimeType: string;
  iat: number;
  exp: number;
};

function getUploadSecret() {
  const secret = process.env.RETENTION_JOB_SECRET;
  if (!secret) {
    throw new Error("Missing RETENTION_JOB_SECRET");
  }
  return secret;
}

function parseFinalizeToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }
  return { payloadEncoded: parts[0], signature: parts[1] };
}

function verifySignature(payloadEncoded: string, signature: string, secret: string) {
  const expected = createHmac("sha256", secret).update(payloadEncoded).digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

function parsePayload(payloadEncoded: string) {
  try {
    const raw = Buffer.from(payloadEncoded, "base64url").toString("utf8");
    return JSON.parse(raw) as CompletePayload;
  } catch {
    return null;
  }
}

function splitStoragePath(path: string) {
  const parts = path.split("/");
  if (parts.length !== 3) {
    return null;
  }
  return {
    folder: `${parts[0]}/${parts[1]}`,
    fileName: parts[2]
  };
}

export async function POST(req: Request) {
  try {
    const auth = await requireBearerAuth(req.headers.get("authorization"));
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      finalize_token?: string;
      doc_uid?: string;
      storage_path?: string;
    };

    const finalizeToken = String(body.finalize_token ?? "");
    const docUid = String(body.doc_uid ?? "");
    const storagePath = String(body.storage_path ?? "");

    if (!finalizeToken || !docUid || !storagePath) {
      return NextResponse.json({ error: "Missing finalize token or document identifiers." }, { status: 400 });
    }

    const tokenParts = parseFinalizeToken(finalizeToken);
    if (!tokenParts) {
      return NextResponse.json({ error: "Invalid finalize token." }, { status: 400 });
    }

    const secret = getUploadSecret();
    if (!verifySignature(tokenParts.payloadEncoded, tokenParts.signature, secret)) {
      return NextResponse.json({ error: "Finalize token signature mismatch." }, { status: 401 });
    }

    const payload = parsePayload(tokenParts.payloadEncoded);
    if (!payload) {
      return NextResponse.json({ error: "Invalid finalize token payload." }, { status: 400 });
    }

    if (payload.exp < Date.now()) {
      return NextResponse.json({ error: "Finalize token expired. Please re-upload." }, { status: 401 });
    }
    if (payload.userId !== auth.userId) {
      return NextResponse.json({ error: "Finalize token user mismatch." }, { status: 403 });
    }
    if (payload.uid !== docUid || payload.path !== storagePath) {
      return NextResponse.json({ error: "Finalize token does not match upload payload." }, { status: 400 });
    }

    const split = splitStoragePath(storagePath);
    if (!split) {
      return NextResponse.json({ error: "Invalid storage path format." }, { status: 400 });
    }

    const service = createServiceClient();
    const { data: objects, error: listError } = await service.storage.from(BUCKET).list(split.folder, {
      search: split.fileName,
      limit: 1
    });
    if (listError) {
      return NextResponse.json({ error: listError.message, stage: "storage_list" }, { status: 500 });
    }

    const object = (objects ?? []).find((entry) => entry.name === split.fileName);
    if (!object) {
      return NextResponse.json({ error: "Uploaded file not found in storage.", stage: "storage_missing" }, { status: 400 });
    }

    const { error: dbError } = await service.from("documents").insert({
      doc_uid: payload.uid,
      doc_type: payload.docType,
      version: payload.version,
      title: payload.title,
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
      file_size: payload.fileSize,
      mime_type: payload.mimeType,
      storage_path: payload.path,
      created_by: auth.userId
    });

    if (dbError) {
      const status = dbError.code === "23505" ? 409 : 500;
      return NextResponse.json({ error: dbError.message, stage: "documents_insert" }, { status });
    }

    await service.from("audit_log").insert({
      user_id: auth.userId,
      action: "UPLOAD_DOCUMENT",
      doc_uid: payload.uid,
      outcome: "ALLOW",
      reason: null,
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown",
      user_agent: req.headers.get("user-agent") ?? "unknown"
    });

    return NextResponse.json({ ok: true, doc_uid: payload.uid, storage_path: payload.path });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Upload finalize failed unexpectedly.",
        stage: "upload_complete_unhandled"
      },
      { status: 500 }
    );
  }
}

