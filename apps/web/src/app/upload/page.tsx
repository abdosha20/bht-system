"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import { authorizedJsonFetch } from "@/lib/security/session";

const DOC_TYPE_OPTIONS = [
  "GENERAL",
  "STAFF",
  "CLIENT",
  "SUPPLIER",
  "COMPANY_POLICY",
  "COMPANY_LEGAL",
  "COMPANY_FINANCE",
  "COMPANY_HR",
  "COMPANY_COMPLIANCE",
  "CONTRACT",
  "VENDOR",
  "BOARD",
  "TAX",
  "CUSTOM"
] as const;
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

type UploadResult = {
  ok?: boolean;
  doc_uid?: string;
  storage_path?: string;
  error?: string;
};

type UploadInitResult = {
  ok?: boolean;
  doc_uid?: string;
  storage_path?: string;
  upload_token?: string;
  finalize_token?: string;
  expires_at?: number;
  error?: string;
};

async function parseJsonSafe<T>(res: Response): Promise<T | null> {
  const raw = await res.text();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function authorizedFetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs = 45000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await authorizedJsonFetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export default function UploadPage() {
  const [result, setResult] = useState<UploadResult | null>(null);
  const [barcode, setBarcode] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [docType, setDocType] = useState<string>("GENERAL");
  const [customDocType, setCustomDocType] = useState<string>("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    setBarcode("");
    try {
      const form = event.currentTarget;
      const data = new FormData(form);
      const normalizedCustom = customDocType.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
      const effectiveDocType = docType === "CUSTOM" ? normalizedCustom : docType;

      if (!effectiveDocType) {
        setResult({ error: "Please provide a custom document type." });
        return;
      }

      const selectedFile = data.get("file");
      if (!(selectedFile instanceof File)) {
        setResult({ error: "Please choose a PDF file." });
        return;
      }
      if (selectedFile.type !== "application/pdf") {
        setResult({ error: "Only PDF uploads are allowed." });
        return;
      }
      if (selectedFile.size > MAX_UPLOAD_BYTES) {
        setResult({
          error: "File too large. Current app limit is 25MB."
        });
        return;
      }

      const initRes = await authorizedFetchWithTimeout(
        "/api/documents/upload-init",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: String(data.get("title") ?? ""),
            doc_type: effectiveDocType,
            version: Number.parseInt(String(data.get("version") ?? "1"), 10),
            file_size: selectedFile.size,
            mime_type: selectedFile.type
          })
        },
        30000
      );

      const initBody = await parseJsonSafe<UploadInitResult>(initRes);
      if (!initRes.ok) {
        setResult({
          error:
            initBody?.error ??
            `Upload initialization failed (HTTP ${initRes.status}). Check Vercel logs for /api/documents/upload-init.`
        });
        return;
      }
      if (!initBody?.doc_uid || !initBody.storage_path || !initBody.upload_token || !initBody.finalize_token) {
        setResult({ error: "Upload initialization returned incomplete data." });
        return;
      }

      const direct = await getBrowserSupabaseClient()
        .storage.from("records-private")
        .uploadToSignedUrl(initBody.storage_path, initBody.upload_token, selectedFile, {
          contentType: selectedFile.type,
          upsert: false
        });
      if (direct.error) {
        setResult({ error: `Direct upload failed: ${direct.error.message}` });
        return;
      }

      const finalizeRes = await authorizedFetchWithTimeout(
        "/api/documents/upload-complete",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doc_uid: initBody.doc_uid,
            storage_path: initBody.storage_path,
            finalize_token: initBody.finalize_token
          })
        },
        30000
      );
      const finalizeBody = await parseJsonSafe<UploadResult>(finalizeRes);
      if (!finalizeRes.ok || !finalizeBody) {
        setResult({
          error:
            finalizeBody?.error ??
            `Upload finalize failed (HTTP ${finalizeRes.status}). Check Vercel logs for /api/documents/upload-complete.`
        });
        return;
      }

      setResult(finalizeBody);

      if (finalizeBody.doc_uid) {
        const gen = await authorizedFetchWithTimeout(
          "/api/barcode/generate",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ doc_uid: finalizeBody.doc_uid, version: 1 })
          },
          30000
        );

        if (gen.ok) {
          const payload = await parseJsonSafe<{ payload: string }>(gen);
          if (payload?.payload) {
            setBarcode(payload.payload);
            localStorage.setItem("bht_last_barcode", payload.payload);
          }
        }
      }
    } catch (error) {
      const message =
        error instanceof Error && error.name === "AbortError"
          ? "Upload timed out. Check Vercel function duration and logs."
          : error instanceof Error
            ? error.message
            : "Upload failed unexpectedly.";
      setResult({ error: message });
    } finally {
      setLoading(false);
    }
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
  }

  return (
    <section className="card">
      <h1>Upload PDF</h1>
      <p className="small">Uploads store PDFs at `{`{year}/{doc_uid}/v{version}.pdf`}` and write metadata to `documents`.</p>
      {result?.error && (
        <p className="error">
          {result.error} <Link href="/account?next=/upload">Sign in</Link>
        </p>
      )}
      <form onSubmit={onSubmit}>
        <div className="formGrid">
          <label>
            Title
            <input name="title" required />
          </label>
          <label>
            Document Type
            <select name="doc_type_select" value={docType} onChange={(e) => setDocType(e.target.value)}>
              {DOC_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            Custom Type (optional)
            <input
              placeholder="e.g. COMPANY_PROCUREMENT"
              value={customDocType}
              onChange={(e) => setCustomDocType(e.target.value)}
              disabled={docType !== "CUSTOM"}
            />
            <span className="small">Allowed chars: A-Z, 0-9, underscore.</span>
          </label>
          <label>
            Version
            <input type="number" name="version" min={1} defaultValue={1} required />
          </label>
          <label>
            PDF File
            <input type="file" name="file" accept="application/pdf" required />
          </label>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? "Uploading..." : "Upload"}
        </button>
      </form>

      {result?.ok && result.doc_uid && (
        <section className="card">
          <h2 className="ok">Upload Complete</h2>
          <p>
            <strong>Document UID:</strong> {result.doc_uid}
          </p>
          <p className="small">
            <strong>Path:</strong> {result.storage_path}
          </p>
          <div className="actions">
            <button type="button" className="secondary" onClick={() => copy(result.doc_uid!)}>
              Copy UID
            </button>
            <Link className="navLink" href={`/search?doc_uid=${encodeURIComponent(result.doc_uid)}`}>
              Open in Search
            </Link>
            <Link className="navLink" href="/resolve">
              Go to Resolve
            </Link>
          </div>
          {barcode && (
            <>
              <p className="small">Generated barcode payload:</p>
              <pre className="codeBlock">{barcode}</pre>
              <div className="actions">
                <button type="button" className="secondary" onClick={() => copy(barcode)}>
                  Copy Barcode Payload
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </section>
  );
}
