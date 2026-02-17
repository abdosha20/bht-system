"use client";

import { useEffect, useMemo, useState } from "react";

type CheckLevel = "ok" | "warn" | "error";

type OpCheck = {
  id: string;
  label: string;
  level: CheckLevel;
  detail: string;
};

type OpResponse = {
  generated_at: string;
  summary: {
    status: CheckLevel;
    total_checks: number;
    failures: number;
    warns: number;
  };
  checks: OpCheck[];
};

export default function OperationsPage() {
  const [data, setData] = useState<OpResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/system/operations", { cache: "no-store" });
      const raw = await res.text();
      let body: (OpResponse & { error?: string }) | null = null;
      try {
        body = raw ? (JSON.parse(raw) as OpResponse & { error?: string }) : null;
      } catch {
        body = null;
      }
      if (!res.ok) {
        const detail = body?.error ?? raw?.trim() ?? "Unable to load system operations";
        throw new Error(detail);
      }
      if (!body) {
        throw new Error("Operations API returned an empty response.");
      }
      setData(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load system operations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  const grouped = useMemo(() => {
    const errors = (data?.checks ?? []).filter((c) => c.level === "error");
    const warns = (data?.checks ?? []).filter((c) => c.level === "warn");
    const ok = (data?.checks ?? []).filter((c) => c.level === "ok");
    return { errors, warns, ok };
  }, [data]);

  return (
    <section className="card">
      <h1>System Operations</h1>
      <p className="small">Live operational monitor. Auto-refresh every 15 seconds.</p>
      <div className="actions">
        <button onClick={load} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh Now"}
        </button>
        {data && <span className={`statusChip ${data.summary.status}`}>Status: {data.summary.status.toUpperCase()}</span>}
      </div>
      {error && <p className="error">{error}</p>}
      {data && (
        <>
          <section className="card">
            <div className="grid">
              <article>
                <h3>Total Checks</h3>
                <p>{data.summary.total_checks}</p>
              </article>
              <article>
                <h3>Failures</h3>
                <p className={data.summary.failures > 0 ? "error" : "ok"}>{data.summary.failures}</p>
              </article>
              <article>
                <h3>Warnings</h3>
                <p className={data.summary.warns > 0 ? "warn" : "ok"}>{data.summary.warns}</p>
              </article>
              <article>
                <h3>Last Refresh</h3>
                <p className="small">{new Date(data.generated_at).toLocaleString()}</p>
              </article>
            </div>
          </section>

          <section className="card">
            <h2>Action Required</h2>
            {grouped.errors.length === 0 && grouped.warns.length === 0 && (
              <p className="ok">No issues detected. System checks are healthy.</p>
            )}
            {grouped.errors.map((c) => (
              <p key={c.id} className="error">
                {c.label}: {c.detail}
              </p>
            ))}
            {grouped.warns.map((c) => (
              <p key={c.id} className="warn">
                {c.label}: {c.detail}
              </p>
            ))}
          </section>

          <section className="card">
            <h2>All Checks</h2>
            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Check</th>
                    <th>Status</th>
                    <th>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {data.checks.map((c) => (
                    <tr key={c.id}>
                      <td>{c.label}</td>
                      <td>
                        <span className={`statusChip ${c.level}`}>{c.level.toUpperCase()}</span>
                      </td>
                      <td>{c.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </section>
  );
}
