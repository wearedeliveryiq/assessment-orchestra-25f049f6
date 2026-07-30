import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AuthLayout, FormError, FormNotice } from "@/components/identity/auth-layout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { confirmVerification } from "@/lib/identity/client";

export const Route = createFileRoute("/auth/verify-email")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Verify your email — DeliveryIQ" },
      { name: "description", content: "Confirm your email address to activate your DeliveryIQ account." },
      { property: "og:title", content: "Verify your email — DeliveryIQ" },
      { property: "og:description", content: "Activate your DeliveryIQ account." },
    ],
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const [state, setState] = useState<"checking" | "verified" | "failed">("checking");

  useEffect(() => {
    let active = true;
    (async () => {
      const params = new URLSearchParams(
        window.location.hash.replace(/^#/, "") || window.location.search,
      );
      const tokenHash = params.get("token_hash");
      if (tokenHash) {
        await supabase.auth
          .verifyOtp({ type: "email", token_hash: tokenHash })
          .catch(() => undefined);
      }
      try {
        await confirmVerification();
        if (active) setState("verified");
      } catch {
        if (active) setState("failed");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

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
          <FormError message="This verification link is invalid or has already been used." />
        ) : null}
        <Button asChild className="w-full" disabled={state === "checking"}>
          <Link to="/auth/login">Continue to sign in</Link>
        </Button>
      </div>
    </AuthLayout>
  );
}
