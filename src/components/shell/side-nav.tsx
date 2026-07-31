import { Link, useRouterState } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useMemo } from "react";

import { navIcon } from "@/components/shell/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useIdentity } from "@/hooks/use-identity";
import { useNotificationCentre } from "@/hooks/use-notification-centre";
import { buildNavigation, isNavItemActive } from "@/lib/shell/navigation";
import { cn } from "@/lib/utils";

interface SideNavProps {
  collapsed: boolean;
  asDrawer?: boolean;
  onNavigate?: () => void;
}

/**
 * Primary navigation. Rendered from navigation data — never from hard-coded
 * JSX — so new modules appear without touching this component.
 */
export function SideNav({ collapsed, asDrawer = false, onNavigate }: SideNavProps) {
  const { can } = useIdentity();
  const { unread } = useNotificationCentre();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const sections = useMemo(
    () =>
      buildNavigation({
        permissions: can("organisation.manage") ? ["organisation.manage"] : [],
        includePlanned: true,
      }),
    [can],
  );

  const badges: Record<string, number> = { "notifications.unread": unread };

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "flex h-full flex-col gap-6 overflow-y-auto border-r border-border/60 bg-surface/40 py-5",
        collapsed && !asDrawer ? "px-2" : "px-3",
      )}
    >
      {asDrawer ? (
        <div className="flex items-center justify-between px-1">
          <span className="text-label uppercase text-muted-foreground">Menu</span>
          <Button variant="ghost" size="icon" aria-label="Close navigation" onClick={onNavigate}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      {sections.map((section) => (
        <div key={section.id} className="space-y-1">
          {!collapsed || asDrawer ? (
            <p className="px-2 pb-1 text-label uppercase text-muted-foreground">{section.label}</p>
          ) : (
            <div className="mx-auto mb-1 h-px w-6 bg-border/70" aria-hidden />
          )}

          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = navIcon(item.icon);
              const active = isNavItemActive(item, pathname);
              const badge = item.badgeKey ? badges[item.badgeKey] : undefined;
              const showLabel = !collapsed || asDrawer;

              if (item.status === "planned" || !item.to) {
                return (
                  <li key={item.id}>
                    <span
                      aria-disabled="true"
                      title={item.description ?? `${item.label} — coming soon`}
                      className={cn(
                        "flex min-h-11 items-center gap-3 rounded-md px-2.5 py-2 text-sm text-muted-foreground/70",
                        !showLabel && "justify-center",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      {showLabel ? (
                        <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                          <span className="truncate">{item.label}</span>
                          <Badge variant="outline" className="shrink-0 text-[10px]">
                            Soon
                          </Badge>
                        </span>
                      ) : null}
                    </span>
                  </li>
                );
              }

              return (
                <li key={item.id}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    title={collapsed && !asDrawer ? item.label : undefined}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors",
                      "hover:bg-secondary/70 focus-visible:bg-secondary/70",
                      active
                        ? "bg-secondary text-foreground shadow-level-1"
                        : "text-muted-foreground hover:text-foreground",
                      !showLabel && "justify-center",
                    )}
                  >
                    <span className="relative flex items-center">
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      {active ? (
                        <span
                          className="ribbon-bar absolute -left-2.5 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full"
                          aria-hidden
                        />
                      ) : null}
                    </span>
                    {showLabel ? (
                      <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                        <span className="truncate">{item.label}</span>
                        {badge ? (
                          <Badge className="shrink-0 px-1.5 text-[10px]">{badge > 99 ? "99+" : badge}</Badge>
                        ) : null}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
