import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { useBreadcrumbs } from "@/hooks/use-breadcrumbs";

/** Automatic breadcrumb trail derived from the route registry. */
export function ShellBreadcrumbs({ labels }: { labels?: Record<string, string> }) {
  const { crumbs } = useBreadcrumbs(labels);
  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-caption text-muted-foreground">
        {crumbs.map((crumb, index) => (
          <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
            {index > 0 ? <ChevronRight className="h-3 w-3 opacity-60" aria-hidden /> : null}
            {crumb.href ? (
              <Link to={crumb.href} className="rounded px-0.5 transition-colors hover:text-foreground">
                {crumb.label}
              </Link>
            ) : (
              <span aria-current="page" className="px-0.5 font-medium text-foreground">
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
