export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import { requireBearerAuth } from "@/lib/security/auth";
import { createServiceClient } from "@/lib/supabase/server";

const BUCKET = "records-private";
const INIT_TOKEN_TTL_MS = 10 * 60 * 1000;
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

type InitPayload = {
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

function randomUid() {
  return crypto.randomUUID().replace(/-/g, "");
}

function normalizeDocType(input: string) {
  return input.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 48);
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function signPayload(payloadEncoded: string, secret: string) {
  return createHmac("sha256", secret).update(payloadEncoded).digest("base64url");
}

function getUploadSecret() {
  const secret = process.env.RETENTION_JOB_SECRET;
  if (!secret) {
    throw new Error("Missing RETENTION_JOB_SECRET");
  }
  return secret;
}

export async function POST(req: Request) {
  try {
    const auth = await requireBearerAuth(req.headers.get("authorization"));
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      title?: string;
      doc_type?: string;
      version?: number;
      file_size?: number;
      mime_type?: string;
    };

    const title = String(body.title ?? "").trim();
    const docType = normalizeDocType(String(body.doc_type ?? "GENERAL"));
    const version = Number.parseInt(String(body.version ?? "1"), 10);
    const fileSize = Number.parseInt(String(body.file_size ?? "0"), 10);
    const mimeType = String(body.mime_type ?? "");

    if (!title) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }
    if (!docType) {
      return NextResponse.json({ error: "Invalid document type." }, { status: 400 });
    }
    if (!Number.isFinite(version) || version < 1) {
      return NextResponse.json({ error: "Invalid version." }, { status: 400 });
    }
    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      return NextResponse.json({ error: "Invalid file size." }, { status: 400 });
    }
    if (fileSize > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        {
          error: `File too large. Max supported size is ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))}MB.`,
          max_bytes: MAX_UPLOAD_BYTES
        },
        { status: 413 }
      );
    }
    if (mimeType !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF uploads are allowed." }, { status: 400 });
    }

    const uid = randomUid();
    const year = new Date().getUTCFullYear();
    const path = `${year}/${uid}/v${version}.pdf`;

    const service = createServiceClient();
    const { data: signedData, error: signedError } = await service.storage.from(BUCKET).createSignedUploadUrl(path);
    if (signedError || !signedData?.token) {
      return NextResponse.json(
        { error: signedError?.message ?? "Failed to create signed upload URL.", stage: "signed_upload_url" },
        { status: 500 }
      );
    }

    const iat = Date.now();
    const payload: InitPayload = {
      uid,
      path,
      userId: auth.userId,
      title,
      docType,
      version,
      fileSize,
      mimeType,
      iat,
      exp: iat + INIT_TOKEN_TTL_MS
    };

    const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
    const signature = signPayload(payloadEncoded, getUploadSecret());
    const finalizeToken = `${payloadEncoded}.${signature}`;

    return NextResponse.json({
      ok: true,
      doc_uid: uid,
      storage_path: path,
      upload_token: signedData.token,
      finalize_token: finalizeToken,
      expires_at: payload.exp
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Upload initialization failed unexpectedly.",
        stage: "upload_init_unhandled"
      },
      { status: 500 }
    );
  }
}

