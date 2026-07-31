import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp?: string;
  status?: "complete" | "current" | "pending" | "failed";
  action?: ReactNode;
}

const DOT_STYLES: Record<NonNullable<TimelineItem["status"]>, string> = {
  complete: "bg-success",
  current: "bg-primary ring-4 ring-primary/20",
  pending: "bg-muted",
  failed: "bg-destructive",
};

/** Shared vertical timeline used for activity, history and stage progress. */
export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={cn("relative space-y-5 border-l border-border/70 pl-6", className)}>
      {items.map((item) => (
        <li key={item.id} className="relative">
          <span
            aria-hidden
            className={cn(
              "absolute -left-[1.90rem] top-1.5 h-2.5 w-2.5 rounded-full",
              DOT_STYLES[item.status ?? "pending"],
            )}
          />
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium">{item.title}</p>
              {item.description ? (
                <p className="mt-0.5 text-caption text-muted-foreground">{item.description}</p>
              ) : null}
            </div>
            {item.timestamp ? (
              <time className="shrink-0 text-caption text-muted-foreground/80">{item.timestamp}</time>
            ) : null}
          </div>
          {item.action ? <div className="mt-2">{item.action}</div> : null}
        </li>
      ))}
    </ol>
  );
}
