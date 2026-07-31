/**
 * Application shell — shared types.
 *
 * The shell is a platform capability: it knows about navigation, layout,
 * theming, preferences, notifications and search. It knows nothing about
 * assessments, reports or any other module.
 */

/* ------------------------------- navigation ------------------------------- */

/** Lifecycle of a navigation destination. Planned items render as disabled. */
export type NavStatus = "available" | "planned";

export interface NavItem {
  id: string;
  label: string;
  /** Router path. Planned modules may omit it. */
  to?: string;
  /** Icon key resolved by the shell's icon registry — keeps nav serialisable. */
  icon: string;
  description?: string;
  status?: NavStatus;
  /** Permission required to see the item. */
  permission?: string;
  /** Feature flag gating the item. */
  featureFlag?: string;
  /** Badge counter key, e.g. `notifications.unread`. */
  badgeKey?: string;
  /** Matches child routes as active, e.g. `/assessments/123`. */
  matchPrefix?: boolean;
  children?: NavItem[];
}

export interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

export interface NavigationContext {
  permissions?: string[];
  featureFlags?: Record<string, boolean>;
  /** Show planned modules as disabled placeholders. Defaults to true. */
  includePlanned?: boolean;
}

/* -------------------------------- routing -------------------------------- */

export interface RouteMeta {
  /** Route pattern using `$param` segments, e.g. `/assessments/$id`. */
  path: string;
  /** Document title fragment. */
  title: string;
  /** Breadcrumb label; falls back to `title`. */
  breadcrumb?: string;
  /** Owning navigation module id. */
  module?: string;
  requiresAuth?: boolean;
  permission?: string;
  featureFlag?: string;
  /** Hide from breadcrumb trails (layout-only segments). */
  hidden?: boolean;
}

export interface Crumb {
  label: string;
  href?: string;
  current: boolean;
}

/* -------------------------------- theming -------------------------------- */

export type ThemeMode = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

/* ------------------------------- preferences ------------------------------ */

export type Density = "comfortable" | "compact";

export interface UserPreferences {
  theme: ThemeMode;
  language: string;
  timezone: string;
  dateFormat: string;
  numberFormat: string;
  density: Density;
  reducedMotion: boolean;
  highContrast: boolean;
  sidebarCollapsed: boolean;
  favouriteModules: string[];
  defaultWorkspaceId: string | null;
  landingPage: string;
}

/* ------------------------------ notifications ----------------------------- */

export type NotificationKind = "info" | "success" | "warning" | "error" | "action";

export interface ShellNotification {
  id: string;
  title: string;
  body: string;
  kind: NotificationKind;
  module: string;
  eventType: string;
  createdAt: string;
  readAt: string | null;
  /** Deep link into the module that raised it. */
  href?: string;
}

export interface NotificationGroup {
  module: string;
  label: string;
  unread: number;
  items: ShellNotification[];
}

/* --------------------------------- search --------------------------------- */

export type SearchResultKind =
  | "workspace"
  | "organisation"
  | "user"
  | "knowledge-pack"
  | "assessment"
  | "report"
  | "teammate"
  | "navigation";

export interface SearchResult {
  id: string;
  kind: SearchResultKind;
  title: string;
  subtitle?: string;
  href: string;
  /** Higher wins when results are merged across providers. */
  score?: number;
}

export interface SearchProvider {
  id: string;
  label: string;
  kinds: SearchResultKind[];
  /** Lower runs first in the merged result list. */
  order?: number;
  enabled?: () => boolean;
  search: (query: string, signal?: AbortSignal) => Promise<SearchResult[]>;
}

/* --------------------------------- layout --------------------------------- */

export type Breakpoint = "mobile" | "tablet" | "desktop";

export interface LayoutState {
  breakpoint: Breakpoint;
  navCollapsed: boolean;
  navDrawerOpen: boolean;
  contextPanelOpen: boolean;
}
