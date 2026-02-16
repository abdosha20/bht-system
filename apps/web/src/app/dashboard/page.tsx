import Link from "next/link";

const quickActions = [
  { href: "/upload", label: "Upload Record", detail: "Store a PDF and write metadata in one flow." },
  { href: "/resolve", label: "Resolve Barcode", detail: "Paste barcode payload and open authorized metadata." },
  { href: "/search", label: "Get Signed URL", detail: "Fetch a 90-second protected download link." },
  { href: "/audit", label: "Audit Viewer", detail: "Review security events (DIRECTOR scoped)." }
];

export default function DashboardPage() {
  return (
    <>
      <section className="card hero">
        <h1>Operations Dashboard</h1>
        <p className="small">Large-screen control center for uploads, barcode resolution, retention checks, and compliance visibility.</p>
        <div className="statRow">
          <div className="statCard">
            <div className="small">Access Model</div>
            <strong>RLS + RBAC</strong>
          </div>
          <div className="statCard">
            <div className="small">Storage</div>
            <strong>Private Bucket</strong>
          </div>
          <div className="statCard">
            <div className="small">Barcode</div>
            <strong>Pointer Only</strong>
          </div>
          <div className="statCard">
            <div className="small">Audit</div>
            <strong>Append-Only</strong>
          </div>
        </div>
      </section>

      <section className="split2">
        <section className="card">
          <h2>Primary Workflows</h2>
          <p className="small">Use the shortcuts below to upload, retrieve, and audit records with least-privilege access.</p>
          <div className="grid">
            {quickActions.map((item) => (
              <article key={item.href} className="card">
                <h3>{item.label}</h3>
                <p className="small">{item.detail}</p>
                <div className="actions">
                  <Link href={item.href} className="navLink">
                    Open
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>Security Controls</h2>
          <div className="grid">
            <article>
              <h3>Data minimisation</h3>
              <p className="small">Only IDs are stored for staff/client/supplier relations.</p>
            </article>
            <article>
              <h3>Access control</h3>
              <p className="small">Server auth, policy checks, and RLS protect document access.</p>
            </article>
            <article>
              <h3>Retention</h3>
              <p className="small">Scheduled review marking supports deletion governance and legal hold.</p>
            </article>
          </div>
        </section>
      </section>
    </>
  );
}
