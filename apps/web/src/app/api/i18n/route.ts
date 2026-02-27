import { NextResponse } from "next/server";
import { APP_LANG_COOKIE, normalizeLang } from "@/lib/i18n";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lang = normalizeLang(url.searchParams.get("lang"));
  const returnTo = url.searchParams.get("returnTo") || "/";
  const redirectUrl = new URL(returnTo, url.origin);

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set(APP_LANG_COOKIE, lang, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax"
  });

  return response;
}
