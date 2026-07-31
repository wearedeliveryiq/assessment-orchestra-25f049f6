import { Link } from "@tanstack/react-router";

/** Minimal footer — status and legal links, nothing that competes for attention. */
export function ShellFooter() {
  return (
    <footer className="border-t border-border/60 bg-surface/30 px-4 py-3 sm:px-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-2 text-caption text-muted-foreground">
        <p>© {new Date().getFullYear()} DeliveryIQ — Delivery intelligence platform</p>
        <nav aria-label="Footer" className="flex items-center gap-4">
          <Link to="/design-system" className="transition-colors hover:text-foreground">
            Design system
          </Link>
          <Link to="/settings" className="transition-colors hover:text-foreground">
            Preferences
          </Link>
        </nav>
      </div>
    </footer>
  );
}
