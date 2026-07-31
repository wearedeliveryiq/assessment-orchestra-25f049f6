import { Link } from "@tanstack/react-router";
import { Check, ChevronsUpDown, Loader2, Plus, Star } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useWorkspaceContext } from "@/hooks/use-workspace-context";
import type { WorkspaceSummary } from "@/lib/tenancy/client";

/** Header affordance for moving between organisations and workspaces. */
export function WorkspaceSwitcher() {
  const { context, currentWorkspace, switchWorkspace, isSwitching, isLoading } =
    useWorkspaceContext();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");

  const groups = useMemo(() => {
    if (!context) return [];
    const needle = term.trim().toLowerCase();
    const visible = context.workspaces.filter((workspace) =>
      needle ? workspace.name.toLowerCase().includes(needle) : true,
    );
    return context.organisations
      .map((organisation) => ({
        organisation,
        workspaces: visible.filter((w) => w.organisationId === organisation.id),
      }))
      .filter((group) => group.workspaces.length > 0);
  }, [context, term]);

  if (isLoading || !context) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="sm" className="max-w-[16rem] justify-between gap-2">
          <span className="truncate">
            {currentWorkspace ? currentWorkspace.name : "Select workspace"}
          </span>
          {isSwitching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border/70 p-2">
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search workspaces…"
            className="h-8"
            aria-label="Search workspaces"
          />
        </div>

        <div className="max-h-72 overflow-y-auto p-1.5">
          {context.favourites.length > 0 && term === "" ? (
            <Section title="Favourites">
              {context.favourites.map((workspace) => (
                <WorkspaceRow
                  key={`fav-${workspace.id}`}
                  workspace={workspace}
                  active={workspace.id === currentWorkspace?.id}
                  onSelect={async () => {
                    await switchWorkspace(workspace.id);
                    setOpen(false);
                  }}
                />
              ))}
            </Section>
          ) : null}

          {groups.map((group) => (
            <Section key={group.organisation.id} title={group.organisation.name}>
              {group.workspaces.map((workspace) => (
                <WorkspaceRow
                  key={workspace.id}
                  workspace={workspace}
                  active={workspace.id === currentWorkspace?.id}
                  onSelect={async () => {
                    await switchWorkspace(workspace.id);
                    setOpen(false);
                  }}
                />
              ))}
            </Section>
          ))}

          {groups.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              No workspaces match “{term}”.
            </p>
          ) : null}
        </div>

        <div className="border-t border-border/70 p-1.5">
          <Button asChild variant="ghost" size="sm" className="w-full justify-start gap-2">
            <Link to="/organisations" onClick={() => setOpen(false)}>
              <Plus className="h-3.5 w-3.5" />
              Manage organisations
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-1.5">
      <p className="px-2 py-1 text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

function WorkspaceRow({
  workspace,
  active,
  onSelect,
}: {
  workspace: WorkspaceSummary;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted ${
        active ? "bg-muted" : ""
      }`}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: workspace.colour }}
        aria-hidden
      />
      <span className="flex-1 truncate">{workspace.name}</span>
      {workspace.favourite ? (
        <Star className="h-3.5 w-3.5 fill-current text-muted-foreground" aria-hidden />
      ) : null}
      {active ? <Check className="h-3.5 w-3.5 text-primary" aria-hidden /> : null}
    </button>
  );
}
