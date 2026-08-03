import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { AuthLayout, FormError, FormNotice } from "@/components/identity/auth-layout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { GENERIC_LINK_ERROR, parseAuthCallback } from "@/lib/identity/auth-callback";
import { confirmVerification, resendVerification } from "@/lib/identity/client";

export const Route = createFileRoute("/auth/verify-email")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    snapshot: search.snapshot === "continue" ? ("continue" as const) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Verify your email — DeliveryIQ" },
      {
        name: "description",
        content: "Confirm your email address to activate your DeliveryIQ account.",
      },
      { property: "og:title", content: "Verify your email — DeliveryIQ" },
      { property: "og:description", content: "Activate your DeliveryIQ account." },
    ],
  }),
  component: VerifyEmailPage,
});

/**
 * Waits for the Supabase session created by the callback before the DeliveryIQ
 * verification endpoint is called. The endpoint authenticates with the bearer
 * token, so calling it early produced a spurious "invalid link" error.
 */
async function awaitSession(attempts = 10): Promise<string | null> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) return data.session.access_token;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return null;
}

function VerifyEmailPage() {
  const search = useSearch({ from: "/auth/verify-email" });
  const [state, setState] = useState<"checking" | "verified" | "failed">("checking");
  const [message, setMessage] = useState<string>(GENERIC_LINK_ERROR);
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const fail = useCallback((reason: string) => {
    setMessage(reason);
    setState("failed");
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const callback = parseAuthCallback(window.location.hash, window.location.search, "signup");

      if (callback.error) {
        if (active) fail(callback.error);
        return;
      }

      if (callback.tokenHash) {
        // The link declares its own verification type; using a hardcoded one
        // caused Supabase to reject valid signup tokens.
        const { error } = await supabase.auth.verifyOtp({
          type: callback.otpType,
          token_hash: callback.tokenHash,
        });
        if (error) {
          if (active) fail(GENERIC_LINK_ERROR);
          return;
        }
      } else if (!callback.hasSessionTokens) {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          if (active) fail(GENERIC_LINK_ERROR);
          return;
        }
      }

      const token = await awaitSession();
      if (!active) return;
      if (!token) {
        fail(GENERIC_LINK_ERROR);
        return;
      }

      try {
        await confirmVerification();
        if (active) setState("verified");
      } catch {
        if (active) fail(GENERIC_LINK_ERROR);
      }
    })();
    return () => {
      active = false;
    };
  }, [fail]);

  return (
    <AuthLayout
      title={state === "verified" ? "Email verified" : "Verifying your email"}
      subtitle={
        state === "verified"
          ? "Your account is now active."
          : "Hold tight while we confirm your verification link."
      }
    >
      <div className="space-y-4">
        {state === "verified" ? <FormNotice message="You can now sign in to DeliveryIQ." /> : null}
        {state === "failed" ? (
          <div className="space-y-3">
            <FormError message={message} />
            <FormNotice message={notice} />
            <label className="block space-y-2 text-sm text-muted-foreground" htmlFor="resend-email">
              <span>Send a new verification email</span>
              <input
                id="resend-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                placeholder="you@company.com"
              />
            </label>
            <Button
              variant="secondary"
              className="w-full"
              disabled={!email}
              onClick={async () => {
                await resendVerification(
                  email,
                  search.snapshot === "continue"
                    ? `${window.location.origin}/auth/verify-email?snapshot=continue`
                    : undefined,
                ).catch(() => undefined);
                setNotice("If that address needs verifying, a new link is on its way.");
              }}
            >
              Resend verification email
            </Button>
          </div>
        ) : null}
        <Button asChild className="w-full" disabled={state === "checking"}>
          <Link
            to="/auth/login"
            search={search.snapshot === "continue" ? { redirect: "/snapshot?continue=1" } : {}}
          >
            Continue to sign in
          </Link>
        </Button>
      </div>
    </AuthLayout>
  );
}
