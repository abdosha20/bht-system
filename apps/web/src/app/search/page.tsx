"use client";

import { FormEvent, useEffect, useState } from "react";
import { authorizedJsonFetch } from "@/lib/security/session";

type SearchResult = {
  url?: string;
  expires_in?: number;
  error?: string;
};

export default function SearchPage() {
  const [docUid, setDocUid] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);

  useEffect(() => {
    const fromQuery = new URLSearchParams(window.location.search).get("doc_uid") ?? "";
    setDocUid(fromQuery);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);

    const res = await authorizedJsonFetch(`/api/documents/${encodeURIComponent(docUid)}/download?version=1`);

    setResult((await res.json()) as SearchResult);
  }

  async function copyUrl() {
    if (result?.url) {
      await navigator.clipboard.writeText(result.url);
    }
  }

  return (
    <section className="card">
      <h1>Search and Download</h1>
      <p className="small">Enter a document UID to fetch a short-lived signed download URL.</p>
      <form onSubmit={onSubmit}>
        <div className="formGrid">
          <label>
            Document UID
            <input name="q" value={docUid} onChange={(e) => setDocUid(e.target.value)} required />
          </label>
        </div>
        <button type="submit">Get Signed URL</button>
      </form>

      {result?.error && <p className="error">{result.error}</p>}
      {result?.url && (
        <section className="card">
          <h2 className="ok">Signed URL Ready</h2>
          <p className="small">Expires in {result.expires_in} seconds.</p>
          <div className="actions">
            <a className="navLink" href={result.url} target="_blank" rel="noreferrer">Open PDF</a>
            <button type="button" className="secondary" onClick={copyUrl}>Copy URL</button>
          </div>
          <pre className="codeBlock">{result.url}</pre>
        </section>
      )}
    </section>
  );
}
