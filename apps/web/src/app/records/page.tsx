"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { authorizedJsonFetch } from "@/lib/security/session";

type StoredDoc = {
  doc_uid: string;
  doc_type: string;
  version: number;
  title: string;
  classification_level: string;
  retention_class: string;
  disposal_due_date: string;
  legal_hold: boolean;
  created_at: string;
  created_by: string;
};

type AuditItem = {
  id: number;
  action: string;
  doc_uid: string | null;
  outcome: string;
  reason: string | null;
  created_at: string;
  user_id: string;
};

type RecordsResponse = {
  documents?: StoredDoc[];
  audits?: AuditItem[];
  error?: string;
};

export default function RecordsPage() {
  const [documents, setDocuments] = useState<StoredDoc[]>([]);
  const [audits, setAudits] = useState<AuditItem[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyDoc, setBusyDoc] = useState<string>("");

  const auditByDoc = useMemo(() => {
    const map = new Map<string, AuditItem[]>();
    for (const audit of audits) {
      const key = audit.doc_uid ?? "";
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push(audit);
      map.set(key, list);
    }
    return map;
  }, [audits]);

  async function loadRecords() {
    setLoading(true);
    setError("");
    setNotice("");

    const res = await authorizedJsonFetch(`/api/documents/mine?t=${Date.now()}`, { cache: "no-store" });

    const body = (await res.json()) as RecordsResponse;
    if (!res.ok) {
      setLoading(false);
      setError(body.error ?? "Unable to load records");
      return;
    }

    setDocuments(body.documents ?? []);
    setAudits(body.audits ?? []);
    setLoading(false);
  }

  async function deleteDocument(doc: StoredDoc) {
    const confirmed = window.confirm(`Delete document "${doc.title}" (${doc.doc_uid})? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setBusyDoc(doc.doc_uid);
    setError("");

    const res = await authorizedJsonFetch(`/api/documents/${encodeURIComponent(doc.doc_uid)}`, {
      method: "DELETE",
      cache: "no-store"
    });

    const body = (await res.json()) as { error?: string; warning?: string };
    if (!res.ok) {
      setBusyDoc("");
      setError(body.error ?? "Unable to delete document");
      return;
    }

    setDocuments((prev) => prev.filter((d) => d.doc_uid !== doc.doc_uid));
    setAudits((prev) => prev.filter((a) => a.doc_uid !== doc.doc_uid));
    setNotice(body.warning ?? `Deleted document ${doc.doc_uid}`);
    await loadRecords();
    setBusyDoc("");
  }

  useEffect(() => {
    loadRecords();
  }, []);

  return (
    <section className="card">
      <h1>Stored Records</h1>
      <p className="small">
        Inventory of documents you are authorized to view, with related audit events. Opening files is intentionally
        excluded on this page.
      </p>
      <div className="actions">
        <button onClick={loadRecords} disabled={loading}>
          {loading ? "Loading..." : "Refresh List"}
        </button>
        <Link href="/upload" className="navLink">
          Upload New
        </Link>
      </div>
      {error && <p className="error">{error}</p>}
      {notice && <p className="ok">{notice}</p>}

      <div className="tableWrap">
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Doc UID</th>
              <th>Type</th>
              <th>Version</th>
              <th>Class</th>
              <th>Retention</th>
              <th>Due Date</th>
              <th>Legal Hold</th>
              <th>Created By</th>
              <th>Audit Events</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.doc_uid}>
                <td>{doc.title}</td>
                <td>{doc.doc_uid}</td>
                <td>{doc.doc_type}</td>
                <td>{doc.version}</td>
                <td>{doc.classification_level}</td>
                <td>{doc.retention_class}</td>
                <td>{doc.disposal_due_date}</td>
                <td>{doc.legal_hold ? "Yes" : "No"}</td>
                <td>{doc.created_by}</td>
                <td>{auditByDoc.get(doc.doc_uid)?.length ?? 0}</td>
                <td>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => deleteDocument(doc)}
                    disabled={doc.legal_hold || busyDoc === doc.doc_uid}
                  >
                    {busyDoc === doc.doc_uid ? "Deleting..." : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
            {documents.length === 0 && (
              <tr>
                <td colSpan={11} className="small">
                  No stored records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {documents.map((doc) => {
        const events = auditByDoc.get(doc.doc_uid) ?? [];
        return (
          <section key={`${doc.doc_uid}-audit`} className="card">
            <h2>{doc.title}</h2>
            <p className="small">{doc.doc_uid}</p>
            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Action</th>
                    <th>Outcome</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((a) => (
                    <tr key={a.id}>
                      <td>{a.created_at}</td>
                      <td>{a.action}</td>
                      <td>{a.outcome}</td>
                      <td>{a.reason ?? "-"}</td>
                    </tr>
                  ))}
                  {events.length === 0 && (
                    <tr>
                      <td colSpan={4} className="small">
                        No audit entries for this document yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </section>
  );
}
