import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;
const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isBrowserSupabaseConfigured() {
  return Boolean(publicUrl && publicAnon);
}

export function getBrowserSupabaseClient() {
  if (browserClient) {
    return browserClient;
  }

  if (!publicUrl || !publicAnon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  browserClient = createClient(publicUrl, publicAnon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  });

  return browserClient;
}
