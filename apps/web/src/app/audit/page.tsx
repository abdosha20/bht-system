"use client";

import { useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

type AuditRow = {
  id: number;
  user_id: string;
  action: string;
  doc_uid: string | null;
  outcome: string;
  reason: string | null;
  created_at: string;
};

export default function AuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    const { data, error: qErr } = await getBrowserSupabaseClient()
      .from("audit_log")
      .select("id,user_id,action,doc_uid,outcome,reason,created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (qErr) {
      setError(qErr.message);
      return;
    }

    setRows((data as AuditRow[]) ?? []);
  }

  return (
    <section className="card">
      <h1>Audit Viewer</h1>
      <p className="small">DIRECTOR-only access is enforced by database RLS policies.</p>
      <button onClick={load}>Load Recent Events</button>
      {error && <p>{error}</p>}
      <div className="tableWrap">
        <table className="table">
          <thead>
            <tr>
              <th>Time</th>
              <th>User</th>
              <th>Action</th>
              <th>Outcome</th>
              <th>Doc UID</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.created_at}</td>
                <td>{row.user_id}</td>
                <td>{row.action}</td>
                <td>{row.outcome}</td>
                <td>{row.doc_uid ?? "-"}</td>
                <td>{row.reason ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
