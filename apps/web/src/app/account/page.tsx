"use client";

import Script from "next/script";
import { FormEvent, useEffect, useRef, useState } from "react";
import { getBrowserSupabaseClient, isBrowserSupabaseConfigured } from "@/lib/supabase/client";

type HCaptchaRenderOptions = {
  sitekey: string;
  size?: "normal" | "compact" | "invisible";
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

const copy = {
  en: {
    envMissing: "Supabase public environment variables are missing. Restart dev server or redeploy after setting env.",
    timeout: "Request timed out. Check network and Supabase Auth settings.",
    captchaExpired: "Captcha expired. Please complete it again.",
    captchaTimedOut: "Captcha challenge timed out. Please try again.",
    captchaHostError: (host: string) => `hCaptcha widget failed for host "${host}". Add this hostname in hCaptcha settings.`,
    captchaBeforeContinue: "Complete the captcha challenge before continuing.",
    signinNoSession: "Sign-in completed without an active session. Please retry.",
    captchaBeforeSignup: "Complete the captcha challenge before creating an account.",
    signupFailed: "Signup failed.",
    signupDone: "Account created. If email confirmation is enabled, confirm your email then sign in.",
    authUnexpected: "Authentication failed unexpectedly.",
    signoutFailed: "Sign out failed.",
    signedOut: "Signed out.",
    title: "Account Access",
    subtitle: "Use this page for sign-in, account creation, and session management.",
    activeUser: "Active user",
    noSession: "No active session",
    switchTo: (mode: "signin" | "signup") => `Switch to ${mode === "signin" ? "Sign Up" : "Sign In"}`,
    signOut: "Sign Out",
    working: "Working...",
    signin: "Sign In",
    create: "Create Account",
    email: "Email",
    password: "Password",
    wait: "Please wait...",
    continue: "Continue"
  },
  ar: {
    envMissing: "متغيرات Supabase العامة مفقودة. أعد تشغيل الخادم بعد ضبط المتغيرات.",
    timeout: "انتهت مهلة الطلب. تحقق من الشبكة وإعدادات Supabase Auth.",
    captchaExpired: "انتهت صلاحية التحقق. أكمل التحقق مرة أخرى.",
    captchaTimedOut: "انتهت مهلة تحدي التحقق. حاول مرة أخرى.",
    captchaHostError: (host: string) => `فشل hCaptcha على النطاق "${host}". أضف هذا النطاق في إعدادات hCaptcha.`,
    captchaBeforeContinue: "أكمل التحقق قبل المتابعة.",
    signinNoSession: "تم تسجيل الدخول بدون جلسة نشطة. يرجى المحاولة مرة أخرى.",
    captchaBeforeSignup: "أكمل التحقق قبل إنشاء الحساب.",
    signupFailed: "فشل إنشاء الحساب.",
    signupDone: "تم إنشاء الحساب. إذا كان تأكيد البريد مفعلاً فقم بالتأكيد ثم سجل الدخول.",
    authUnexpected: "فشل المصادقة بشكل غير متوقع.",
    signoutFailed: "فشل تسجيل الخروج.",
    signedOut: "تم تسجيل الخروج.",
    title: "الوصول إلى الحساب",
    subtitle: "استخدم هذه الصفحة لتسجيل الدخول وإنشاء الحساب وإدارة الجلسة.",
    activeUser: "المستخدم الحالي",
    noSession: "لا توجد جلسة نشطة",
    switchTo: (mode: "signin" | "signup") => `التحويل إلى ${mode === "signin" ? "إنشاء حساب" : "تسجيل الدخول"}`,
    signOut: "تسجيل الخروج",
    working: "جارٍ التنفيذ...",
    signin: "تسجيل الدخول",
    create: "إنشاء حساب",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    wait: "يرجى الانتظار...",
    continue: "متابعة"
  }
} as const;

export default function AccountPage() {
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [nextPath, setNextPath] = useState("/dashboard");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaReady, setCaptchaReady] = useState(false);
  const [captchaSize, setCaptchaSize] = useState<"normal" | "compact">("normal");
  const captchaContainerRef = useRef<HTMLDivElement | null>(null);
  const captchaWidgetRef = useRef<string | number | null>(null);
  const t = copy[lang];

  async function withTimeout<T>(promise: Promise<T>, ms = 15000): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(t.timeout)), ms);
      });
      return (await Promise.race([promise, timeout])) as T;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  useEffect(() => {
    setLang(document.documentElement.lang === "ar" ? "ar" : "en");
  }, []);

  useEffect(() => {
    if (!isBrowserSupabaseConfigured()) {
      setMessage(t.envMissing);
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
  }, [t.envMissing]);

  useEffect(() => {
    const updateCaptchaSize = () => {
      setCaptchaSize(window.innerWidth <= 420 ? "compact" : "normal");
    };
    updateCaptchaSize();
    window.addEventListener("resize", updateCaptchaSize);
    return () => window.removeEventListener("resize", updateCaptchaSize);
  }, []);

  useEffect(() => {
    if (!HCAPTCHA_SITE_KEY) {
      return;
    }
    if (!captchaReady || !window.hcaptcha || !captchaContainerRef.current) {
      return;
    }

    if (captchaWidgetRef.current !== null) {
      // Re-render when size changes so mobile gets compact widget.
      captchaContainerRef.current.innerHTML = "";
      captchaWidgetRef.current = null;
    }

    captchaWidgetRef.current = window.hcaptcha.render(captchaContainerRef.current, {
      sitekey: HCAPTCHA_SITE_KEY,
      size: captchaSize,
      callback: (token: string) => {
        setCaptchaToken(token);
        setMessage("");
      },
      "expired-callback": () => {
        setCaptchaToken("");
        setMessage(t.captchaExpired);
      },
      "chalexpired-callback": () => {
        setCaptchaToken("");
        setMessage(t.captchaTimedOut);
      },
      "error-callback": () => {
        setCaptchaToken("");
        setMessage(t.captchaHostError(window.location.hostname));
      }
    });
  }, [captchaReady, captchaSize, t]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!isBrowserSupabaseConfigured()) {
      setMessage(t.envMissing);
      return;
    }
    setLoading(true);

    try {
      if (HCAPTCHA_SITE_KEY && !captchaToken) {
        setMessage(t.captchaBeforeContinue);
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
          setMessage(t.signinNoSession);
          setLoading(false);
          return;
        }

        setCurrentUser(data.user?.email ?? email);
        window.location.assign(nextPath);
        return;
      }

      if (!captchaToken) {
        setMessage(t.captchaBeforeSignup);
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
        setMessage(`${payload?.error ?? t.signupFailed}${codes}${hints}`);
        setLoading(false);
        return;
      }

      if (window.hcaptcha && captchaWidgetRef.current !== null) {
        window.hcaptcha.reset(captchaWidgetRef.current);
      }
      setCaptchaToken("");
      setMessage(t.signupDone);
      setMode("signin");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t.authUnexpected);
    } finally {
      setLoading(false);
    }
  }

  async function onSignOut() {
    if (!isBrowserSupabaseConfigured()) {
      setMessage(t.envMissing);
      return;
    }
    try {
      setLoading(true);
      await withTimeout(getBrowserSupabaseClient().auth.signOut());
      setCurrentUser(null);
      setMessage(t.signedOut);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t.signoutFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card">
      <div className="split2">
        <article className="card">
          <h1>{t.title}</h1>
          <p className="small">{t.subtitle}</p>
          <p className="small">
            {t.activeUser}: {currentUser ?? t.noSession}
          </p>
          <div className="actions">
            <button
              type="button"
              className="secondary"
              disabled={loading}
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {t.switchTo(mode)}
            </button>
            <button type="button" className="danger" disabled={loading} onClick={onSignOut}>
              {loading ? t.working : t.signOut}
            </button>
          </div>
        </article>

        <article className="card">
          <h2>{mode === "signin" ? t.signin : t.create}</h2>
          {HCAPTCHA_SITE_KEY && (
            <Script
              src="https://js.hcaptcha.com/1/api.js?render=explicit&recaptchacompat=off"
              async
              defer
              onReady={() => setCaptchaReady(true)}
            />
          )}
          <form onSubmit={onSubmit}>
            <div className="formGrid">
              <label>
                {t.email}
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </label>
              <label>
                {t.password}
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </label>
            </div>
            {HCAPTCHA_SITE_KEY && (
              <div className="hCaptchaWrap">
                <div ref={captchaContainerRef} className="hcaptchaContainer" />
              </div>
            )}
            <button type="submit" disabled={loading}>
              {loading ? t.wait : mode === "signin" ? t.continue : t.create}
            </button>
          </form>
          {message && <p className="small">{message}</p>}
        </article>
      </div>
    </section>
  );
}
