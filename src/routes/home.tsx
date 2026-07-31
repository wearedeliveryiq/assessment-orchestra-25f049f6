import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";

import { PlatformShell } from "@/components/shell/platform-shell";
import { EmptyState } from "@/components/shell/empty-state";
import { navIcon } from "@/components/shell/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePreferences } from "@/hooks/use-preferences";
import { useWorkspaceContext } from "@/hooks/use-workspace-context";
import { NAVIGATION, buildNavigation, findNavItem, flattenNavigation } from "@/lib/shell/navigation";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Home — DeliveryIQ platform" },
      {
        name: "description",
        content:
          "Your DeliveryIQ home: jump into workspaces, knowledge packs, assessments and reports from one place.",
      },
      { property: "og:title", content: "Home — DeliveryIQ platform" },
      {
        property: "og:description",
        content: "Jump into workspaces, knowledge packs, assessments and reports from one place.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { preferences } = usePreferences();
  const { currentWorkspace, organisation } = useWorkspaceContext();

  const sections = buildNavigation({ includePlanned: true }, NAVIGATION);
  const modules = flattenNavigation(sections).filter((item) => item.to && item.id !== "home");
  const favourites = preferences.favouriteModules
    .map((id) => findNavItem(id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item?.to));

  return (
    <PlatformShell
      title="Home"
      description={[organisation?.name, currentWorkspace?.name].filter(Boolean).join(" · ") || "DeliveryIQ platform"}
    >
      <section aria-labelledby="favourites-heading" className="mb-10">
        <h2 id="favourites-heading" className="mb-3 text-label uppercase text-muted-foreground">
          Favourites
        </h2>
        {favourites.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No favourite modules yet"
            description="Star a module from its workspace header and it will appear here for one-click access."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {favourites.map((item) => {
              const Icon = navIcon(item.icon);
              return (
                <Link key={item.id} to={item.to as string} className="group rounded-lg">
                  <Card className="h-full transition-colors group-hover:border-primary/50">
                    <CardHeader className="flex-row items-center gap-3 space-y-0">
                      <span className="ribbon-panel flex h-9 w-9 items-center justify-center rounded-lg">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <CardTitle className="text-h3">{item.label}</CardTitle>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="modules-heading">
        <h2 id="modules-heading" className="mb-3 text-label uppercase text-muted-foreground">
          All modules
        </h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((item) => {
            const Icon = navIcon(item.icon);
            return (
              <Card key={item.id} className="flex h-full flex-col">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <span className="ribbon-panel flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <CardTitle className="text-h3">{item.label}</CardTitle>
                  </div>
                  <CardDescription>
                    {item.description ?? `Open the ${item.label.toLowerCase()} module.`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto">
                  <Button asChild variant="ghost" size="sm" className="px-0 hover:bg-transparent">
                    <Link to={item.to as string}>
                      Open <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="soon-heading" className="mt-10">
        <h2 id="soon-heading" className="mb-3 text-label uppercase text-muted-foreground">
          Coming soon
        </h2>
        <div className="flex flex-wrap gap-2">
          {flattenNavigation(sections)
            .filter((item) => item.status === "planned")
            .map((item) => (
              <Badge key={item.id} variant="outline" className="px-3 py-1">
                {item.label}
              </Badge>
            ))}
        </div>
      </section>
    </PlatformShell>
  );
}
