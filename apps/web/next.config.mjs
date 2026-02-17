/** @type {import("next").NextConfig} */
const fallbackPublicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const fallbackPublicSupabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  "";

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_SUPABASE_URL: fallbackPublicSupabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: fallbackPublicSupabaseAnonKey
  }
};

export default nextConfig;
