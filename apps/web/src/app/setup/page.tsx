"use client";

import { useEffect, useState } from "react";

export default function SetupPage() {
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    fetch("/api/setup")
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body?.error ?? "Setup failed");
        }
        setState("ok");
      })
      .catch((e: Error) => {
        setState("error");
        setError(e.message);
      });
  }, []);

  return (
    <section className="card">
      <h1>Setup Check</h1>
      {state === "loading" && <p>Checking Supabase connectivity...</p>}
      {state === "ok" && <p>ok</p>}
      {state === "error" && <p>error: {error}</p>}
    </section>
  );
}