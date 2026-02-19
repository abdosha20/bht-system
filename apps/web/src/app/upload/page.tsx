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

type UploadResult = {
  ok?: boolean;
  doc_uid?: string;
  storage_path?: string;
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

      data.set("doc_type", effectiveDocType);

      const res = await authorizedFetchWithTimeout(
        "/api/documents/upload",
        {
          method: "POST",
          body: data
        },
        60000
      );

      const body = await parseJsonSafe<UploadResult>(res);
      if (!res.ok) {
        setResult({
          error:
            body?.error ??
            `Upload failed (HTTP ${res.status}). Check Vercel Function logs for /api/documents/upload.`
        });
        return;
      }

      if (!body) {
        setResult({ error: "Upload API returned an empty response." });
        return;
      }

      setResult(body);

      if (body.doc_uid) {
        const gen = await authorizedFetchWithTimeout(
          "/api/barcode/generate",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ doc_uid: body.doc_uid, version: 1 })
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
