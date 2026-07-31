import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { useIdentity } from "@/hooks/use-identity";
import { recordShellEvent } from "@/lib/shell/audit";
import { dismissNotifications, fetchNotifications, markNotificationsRead } from "@/lib/shell/client";
import { filterByKind, groupByModule } from "@/lib/shell/notifications";
import type { NotificationKind, ShellNotification } from "@/lib/shell/types";

const QUERY_KEY = ["shell", "notifications"] as const;

/** NotificationCentre hook: feed, unread count, filters and bulk actions. */
export function useNotificationCentre() {
  const { isAuthenticated } = useIdentity();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<NotificationKind | "all">("all");

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchNotifications,
    enabled: isAuthenticated,
    refetchInterval: 60_000,
    retry: false,
  });

  const notifications: ShellNotification[] = query.data?.notifications ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const read = useMutation({
    mutationFn: markNotificationsRead,
    onSuccess: (_result, variables) => {
      recordShellEvent("notification.read", variables as Record<string, unknown>);
      void invalidate();
    },
  });

  const dismiss = useMutation({
    mutationFn: dismissNotifications,
    onSuccess: (_result, variables) => {
      recordShellEvent("notification.dismissed", variables as Record<string, unknown>);
      void invalidate();
    },
  });

  const visible = useMemo(() => filterByKind(notifications, kind), [notifications, kind]);

  return {
    notifications,
    visible,
    groups: useMemo(() => groupByModule(visible), [visible]),
    unread: query.data?.unread ?? 0,
    isLoading: query.isLoading,
    kind,
    setKind,
    markRead: (ids: string[]) => read.mutateAsync({ ids }),
    markAllRead: () => read.mutateAsync({ all: true }),
    dismiss: (ids: string[]) => dismiss.mutateAsync({ ids }),
    dismissAll: () => dismiss.mutateAsync({ all: true }),
    isMutating: read.isPending || dismiss.isPending,
    refresh: invalidate,
  };
}
