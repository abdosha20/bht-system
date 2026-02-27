import { cookies } from "next/headers";

export type AppLang = "en" | "ar";

export const APP_LANG_COOKIE = "bht_lang";

export function normalizeLang(input: string | null | undefined): AppLang {
  return input === "ar" ? "ar" : "en";
}

export async function getServerLang(): Promise<AppLang> {
  const store = await cookies();
  return normalizeLang(store.get(APP_LANG_COOKIE)?.value);
}

export function dirForLang(lang: AppLang): "ltr" | "rtl" {
  return lang === "ar" ? "rtl" : "ltr";
}
