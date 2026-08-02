import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/deliveryiq/app-shell";
import { IdentityMenu } from "@/components/identity/identity-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import * as tenancy from "@/lib/tenancy/client";

export const Route = createFileRoute("/organisations/")({
  head: () => ({
    meta: [
      { title: "Organisations — DeliveryIQ" },
      {
        name: "description",
        content:
          "Manage the organisations and workspaces your DeliveryIQ assessments belong to.",
      },
      { property: "og:title", content: "Organisations — DeliveryIQ" },
      {
        property: "og:description",
        content: "Multi-tenant organisation and workspace administration for DeliveryIQ.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrganisationsPage,
});

function OrganisationsPage() {
  const queryClient = useQueryClient();
  const [term, setTerm] = useState("");

  const organisations = useQuery({
    queryKey: ["tenancy", "organisations", term],
    queryFn: () => tenancy.listOrganisations(term || undefined),
  });

  const create = useMutation({
    mutationFn: tenancy.createOrganisation,
    onSuccess: () => {
      toast.success("Organisation created.");
      queryClient.invalidateQueries({ queryKey: ["tenancy"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <AppShell action={<IdentityMenu />}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Organisations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every assessment belongs to a workspace inside one of these organisations.
          </p>
        </div>
        <CreateOrganisationDialog onCreate={(input) => create.mutateAsync(input)} />
      </div>

      <div className="mt-6 max-w-sm">
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search organisations…"
          aria-label="Search organisations"
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(organisations.data ?? []).map((organisation) => (
          <Link
            key={organisation.id}
            to="/organisations/$id"
            params={{ id: organisation.id }}
            className="ribbon-panel rounded-xl p-5 transition-colors hover:border-primary/50"
          >
            <div className="flex items-center gap-3">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15"
              >
                <Building2 className="h-4 w-4 text-primary" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium">{organisation.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {organisation.industry || "No industry set"}
                </p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
              <Stat label="Workspaces" value={organisation.workspaceCount} />
              <Stat label="Members" value={organisation.memberCount} />
              <Stat label="Pending" value={organisation.pendingInvitationCount} />
            </dl>
          </Link>
        ))}

        {organisations.isSuccess && organisations.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You are not a member of any organisation yet. Create one to get started.
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border/60 py-2">
      <dt className="text-[0.65rem] uppercase tracking-[0.14em]">{label}</dt>
      <dd className="font-display text-base text-foreground">{value}</dd>
    </div>
  );
}

function CreateOrganisationDialog({
  onCreate,
}: {
  onCreate: (input: Record<string, unknown>) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", industry: "", description: "" });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          New organisation
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create an organisation</DialogTitle>
          <DialogDescription>
            Set up the organisation that will own your DeliveryIQ workspaces and assessments.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            await onCreate(form);
            setOpen(false);
            setForm({ name: "", industry: "", description: "" });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="org-name">Name</Label>
            <Input
              id="org-name"
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-industry">Industry</Label>
            <Input
              id="org-industry"
              value={form.industry}
              onChange={(event) => setForm({ ...form, industry: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-description">Description</Label>
            <Input
              id="org-description"
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="submit">Create organisation</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
