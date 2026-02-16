"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabaseClient, isBrowserSupabaseConfigured } from "@/lib/supabase/client";

export default function AccountPage() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState("/dashboard");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    if (!isBrowserSupabaseConfigured()) {
      setMessage("Supabase public environment variables are missing in this deployment.");
      return;
    }

    const nextFromQuery = new URLSearchParams(window.location.search).get("next");
    if (nextFromQuery) {
      setNextPath(nextFromQuery);
    }

    getBrowserSupabaseClient()
      .auth.getUser()
      .then(({ data }) => setCurrentUser(data.user?.email ?? null))
      .catch(() => setCurrentUser(null));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!isBrowserSupabaseConfigured()) {
      setMessage("Supabase public environment variables are missing in this deployment.");
      return;
    }

    if (mode === "signin") {
      const { error } = await getBrowserSupabaseClient().auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(error.message);
        return;
      }

      router.push(nextPath);
      router.refresh();
      return;
    }

    const { error } = await getBrowserSupabaseClient().auth.signUp({ email, password });
    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Account created. If email confirmation is enabled, confirm your email then sign in.");
    setMode("signin");
  }

  async function onSignOut() {
    if (!isBrowserSupabaseConfigured()) {
      setMessage("Supabase public environment variables are missing in this deployment.");
      return;
    }
    await getBrowserSupabaseClient().auth.signOut();
    setCurrentUser(null);
    setMessage("Signed out.");
  }

  return (
    <section className="card">
      <div className="split2">
        <article className="card">
          <h1>Account Access</h1>
          <p className="small">Use this page for sign-in, account creation, and session management.</p>
          <p className="small">Active user: {currentUser ?? "No active session"}</p>
          <div className="actions">
            <button type="button" className="secondary" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
              Switch to {mode === "signin" ? "Sign Up" : "Sign In"}
            </button>
            <button type="button" className="danger" onClick={onSignOut}>
              Sign Out
            </button>
          </div>
        </article>

        <article className="card">
          <h2>{mode === "signin" ? "Sign In" : "Create Account"}</h2>
          <form onSubmit={onSubmit}>
            <div className="formGrid">
              <label>
                Email
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </label>
              <label>
                Password
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </label>
            </div>
            <button type="submit">{mode === "signin" ? "Continue" : "Create Account"}</button>
          </form>
          {message && <p className="small">{message}</p>}
        </article>
      </div>
    </section>
  );
}
