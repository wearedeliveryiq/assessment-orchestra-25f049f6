import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";

// Supabase auth.oauth is a beta namespace. If the generated types don't expose
// it yet, we add a small local wrapper so we can still call the methods safely.
interface OAuthAuthorizationDetails {
  client?: { name: string; client_id?: string; client_uri?: string } | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
  scopes?: string[];
  expires_at?: string;
}

interface OAuthAuthorizationMethods {
  getAuthorizationDetails: (authorizationId: string) => Promise<{
    data: OAuthAuthorizationDetails | null;
    error: Error | null;
  }>;
  approveAuthorization: (authorizationId: string) => Promise<{
    data: { redirect_url?: string | null; redirect_to?: string | null } | null;
    error: Error | null;
  }>;
  denyAuthorization: (authorizationId: string) => Promise<{
    data: { redirect_url?: string | null; redirect_to?: string | null } | null;
    error: Error | null;
  }>;
}

const oauth: OAuthAuthorizationMethods = (supabase.auth as unknown as { oauth: OAuthAuthorizationMethods }).oauth;

function safeRedirect(value: string | undefined): string {
  // Only accept same-origin relative paths to avoid open-redirect abuse.
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    authorization_id: typeof search.authorization_id === "string" ? search.authorization_id : "",
  }),
  head: () => ({
    meta: [
      { title: "Connect an app — DeliveryIQ" },
      {
        name: "description",
        content: "Approve or deny an application that wants to access your DeliveryIQ data.",
      },
      { property: "og:title", content: "Connect an app — DeliveryIQ" },
      {
        property: "og:description",
        content: "Approve or deny an application that wants to access your DeliveryIQ data.",
      },
    ],
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/auth/login", search: { redirect: next } });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="p-8 text-foreground">
      Could not load this authorization request: {String((error as Error)?.message ?? error)}
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error: decisionError } = approve
      ? await oauth.approveAuthorization(authorization_id)
      : await oauth.denyAuthorization(authorization_id);
    if (decisionError) {
      setBusy(false);
      setError(decisionError.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = safeRedirect(target);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-card-foreground">
          Connect {details?.client?.name ?? "an app"} to your account
        </h1>
        <p className="text-muted-foreground">
          This lets {details?.client?.name ?? "the client"} use DeliveryIQ as you — read your assessments, start
          new ones, and review results.
        </p>
        {error && (
          <p role="alert" className="rounded border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
          >
            Deny
          </button>
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Approve
          </button>
        </div>
      </div>
    </main>
  );
}
