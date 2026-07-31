import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/shell/empty-state";
import { PlatformShell } from "@/components/shell/platform-shell";
import { Timeline } from "@/components/shell/timeline";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/design-system")({
  head: () => ({
    meta: [
      { title: "Design system — DeliveryIQ" },
      {
        name: "description",
        content:
          "The DeliveryIQ design system: tokens, typography, colour, and the accessible component library used across the platform.",
      },
      { property: "og:title", content: "Design system — DeliveryIQ" },
      {
        property: "og:description",
        content: "Tokens, typography, colour and the accessible DeliveryIQ component library.",
      },
    ],
  }),
  component: DesignSystemPage,
});

const SEMANTIC_COLOURS = [
  ["Primary", "bg-primary text-primary-foreground"],
  ["Secondary", "bg-secondary text-secondary-foreground"],
  ["Success", "bg-success text-success-foreground"],
  ["Warning", "bg-warning text-warning-foreground"],
  ["Error", "bg-destructive text-destructive-foreground"],
  ["Information", "bg-info text-info-foreground"],
  ["Surface", "bg-surface text-foreground border border-border"],
  ["Background", "bg-background text-foreground border border-border"],
];

const TYPE_SCALE = [
  ["Display", "text-display font-display"],
  ["Heading 1", "text-h1 font-display"],
  ["Heading 2", "text-h2 font-display"],
  ["Heading 3", "text-h3 font-display"],
  ["Body", "text-body"],
  ["Caption", "text-caption text-muted-foreground"],
  ["Label", "text-label uppercase text-muted-foreground"],
  ["Code", "text-code font-mono"],
];

function Section({ id, title, description, children }: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-heading`} className="mb-10">
      <h2 id={`${id}-heading`} className="text-h2 font-display font-semibold tracking-tight">
        {title}
      </h2>
      <p className="mb-4 mt-1 text-caption text-muted-foreground">{description}</p>
      {children}
    </section>
  );
}

function DesignSystemPage() {
  const [checked, setChecked] = useState(true);
  const [term, setTerm] = useState("");

  return (
    <PlatformShell
      title="Design system"
      description="Tokens, typography and the shared component library"
    >
      <Section
        id="tokens"
        title="Colour"
        description="Semantic tokens only — components never hard-code a colour, so themes swap cleanly."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SEMANTIC_COLOURS.map(([label, classes]) => (
            <div key={label} className={`rounded-lg px-4 py-6 text-sm font-medium ${classes}`}>
              {label}
            </div>
          ))}
        </div>
      </Section>

      <Section id="type" title="Typography" description="One scale, consistent line heights and tracking.">
        <Card>
          <CardContent className="space-y-3 pt-6">
            {TYPE_SCALE.map(([label, classes]) => (
              <div key={label} className="flex flex-wrap items-baseline gap-4">
                <span className="w-24 shrink-0 text-caption text-muted-foreground">{label}</span>
                <span className={classes}>Delivery intelligence, evidenced.</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </Section>

      <Section id="controls" title="Controls" description="Buttons, inputs and selection controls.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-h3">Buttons</CardTitle>
              <CardDescription>Every variant meets AA contrast in both themes.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button size="icon" aria-label="Search">
                <Search className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-h3">Inputs</CardTitle>
              <CardDescription>Labelled, keyboard accessible, screen-reader friendly.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ds-search">Search box</Label>
                <Input
                  id="ds-search"
                  value={term}
                  onChange={(event) => setTerm(event.target.value)}
                  placeholder="Search knowledge packs…"
                />
              </div>
              <div className="flex items-center gap-3">
                <Checkbox id="ds-check" checked={checked} onCheckedChange={(v) => setChecked(v === true)} />
                <Label htmlFor="ds-check">Include archived</Label>
              </div>
              <RadioGroup defaultValue="all" className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="all" id="ds-all" />
                  <Label htmlFor="ds-all">All</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="mine" id="ds-mine" />
                  <Label htmlFor="ds-mine">Mine</Label>
                </div>
              </RadioGroup>
              <div className="flex items-center gap-3">
                <Switch id="ds-switch" defaultChecked />
                <Label htmlFor="ds-switch">Email digests</Label>
              </div>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section id="feedback" title="Feedback" description="Progress, toasts, skeletons and empty states.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-h3">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={62} aria-label="Assessment completion" />
              <div className="flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Error</Badge>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => toast.success("Preferences saved")}>
                  Toast
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      Modal
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Dialog title</DialogTitle>
                      <DialogDescription>
                        Focus is trapped, escape closes, and the trigger regains focus on close.
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          <EmptyState
            title="No assessments yet"
            description="Start a Delivery DNA Snapshot to see results here."
            action={<Button size="sm">New assessment</Button>}
          />
        </div>
      </Section>

      <Section id="data" title="Data display" description="Tables, tabs, accordions and timelines.">
        <Tabs defaultValue="table">
          <TabsList>
            <TabsTrigger value="table">Table</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="accordion">Accordion</TabsTrigger>
          </TabsList>

          <TabsContent value="table" className="mt-4">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assessment</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    ["Delivery DNA Snapshot", "A. Rahman", "Completed"],
                    ["Executive Sponsorship", "J. Okafor", "In progress"],
                  ].map(([name, owner, status]) => (
                    <TableRow key={name}>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px]">{owner.slice(0, 2)}</AvatarFallback>
                          </Avatar>
                          {owner}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status === "Completed" ? "secondary" : "outline"}>{status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <Timeline
                  items={[
                    { id: "1", title: "Knowledge Pack loaded", status: "complete", timestamp: "09:14" },
                    { id: "2", title: "Observations generated", status: "complete", timestamp: "09:15" },
                    { id: "3", title: "Signals inferred", status: "current", timestamp: "09:15" },
                    { id: "4", title: "Narrative composed", status: "pending" },
                  ]}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="accordion" className="mt-4">
            <Card>
              <CardContent className="pt-2">
                <Accordion type="single" collapsible>
                  <AccordionItem value="a">
                    <AccordionTrigger>How do I theme a component?</AccordionTrigger>
                    <AccordionContent>
                      Use semantic utility classes such as <code className="text-code">bg-surface</code> and
                      <code className="text-code"> text-muted-foreground</code>. Never hard-code a colour.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="b">
                    <AccordionTrigger>How do I add a module to navigation?</AccordionTrigger>
                    <AccordionContent>
                      Add an entry to <code className="text-code">src/lib/shell/navigation.ts</code>. The sidebar,
                      search and breadcrumbs pick it up automatically.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Section>
    </PlatformShell>
  );
}
