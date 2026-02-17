import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Analytics } from "@vercel/analytics/next";
import { AuthStatus } from "@/components/auth-status";

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

const nav = [
  { href: "/dashboard", label: "Dashboard", mobileLabel: "Home" },
  { href: "/records", label: "Records", mobileLabel: "Records" },
  { href: "/data-protection", label: "Data Protection", mobileLabel: "Data" },
  { href: "/operations", label: "Operations", mobileLabel: "Ops" },
  { href: "/upload", label: "Upload", mobileLabel: "Upload" },
  { href: "/resolve", label: "Resolve", mobileLabel: "Resolve" },
  { href: "/search", label: "Search", mobileLabel: "Search" },
  { href: "/audit", label: "Audit", mobileLabel: "Audit" },
  { href: "/setup", label: "Setup", mobileLabel: "Setup" }
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="topbar">
            <div className="topbarInner">
              <div className="brandWrap">
                <div className="brandLine">
                  <Image src="/logo-bytehub.png" alt="BYTE HUB logo" width={120} height={52} className="brandLogo" />
                  <div className="brand">BHT Secure Records Archive</div>
                </div>
                <div className="small">Internal records handling, retention, and audit trail</div>
              </div>
              <AuthStatus />
            </div>
          </header>
          <div className="workspace">
            <aside className="sideNav">
              <div className="sideTitle">Navigation</div>
              <nav className="sideNavList">
                {nav.map((item) => (
                  <Link key={item.href} href={item.href} className="sideNavLink">
                    {item.label}
                  </Link>
                ))}
              </nav>
            </aside>
            <main className="main">{children}</main>
          </div>
          <nav className="mobileTabs" aria-label="Mobile navigation">
            {nav.map((item) => (
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
                  <div className="footerTitle">BHT Secure Records Archive</div>
                  <div className="small">Security-first internal archive with audit, retention, and controlled access.</div>
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
                  Main Website
                </a>
                <a
                  href="https://wa.me/447361542988"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footerLink"
                >
                  <span className="fIcon wa" aria-hidden />
                  WhatsApp Support
                </a>
                <a
                  href="https://www.facebook.com/share/1BEDmz4uFN/?mibextid=wwXIfr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footerLink"
                >
                  <span className="fIcon fb" aria-hidden />
                  Facebook Page
                </a>
              </div>
              <div className="footerMeta small">
                <div>Support: Mon-Fri, 09:00-18:00 (UK)</div>
                <div>For urgent incidents, contact WhatsApp support first.</div>
                <div>
                  Version {appVersion} | Powered By | BYTE HUB TECHNOLOGY CORPORATE LTD
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
