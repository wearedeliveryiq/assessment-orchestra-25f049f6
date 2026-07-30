import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/deliveryiq/app-shell";
import { PasswordStrength } from "@/components/identity/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIdentity } from "@/hooks/use-identity";
import {
  changePassword,
  listSessions,
  revokeAllSessions,
  revokeSession,
  securityActivity,
  signOut,
  updateProfile,
} from "@/lib/identity/client";
import { roleLabel } from "@/lib/identity/rbac";
import { STATUS_LABELS } from "@/lib/identity/password-policy";

export const Route = createFileRoute("/account")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Account & security — DeliveryIQ" },
      {
        name: "description",
        content: "Manage your DeliveryIQ profile, password, active sessions and security activity.",
      },
      { property: "og:title", content: "Account & security — DeliveryIQ" },
      {
        property: "og:description",
        content: "Manage your DeliveryIQ profile, sessions and security activity.",
      },
    ],
  }),
  component: AccountPage,
});

function Panel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="ribbon-panel rounded-xl p-6">
      <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function AccountPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { identity, isLoading, isAuthenticated, refresh } = useIdentity();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate({ to: "/auth/login", search: { redirect: "/account" } });
  }, [isAuthenticated, isLoading, navigate]);

  const sessions = useQuery({
    queryKey: ["identity", "sessions"],
    queryFn: listSessions,
    enabled: isAuthenticated,
  });
  const activity = useQuery({
    queryKey: ["identity", "activity"],
    queryFn: securityActivity,
    enabled: isAuthenticated,
  });

  const [profileForm, setProfileForm] = useState({ firstName: "", lastName: "", displayName: "" });
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (identity) {
      setProfileForm({
        firstName: identity.user.firstName,
        lastName: identity.user.lastName,
        displayName: identity.user.displayName,
      });
    }
  }, [identity]);

  if (!identity) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Loading your account…</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      action={
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            await queryClient.cancelQueries();
            queryClient.clear();
            await signOut();
            navigate({ to: "/auth/login", replace: true });
          }}
        >
          Sign out
        </Button>
      }
    >
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Identity & access
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground">
          Account & security
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {identity.user.email} · {STATUS_LABELS[identity.user.status]} ·{" "}
          {identity.roles.map(roleLabel).join(", ")}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Profile" description="How your name appears across DeliveryIQ.">
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              try {
                await updateProfile(profileForm);
                refresh();
                toast.success("Profile updated");
              } catch (cause) {
                toast.error(cause instanceof Error ? cause.message : "Update failed");
              }
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={profileForm.firstName}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, firstName: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={profileForm.lastName}
                  onChange={(event) =>
                    setProfileForm((current) => ({ ...current, lastName: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                value={profileForm.displayName}
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, displayName: event.target.value }))
                }
              />
            </div>
            <Button type="submit">Save profile</Button>
          </form>
        </Panel>

        <Panel title="Password" description="Passwords must meet the platform security policy.">
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              try {
                await changePassword({ newPassword: password });
                setPassword("");
                toast.success("Password updated");
              } catch (cause) {
                toast.error(cause instanceof Error ? cause.message : "Update failed");
              }
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <PasswordStrength password={password} />
            </div>
            <Button type="submit" disabled={!password}>
              Update password
            </Button>
          </form>
        </Panel>

        <Panel title="Active sessions" description="Sign out devices you no longer recognise.">
          <div className="space-y-3">
            {(sessions.data ?? []).filter((session) => !session.revoked).length === 0 ? (
              <p className="text-sm text-muted-foreground">No active sessions recorded.</p>
            ) : null}
            {(sessions.data ?? [])
              .filter((session) => !session.revoked)
              .map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-surface/50 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">
                      {session.browser} on {session.device}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {session.ipAddress} · last active{" "}
                      {new Date(session.lastActivity).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await revokeSession(session.id);
                      sessions.refetch();
                    }}
                  >
                    Revoke
                  </Button>
                </div>
              ))}
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                await revokeAllSessions();
                sessions.refetch();
                toast.success("All sessions revoked");
              }}
            >
              Revoke all sessions
            </Button>
          </div>
        </Panel>

        <Panel title="Security activity" description="Recent identity events on your account.">
          <ul className="space-y-2">
            {(activity.data ?? []).slice(0, 12).map((event) => (
              <li key={event.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-foreground">{event.eventType.replace(/[._]/g, " ")}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(event.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
            {(activity.data ?? []).length === 0 ? (
              <li className="text-sm text-muted-foreground">No activity recorded yet.</li>
            ) : null}
          </ul>
        </Panel>
      </div>

      {identity.memberships.length > 0 ? (
        <div className="mt-6">
          <Panel title="Organisations" description="Workspaces you belong to and your role in each.">
            <ul className="space-y-2">
              {identity.memberships.map((membership) => (
                <li
                  key={membership.id}
                  className="flex items-center justify-between rounded-lg border border-border/70 bg-surface/50 px-3 py-2 text-sm"
                >
                  <span className="text-foreground">
                    {membership.organisationName ?? membership.organisationId}
                  </span>
                  <span className="text-xs text-muted-foreground">{roleLabel(membership.role)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      ) : null}
    </AppShell>
  );
}
