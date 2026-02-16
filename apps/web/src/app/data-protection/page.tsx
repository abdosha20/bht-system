export default function DataProtectionPage() {
  return (
    <section className="card">
      <h1>Data Protection and GDPR Compliance</h1>
      <p className="small">
        Scope: Internal Secure Records Archive. This page documents controls implemented in this system. Last reviewed:
        February 16, 2026.
      </p>

      <section className="card">
        <h2>Legal Framework Followed</h2>
        <div className="grid">
          <article>
            <h3>UK GDPR</h3>
            <p className="small">
              Core principles applied: lawfulness, fairness, transparency, purpose limitation, data minimisation,
              accuracy, storage limitation, integrity/confidentiality, and accountability.
            </p>
          </article>
          <article>
            <h3>Data Protection Act 2018</h3>
            <p className="small">
              UK implementation and supplementary provisions supporting the UK GDPR framework.
            </p>
          </article>
          <article>
            <h3>Security by Design</h3>
            <p className="small">
              Technical and organisational measures include RBAC, RLS, audit trails, and controlled storage access.
            </p>
          </article>
        </div>
      </section>

      <section className="card">
        <h2>System Rules and Clarifications</h2>
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Control</th>
                <th>Implementation</th>
                <th>Clarification</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Data minimisation</td>
                <td>Only IDs for staff/client/supplier linkage are stored in metadata.</td>
                <td>No personal data is encoded in barcode payloads.</td>
              </tr>
              <tr>
                <td>Barcode security</td>
                <td>Payload format: `BHTCL|doc_uid|doc_type|vversion|checksum` with salted checksum validation.</td>
                <td>Invalid checksum responses do not confirm document existence.</td>
              </tr>
              <tr>
                <td>Least privilege</td>
                <td>Role + scope checks with table-level RLS policies.</td>
                <td>No filter-after-fetch pattern is used for protected data access.</td>
              </tr>
              <tr>
                <td>Server-only secrets</td>
                <td>`SUPABASE_SERVICE_ROLE_KEY` is used only in server routes.</td>
                <td>Service role key must never be exposed to browser bundles.</td>
              </tr>
              <tr>
                <td>Auditability</td>
                <td>Operations write entries to `audit_log` with action/outcome/reason.</td>
                <td>Audit read access is restricted to `DIRECTOR` role by policy.</td>
              </tr>
              <tr>
                <td>Storage limitation</td>
                <td>Retention job marks records due for review 60 days before due date.</td>
                <td>Records on legal hold cannot be deleted.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>Data Subject Rights (Operational Response)</h2>
        <div className="grid">
          <article>
            <h3>Access and Rectification</h3>
            <p className="small">
              Metadata can be located by document UID and reviewed with controlled role-based access.
            </p>
          </article>
          <article>
            <h3>Erasure and Restriction</h3>
            <p className="small">
              Retention and legal hold controls govern deletion workflow; deletion requires approved route.
            </p>
          </article>
          <article>
            <h3>Accountability</h3>
            <p className="small">
              Audit events and role policies provide evidence for compliance and access review.
            </p>
          </article>
        </div>
      </section>

      <p className="small muted">
        Compliance note: This page is an operational control summary, not legal advice. Regulatory interpretation should
        be confirmed by qualified legal counsel.
      </p>
    </section>
  );
}
