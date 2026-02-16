import Link from "next/link";

export default async function DocumentCardPage({ params }: { params: Promise<{ docUid: string }> }) {
  const { docUid } = await params;
  return (
    <section className="card">
      <h1>Document Card</h1>
      <p>Document UID: {docUid}</p>
      <p className="small">Use resolve or search endpoints to retrieve authorized metadata and signed links.</p>
      <Link href="/search" className="navLink">
        Back to Search
      </Link>
    </section>
  );
}
