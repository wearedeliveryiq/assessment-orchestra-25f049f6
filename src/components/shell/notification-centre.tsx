import { Link } from "@tanstack/react-router";
import { AlertTriangle, Bell, CheckCircle2, CircleAlert, Info, Trash2, Zap } from "lucide-react";

import { EmptyState } from "@/components/shell/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotificationCentre } from "@/hooks/use-notification-centre";
import { usePreferences } from "@/hooks/use-preferences";
import { formatRelative } from "@/lib/shell/preferences";
import type { NotificationKind } from "@/lib/shell/types";
import { cn } from "@/lib/utils";

const KIND_ICON: Record<NotificationKind, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: CircleAlert,
  action: Zap,
};

const KIND_STYLES: Record<NotificationKind, string> = {
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  error: "text-destructive",
  action: "text-primary",
};

const FILTERS: { id: NotificationKind | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "action", label: "Action" },
  { id: "error", label: "Errors" },
  { id: "warning", label: "Warnings" },
  { id: "success", label: "Success" },
  { id: "info", label: "Info" },
];

/** Global notification centre: filters, bulk actions and deep links. */
export function NotificationCentre({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { visible, unread, kind, setKind, isLoading, markRead, markAllRead, dismiss, dismissAll, isMutating } =
    useNotificationCentre();
  const { preferences } = usePreferences();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/60 px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-h3">
            Notifications
            {unread > 0 ? <Badge className="px-1.5 text-[10px]">{unread} unread</Badge> : null}
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-wrap items-center gap-1.5 border-b border-border/60 px-5 py-3">
          {FILTERS.map((filter) => (
            <Button
              key={filter.id}
              size="sm"
              variant={kind === filter.id ? "secondary" : "ghost"}
              aria-pressed={kind === filter.id}
              className="h-8 rounded-full px-3 text-caption"
              onClick={() => setKind(filter.id)}
            >
              {filter.label}
            </Button>
          ))}
        </div>

        <ScrollArea className="flex-1">
          <div className="divide-y divide-border/50">
            {isLoading ? (
              <div className="space-y-3 p-5">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : visible.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="You're all caught up"
                description="Assessment, workspace and runtime activity will appear here."
                className="border-0 bg-transparent"
              />
            ) : (
              visible.map((notification) => {
                const Icon = KIND_ICON[notification.kind];
                const body = (
                  <div className="flex gap-3">
                    <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", KIND_STYLES[notification.kind])} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{notification.title}</p>
                      {notification.body ? (
                        <p className="mt-0.5 line-clamp-2 text-caption text-muted-foreground">
                          {notification.body}
                        </p>
                      ) : null}
                      <p className="mt-1 text-caption text-muted-foreground/80">
                        {formatRelative(notification.createdAt, preferences)}
                      </p>
                    </div>
                  </div>
                );

                return (
                  <article
                    key={notification.id}
                    className={cn("px-5 py-4", notification.readAt === null && "bg-secondary/25")}
                  >
                    {notification.href ? (
                      <Link
                        to={notification.href}
                        onClick={() => {
                          void markRead([notification.id]);
                          onOpenChange(false);
                        }}
                        className="block rounded-md"
                      >
                        {body}
                      </Link>
                    ) : (
                      body
                    )}

                    <div className="mt-2 flex items-center gap-1">
                      {notification.readAt === null ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-caption"
                          disabled={isMutating}
                          onClick={() => void markRead([notification.id])}
                        >
                          Mark as read
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-caption text-muted-foreground"
                        disabled={isMutating}
                        onClick={() => void dismiss([notification.id])}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between gap-2 border-t border-border/60 px-5 py-3">
          <Button
            variant="ghost"
            size="sm"
            disabled={isMutating || unread === 0}
            onClick={() => void markAllRead()}
          >
            Mark all as read
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            disabled={isMutating || visible.length === 0}
            onClick={() => void dismissAll()}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Clear all
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
