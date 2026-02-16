import { createUserServerClient } from "@/lib/supabase/server";

export type AuthContext = {
  userId: string;
  role: string;
  accessToken: string;
};

export async function requireBearerAuth(authHeader: string | null): Promise<AuthContext | null> {
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return null;
  }

  const userClient = createUserServerClient(token);
  const { data: userData } = await userClient.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) {
    return null;
  }

  const { data: profile } = await userClient
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  // If profile is missing/unreadable, fall back to least privilege.
  return { userId, role: profile?.role ?? "STAFF", accessToken: token };
}
