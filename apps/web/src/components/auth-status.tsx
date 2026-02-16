"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getBrowserSupabaseClient, isBrowserSupabaseConfigured } from "@/lib/supabase/client";

export function AuthStatus() {
  const [email, setEmail] = useState<string | null>(null);
  const [misconfigured, setMisconfigured] = useState(false);

  useEffect(() => {
    if (!isBrowserSupabaseConfigured()) {
      setMisconfigured(true);
      return;
    }

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
      <span className="small">
        {misconfigured ? "Supabase public env missing" : email ? `Signed in: ${email}` : "Not signed in"}
      </span>
      <Link href={email ? "/account" : "/account?next=/dashboard"} className="navLink">
        {email ? "Account" : "Sign In"}
      </Link>
    </div>
  );
}
