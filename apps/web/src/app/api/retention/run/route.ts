export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const secret = req.headers.get("x-retention-secret");
  if (!secret || secret !== process.env.RETENTION_JOB_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();

  const now = new Date();
  const reviewCutoff = new Date(now.getTime() + 60 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  const { data: reviewDocs } = await service
    .from("documents")
    .select("doc_uid")
    .lte("disposal_due_date", reviewCutoff)
    .eq("legal_hold", false);

  if (reviewDocs && reviewDocs.length > 0) {
    const ids = reviewDocs.map((d) => d.doc_uid);
    await service
      .from("documents")
      .update({ classification_level: "DUE_FOR_REVIEW" })
      .in("doc_uid", ids);
  }

  // TODO: Hard deletion is intentionally not performed here.
  // A separate, approved endpoint with 4-eyes workflow must trigger deletion.
  return NextResponse.json({
    ok: true,
    marked_due_for_review: reviewDocs?.length ?? 0,
    deletions_executed: 0,
    disposal_certificates_written: 0
  });
}