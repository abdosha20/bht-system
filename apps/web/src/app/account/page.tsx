"use client";

import { FormEvent, useEffect, useState } from "react";
import { getBrowserSupabaseClient, isBrowserSupabaseConfigured } from "@/lib/supabase/client";

export default function AccountPage() {
  const [nextPath, setNextPath] = useState("/dashboard");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function withTimeout<T>(promise: Promise<T>, ms = 15000): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Request timed out. Check network and Supabase Auth settings.")), ms);
      });
      return (await Promise.race([promise, timeout])) as T;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  useEffect(() => {
    if (!isBrowserSupabaseConfigured()) {
      setMessage("Supabase public environment variables are missing. Restart dev server or redeploy after setting env.");
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
      setMessage("Supabase public environment variables are missing. Restart dev server or redeploy after setting env.");
      return;
    }
    setLoading(true);

    try {
      if (mode === "signin") {
        const { data, error } = await withTimeout(
          getBrowserSupabaseClient().auth.signInWithPassword({ email, password })
        );
        if (error) {
          setMessage(error.message);
          setLoading(false);
          return;
        }
        if (!data?.session) {
          setMessage("Sign-in completed without an active session. Please retry.");
          setLoading(false);
          return;
        }

        setCurrentUser(data.user?.email ?? email);
        window.location.assign(nextPath);
        return;
      }

      const { error } = await withTimeout(getBrowserSupabaseClient().auth.signUp({ email, password }));
      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      setMessage("Account created. If email confirmation is enabled, confirm your email then sign in.");
      setMode("signin");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Authentication failed unexpectedly.");
    } finally {
      setLoading(false);
    }
  }

  async function onSignOut() {
    if (!isBrowserSupabaseConfigured()) {
      setMessage("Supabase public environment variables are missing. Restart dev server or redeploy after setting env.");
      return;
    }
    try {
      setLoading(true);
      await withTimeout(getBrowserSupabaseClient().auth.signOut());
      setCurrentUser(null);
      setMessage("Signed out.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Sign out failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card">
      <div className="split2">
        <article className="card">
          <h1>Account Access</h1>
          <p className="small">Use this page for sign-in, account creation, and session management.</p>
          <p className="small">Active user: {currentUser ?? "No active session"}</p>
          <div className="actions">
            <button
              type="button"
              className="secondary"
              disabled={loading}
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              Switch to {mode === "signin" ? "Sign Up" : "Sign In"}
            </button>
            <button type="button" className="danger" disabled={loading} onClick={onSignOut}>
              {loading ? "Working..." : "Sign Out"}
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
            <button type="submit" disabled={loading}>
              {loading ? "Please wait..." : mode === "signin" ? "Continue" : "Create Account"}
            </button>
          </form>
          {message && <p className="small">{message}</p>}
        </article>
      </div>
    </section>
  );
}
