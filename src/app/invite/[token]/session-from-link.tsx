"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Supabase's invitation and sign-in emails (with the default templates) return
 * here with the session in the URL fragment (#access_token=...). Fragments
 * never reach the server, so pick the session up in the browser, remove it
 * from the address bar, and re-render the page as the signed-in invitee.
 */
export function SessionFromLink() {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const fragment = window.location.hash.slice(1);
    if (!fragment) return;

    const params = new URLSearchParams(fragment);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const errorCode = params.get("error_code") ?? params.get("error");
    if (!accessToken && !errorCode) return;

    window.history.replaceState(null, "", window.location.pathname + window.location.search);

    if (errorCode || !accessToken || !refreshToken) {
      // One-time sync from the URL fragment, which only exists in the browser.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotice(
        errorCode === "otp_expired"
          ? "The sign-in part of that email link has expired, but your invitation is still here. Continue below."
          : "We couldn't sign you in from that link. You can still continue below.",
      );
      return;
    }

    setNotice("Signing you in…");
    createSupabaseBrowserClient()
      .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          setNotice("We couldn't sign you in from that link. You can still continue below.");
        } else {
          setNotice(null);
          router.refresh();
        }
      });
  }, [router]);

  return notice ? (
    <p role="status" className="mb-4 rounded-xl bg-accent-soft px-4 py-3 text-center text-sm text-ink">
      {notice}
    </p>
  ) : null;
}
