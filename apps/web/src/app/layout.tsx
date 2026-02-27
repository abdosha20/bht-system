import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Analytics } from "@vercel/analytics/next";
import { AuthStatus } from "@/components/auth-status";
import { LanguageToggle } from "@/components/language-toggle";
import { dirForLang, getServerLang } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Secure Records Archive",
  description: "Internal BHT secure archive MVP",
  icons: {
    icon: "/logo-bytehub.png",
    shortcut: "/favicon.ico",
    apple: "/logo-bytehub.png"
  }
};
const appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? "v1.0.0";

const nav = {
  en: [
    { href: "/dashboard", label: "Dashboard", mobileLabel: "Home" },
    { href: "/records", label: "Records", mobileLabel: "Records" },
    { href: "/data-protection", label: "Data Protection", mobileLabel: "Data" },
    { href: "/operations", label: "Operations", mobileLabel: "Ops" },
    { href: "/upload", label: "Upload", mobileLabel: "Upload" },
    { href: "/resolve", label: "Resolve", mobileLabel: "Resolve" },
    { href: "/search", label: "Search", mobileLabel: "Search" },
    { href: "/audit", label: "Audit", mobileLabel: "Audit" },
    { href: "/setup", label: "Setup", mobileLabel: "Setup" }
  ],
  ar: [
    { href: "/dashboard", label: "لوحة التحكم", mobileLabel: "الرئيسية" },
    { href: "/records", label: "السجلات", mobileLabel: "السجلات" },
    { href: "/data-protection", label: "حماية البيانات", mobileLabel: "البيانات" },
    { href: "/operations", label: "العمليات", mobileLabel: "العمليات" },
    { href: "/upload", label: "رفع", mobileLabel: "رفع" },
    { href: "/resolve", label: "تحليل الرمز", mobileLabel: "تحليل" },
    { href: "/search", label: "بحث", mobileLabel: "بحث" },
    { href: "/audit", label: "التدقيق", mobileLabel: "تدقيق" },
    { href: "/setup", label: "الإعداد", mobileLabel: "إعداد" }
  ]
} as const;

const copy = {
  en: {
    brand: "BHT Secure Records Archive",
    strap: "Internal records handling, retention, and audit trail",
    navigation: "Navigation",
    mobileNav: "Mobile navigation",
    footerTitle: "BHT Secure Records Archive",
    footerDesc: "Security-first internal archive with audit, retention, and controlled access.",
    website: "Main Website",
    whatsapp: "WhatsApp Support",
    facebook: "Facebook Page",
    supportHours: "Support: Mon-Fri, 09:00-18:00 (UK)",
    supportHint: "For urgent incidents, contact WhatsApp support first.",
    versionBy: "Powered By | BYTE HUB TECHNOLOGY CORPORATE LTD"
  },
  ar: {
    brand: "أرشيف BHT الآمن للسجلات",
    strap: "إدارة السجلات الداخلية والحفظ ومسار التدقيق",
    navigation: "التنقل",
    mobileNav: "تنقل الجوال",
    footerTitle: "أرشيف BHT الآمن للسجلات",
    footerDesc: "أرشيف داخلي آمن مع تدقيق وحفظ وصول مضبوط.",
    website: "الموقع الرئيسي",
    whatsapp: "دعم واتساب",
    facebook: "صفحة فيسبوك",
    supportHours: "الدعم: الإثنين-الجمعة، 09:00-18:00 (المملكة المتحدة)",
    supportHint: "للحوادث العاجلة، تواصل أولاً عبر واتساب.",
    versionBy: "مشغل بواسطة | BYTE HUB TECHNOLOGY CORPORATE LTD"
  }
} as const;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getServerLang();
  const t = copy[lang];
  const navItems = nav[lang];

  return (
    <html lang={lang} dir={dirForLang(lang)}>
      <body>
        <div className="shell">
          <header className="topbar">
            <div className="topbarInner">
              <div className="brandWrap">
                <div className="brandLine">
                  <Image src="/logo-bytehub.png" alt="BYTE HUB logo" width={120} height={52} className="brandLogo" />
                  <div className="brand">{t.brand}</div>
                </div>
                <div className="small">{t.strap}</div>
              </div>
              <div className="actions">
                <LanguageToggle lang={lang} />
                <AuthStatus lang={lang} />
              </div>
            </div>
          </header>
          <div className="workspace">
            <aside className="sideNav">
              <div className="sideTitle">{t.navigation}</div>
              <nav className="sideNavList">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href} className="sideNavLink">
                    {item.label}
                  </Link>
                ))}
              </nav>
            </aside>
            <main className="main">{children}</main>
          </div>
          <nav className="mobileTabs" aria-label={t.mobileNav}>
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="mobileTabLink">
                {item.mobileLabel}
              </Link>
            ))}
          </nav>
          <footer className="footer">
            <div className="footerGlow footerGlowA" aria-hidden />
            <div className="footerGlow footerGlowB" aria-hidden />
            <div className="footerInner">
              <div className="footerBrand">
                <Image src="/logo-bytehub.png" alt="BYTE HUB logo" width={72} height={72} className="footerLogo" />
                <div>
                  <div className="footerTitle">{t.footerTitle}</div>
                  <div className="small">{t.footerDesc}</div>
                </div>
              </div>
              <div className="footerLinks">
                <a href="tel:+447361542988" className="footerLink">
                  <span className="fIcon phone" aria-hidden />
                  +44 7361 542988
                </a>
                <a href="mailto:info@bytehubtech.co.uk" className="footerLink">
                  <span className="fIcon email" aria-hidden />
                  info@bytehubtech.co.uk
                </a>
                <a href="https://bytehubtech.co.uk/" target="_blank" rel="noopener noreferrer" className="footerLink">
                  <span className="fIcon web" aria-hidden />
                  {t.website}
                </a>
                <a
                  href="https://wa.me/447361542988"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footerLink"
                >
                  <span className="fIcon wa" aria-hidden />
                  {t.whatsapp}
                </a>
                <a
                  href="https://www.facebook.com/share/1BEDmz4uFN/?mibextid=wwXIfr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footerLink"
                >
                  <span className="fIcon fb" aria-hidden />
                  {t.facebook}
                </a>
              </div>
              <div className="footerMeta small">
                <div>{t.supportHours}</div>
                <div>{t.supportHint}</div>
                <div>
                  Version {appVersion} | {t.versionBy}
                </div>
              </div>
            </div>
          </footer>
          <Analytics />
        </div>
      </body>
    </html>
  );
}
