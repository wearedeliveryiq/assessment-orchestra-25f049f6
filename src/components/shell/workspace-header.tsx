import { Star } from "lucide-react";
import type { ReactNode } from "react";

import { ShellBreadcrumbs } from "@/components/shell/shell-breadcrumbs";
import { Button } from "@/components/ui/button";
import { useBreadcrumbs } from "@/hooks/use-breadcrumbs";
import { usePreferences } from "@/hooks/use-preferences";
import { useWorkspaceContext } from "@/hooks/use-workspace-context";
import { toggleFavouriteModule } from "@/lib/shell/preferences";
import { cn } from "@/lib/utils";

export interface WorkspaceHeaderProps {
  /** Overrides the module title derived from the route registry. */
  title?: string;
  description?: string;
  actions?: ReactNode;
  /** Slot for future workspace-level metrics. */
  metrics?: ReactNode;
  breadcrumbLabels?: Record<string, string>;
}

/** Context band: where you are, which workspace you are in, what you can do. */
export function WorkspaceHeader({
  title,
  description,
  actions,
  metrics,
  breadcrumbLabels,
}: WorkspaceHeaderProps) {
  const { currentWorkspace, organisation } = useWorkspaceContext();
  const { title: routeTitle, module } = useBreadcrumbs(breadcrumbLabels);
  const { preferences, update } = usePreferences();

  const moduleId = module?.id ?? "home";
  const isFavourite = preferences.favouriteModules.includes(moduleId);

  return (
    <header className="border-b border-border/60 bg-surface/30">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-4 sm:px-6">
        <ShellBreadcrumbs labels={breadcrumbLabels} />

        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-h2 font-display font-semibold tracking-tight">
                {title ?? routeTitle}
              </h1>
              <Button
                variant="ghost"
                size="icon"
                aria-pressed={isFavourite}
                aria-label={isFavourite ? `Remove ${moduleId} from favourites` : `Add ${moduleId} to favourites`}
                className="min-h-11 min-w-11 shrink-0"
                onClick={() => void update(toggleFavouriteModule(preferences, moduleId))}
              >
                <Star className={cn("h-4 w-4", isFavourite && "fill-primary text-primary")} />
              </Button>
            </div>
            <p className="mt-0.5 truncate text-caption text-muted-foreground">
              {description ??
                [organisation?.name, currentWorkspace?.name].filter(Boolean).join(" · ") ??
                "DeliveryIQ platform"}
            </p>
          </div>

          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>

        {metrics ? <div className="mt-4">{metrics}</div> : null}
      </div>
      <div className="ribbon-bar h-0.5 w-full opacity-70" aria-hidden />
    </header>
  );
}
