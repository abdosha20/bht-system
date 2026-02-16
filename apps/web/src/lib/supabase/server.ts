import { createClient } from "@supabase/supabase-js";

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function createServiceClient() {
  const url = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRole = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, serviceRole, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export function createUserServerClient(accessToken: string) {
  const url = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anon = getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createClient(url, anon, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
