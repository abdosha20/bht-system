"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type Props = {
  lang: "en" | "ar";
};

export function LanguageToggle({ lang }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const targetLang = lang === "ar" ? "en" : "ar";
  const label = lang === "ar" ? "English" : "العربية";
  const current = `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ""}`;
  const href = `/api/i18n?lang=${targetLang}&returnTo=${encodeURIComponent(current)}`;

  return (
    <Link href={href} className="navLink" prefetch={false}>
      {label}
    </Link>
  );
}
