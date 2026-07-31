import type { ReactNode } from "react";

import { PlatformShell } from "@/components/shell/platform-shell";

export { BrandMark } from "@/components/shell/brand-mark";

/**
 * Legacy shell entry point, kept so existing pages keep working.
 *
 * It now delegates to the platform shell, which owns navigation, layout,
 * theming, search and notifications. New pages should use `PlatformShell`
 * directly for access to context panels and workspace header options.
 */
export function AppShell({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <PlatformShell actions={action}>{children}</PlatformShell>;
}
