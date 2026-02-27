"use client";

import Script from "next/script";
import { FormEvent, useEffect, useRef, useState } from "react";
import { getBrowserSupabaseClient, isBrowserSupabaseConfigured } from "@/lib/supabase/client";

type HCaptchaRenderOptions = {
  sitekey: string;
  callback: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
  "chalexpired-callback"?: () => void;
};

type HCaptchaApi = {
  render: (container: string | HTMLElement, options: HCaptchaRenderOptions) => string | number;
  reset: (widgetId?: string | number) => void;
};

declare global {
  interface Window {
    hcaptcha?: HCaptchaApi;
  }
}

const HCAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? "";

export default function AccountPage() {
  const [nextPath, setNextPath] = useState("/dashboard");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaReady, setCaptchaReady] = useState(false);
  const captchaContainerRef = useRef<HTMLDivElement | null>(null);
  const captchaWidgetRef = useRef<string | number | null>(null);

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

  useEffect(() => {
    if (!HCAPTCHA_SITE_KEY) {
      return;
    }
    if (!captchaReady || !window.hcaptcha || !captchaContainerRef.current) {
      return;
    }

    if (captchaWidgetRef.current !== null) {
      window.hcaptcha.reset(captchaWidgetRef.current);
      return;
    }

    captchaWidgetRef.current = window.hcaptcha.render(captchaContainerRef.current, {
      sitekey: HCAPTCHA_SITE_KEY,
      callback: (token: string) => {
        setCaptchaToken(token);
        setMessage("");
      },
      "expired-callback": () => {
        setCaptchaToken("");
        setMessage("Captcha expired. Please complete it again.");
      },
      "chalexpired-callback": () => {
        setCaptchaToken("");
        setMessage("Captcha challenge timed out. Please try again.");
      },
      "error-callback": () => {
        setCaptchaToken("");
        setMessage(
          `hCaptcha widget failed for host "${window.location.hostname}". Add this hostname in hCaptcha settings.`
        );
      }
    });
  }, [captchaReady]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!isBrowserSupabaseConfigured()) {
      setMessage("Supabase public environment variables are missing. Restart dev server or redeploy after setting env.");
      return;
    }
    setLoading(true);

    try {
      if (HCAPTCHA_SITE_KEY && !captchaToken) {
        setMessage("Complete the captcha challenge before continuing.");
        setLoading(false);
        return;
      }

      if (mode === "signin") {
        const { data, error } = await withTimeout(
          getBrowserSupabaseClient().auth.signInWithPassword({
            email,
            password,
            options: {
              captchaToken: captchaToken || undefined
            }
          })
        );
        if (error) {
          if (window.hcaptcha && captchaWidgetRef.current !== null) {
            window.hcaptcha.reset(captchaWidgetRef.current);
          }
          setCaptchaToken("");
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

      if (!captchaToken) {
        setMessage("Complete the captcha challenge before creating an account.");
        setLoading(false);
        return;
      }

      const response = await withTimeout(
        fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, captchaToken })
        })
      );
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; codes?: string[]; hints?: string[] }
        | null;

      if (!response.ok) {
        if (window.hcaptcha && captchaWidgetRef.current !== null) {
          window.hcaptcha.reset(captchaWidgetRef.current);
        }
        setCaptchaToken("");
        const codes = payload?.codes?.length ? ` (${payload.codes.join(", ")})` : "";
        const hints = payload?.hints?.length ? ` ${payload.hints.join(" ")}` : "";
        setMessage(`${payload?.error ?? "Signup failed."}${codes}${hints}`);
        setLoading(false);
        return;
      }

      if (window.hcaptcha && captchaWidgetRef.current !== null) {
        window.hcaptcha.reset(captchaWidgetRef.current);
      }
      setCaptchaToken("");
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
          {HCAPTCHA_SITE_KEY && (
            <Script src="https://js.hcaptcha.com/1/api.js" async defer onReady={() => setCaptchaReady(true)} />
          )}
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
            {HCAPTCHA_SITE_KEY && <div ref={captchaContainerRef} className="h-captcha" />}
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
