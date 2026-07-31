import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/deliveryiq/app-shell";
import { IdentityMenu } from "@/components/identity/identity-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { roleLabel } from "@/lib/identity/rbac";
import * as tenancy from "@/lib/tenancy/client";

export const Route = createFileRoute("/workspaces/$id")({
  head: () => ({
    meta: [
      { title: "Workspace — DeliveryIQ" },
      {
        name: "description",
        content: "Workspace members, settings and activity for your DeliveryIQ assessments.",
      },
      { property: "og:title", content: "Workspace — DeliveryIQ" },
      {
        property: "og:description",
        content: "Manage workspace membership, defaults and recent activity in DeliveryIQ.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: ({ error }) => (
    <AppShell>
      <p className="text-sm text-destructive-foreground">{error.message}</p>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <p className="text-sm text-muted-foreground">Workspace not found.</p>
    </AppShell>
  ),
  component: WorkspaceDetailPage,
});

function WorkspaceDetailPage() {
  const { id } = useParams({ from: "/workspaces/$id" });
  const queryClient = useQueryClient();

  const detail = useQuery({
    queryKey: ["tenancy", "workspace", id],
    queryFn: () => tenancy.getWorkspace(id),
  });

  const favourite = useMutation({
    mutationFn: (value: boolean) => tenancy.setWorkspaceFavourite(id, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenancy"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  if (detail.isLoading) {
    return (
      <AppShell action={<IdentityMenu />}>
        <p className="text-sm text-muted-foreground">Loading workspace…</p>
      </AppShell>
    );
  }
  if (!detail.data) {
    return (
      <AppShell action={<IdentityMenu />}>
        <p className="text-sm text-destructive-foreground">
          {detail.error instanceof Error ? detail.error.message : "Unable to load workspace."}
        </p>
      </AppShell>
    );
  }

  const { workspace, members, settings, audit } = detail.data;

  return (
    <AppShell action={<IdentityMenu />}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            to="/organisations/$id"
            params={{ id: workspace.organisationId }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← Back to organisation
          </Link>
          <h1 className="mt-1 flex items-center gap-2 font-display text-2xl font-semibold tracking-tight">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: workspace.colour }}
              aria-hidden
            />
            {workspace.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {workspace.description || "No description"}
          </p>
        </div>
        <Button
          size="sm"
          variant={workspace.favourite ? "secondary" : "ghost"}
          className="gap-2"
          onClick={() => favourite.mutate(!workspace.favourite)}
        >
          <Star className={`h-4 w-4 ${workspace.favourite ? "fill-current" : ""}`} />
          {workspace.favourite ? "Favourited" : "Add to favourites"}
        </Button>
      </div>

      <Tabs defaultValue="members" className="mt-7">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-5 space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="ribbon-panel flex items-center justify-between gap-3 rounded-lg px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{member.displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{member.email}</p>
              </div>
              <Badge variant="outline">{roleLabel(member.role)}</Badge>
            </div>
          ))}
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No workspace members yet.</p>
          ) : null}
        </TabsContent>

        <TabsContent value="settings" className="mt-5">
          <dl className="ribbon-panel grid gap-4 rounded-lg p-5 sm:grid-cols-2">
            <Detail label="Visibility" value={settings.visibility} />
            <Detail label="Default knowledge pack" value={settings.defaultKnowledgePack || "—"} />
            <Detail label="Workspace type" value={workspace.type} />
            <Detail label="Status" value={workspace.status} />
          </dl>
        </TabsContent>

        <TabsContent value="activity" className="mt-5 space-y-2">
          {audit.map((event) => (
            <div key={event.id} className="ribbon-panel rounded-lg px-4 py-3 text-sm">
              <p>{event.summary}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(event.createdAt).toLocaleString()} · {event.eventType}
              </p>
            </div>
          ))}
          {audit.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recorded activity yet.</p>
          ) : null}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}
