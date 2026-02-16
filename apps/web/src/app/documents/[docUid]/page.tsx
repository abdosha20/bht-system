import Link from "next/link";

export default function DocumentCardPage({ params }: { params: { docUid: string } }) {
  return (
    <section className="card">
      <h1>Document Card</h1>
      <p>Document UID: {params.docUid}</p>
      <p className="small">Use resolve or search endpoints to retrieve authorized metadata and signed links.</p>
      <Link href="/search" className="navLink">
        Back to Search
      </Link>
    </section>
  );
}