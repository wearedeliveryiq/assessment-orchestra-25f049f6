import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AuthLayout, FormError, PasswordStrength } from "@/components/identity/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { GENERIC_LINK_ERROR, parseAuthCallback } from "@/lib/identity/auth-callback";
import { changePassword } from "@/lib/identity/client";

export const Route = createFileRoute("/auth/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Choose a new password — DeliveryIQ" },
      { name: "description", content: "Set a new password for your DeliveryIQ account." },
      { property: "og:title", content: "Choose a new password — DeliveryIQ" },
      { property: "og:description", content: "Complete your DeliveryIQ password reset." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The recovery link carries either a PKCE code (handled automatically) or a
  // token hash that must be exchanged for a short-lived session.
  useEffect(() => {
    let active = true;
    (async () => {
      const callback = parseAuthCallback(window.location.hash, window.location.search, "recovery");
      if (callback.error) {
        if (!active) return;
        setError(callback.error);
        setReady(true);
        return;
      }
      if (callback.tokenHash) {
        await supabase.auth
          .verifyOtp({ type: callback.otpType, token_hash: callback.tokenHash })
          .catch(() => undefined);
      }
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (!data.session) setError(GENERIC_LINK_ERROR);
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError("Both passwords must match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await changePassword({ newPassword: password, reset: true });
      await supabase.auth.signOut();
      navigate({ to: "/auth/login" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update your password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Your new password must meet the DeliveryIQ security policy."
      footer={
        <Link to="/auth/login" className="text-foreground underline underline-offset-4">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={error} />

        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <PasswordStrength password={password} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm new password</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </div>

        <Button type="submit" className="w-full" disabled={busy || !ready}>
          {busy ? "Updating…" : "Update password"}
        </Button>
      </form>
    </AuthLayout>
  );
}
