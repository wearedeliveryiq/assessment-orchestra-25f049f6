import { createFileRoute, Link } from "@tanstack/react-router";
import { Layers3 } from "lucide-react";

import { AppShell } from "@/components/deliveryiq/app-shell";
import { IdentityMenu } from "@/components/identity/identity-menu";
import { useWorkspaceContext } from "@/hooks/use-workspace-context";

export const Route = createFileRoute("/workspaces/")({
  head: () => ({
    meta: [
      { title: "Workspaces — DeliveryIQ" },
      {
        name: "description",
        content: "Open the DeliveryIQ workspaces available to your account.",
      },
    ],
  }),
  component: WorkspacesPage,
});

function WorkspacesPage() {
  const { workspaces, organisations, isLoading } = useWorkspaceContext();
  const organisationNames = new Map(organisations.map((item) => [item.id, item.name]));

  return (
    <AppShell action={<IdentityMenu />}>
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Workspaces</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose the workspace containing the assessments and delivery activity you want to manage.
        </p>
      </div>

      {isLoading ? <p className="mt-6 text-sm text-muted-foreground">Loading workspaces…</p> : null}

      {!isLoading && workspaces.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((workspace) => (
            <Link
              key={workspace.id}
              to="/workspaces/$id"
              params={{ id: workspace.id }}
              className="ribbon-panel rounded-xl p-5 transition-colors hover:border-primary/50"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15">
                  <Layers3 className="h-4 w-4 text-primary" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{workspace.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {organisationNames.get(workspace.organisationId) ?? "DeliveryIQ organisation"}
                  </p>
                </div>
              </div>
              <p className="mt-4 line-clamp-2 text-sm text-muted-foreground">
                {workspace.description || "No description"}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                {workspace.memberCount} member{workspace.memberCount === 1 ? "" : "s"} · {workspace.status}
              </p>
            </Link>
          ))}
        </div>
      ) : null}

      {!isLoading && workspaces.length === 0 ? (
        <div className="ribbon-panel mt-6 rounded-xl p-6">
          <p className="font-medium">No workspaces available yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create one from an organisation to start a Delivery DNA™ assessment.
          </p>
          <Link to="/organisations" className="mt-4 inline-block text-sm text-primary hover:underline">
            Go to organisations
          </Link>
        </div>
      ) : null}
    </AppShell>
  );
}
