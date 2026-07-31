import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/deliveryiq/app-shell";
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
import { Textarea } from "@/components/ui/textarea";
import { useWorkspaceContext } from "@/hooks/use-workspace-context";
import * as sessions from "@/lib/sessions/client";
import { SESSION_PRIORITIES, type SessionPriority } from "@/lib/sessions/types";
import * as tenancy from "@/lib/tenancy/client";

export const Route = createFileRoute("/sessions/new")({
  head: () => ({
    meta: [
      { title: "New assessment session — DeliveryIQ" },
      {
        name: "description",
        content: "Create an assessment session, assign an owner and set a due date.",
      },
      { property: "og:title", content: "New assessment session — DeliveryIQ" },
      {
        property: "og:description",
        content: "Create an assessment session and assign it to your delivery team.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewSessionPage,
});

function NewSessionPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentWorkspace, organisation, workspaces } = useWorkspaceContext();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [priority, setPriority] = useState<SessionPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  const activeWorkspaceId = workspaceId || currentWorkspace?.id || "";

  const members = useQuery({
    queryKey: ["tenancy", "members", organisation?.id],
    queryFn: () => tenancy.listMembers(organisation!.id),
    enabled: Boolean(organisation?.id),
  });

  const create = useMutation({
    mutationFn: () =>
      sessions.createSession({
        knowledgePackId: "executive-sponsorship",
        organisationId: organisation!.id,
        workspaceId: activeWorkspaceId,
        name: name.trim(),
        description: description.trim(),
        priority,
        dueDate: dueDate || null,
        assignedTo: assignedTo || null,
      }),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Session created");
      navigate({ to: "/sessions/$id", params: { id: session.id } });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const disabled = !name.trim() || !organisation?.id || !activeWorkspaceId || create.isPending;

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          New assessment session
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sessions carry ownership, assignment and lifecycle state for a piece of assessment work.
        </p>

        <form
          className="ribbon-panel mt-6 space-y-5 rounded-xl p-6"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="name">Session name</Label>
            <Input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Q1 Executive Sponsorship review"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Workspace</Label>
              <Select value={activeWorkspaceId} onValueChange={setWorkspaceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select workspace" />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((workspace) => (
                    <SelectItem key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(value) => setPriority(value as SessionPriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_PRIORITIES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="due">Due date</Label>
              <Input
                id="due"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Assign to</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {(members.data ?? []).map((member) => (
                    <SelectItem key={member.userId} value={member.userId}>
                      {member.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" disabled={disabled} className="w-full">
            {create.isPending ? "Creating…" : "Create session"}
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
