import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Check,
  Circle,
  ExternalLink,
  Github,
  HelpCircle,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

import { AppShell } from "@/components/deliveryiq/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/internal/github-sync")({
  head: () => ({
    meta: [
      { title: "GitHub Sync — DeliveryIQ" },
      {
        name: "description",
        content:
          "Check your Lovable workspace GitHub connection, project repository status, and two-way sync readiness.",
      },
      { property: "og:title", content: "GitHub Sync — DeliveryIQ" },
      {
        property: "og:description",
        content:
          "Workspace connection, repository status and two-way sync readiness for DeliveryIQ.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GitHubSyncPage,
});

const STORAGE_KEY = "deliveryiq-github-sync-checklist";

interface SyncChecklist {
  workspaceConnection: boolean;
  projectRepository: boolean;
  twoWaySync: boolean;
}

const STEPS: {
  id: keyof SyncChecklist;
  label: string;
  description: string;
  instructions: string[];
  href: string;
  linkLabel: string;
}[] = [
  {
    id: "workspaceConnection",
    label: "Workspace GitHub connection",
    description: "A workspace owner or admin must authorise Lovable to access your GitHub account or organisation.",
    instructions: [
      "Open Workspace settings → Git → GitHub → Add connection.",
      "Install the Lovable GitHub app for the account or organisation that should own the repository.",
      "Return here and mark this step complete when the connection is shown in the workspace.",
    ],
    href: "https://docs.lovable.dev/integrations/github",
    linkLabel: "Git sync docs",
  },
  {
    id: "projectRepository",
    label: "Project repository linked",
    description: "Connect this DeliveryIQ project to a GitHub repository. Lovable creates a new private repo.",
    instructions: [
      "Open this project in the Lovable editor.",
      "Click the Plus (+) menu in the chat input → GitHub → Connect project.",
      "Select the connected workspace account and click Connect to create the repository.",
    ],
    href: "https://docs.lovable.dev/integrations/github",
    linkLabel: "Project sync steps",
  },
  {
    id: "twoWaySync",
    label: "Two-way sync active",
    description: "Confirm changes are flowing in both directions between Lovable and GitHub.",
    instructions: [
      "Make a small change in the Lovable editor and publish it.",
      "Check the target repository on GitHub for a matching commit.",
      "Push a trivial README change to the repo and confirm it appears in Lovable.",
    ],
    href: "https://docs.lovable.dev/integrations/github",
    linkLabel: "How sync works",
  },
];

function loadChecklist(): SyncChecklist {
  if (typeof window === "undefined") {
    return { workspaceConnection: false, projectRepository: false, twoWaySync: false };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { workspaceConnection: false, projectRepository: false, twoWaySync: false };
    const parsed = JSON.parse(raw) as Partial<SyncChecklist>;
    return {
      workspaceConnection: Boolean(parsed.workspaceConnection),
      projectRepository: Boolean(parsed.projectRepository),
      twoWaySync: Boolean(parsed.twoWaySync),
    };
  } catch {
    return { workspaceConnection: false, projectRepository: false, twoWaySync: false };
  }
}

function saveChecklist(checklist: SyncChecklist) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(checklist));
}

function findNextMissingStep(checklist: SyncChecklist) {
  return STEPS.find((step) => !checklist[step.id]);
}

function GitHubSyncPage() {
  const [checklist, setChecklist] = useState<SyncChecklist>(() => loadChecklist());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setChecklist(loadChecklist());
  }, []);

  const toggle = (id: keyof SyncChecklist) => {
    const next = { ...checklist, [id]: !checklist[id] };
    setChecklist(next);
    saveChecklist(next);
  };

  const reset = () => {
    const empty = { workspaceConnection: false, projectRepository: false, twoWaySync: false };
    setChecklist(empty);
    saveChecklist(empty);
  };

  const completedCount = Object.values(checklist).filter(Boolean).length;
  const nextMissing = findNextMissingStep(checklist);
  const allDone = completedCount === STEPS.length;

  return (
    <AppShell>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-accent">
        <Github className="h-3.5 w-3.5" />
        Platform integration
      </div>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">GitHub Sync</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        DeliveryIQ can sync its codebase to a GitHub repository through Lovable&apos;s GitHub
        integration. This panel shows the required setup steps and the next one you need to complete.
      </p>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="ribbon-panel rounded-xl p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Status</p>
          <p
            className={cn(
              "mt-1 font-display text-2xl font-semibold",
              allDone ? "text-success" : "text-warning",
            )}
          >
            {allDone ? "Synced" : "Not ready"}
          </p>
        </div>
        <div className="ribbon-panel rounded-xl p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Progress</p>
          <p className="mt-1 font-display text-2xl font-semibold">
            {completedCount}/{STEPS.length}
          </p>
        </div>
        <div className="ribbon-panel rounded-xl p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Next step</p>
          <p className="mt-1 text-sm font-medium leading-tight">
            {nextMissing ? nextMissing.label : "All setup complete"}
          </p>
        </div>
      </section>

      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-h3">Setup checklist</CardTitle>
              <CardDescription className="mt-1">
                Mark each step as you complete it in the Lovable editor. The panel then highlights
                the next missing requirement.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={reset}
              className="shrink-0"
              aria-label="Reset checklist"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Reset
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {STEPS.map((step, index) => {
            const complete = checklist[step.id];
            const isNext = nextMissing?.id === step.id;
            return (
              <div
                key={step.id}
                className={cn(
                  "rounded-xl border p-4 transition-colors",
                  complete
                    ? "border-success/30 bg-success/5"
                    : isNext
                      ? "border-warning/50 bg-warning/5"
                      : "border-border bg-card",
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                      complete
                        ? "border-success bg-success text-success-foreground"
                        : "border-muted-foreground/30 text-muted-foreground",
                    )}
                  >
                    {complete ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold">
                          Step {index + 1}: {step.label}
                        </h3>
                        <p className="text-xs text-muted-foreground">{step.description}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {isNext && (
                          <span className="flex items-center gap-1 rounded-full border border-warning/50 px-2 py-0.5 text-[10px] font-medium text-warning">
                            <ShieldAlert className="h-3 w-3" />
                            Next
                          </span>
                        )}
                        {mounted && (
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`github-step-${step.id}`}
                              checked={complete}
                              onCheckedChange={() => toggle(step.id)}
                            />
                            <Label
                              htmlFor={`github-step-${step.id}`}
                              className="sr-only"
                            >{`Mark ${step.label} complete`}</Label>
                          </div>
                        )}
                      </div>
                    </div>
                    <Separator className="my-3" />
                    <ol className="space-y-1.5 text-sm text-muted-foreground">
                      {step.instructions.map((instruction, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-accent">{i + 1}.</span>
                          <span>{instruction}</span>
                        </li>
                      ))}
                    </ol>
                    <a
                      href={step.href}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent/80"
                    >
                      {step.linkLabel}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-h3">Why the workspace connection matters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            The project-level <strong>Connect project</strong> option only appears after a workspace
            owner or admin has created the workspace-level GitHub connection. Without it, the repo
            creation button is hidden.
          </p>
          <p>
            If you do not see the workspace option, ask a workspace owner to add the connection, or
            check that you are in the correct workspace.
          </p>
          <a
            href="https://docs.lovable.dev/integrations/github"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent/80"
          >
            <HelpCircle className="h-3 w-3" />
            Read the GitHub integration docs
            <ExternalLink className="h-3 w-3" />
          </a>
        </CardContent>
      </Card>
    </AppShell>
  );
}
