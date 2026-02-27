export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createAnonServerClient } from "@/lib/supabase/server";

type VerifyCaptchaResult = {
  success: boolean;
  "error-codes"?: string[];
  hostname?: string;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function getRemoteIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const email = String(body?.email ?? "").trim();
    const password = String(body?.password ?? "");
    const captchaToken = String(body?.captchaToken ?? "");

    if (!email || !password || !captchaToken) {
      return NextResponse.json(
        { error: "Email, password, and captcha token are required." },
        { status: 400 }
      );
    }

    const captchaSecret = getRequiredEnv("HCAPTCHA_SECRET_KEY");
    const captchaSiteKey = process.env.HCAPTCHA_SITE_KEY ?? process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? "";

    const verifyBody = new URLSearchParams({
      secret: captchaSecret,
      response: captchaToken
    });
    if (captchaSiteKey) {
      verifyBody.set("sitekey", captchaSiteKey);
    }
    const remoteIp = getRemoteIp(req);
    if (remoteIp) {
      verifyBody.set("remoteip", remoteIp);
    }

    const verifyResponse = await fetch("https://api.hcaptcha.com/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: verifyBody
    });

    if (!verifyResponse.ok) {
      const raw = await verifyResponse.text().catch(() => "");
      return NextResponse.json(
        {
          error: "Captcha verification endpoint failed.",
          provider_status: verifyResponse.status,
          provider_body: raw.slice(0, 300)
        },
        { status: 502 }
      );
    }

    const verifyResult = (await verifyResponse.json()) as VerifyCaptchaResult;
    if (!verifyResult.success) {
      const codes = verifyResult["error-codes"] ?? [];
      return NextResponse.json(
        {
          error: `Captcha challenge failed: ${codes.join(", ") || "unknown_error"}.`,
          codes
        },
        { status: 400 }
      );
    }

    const client = createAnonServerClient();
    const { data, error } = await client.auth.signUp({ email, password });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      needs_email_confirmation: !data.session
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Signup failed unexpectedly." },
      { status: 500 }
    );
  }
}
