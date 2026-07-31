import { Link, createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";

import { EmptyState } from "@/components/shell/empty-state";
import { PlatformShell } from "@/components/shell/platform-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotificationCentre } from "@/hooks/use-notification-centre";
import { usePreferences } from "@/hooks/use-preferences";
import { formatRelative } from "@/lib/shell/preferences";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — DeliveryIQ" },
      {
        name: "description",
        content: "Every DeliveryIQ alert in one place: assessments, workspaces, runtime and reports.",
      },
      { property: "og:title", content: "Notifications — DeliveryIQ" },
      {
        property: "og:description",
        content: "Assessment, workspace, runtime and reporting alerts grouped by module.",
      },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { groups, unread, isLoading, markAllRead, markRead, dismiss, isMutating } = useNotificationCentre();
  const { preferences } = usePreferences();

  return (
    <PlatformShell
      title="Notifications"
      description={unread > 0 ? `${unread} unread` : "You're all caught up"}
      actions={
        <Button variant="outline" size="sm" disabled={isMutating || unread === 0} onClick={() => void markAllRead()}>
          Mark all as read
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description="Activity from assessments, workspaces and the intelligence runtime will land here."
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <Card key={group.module}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-h3">{group.label}</CardTitle>
                {group.unread > 0 ? <Badge>{group.unread} unread</Badge> : null}
              </CardHeader>
              <CardContent className="divide-y divide-border/50 p-0">
                {group.items.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-start gap-3 px-6 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {item.href ? (
                          <Link to={item.href} className="hover:underline" onClick={() => void markRead([item.id])}>
                            {item.title}
                          </Link>
                        ) : (
                          item.title
                        )}
                      </p>
                      {item.body ? (
                        <p className="mt-0.5 text-caption text-muted-foreground">{item.body}</p>
                      ) : null}
                      <p className="mt-1 text-caption text-muted-foreground/80">
                        {formatRelative(item.createdAt, preferences)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {item.readAt === null ? (
                        <Button size="sm" variant="ghost" onClick={() => void markRead([item.id])}>
                          Mark read
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground"
                        onClick={() => void dismiss([item.id])}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PlatformShell>
  );
}
