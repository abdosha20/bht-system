export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

type CheckLevel = "ok" | "warn" | "error";

type OpCheck = {
  id: string;
  label: string;
  level: CheckLevel;
  detail: string;
};

function envCheck(name: string): OpCheck {
  return {
    id: `env_${name}`,
    label: `Env ${name}`,
    level: process.env[name] ? "ok" : "error",
    detail: process.env[name] ? "Configured" : "Missing environment variable"
  };
}

async function tableCheck(table: string): Promise<OpCheck> {
  const service = createServiceClient();
  const { error } = await service.from(table).select("*").limit(1);

  if (error) {
    return {
      id: `table_${table}`,
      label: `Table ${table}`,
      level: "error",
      detail: error.message
    };
  }

  return {
    id: `table_${table}`,
    label: `Table ${table}`,
    level: "ok",
    detail: "Reachable"
  };
}

async function bucketCheck(): Promise<OpCheck> {
  const service = createServiceClient();
  const { data, error } = await service.storage.listBuckets();

  if (error) {
    return {
      id: "storage_bucket",
      label: "Storage Bucket records-private",
      level: "error",
      detail: error.message
    };
  }

  const found = (data ?? []).some((b) => b.name === "records-private" || b.id === "records-private");
  return {
    id: "storage_bucket",
    label: "Storage Bucket records-private",
    level: found ? "ok" : "error",
    detail: found ? "Bucket exists" : "Bucket missing"
  };
}

function firstPresent(names: string[]) {
  for (const name of names) {
    if (process.env[name]) {
      return name;
    }
  }
  return null;
}

function publicSupabaseUrlCheck(): OpCheck {
  const source = firstPresent(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"]);
  return {
    id: "env_public_supabase_url",
    label: "Env public Supabase URL",
    level: source ? "ok" : "error",
    detail: source ? `Configured via ${source}` : "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL"
  };
}

function publicSupabaseAnonCheck(): OpCheck {
  const source = firstPresent([
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_ANON_KEY",
    "SUPABASE_PUBLISHABLE_KEY"
  ]);
  return {
    id: "env_public_supabase_anon",
    label: "Env public Supabase anon key",
    level: source ? "ok" : "error",
    detail: source
      ? `Configured via ${source}`
      : "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY or SUPABASE_PUBLISHABLE_KEY"
  };
}

export async function GET() {
  const now = new Date().toISOString();
  const checks: OpCheck[] = [];

  checks.push(publicSupabaseUrlCheck());
  checks.push(publicSupabaseAnonCheck());
  checks.push(envCheck("SUPABASE_SERVICE_ROLE_KEY"));
  checks.push(envCheck("BHT_BARCODE_SECRET_SALT"));
  checks.push(envCheck("RETENTION_JOB_SECRET"));
  checks.push({
    id: "env_vercel_runtime",
    label: "Runtime environment",
    level: "ok",
    detail: process.env.VERCEL_ENV
      ? `Vercel ${process.env.VERCEL_ENV}`
      : process.env.NODE_ENV ?? "unknown"
  });

  const service = createServiceClient();
  const { error: healthError } = await service.from("healthcheck_public").select("id,ok").limit(1);
  checks.push({
    id: "healthcheck_public",
    label: "Healthcheck table",
    level: healthError ? "error" : "ok",
    detail: healthError ? healthError.message : "Public setup healthcheck reachable"
  });

  const tableChecks = await Promise.all([
    tableCheck("profiles"),
    tableCheck("documents"),
    tableCheck("audit_log"),
    tableCheck("manager_staff_assignment"),
    tableCheck("client_manager_assignment"),
    tableCheck("disposal_certificate")
  ]);
  checks.push(...tableChecks);

  checks.push(await bucketCheck());

  const failures = checks.filter((c) => c.level === "error").length;
  const warns = checks.filter((c) => c.level === "warn").length;

  return NextResponse.json({
    generated_at: now,
    summary: {
      status: failures > 0 ? "error" : warns > 0 ? "warn" : "ok",
      total_checks: checks.length,
      failures,
      warns
    },
    checks
  });
}
