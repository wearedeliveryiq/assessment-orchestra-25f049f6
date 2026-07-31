import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Primary and secondary actions. */
  action?: ReactNode;
  /** Optional custom illustration replacing the icon. */
  illustration?: ReactNode;
  className?: string;
}

/** Reusable empty state for lists, panels and search results. */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  illustration,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-surface/30 px-6 py-12 text-center",
        className,
      )}
    >
      {illustration ?? (
        <span className="ribbon-panel mb-4 flex h-12 w-12 items-center justify-center rounded-xl">
          <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
        </span>
      )}
      <h3 className="text-h3 font-display font-semibold tracking-tight">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-caption text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
