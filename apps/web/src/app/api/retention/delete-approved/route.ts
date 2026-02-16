export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Not implemented",
      detail: "Deletion requires an approved route with dual-control and disposal certificate generation."
    },
    { status: 501 }
  );
}