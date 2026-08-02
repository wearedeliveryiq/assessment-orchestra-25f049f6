import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/deliveryiq/app-shell";
import { IdentityMenu } from "@/components/identity/identity-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { roleLabel } from "@/lib/identity/rbac";
import type { PlatformRole } from "@/lib/identity/types";
import * as tenancy from "@/lib/tenancy/client";

const ORG_ROLES: PlatformRole[] = [
  "org_admin",
  "workspace_manager",
  "assessment_manager",
  "contributor",
  "reviewer",
  "read_only",
];

export const Route = createFileRoute("/organisations/$id")({
  head: () => ({
    meta: [
      { title: "Organisation settings — DeliveryIQ" },
      {
        name: "description",
        content: "Administer workspaces, members, invitations and settings for your organisation.",
      },
      { property: "og:title", content: "Organisation settings — DeliveryIQ" },
      {
        property: "og:description",
        content: "Workspace, membership and invitation administration in DeliveryIQ.",
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
      <p className="text-sm text-muted-foreground">Organisation not found.</p>
    </AppShell>
  ),
  component: OrganisationDetailPage,
});

function OrganisationDetailPage() {
  const { id } = useParams({ from: "/organisations/$id" });
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["tenancy"] });

  const detail = useQuery({
    queryKey: ["tenancy", "organisation", id],
    queryFn: () => tenancy.getOrganisation(id),
  });

  const createWorkspace = useMutation({
    mutationFn: tenancy.createWorkspace,
    onSuccess: () => {
      toast.success("Workspace created.");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const invite = useMutation({
    mutationFn: tenancy.inviteMember,
    onSuccess: ({ inviteUrl }) => {
      navigator.clipboard?.writeText(inviteUrl).catch(() => undefined);
      toast.success("Invitation created — link copied to your clipboard.");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMember = useMutation({
    mutationFn: ({ membershipId, patch }: { membershipId: string; patch: Record<string, string> }) =>
      tenancy.updateMember(membershipId, patch),
    onSuccess: () => invalidate(),
    onError: (error: Error) => toast.error(error.message),
  });

  if (detail.isLoading) {
    return (
      <AppShell action={<IdentityMenu />}>
        <p className="text-sm text-muted-foreground">Loading organisation…</p>
      </AppShell>
    );
  }
  if (!detail.data) {
    return (
      <AppShell action={<IdentityMenu />}>
        <p className="text-sm text-destructive-foreground">
          {detail.error instanceof Error ? detail.error.message : "Unable to load organisation."}
        </p>
      </AppShell>
    );
  }

  const { organisation, workspaces, members, invitations, audit } = detail.data;

  return (
    <AppShell action={<IdentityMenu />}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/organisations" className="text-xs text-muted-foreground hover:text-foreground">
            ← All organisations
          </Link>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
            {organisation.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {organisation.industry || "No industry"} · {organisation.status}
          </p>
        </div>
      </div>

      <Tabs defaultValue="workspaces" className="mt-7">
        <TabsList>
          <TabsTrigger value="workspaces">Workspaces</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="workspaces" className="mt-5 space-y-4">
          <CreateWorkspaceDialog
            onCreate={(input) => createWorkspace.mutateAsync({ ...input, organisationId: id })}
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((workspace) => (
              <Link
                key={workspace.id}
                to="/workspaces/$id"
                params={{ id: workspace.id }}
                className="ribbon-panel rounded-lg p-4 transition-colors hover:border-primary/50"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: workspace.colour }}
                    aria-hidden
                  />
                  <p className="truncate font-medium">{workspace.name}</p>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                  {workspace.description || "No description"}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {workspace.memberCount} member{workspace.memberCount === 1 ? "" : "s"} ·{" "}
                  {workspace.status}
                </p>
              </Link>
            ))}
            {workspaces.length === 0 ? (
              <p className="text-sm text-muted-foreground">No workspaces yet.</p>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="members" className="mt-5 space-y-3">
          {members.map((member) => (
            <div
              key={member.membershipId}
              className="ribbon-panel flex flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{member.displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{member.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={member.status === "active" ? "secondary" : "outline"}>
                  {member.status}
                </Badge>
                <Select
                  value={member.role}
                  onValueChange={(role) =>
                    updateMember.mutate({ membershipId: member.membershipId, patch: { role } })
                  }
                >
                  <SelectTrigger className="h-8 w-52">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORG_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {roleLabel(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    updateMember.mutate({
                      membershipId: member.membershipId,
                      patch: { status: member.status === "suspended" ? "active" : "suspended" },
                    })
                  }
                >
                  {member.status === "suspended" ? "Reinstate" : "Suspend"}
                </Button>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="invitations" className="mt-5 space-y-4">
          <InviteDialog
            workspaces={workspaces.map((workspace) => ({
              id: workspace.id,
              name: workspace.name,
            }))}
            onInvite={(input) => invite.mutateAsync({ ...input, organisationId: id })}
          />
          <div className="space-y-2">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="ribbon-panel flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm"
              >
                <span className="truncate">{invitation.email}</span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {roleLabel(invitation.role)}
                  <Badge variant="outline">{invitation.status}</Badge>
                </span>
              </div>
            ))}
            {invitations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invitations.</p>
            ) : null}
          </div>
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

function CreateWorkspaceDialog({
  onCreate,
}: {
  onCreate: (input: Record<string, unknown>) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", type: "programme" });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          New workspace
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a workspace</DialogTitle>
          <DialogDescription>
            Create a home for this organisation's assessments, members and delivery activity.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            await onCreate(form);
            setOpen(false);
            setForm({ name: "", description: "", type: "programme" });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="ws-name">Name</Label>
            <Input
              id="ws-name"
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ws-description">Description</Label>
            <Input
              id="ws-description"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="submit">Create workspace</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InviteDialog({
  workspaces,
  onInvite,
}: {
  workspaces: { id: string; name: string }[];
  onInvite: (input: {
    email: string;
    role: string;
    workspaceId?: string | null;
    organisationId: string;
  }) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("contributor");
  const [workspaceId, setWorkspaceId] = useState<string>("none");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Invite member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite someone to this organisation</DialogTitle>
          <DialogDescription>
            Choose their organisation role and optionally add them to a workspace.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            await onInvite({
              email,
              role,
              workspaceId: workspaceId === "none" ? null : workspaceId,
              organisationId: "",
            });
            setOpen(false);
            setEmail("");
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="invite-email">Work email</Label>
            <Input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Organisation role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORG_ROLES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {roleLabel(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Add to workspace (optional)</Label>
            <Select value={workspaceId} onValueChange={setWorkspaceId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No workspace</SelectItem>
                {workspaces.map((workspace) => (
                  <SelectItem key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit">Send invitation</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
