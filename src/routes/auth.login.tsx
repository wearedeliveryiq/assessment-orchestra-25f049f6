import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";

import { AuthLayout, FormError } from "@/components/identity/auth-layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/lib/identity/client";

export const Route = createFileRoute("/auth/login")({
  validateSearch: (search: Record<string, unknown>) => {
    const result: { redirect?: string } = {};
    if (typeof search.redirect === "string") result.redirect = search.redirect;
    return result;
  },
  head: () => ({
    meta: [
      { title: "Sign in — DeliveryIQ" },
      {
        name: "description",
        content: "Sign in to the DeliveryIQ intelligence runtime to run and review assessments.",
      },
      { property: "og:title", content: "Sign in — DeliveryIQ" },
      {
        property: "og:description",
        content: "Secure access to the DeliveryIQ assessment intelligence platform.",
      },
    ],
  }),
  component: LoginPage,
});

function safePath(value: string | undefined): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function LoginPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth/login" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn({ email, password, rememberMe });
      navigate({ to: safePath(search.redirect) });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Access your organisation's delivery intelligence."
      footer={
        <>
          New to DeliveryIQ?{" "}
          <Link
            to="/auth/register"
            search={{ snapshot: undefined, source: undefined, result: undefined }}
            className="text-foreground underline underline-offset-4"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={error} />

        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              to="/auth/forgot-password"
              className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox
            checked={rememberMe}
            onCheckedChange={(value) => setRememberMe(value === true)}
          />
          Keep me signed in on this device
        </label>

        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
