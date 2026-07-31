import type { ReactNode } from "react";

import { ShellFooter } from "@/components/shell/shell-footer";
import { SideNav } from "@/components/shell/side-nav";
import { TopBar } from "@/components/shell/top-bar";
import { WorkspaceHeader, type WorkspaceHeaderProps } from "@/components/shell/workspace-header";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useShellLayout } from "@/hooks/use-shell-layout";
import { navWidth } from "@/lib/shell/layout";
import { cn } from "@/lib/utils";

export interface PlatformShellProps extends WorkspaceHeaderProps {
  children: ReactNode;
  /** Optional right-hand context panel (evidence, filters, help). */
  contextPanel?: ReactNode;
  /** Renders the page full-bleed instead of inside the standard container. */
  fullWidth?: boolean;
  /** Hides the workspace header for focused flows such as the assessment player. */
  hideWorkspaceHeader?: boolean;
}

/**
 * PlatformShell — top bar → left navigation → workspace header → content →
 * optional context panel → footer.
 *
 * It carries no business logic: modules render into `children` and contribute
 * chrome through props or the component registry.
 */
export function PlatformShell({
  children,
  contextPanel,
  fullWidth = false,
  hideWorkspaceHeader = false,
  ...headerProps
}: PlatformShellProps) {
  const layout = useShellLayout();

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <div className="ribbon-field" aria-hidden />

      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <TopBar onToggleNav={layout.toggleNav} />

      <div className="relative flex min-h-0 flex-1">
        {!layout.isMobile ? (
          <aside
            className="sticky shrink-0 self-start transition-[width] duration-200"
            style={{
              width: navWidth(layout),
              top: "var(--shell-topbar-height)",
              height: "calc(100vh - var(--shell-topbar-height))",
            }}
          >
            <SideNav collapsed={layout.navCollapsed} />
          </aside>
        ) : (
          <Sheet open={layout.navDrawerOpen} onOpenChange={(open) => !open && layout.closeNavDrawer()}>
            <SheetContent side="left" className="w-72 p-0">
              <SideNav collapsed={false} asDrawer onNavigate={layout.closeNavDrawer} />
            </SheetContent>
          </Sheet>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          {hideWorkspaceHeader ? null : <WorkspaceHeader {...headerProps} />}

          <div className="flex min-h-0 flex-1">
            <main
              id="main-content"
              tabIndex={-1}
              className={cn(
                "min-w-0 flex-1 animate-shell-in px-4 py-6 sm:px-6 sm:py-8",
                !fullWidth && "mx-auto w-full max-w-[1600px]",
              )}
            >
              {children}
            </main>

            {contextPanel && !layout.isMobile ? (
              <aside
                aria-label="Context panel"
                className="hidden shrink-0 border-l border-border/60 bg-surface/30 p-4 xl:block"
                style={{ width: "var(--shell-context-width)" }}
              >
                {contextPanel}
              </aside>
            ) : null}
          </div>

          <ShellFooter />
        </div>
      </div>
    </div>
  );
}
