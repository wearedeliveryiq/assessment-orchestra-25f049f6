import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState } from "react";

import {
  AuthLayout,
  FormError,
  FormNotice,
  PasswordStrength,
} from "@/components/identity/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerAccount, resendVerification } from "@/lib/identity/client";

export const Route = createFileRoute("/auth/register")({
  validateSearch: (search: Record<string, unknown>) => ({
    snapshot: search.snapshot === "continue" ? ("continue" as const) : undefined,
    source: search.source === "delivery-dna" ? ("delivery-dna" as const) : undefined,
    result: typeof search.result === "string" ? search.result : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Create your account — DeliveryIQ" },
      {
        name: "description",
        content: "Create a DeliveryIQ account to run delivery maturity assessments securely.",
      },
      { property: "og:title", content: "Create your account — DeliveryIQ" },
      {
        property: "og:description",
        content: "Register for secure access to the DeliveryIQ intelligence runtime.",
      },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const search = useSearch({ from: "/auth/register" });
  const continuingSnapshot = search.snapshot === "continue";
  const continuingPublicResult = search.source === "delivery-dna" && Boolean(search.result);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (form.password !== confirm) {
      setError("Both passwords must match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await registerAccount({
        ...form,
        redirectTo: continuingSnapshot
          ? `${window.location.origin}/auth/verify-email?snapshot=continue`
          : undefined,
      });
      setSubmitted(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create your account.");
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <AuthLayout
        title="Verify your email"
        subtitle={`We've sent a verification link to ${form.email}. Confirm it to activate your account.`}
        footer={
          <Link
            to="/auth/login"
            search={continuingSnapshot ? { redirect: "/snapshot?continue=1" } : {}}
            className="text-foreground underline underline-offset-4"
          >
            Back to sign in
          </Link>
        }
      >
        <div className="space-y-4">
          <FormNotice message={notice} />
          <Button
            variant="secondary"
            className="w-full"
            onClick={async () => {
              await resendVerification(
                form.email,
                continuingSnapshot
                  ? `${window.location.origin}/auth/verify-email?snapshot=continue`
                  : undefined,
              ).catch(() => undefined);
              setNotice("Verification email sent again.");
            }}
          >
            Resend verification email
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle={
        continuingSnapshot
          ? "Create your secure DeliveryIQ workspace to save your Snapshot, return to your results and continue to your complete Delivery DNA Overview."
          : continuingPublicResult
            ? "Create your secure DeliveryIQ workspace to save your result and return when you are ready."
            : "Set up secure access to the DeliveryIQ intelligence runtime."
      }
      footer={
        <>
          Already registered?{" "}
          <Link
            to="/auth/login"
            search={continuingSnapshot ? { redirect: "/snapshot?continue=1" } : {}}
            className="text-foreground underline underline-offset-4"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={error} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" required value={form.firstName} onChange={set("firstName")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" required value={form.lastName} onChange={set("lastName")} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={set("email")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={form.password}
            onChange={set("password")}
          />
          <PasswordStrength password={form.password} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </div>

        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
}
