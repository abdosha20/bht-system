"use client";

import { FormEvent, useState } from "react";
import { authorizedJsonFetch } from "@/lib/security/session";

type ResolveResult = {
  document?: {
    doc_uid: string;
    doc_type: string;
    version: number;
    title: string;
    description: string | null;
    retention_class: string;
    disposal_due_date: string;
    legal_hold: boolean;
  };
  error?: string;
};

export default function ResolvePage() {
  const [payload, setPayload] = useState("");
  const [result, setResult] = useState<ResolveResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult(null);

    const res = await authorizedJsonFetch("/api/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload })
    });

    setResult((await res.json()) as ResolveResult);
    setLoading(false);
  }

  function loadLastPayload() {
    const last = localStorage.getItem("bht_last_barcode") || "";
    if (last) {
      setPayload(last);
    }
  }

  return (
    <section className="card">
      <h1>Resolve Barcode</h1>
      <p className="small">Format: BHTCL|doc_uid|doc_type|vversion|checksum</p>
      <form onSubmit={onSubmit}>
        <label>
          Barcode Payload
          <textarea name="payload" rows={4} value={payload} onChange={(e) => setPayload(e.target.value)} required />
        </label>
        <div className="actions">
          <button type="submit" disabled={loading}>
            {loading ? "Resolving..." : "Resolve"}
          </button>
          <button type="button" className="secondary" onClick={loadLastPayload}>
            Load Last Upload Payload
          </button>
        </div>
      </form>

      {result?.error && <p className="error">{result.error}</p>}
      {result?.document && (
        <section className="card">
          <h2 className="ok">Document Found</h2>
          <p>
            <strong>{result.document.title}</strong>
          </p>
          <div className="grid">
            <p>
              <strong>UID:</strong> {result.document.doc_uid}
            </p>
            <p>
              <strong>Type:</strong> {result.document.doc_type}
            </p>
            <p>
              <strong>Version:</strong> {result.document.version}
            </p>
            <p>
              <strong>Retention:</strong> {result.document.retention_class}
            </p>
            <p>
              <strong>Disposal Due:</strong> {result.document.disposal_due_date}
            </p>
            <p>
              <strong>Legal Hold:</strong> {result.document.legal_hold ? "Yes" : "No"}
            </p>
          </div>
        </section>
      )}
    </section>
  );
}
