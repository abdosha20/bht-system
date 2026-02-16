"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

export function AuthStatus() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const client = getBrowserSupabaseClient();

    client.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });

    const {
      data: { subscription }
    } = client.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="authBadge">
      <span className="small">{email ? `Signed in: ${email}` : "Not signed in"}</span>
      <Link href={email ? "/account" : "/account?next=/dashboard"} className="navLink">
        {email ? "Account" : "Sign In"}
      </Link>
    </div>
  );
}
