import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AuthLayout, FormError, FormNotice } from "@/components/identity/auth-layout";
import { Button } from "@/components/ui/button";
import { useIdentity } from "@/hooks/use-identity";
import { acceptInvitation } from "@/lib/identity/client";

export const Route = createFileRoute("/auth/invitation")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  head: () => ({
    meta: [
      { title: "Accept your invitation — DeliveryIQ" },
      { name: "description", content: "Join your organisation's DeliveryIQ workspace." },
      { property: "og:title", content: "Accept your invitation — DeliveryIQ" },
      { property: "og:description", content: "Join your organisation's DeliveryIQ workspace." },
    ],
  }),
  component: InvitationPage,
});

function InvitationPage() {
  const { token } = useSearch({ from: "/auth/invitation" });
  const { isAuthenticated, isLoading } = useIdentity();
  const navigate = useNavigate();
  const [state, setState] = useState<"idle" | "accepted">("idle");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({
        to: "/auth/login",
        search: { redirect: `/auth/invitation?token=${encodeURIComponent(token)}` },
      });
    }
  }, [isAuthenticated, isLoading, navigate, token]);

  async function onAccept() {
    setBusy(true);
    setError(null);
    try {
      await acceptInvitation(token);
      setState("accepted");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to accept this invitation.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Organisation invitation"
      subtitle="Accept to join your organisation's DeliveryIQ workspace."
      footer={
        <Link to="/account" className="text-foreground underline underline-offset-4">
          Go to your account
        </Link>
      }
    >
      <div className="space-y-4">
        <FormError message={error} />
        {state === "accepted" ? (
          <FormNotice message="Invitation accepted. Your access has been updated." />
        ) : (
          <Button className="w-full" onClick={onAccept} disabled={busy || !token}>
            {busy ? "Accepting…" : "Accept invitation"}
          </Button>
        )}
      </div>
    </AuthLayout>
  );
}
