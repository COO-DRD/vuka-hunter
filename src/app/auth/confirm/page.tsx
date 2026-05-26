"use client";
/**
 * Handles email confirmation links generated server-side via admin.generateLink.
 * Supabase resolves those links with #access_token=... in the URL fragment —
 * fragments are never sent to the server, so the normal /auth/callback route
 * can't see them. This client page reads the fragment, sets the session, then
 * redirects to the dashboard.
 */
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Zap } from "lucide-react";

export default function ConfirmPage() {
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    async function confirm() {
      const hash = window.location.hash.slice(1); // strip leading #
      if (!hash) { setStatus("error"); return; }

      const params = new URLSearchParams(hash);
      const accessToken  = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (!accessToken || !refreshToken) { setStatus("error"); return; }

      const sb = createSupabaseBrowserClient();
      const { error } = await sb.auth.setSession({
        access_token:  accessToken,
        refresh_token: refreshToken,
      });

      if (error) { setStatus("error"); return; }

      // Hard redirect so middleware sees the fresh session cookie immediately
      window.location.replace("/dashboard");
    }

    confirm();
  }, []);

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
        <div className="text-center max-w-xs">
          <p className="text-sm text-red-400 mb-4">
            This confirmation link has expired or is invalid.
          </p>
          <a href="/sign-in" className="text-xs text-red-400 hover:text-red-300 underline">
            Back to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="flex items-center gap-3 text-zinc-400 text-sm">
        <Zap className="h-4 w-4 text-red-400 animate-pulse" />
        Confirming your account…
      </div>
    </div>
  );
}
