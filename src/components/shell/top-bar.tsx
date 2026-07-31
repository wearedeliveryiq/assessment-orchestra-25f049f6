import { Link } from "@tanstack/react-router";
import { Bell, Menu, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { BrandMark } from "@/components/shell/brand-mark";
import { GlobalSearchDialog } from "@/components/shell/global-search";
import { NotificationCentre } from "@/components/shell/notification-centre";
import { UserMenu } from "@/components/shell/user-menu";
import { WorkspaceSwitcher } from "@/components/tenancy/workspace-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNotificationCentre } from "@/hooks/use-notification-centre";

/** Global top bar: brand, search, workspace, notifications and account. */
export function TopBar({ onToggleNav }: { onToggleNav: () => void }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { unread } = useNotificationCentre();

  // ⌘K / Ctrl-K opens search; the sequence is announced in the button label.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <header
      className="sticky top-0 z-40 border-b border-border/60 bg-surface/80 backdrop-blur"
      style={{ height: "var(--shell-topbar-height)" }}
    >
      <div className="flex h-full items-center gap-3 px-3 sm:px-4">
        <Button
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11"
          aria-label="Toggle navigation"
          onClick={onToggleNav}
        >
          <Menu className="h-4 w-4" />
        </Button>

        <Link to="/" className="shrink-0 rounded transition-opacity hover:opacity-80">
          <BrandMark />
        </Link>

        <div className="ml-1 hidden min-w-0 flex-1 md:flex">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex h-9 w-full max-w-md items-center gap-2 rounded-md border border-border/70 bg-background/60 px-3 text-caption text-muted-foreground transition-colors hover:border-border hover:text-foreground"
          >
            <Search className="h-3.5 w-3.5" aria-hidden />
            <span className="flex-1 text-left">Search DeliveryIQ…</span>
            <kbd className="rounded border border-border/70 px-1.5 py-0.5 text-[10px]">⌘K</kbd>
          </button>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="min-h-11 min-w-11 md:hidden"
            aria-label="Search"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-4 w-4" />
          </Button>

          <div className="hidden sm:block">
            <WorkspaceSwitcher />
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="relative min-h-11 min-w-11"
            aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
            onClick={() => setNotificationsOpen(true)}
          >
            <Bell className="h-4 w-4" />
            {unread > 0 ? (
              <Badge className="absolute right-1 top-1 h-4 min-w-4 justify-center px-1 text-[10px]">
                {unread > 9 ? "9+" : unread}
              </Badge>
            ) : null}
          </Button>

          <UserMenu />
        </div>
      </div>

      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <NotificationCentre open={notificationsOpen} onOpenChange={setNotificationsOpen} />
    </header>
  );
}
