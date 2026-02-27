import { getServerLang } from "@/lib/i18n";

export default async function HomePage() {
  const lang = await getServerLang();

  return (
    <section className="card">
      <h1>{lang === "ar" ? "أرشيف السجلات الآمن" : "Secure Records Archive"}</h1>
      <p>
        {lang === "ar"
          ? "استخدم التنقل لرفع الملفات، وتحليل الباركود، والبحث في البيانات، ومراجعة أحداث التدقيق."
          : "Use the navigation to upload, resolve barcodes, search metadata, and review audit events."}
      </p>
    </section>
  );
}
